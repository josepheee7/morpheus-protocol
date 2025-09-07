import { expect } from "chai";
import { ethers } from "hardhat";

describe("Morpheus Protocol MVP", function () {
  it("deploys, swaps, and evolves a child pool", async function () {
    const [owner, trader] = await ethers.getSigners();

    // Deploy tokens
    const TestToken = await ethers.getContractFactory("TestToken");
    const token0: any = await TestToken.deploy("Token0", "TK0", owner.address);
    await token0.waitForDeployment();
    const token1: any = await TestToken.deploy("Token1", "TK1", owner.address);
    await token1.waitForDeployment();

    // Mint
    const supply = ethers.parseUnits("1000000", 18);
    await (await token0.mint(owner.address, supply)).wait();
    await (await token1.mint(owner.address, supply)).wait();
    await (await token0.mint(trader.address, supply)).wait();
    await (await token1.mint(trader.address, supply)).wait();

    // Implementation, registry, factory
    const EvolvablePool = await ethers.getContractFactory("EvolvablePool");
    const impl = await EvolvablePool.deploy();
    await impl.waitForDeployment();

    const Registry = await ethers.getContractFactory("Registry");
    const registry = await Registry.deploy(owner.address);
    await registry.waitForDeployment();

    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    const factory = await PoolFactory.deploy(await impl.getAddress(), await registry.getAddress(), owner.address);
    await factory.waitForDeployment();

    await (await registry.setFactory(await factory.getAddress())).wait();

    const initTraits = { feeBps: 30, slippageGuardBps: 500, cooldownBlocks: 0, mevProtection: true };

    // Create pool
    const tx = await factory.createPool(await token0.getAddress(), await token1.getAddress(), ethers.ZeroAddress, initTraits);
    const rc = await tx.wait();
    const ev = rc?.logs.map((l: any) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e: any) => e && e.name === "PoolCreated");
    expect(ev).to.not.be.undefined;
    const poolAddr = ev!.args[0] as string;

    const pool: any = await ethers.getContractAt("EvolvablePool", poolAddr);

    // Seed liquidity by owner
    const seed = ethers.parseUnits("100000", 18);
    await (await token0.approve(poolAddr, seed)).wait();
    await (await token1.approve(poolAddr, seed)).wait();
    await (await pool.addLiquidity(seed, seed)).wait();

    // Trader swaps
    const small = ethers.parseUnits("1000", 18);
    await (await token0.connect(trader).approve(poolAddr, small)).wait();
    await (await token1.connect(trader).approve(poolAddr, small)).wait();

    for (let i = 0; i < 5; i++) {
      await (await pool.connect(trader).swapExactInput(await token0.getAddress(), small, 0, trader.address)).wait();
      await (await pool.connect(trader).swapExactInput(await token1.getAddress(), small, 0, trader.address)).wait();
    }

    const numSwaps = await pool.numSwaps();
    expect(Number(numSwaps)).to.be.greaterThan(0);

    // Evolve: create child with slightly different fee
    const childTraits = { ...initTraits, feeBps: 25 };
    const tx2 = await factory.createPool(await token0.getAddress(), await token1.getAddress(), poolAddr, childTraits);
    const rc2 = await tx2.wait();
    const ev2 = rc2?.logs.map((l: any) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e: any) => e && e.name === "PoolCreated");
    expect(ev2).to.not.be.undefined;
    const childAddr = ev2!.args[0] as string;

    // Registry lineage
    const parentDesc = await registry.getPool(poolAddr);
    const childDesc = await registry.getPool(childAddr);

    expect(childDesc.parent).to.equal(poolAddr);
    expect(childDesc.generation).to.equal(parentDesc.generation + 1n);

    // Trait caps enforced
    await expect(
      factory.createPool(await token0.getAddress(), await token1.getAddress(), ethers.ZeroAddress, { ...initTraits, feeBps: 5000 })
    ).to.be.revertedWith("FEE_BPS_MAX");
  });
});
