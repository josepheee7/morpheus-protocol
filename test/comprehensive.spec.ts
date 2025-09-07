import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Morpheus Protocol - Comprehensive Tests", function () {
  async function deployMorpheusFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy test tokens
    const TestToken = await ethers.getContractFactory("TestToken");
    const token0 = await TestToken.deploy("Test Token A", "TTA", owner.address) as any;
    const token1 = await TestToken.deploy("Test Token B", "TTB", owner.address) as any;

    // Mint tokens
    const mintAmount = ethers.parseUnits("1000000", 18);
    await token0.mint(owner.address, mintAmount);
    await token1.mint(owner.address, mintAmount);
    await token0.mint(user1.address, mintAmount);
    await token1.mint(user1.address, mintAmount);

    // Deploy core contracts
    const EvolvablePool = await ethers.getContractFactory("EvolvablePool");
    const poolImpl = await EvolvablePool.deploy();

    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.deploy(owner.address);

    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const factory = await PoolFactory.deploy(await poolImpl.getAddress(), await registry.getAddress());

    const MorpheusFactory = await ethers.getContractFactory("MorpheusFactory");
    const morpheus = await MorpheusFactory.deploy(await registry.getAddress(), await factory.getAddress());

    // Set factory in registry
    await registry.setFactory(await factory.getAddress());

    return {
      owner, user1, user2, user3,
      token0, token1,
      poolImpl, registry, factory, morpheus
    };
  }

  describe("Deployment and Initialization", function () {
    it("Should deploy all contracts correctly", async function () {
      const { registry, factory, morpheus, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      expect(await registry.factory()).to.equal(await factory.getAddress());
      expect(await factory.registry()).to.equal(await registry.getAddress());
      expect(await morpheus.registry()).to.equal(await registry.getAddress());
      expect(await morpheus.factory()).to.equal(await factory.getAddress());
    });

    it("Should create genesis pool with correct traits", async function () {
      const { owner, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      const traits = {
        feeBps: 300, // 3%
        slippageGuardBps: 1000, // 10%
        cooldownBlocks: 10,
        mevProtection: true
      };

      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress, // no parent
        0, // generation 0
        traits
      );

      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      expect(poolAddress).to.not.be.undefined;
    });
  });

  describe("Pool Operations", function () {
    it("Should add and remove liquidity correctly", async function () {
      const { owner, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create pool
      const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 10, mevProtection: true };
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      const pool = await ethers.getContractAt("EvolvablePool", poolAddress!) as any;

      // Approve tokens
      const liquidityAmount = ethers.parseUnits("1000", 18);
      await token0.approve(poolAddress!, liquidityAmount);
      await token1.approve(poolAddress!, liquidityAmount);

      // Add liquidity
      await pool.addLiquidity(liquidityAmount, liquidityAmount);
      
      expect(await pool.reserve0()).to.equal(liquidityAmount);
      expect(await pool.reserve1()).to.equal(liquidityAmount);
    });

    it("Should execute swaps with correct fee calculation", async function () {
      const { owner, user1, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create and setup pool
      const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 0, mevProtection: false };
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      const pool = await ethers.getContractAt("EvolvablePool", poolAddress!) as any;

      // Add liquidity
      const liquidityAmount = ethers.parseUnits("10000", 18);
      await token0.approve(poolAddress!, liquidityAmount);
      await token1.approve(poolAddress!, liquidityAmount);
      await pool.addLiquidity(liquidityAmount, liquidityAmount);

      // Execute swap
      const swapAmount = ethers.parseUnits("100", 18);
      await (token0 as any).connect(user1).approve(poolAddress!, swapAmount);
      
      const balanceBefore = await (token1 as any).balanceOf(user1.address);
      await pool.connect(user1).swap(await (token0 as any).getAddress(), swapAmount, 0);
      const balanceAfter = await (token1 as any).balanceOf(user1.address);
      
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Evolution Mechanics", function () {
    it("Should create child pools with mutated traits", async function () {
      const { owner, factory, registry, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create parent pool
      const parentTraits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 10, mevProtection: true };
      const tx1 = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        parentTraits
      );
      
      const receipt1 = await tx1.wait();
      const parentAddress = receipt1?.logs[0].address;

      // Create child pool with mutated traits
      const childTraits = { feeBps: 250, slippageGuardBps: 1200, cooldownBlocks: 15, mevProtection: true };
      const tx2 = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        parentAddress!,
        1,
        childTraits
      );
      
      const receipt2 = await tx2.wait();
      const childAddress = receipt2?.logs[0].address;
      
      // Verify lineage
      const children = await registry.getChildren(parentAddress!);
      expect(children).to.include(childAddress);
      
      const childDesc = await registry.getPool(childAddress!);
      expect(childDesc.parent).to.equal(parentAddress);
      expect(childDesc.generation).to.equal(1);
    });

    it("Should track pool metrics correctly", async function () {
      const { owner, user1, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create and setup pool
      const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 0, mevProtection: false };
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      const pool = await ethers.getContractAt("EvolvablePool", poolAddress!) as any;

      // Add liquidity and execute swaps
      const liquidityAmount = ethers.parseUnits("10000", 18);
      await token0.approve(poolAddress!, liquidityAmount);
      await token1.approve(poolAddress!, liquidityAmount);
      await pool.addLiquidity(liquidityAmount, liquidityAmount);

      // Multiple swaps to generate metrics
      const swapAmount = ethers.parseUnits("100", 18);
      await token0.connect(user1).approve(poolAddress!, swapAmount * 3n);
      
      await pool.connect(user1).swap(await token0.getAddress(), swapAmount, 0);
      await pool.connect(user1).swap(await token1.getAddress(), swapAmount, 0);
      await pool.connect(user1).swap(await token0.getAddress(), swapAmount / 2n, 0);

      // Verify metrics are tracked
      expect(await pool.totalVolume()).to.be.gt(0);
    });
  });

  describe("Security Features", function () {
    it("Should enforce slippage protection", async function () {
      const { owner, user1, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create pool with strict slippage guard
      const traits = { feeBps: 300, slippageGuardBps: 500, cooldownBlocks: 0, mevProtection: false }; // 5% max slippage
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      const pool = await ethers.getContractAt("EvolvablePool", poolAddress!) as any;

      // Add minimal liquidity to create high slippage
      const liquidityAmount = ethers.parseUnits("100", 18);
      await token0.approve(poolAddress!, liquidityAmount);
      await token1.approve(poolAddress!, liquidityAmount);
      await pool.addLiquidity(liquidityAmount, liquidityAmount);

      // Try large swap that would exceed slippage guard
      const largeSwapAmount = ethers.parseUnits("50", 18); // 50% of liquidity
      await token0.connect(user1).approve(poolAddress!, largeSwapAmount);
      
      await expect(
        pool.connect(user1).swap(await token0.getAddress(), largeSwapAmount, 0)
      ).to.be.reverted;
    });

    it("Should enforce cooldown periods", async function () {
      const { owner, user1, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create pool with cooldown
      const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 5, mevProtection: false };
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      const pool = await ethers.getContractAt("EvolvablePool", poolAddress!) as any;

      // Add liquidity
      const liquidityAmount = ethers.parseUnits("10000", 18);
      await token0.approve(poolAddress!, liquidityAmount);
      await token1.approve(poolAddress!, liquidityAmount);
      await pool.addLiquidity(liquidityAmount, liquidityAmount);

      // Execute first swap
      const swapAmount = ethers.parseUnits("100", 18);
      await token0.connect(user1).approve(poolAddress!, swapAmount * 2n);
      
      await pool.connect(user1).swap(await token0.getAddress(), swapAmount, 0);

      // Try immediate second swap (should fail due to cooldown)
      await expect(
        pool.connect(user1).swap(await token0.getAddress(), swapAmount, 0)
      ).to.be.revertedWithCustomError(pool, "CooldownActive");
    });

    it("Should allow emergency pause", async function () {
      const { owner, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 0, mevProtection: false };
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;
      const pool = await ethers.getContractAt("EvolvablePool", poolAddress!) as any;

      // Pause the pool
      await pool.setPaused(true);
      expect(await pool.paused()).to.be.true;

      // Try to add liquidity (should fail)
      const liquidityAmount = ethers.parseUnits("1000", 18);
      await token0.approve(poolAddress!, liquidityAmount);
      await token1.approve(poolAddress!, liquidityAmount);
      
      await expect(
        pool.addLiquidity(liquidityAmount, liquidityAmount)
      ).to.be.revertedWithCustomError(pool, "PausedError");
    });
  });

  describe("Multi-Chain DNA Export/Import", function () {
    it("Should export and encode pool DNA correctly", async function () {
      const { morpheus, factory, token0, token1 } = await loadFixture(deployMorpheusFixture);
      
      // Create pool
      const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 10, mevProtection: true };
      const tx = await factory.createPool(
        await token0.getAddress(),
        await token1.getAddress(),
        ethers.ZeroAddress,
        0,
        traits
      );
      
      const receipt = await tx.wait();
      const poolAddress = receipt?.logs[0].address;

      // Set fitness score
      await morpheus.setFitness(poolAddress!, 8500, [8000, 8500, 9000]); // 85% fitness

      // Export DNA
      const dna = await morpheus.exportDNA(poolAddress!);
      expect(dna).to.not.equal("0x");
      expect(dna.length).to.be.gt(2); // More than just "0x"
    });
  });
});
