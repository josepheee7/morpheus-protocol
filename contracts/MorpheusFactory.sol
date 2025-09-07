// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Types} from "./Types.sol";
import {Registry} from "./Registry.sol";
import {PoolFactory} from "./PoolFactory.sol";

interface IEvolvablePoolLite {
    function transferOwnership(address newOwner) external;
    function getAveragePriceImpactBps() external view returns (uint256);
}

/// @title MorpheusFactory
/// @notice GA orchestrator + DNA registry + cross-chain DNA encoder, built on top of PoolFactory/Registry
contract MorpheusFactory is Ownable {
    using Types for Types.Traits;

    struct ContractDNA {
        uint256 generation;
        bytes32 parentHash;
        uint256[3] traits; // [gasEfficiency, profitability, userSatisfaction]
        uint256 fitnessScore;
        uint256 birthBlock;
        // NOTE: customTraits keyed by keccak256(name) maintained in external mapping for easy encoding
    }

    struct EvolutionEvent {
        address parent;
        address child;
        uint256 improvement;
        uint256 timestamp;
    }

    Registry public immutable registry;
    PoolFactory public immutable factory;

    // DNA and evolution tracking
    mapping(address => ContractDNA) public contractGenetics;
    mapping(uint256 => address[]) public generationContracts;
    mapping(address => EvolutionEvent[]) public evolutionHistory;

    // optional custom traits map: pool => key => value (key = keccak256(bytes(name)))
    mapping(address => mapping(bytes32 => uint256)) public customTrait;

    // roles
    address public fitnessOracle;

    event FitnessUpdated(address indexed contractAddr, uint256 newFitness, uint256 improvement, uint256[3] components);
    event ContractEvolved(address indexed parent, address indexed child, uint256 generation, uint256 fitnessImprovement);
    event CrossChainMigration(address indexed contractAddr, uint256 sourceChain, uint256 targetChain, bytes dna);
    event FitnessOracleUpdated(address indexed oracle);

    error NotOracle();
    error UnknownPool();

    constructor(PoolFactory _factory, Registry _registry, address initialOwner) Ownable(initialOwner) {
        factory = _factory;
        registry = _registry;
    }

    // === Admin ===
    function setFitnessOracle(address _oracle) external onlyOwner {
        fitnessOracle = _oracle;
        emit FitnessOracleUpdated(_oracle);
    }

    // === DNA Management ===
    function seedDNA(address pool) public onlyOwner {
        if (contractGenetics[pool].birthBlock != 0) return; // already seeded
        Types.PoolDescriptor memory d = registry.getPool(pool);
        if (d.token0 == address(0)) revert UnknownPool();
        ContractDNA memory dna;
        dna.generation = d.generation;
        dna.parentHash = keccak256(abi.encodePacked(d.parent));
        dna.traits = [uint256(0), uint256(0), uint256(0)];
        dna.fitnessScore = 0;
        dna.birthBlock = block.number;
        contractGenetics[pool] = dna;
        generationContracts[uint256(d.generation)].push(pool);
    }

    function _ensureSeed(address pool) internal {
        if (contractGenetics[pool].birthBlock == 0) {
            // try seeding lazily
            seedDNA(pool);
        }
    }

    /// @notice Oracle-reported fitness components; weighted score: 40% gas, 30% profit, 30% user satisfaction.
    function reportFitness(address pool, uint256 gasEfficiency, uint256 profitability, uint256 userSatisfaction) external {
        if (msg.sender != fitnessOracle && msg.sender != owner()) revert NotOracle();
        _ensureSeed(pool);
        ContractDNA storage dna = contractGenetics[pool];
        uint256 old = dna.fitnessScore;
        // simple weighted sum in bps space (assume each component is 0..10000)
        uint256 score = (gasEfficiency * 40 + profitability * 30 + userSatisfaction * 30) / 100;
        // MEV resistance bonus based on low avg price impact
        try IEvolvablePoolLite(pool).getAveragePriceImpactBps() returns (uint256 impact) {
            if (impact < 300) {
                score = score + 100; // small bonus
            }
        } catch {}
        dna.traits = [gasEfficiency, profitability, userSatisfaction];
        dna.fitnessScore = score;
        uint256 improvement = score > old ? (score - old) : 0;
        evolutionHistory[pool].push(EvolutionEvent({ parent: address(0), child: pool, improvement: improvement, timestamp: block.timestamp }));
        emit FitnessUpdated(pool, score, improvement, [gasEfficiency, profitability, userSatisfaction]);
    }

    /// @notice Evolve a parent by generating a child with mutated pool Traits using simple on-chain GA operations.
    function evolveContract(address parent, uint256[] memory targetTraits) external onlyOwner returns (address child) {
        Types.PoolDescriptor memory pd = registry.getPool(parent);
        if (pd.token0 == address(0)) revert UnknownPool();
        _ensureSeed(parent);

        // Selection: pick best peer from same generation (including parent); fallback to parent
        address mate = parent;
        uint256 bestFitness = contractGenetics[parent].fitnessScore;
        address[] storage peers = generationContracts[uint256(pd.generation)];
        for (uint256 i = 0; i < peers.length; i++) {
            address p = peers[i];
            uint256 f = contractGenetics[p].fitnessScore;
            if (f > bestFitness) { bestFitness = f; mate = p; }
        }

        // Crossover + Mutation over operational Traits
        Types.Traits memory t = pd.traits;
        // PRNG source (sufficient for testnets/demo)
        uint256 r = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, parent, mate)));
        // single-point crossover style between parent and mate for feeBps & guard
        Types.PoolDescriptor memory md = registry.getPool(mate);
        uint16 fee = (((r & 1) == 1)) ? t.feeBps : md.traits.feeBps;
        uint16 guard = ((((r >> 1) & 1) == 1)) ? t.slippageGuardBps : md.traits.slippageGuardBps;
        uint16 cool = ((((r >> 2) & 1) == 1)) ? t.cooldownBlocks : md.traits.cooldownBlocks;
        bool mev = ((((r >> 3) & 1) == 1)) ? t.mevProtection : md.traits.mevProtection;

        // bounded mutation +-5 bps fee, +-50 bps guard, +-1 block cooldown
        int256 mf = int256(int8(int256((r >> 8) % 11))) - 5; // [-5..+5]
        int256 mg = int256(int16(int256((r >> 16) % 101))) - 50; // [-50..+50]
        int256 mc = int256(int8(int256((r >> 24) % 3))) - 1; // [-1..+1]

        int256 newFee = int256(uint256(fee)) + mf;
        int256 newGuard = int256(uint256(guard)) + mg;
        int256 newCool = int256(uint256(cool)) + mc;

        uint16 feeBps = uint16(_clamp(newFee, 1, 1000));
        uint16 slippageGuardBps = uint16(_clamp(newGuard, 0, 2000));
        uint16 cooldownBlocks = uint16(_clamp(newCool, 0, 1000));

        Types.Traits memory childTraits = Types.Traits({
            feeBps: feeBps,
            slippageGuardBps: slippageGuardBps,
            cooldownBlocks: cooldownBlocks,
            mevProtection: mev
        });

        // Create child via PoolFactory; owner becomes this contract, transfer to tx.origin-like desired owner (use current owner)
        child = factory.createPool(pd.token0, pd.token1, parent, childTraits);
        // Transfer ownership to contract owner (operator) so UI/scripts can manage liquidity
        IEvolvablePoolLite(child).transferOwnership(owner());

        // Initialize DNA for child
        ContractDNA memory dna;
        dna.generation = uint256(pd.generation) + 1;
        dna.parentHash = keccak256(abi.encodePacked(parent));
        if (targetTraits.length == 3) {
            dna.traits = [targetTraits[0], targetTraits[1], targetTraits[2]];
        } else {
            // inherit from best parent
            dna.traits = contractGenetics[mate].traits;
        }
        dna.fitnessScore = 0; // to be updated by oracle after live data
        dna.birthBlock = block.number;
        contractGenetics[child] = dna;
        generationContracts[dna.generation].push(child);
        evolutionHistory[parent].push(EvolutionEvent({ parent: parent, child: child, improvement: 0, timestamp: block.timestamp }));

        emit ContractEvolved(parent, child, dna.generation, 0);
    }

    /// @notice Encode DNA and descriptor for migration; off-chain agent recreates on target chain using its PoolFactory.
    function migrateToChain(address contractAddr, uint256 targetChainId) external onlyOwner returns (bytes memory dnaBlob) {
        Types.PoolDescriptor memory d = registry.getPool(contractAddr);
        if (d.token0 == address(0)) revert UnknownPool();
        _ensureSeed(contractAddr);
        ContractDNA memory dna = contractGenetics[contractAddr];
        // Compact encoding: (version=1, generation, parentHash, dnaTraits[3], fitness, birthBlock, token0, token1, poolTraits)
        dnaBlob = abi.encode(
            uint8(1),
            dna.generation,
            dna.parentHash,
            dna.traits,
            dna.fitnessScore,
            dna.birthBlock,
            d.token0,
            d.token1,
            d.traits
        );
        emit CrossChainMigration(contractAddr, block.chainid, targetChainId, dnaBlob);
    }

    // Helper
    function _clamp(int256 v, int256 lo, int256 hi) internal pure returns (int256) {
        if (v < lo) return lo;
        if (v > hi) return hi;
        return v;
    }
}
