import { expect } from "chai";
import { ethers } from "hardhat";
import { AbiCoder, ZeroAddress } from "ethers";

describe("MorpheusFactory", function () {
  it("reports fitness, evolves a child, and migrates DNA", async function () {
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

    // MorpheusFactory
    const Morpheus = await ethers.getContractFactory("MorpheusFactory");
    const morpheus = await Morpheus.deploy(await factory.getAddress(), await registry.getAddress(), owner.address);
    await morpheus.waitForDeployment();

    const initTraits = { feeBps: 30, slippageGuardBps: 500, cooldownBlocks: 0, mevProtection: true };

    // Create pool
    const tx = await factory.createPool(await token0.getAddress(), await token1.getAddress(), ZeroAddress, initTraits);
    const rc = await tx.wait();
    const ev = rc?.logs.map((l: any) => { try { return factory.interface.parseLog(l); } catch { return null; } }).find((e: any) => e && e.name === "PoolCreated");
    expect(ev).to.not.be.undefined;
    const poolAddr = ev!.args.pool as string;

    // Seed DNA and report fitness (owner acts as oracle)
    await (await morpheus.seedDNA(poolAddr)).wait();
    await (await morpheus.reportFitness(poolAddr, 8000, 7000, 7500)).wait();
    const dna = await morpheus.contractGenetics(poolAddr);
    expect(Number(dna.fitnessScore)).to.be.greaterThan(0);

    // Evolve
    const txE = await morpheus.evolveContract(poolAddr, [8200, 7200, 7600]);
    const rcE = await txE.wait();
    const evE = rcE?.logs.map((l: any) => { try { return morpheus.interface.parseLog(l); } catch { return null; } }).find((e: any) => e && e.name === "ContractEvolved");
    expect(evE).to.not.be.undefined;
    const child = evE!.args.child as string;
    expect(child).to.be.properAddress;

    const parentDesc = await registry.getPool(poolAddr);
    const childDesc = await registry.getPool(child);
    expect(childDesc.parent).to.equal(poolAddr);
    expect(childDesc.generation).to.equal(parentDesc.generation + 1n);

    // Migrate DNA (encode) and verify decoded fields
    const blob: string = await morpheus.migrateToChain.staticCall(child, 84532);
    const coder = AbiCoder.defaultAbiCoder();
    const [ver, generation, parentHash, dnaTraits, fitness, birthBlock, decT0, decT1, decTraits] = coder.decode([
      "uint8","uint256","bytes32","uint256[3]","uint256","uint256","address","address","tuple(uint16 feeBps, uint16 slippageGuardBps, uint16 cooldownBlocks, bool mevProtection)"
    ], blob);
    expect(Number(ver)).to.equal(1);
    expect(decT0).to.equal(await token0.getAddress());
    expect(decT1).to.equal(await token1.getAddress());
    expect(decTraits.feeBps).to.be.a("bigint");
  });
});
