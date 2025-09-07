// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Types} from "./Types.sol";

/// @title EvolvablePool
/// @notice Minimal constant-product AMM with configurable traits and basic anti-MEV/price-impact guards
/// @dev Designed to be used behind EIP-1167 clones via PoolFactory. No LP tokens; liquidity managed by owner for MVP.
contract EvolvablePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // immutable-like after initialize
    address public token0;
    address public token1;
    address public parent;
    uint32 public generation;

    // reserves
    uint256 public reserve0;
    uint256 public reserve1;

    // traits
    Types.Traits public traits;

    // metrics
    uint256 public totalVolume0; // cumulative token0 volume in swaps
    uint256 public totalVolume1; // cumulative token1 volume in swaps
    uint256 public totalFees0;   // cumulative fees collected in token0 equivalent
    uint256 public totalFees1;   // cumulative fees collected in token1 equivalent
    uint256 public numSwaps;
    uint256 public cumulativePriceImpactBps;

    bool private _initialized;
    bool public paused; // emergency pause

    // basic cooldown per sender to limit same-block MEV
    mapping(address => uint256) public lastSwapBlock;

    event Initialized(address token0, address token1, address parent, uint32 generation, Types.Traits traits);
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 newReserve0, uint256 newReserve1);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 newReserve0, uint256 newReserve1);
    event Swap(address indexed sender, address indexed tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut, uint256 priceImpactBps);
    event Paused(bool paused);

    error AlreadyInitialized();
    error InvalidTokens();
    error ZeroAmount();
    error SlippageExceeded(uint256 priceImpactBps, uint256 guardBps);
    error CooldownActive();
    error PausedError();

    modifier onlyInitialized() {
        require(_initialized, "NOT_INIT");
        _;
    }

    // Ownable v5 requires an initial owner for the implementation. Using deployer here is fine; clones set owner in initialize().
    constructor() Ownable(msg.sender) {}

    function initialize(
        address _owner,
        address _token0,
        address _token1,
        address _parent,
        uint32 _generation,
        Types.Traits memory _traits
    ) external {
        if (_initialized) revert AlreadyInitialized();
        if (_token0 == address(0) || _token1 == address(0) || _token0 == _token1) revert InvalidTokens();
        // trait sanity caps
        require(_traits.feeBps <= 1000, "FEE_BPS_MAX"); // <=10%
        require(_traits.slippageGuardBps <= 2000, "GUARD_BPS_MAX"); // <=20%
        require(_traits.cooldownBlocks <= 1000, "COOLDOWN_MAX");
        _transferOwnership(_owner);
        token0 = _token0;
        token1 = _token1;
        parent = _parent;
        generation = _generation;
        traits = _traits;
        _initialized = true;
        emit Initialized(_token0, _token1, _parent, _generation, _traits);
    }

    // === Liquidity (owner managed for MVP) ===
    function addLiquidity(uint256 amount0, uint256 amount1) external onlyOwner onlyInitialized nonReentrant {
        if (paused) revert PausedError();
        if (amount0 == 0 && amount1 == 0) revert ZeroAmount();
        if (amount0 > 0) IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        reserve0 += amount0;
        reserve1 += amount1;
        emit AddLiquidity(msg.sender, amount0, amount1, reserve0, reserve1);
    }

    function removeLiquidity(uint256 amount0, uint256 amount1) external onlyOwner onlyInitialized nonReentrant {
        if (paused) revert PausedError();
        if (amount0 == 0 && amount1 == 0) revert ZeroAmount();
        if (amount0 > 0) {
            require(reserve0 >= amount0, "INSUFF_RES0");
            reserve0 -= amount0;
            IERC20(token0).safeTransfer(msg.sender, amount0);
        }
        if (amount1 > 0) {
            require(reserve1 >= amount1, "INSUFF_RES1");
            reserve1 -= amount1;
            IERC20(token1).safeTransfer(msg.sender, amount1);
        }
        emit RemoveLiquidity(msg.sender, amount0, amount1, reserve0, reserve1);
    }

    // === Swaps ===
    function swapExactInput(address tokenIn, uint256 amountIn, uint256 minOut, address to) external onlyInitialized nonReentrant returns (uint256 amountOut) {
        if (paused) revert PausedError();
        if (amountIn == 0) revert ZeroAmount();
        if (traits.mevProtection) {
            if (lastSwapBlock[msg.sender] == block.number) revert CooldownActive();
            if (traits.cooldownBlocks > 0) {
                require(block.number > lastSwapBlock[msg.sender] + traits.cooldownBlocks, "COOLDOWN");
            }
        }

        bool zeroForOne;
        if (tokenIn == token0) {
            zeroForOne = true;
            IERC20(token0).safeTransferFrom(msg.sender, address(this), amountIn);
        } else if (tokenIn == token1) {
            zeroForOne = false;
            IERC20(token1).safeTransferFrom(msg.sender, address(this), amountIn);
        } else {
            revert InvalidTokens();
        }

        uint256 _reserveIn = zeroForOne ? reserve0 : reserve1;
        uint256 _reserveOut = zeroForOne ? reserve1 : reserve0;
        require(_reserveIn > 0 && _reserveOut > 0, "NO_LIQ");

        // take fee
        uint256 amountInAfterFee = amountIn * (10000 - traits.feeBps) / 10000;

        // constant product x*y = k
        uint256 newReserveIn = _reserveIn + amountInAfterFee;
        uint256 k = _reserveIn * _reserveOut;
        uint256 newReserveOut = k / newReserveIn;
        amountOut = _reserveOut - newReserveOut;
        require(amountOut >= minOut, "SLIPPAGE_MINOUT");

        // compute approximate price impact vs linear quote
        uint256 linearOut = (amountInAfterFee * _reserveOut) / _reserveIn;
        uint256 impactBps = 0;
        if (linearOut > amountOut && linearOut > 0) {
            impactBps = ((linearOut - amountOut) * 10000) / linearOut;
        }
        if (traits.slippageGuardBps > 0 && impactBps > traits.slippageGuardBps) {
            revert SlippageExceeded(impactBps, traits.slippageGuardBps);
        }

        // update reserves and transfer out
        if (zeroForOne) {
            reserve0 = newReserveIn;
            reserve1 = newReserveOut;
            IERC20(token1).safeTransfer(to, amountOut);
            totalVolume0 += amountIn;
            totalFees0 += (amountIn - amountInAfterFee);
        } else {
            reserve1 = newReserveIn;
            reserve0 = newReserveOut;
            IERC20(token0).safeTransfer(to, amountOut);
            totalVolume1 += amountIn;
            totalFees1 += (amountIn - amountInAfterFee);
        }

        numSwaps += 1;
        cumulativePriceImpactBps += impactBps;
        lastSwapBlock[msg.sender] = block.number;

        emit Swap(msg.sender, tokenIn, amountIn, zeroForOne ? token1 : token0, amountOut, impactBps);
    }

    function getAveragePriceImpactBps() external view returns (uint256) {
        if (numSwaps == 0) return 0;
        return cumulativePriceImpactBps / numSwaps;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function setPaused(bool _p) external onlyOwner {
        paused = _p;
        emit Paused(_p);
    }
}
