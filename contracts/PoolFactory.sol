// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EvolvablePool} from "./EvolvablePool.sol";
import {Registry} from "./Registry.sol";
import {Types} from "./Types.sol";

/// @title PoolFactory
/// @notice Deploys minimal-proxy clones of EvolvablePool and registers them in Registry
contract PoolFactory is Ownable {
    using Types for Types.Traits;

    address public immutable implementation;
    Registry public immutable registry;

    event PoolCreated(address indexed pool, address indexed token0, address indexed token1, address parent, uint32 generation, address owner);

    constructor(address _implementation, Registry _registry, address initialOwner) Ownable(initialOwner) {
        implementation = _implementation;
        registry = _registry;
    }

    function createPool(
        address token0,
        address token1,
        address parent,
        Types.Traits calldata traits
    ) external returns (address pool) {
        pool = Clones.clone(implementation);
        uint32 generation = 0;
        if (parent != address(0)) {
            Types.PoolDescriptor memory pd = registry.getPool(parent);
            generation = pd.generation + 1;
        }
        EvolvablePool(pool).initialize(msg.sender, token0, token1, parent, generation, traits);
        registry.onPoolCreated(pool, token0, token1, parent, generation, traits);
        emit PoolCreated(pool, token0, token1, parent, generation, msg.sender);
    }
}
