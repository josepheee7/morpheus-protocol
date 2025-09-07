// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Types {
    struct Traits {
        uint16 feeBps;            // 0 - 1000 (0% - 10%)
        uint16 slippageGuardBps;  // 0 - 2000 (0% - 20%)
        uint16 cooldownBlocks;    // 0 - 1000 blocks
        bool mevProtection;       // simple same-block guard
    }

    struct PoolDescriptor {
        address token0;
        address token1;
        address parent;
        uint32 generation;
        Traits traits;
    }
}
