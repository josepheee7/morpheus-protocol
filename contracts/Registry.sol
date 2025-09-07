// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Types} from "./Types.sol";

/// @title Registry for Evolvable Pools
/// @notice Tracks pools, lineage, and exposes read APIs for frontends and off-chain orchestrator
contract Registry is Ownable {
    using Types for Types.Traits;

    address public factory; // allowed creator

    mapping(address => Types.PoolDescriptor) private _pools; // pool => descriptor
    address[] private _allPools;
    mapping(address => address[]) private _children; // parent => children list

    event FactoryUpdated(address indexed factory);
    event PoolRegistered(address indexed pool, address indexed parent, uint32 generation, address token0, address token1, Types.Traits traits);

    error NotFactory();

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
        emit FactoryUpdated(_factory);
    }

    function onPoolCreated(
        address pool,
        address token0,
        address token1,
        address parent,
        uint32 generation,
        Types.Traits calldata traits
    ) external onlyFactory {
        Types.PoolDescriptor memory d = Types.PoolDescriptor({
            token0: token0,
            token1: token1,
            parent: parent,
            generation: generation,
            traits: traits
        });
        _pools[pool] = d;
        _allPools.push(pool);
        if (parent != address(0)) {
            _children[parent].push(pool);
        }
        emit PoolRegistered(pool, parent, generation, token0, token1, traits);
    }

    // Views
    function getPool(address pool) external view returns (Types.PoolDescriptor memory) {
        return _pools[pool];
    }

    function getChildren(address parent) external view returns (address[] memory) {
        return _children[parent];
    }

    function allPools() external view returns (address[] memory) {
        return _allPools;
    }

    function poolCount() external view returns (uint256) {
        return _allPools.length;
    }
}
