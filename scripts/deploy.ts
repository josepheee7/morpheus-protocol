import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import "dotenv/config";

const DEPLOY_FILE = path.resolve(__dirname, "../deployments.json");
const MULTI_FILE = path.resolve(__dirname, "../deployments.multi.json");
const FRONTEND_PUBLIC = path.resolve(__dirname, "../frontend/public");
const FRONTEND_DEPLOY = path.resolve(FRONTEND_PUBLIC, "deployments.json");

function save(json: any) {
  fs.writeFileSync(DEPLOY_FILE, JSON.stringify(json, null, 2));
}

function upsertMulti(net: string, data: any) {
  let agg: any = {};
  if (fs.existsSync(MULTI_FILE)) {
    try {
      agg = JSON.parse(fs.readFileSync(MULTI_FILE, "utf-8"));
    } catch {}
  }
  const prev = agg[net] || {};
  const pools: string[] = Array.from(new Set([...(prev.pools || []), data.genesisPool].filter(Boolean)));
  agg[net] = { ...prev, ...data, pools };
  agg.updatedAt = Date.now();
  fs.writeFileSync(MULTI_FILE, JSON.stringify(agg, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address} (network: ${network.name})`);

  // Deploy test tokens
  const TestToken = await ethers.getContractFactory("TestToken");
  const token0 = await TestToken.deploy("Test Token A", "TTA", deployer.address);
  await token0.waitForDeployment();
  const token1 = await TestToken.deploy("Test Token B", "TTB", deployer.address);
  await token1.waitForDeployment();
  console.log("token0:", await token0.getAddress());
  console.log("token1:", await token1.getAddress());

  // Mint supply for deployer
  const mintAmt = ethers.parseUnits("1000000", 18);
  await (await token0.mint(deployer.address, mintAmt)).wait();
  await (await token1.mint(deployer.address, mintAmt)).wait();

  // Deploy implementation
  const EvolvablePool = await ethers.getContractFactory("EvolvablePool");
  const impl = await EvolvablePool.deploy();
  await impl.waitForDeployment();
  console.log("EvolvablePool impl:", await impl.getAddress());

  // Deploy registry
  const Registry = await ethers.getContractFactory("Registry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log("Registry:", await registry.getAddress());

  // Deploy factory
  const PoolFactory = await ethers.getContractFactory("PoolFactory");
  const factory = await PoolFactory.deploy(await impl.getAddress(), await registry.getAddress(), deployer.address);
  await factory.waitForDeployment();
  console.log("Factory:", await factory.getAddress());

  // Set factory on registry
  await (await registry.setFactory(await factory.getAddress())).wait();

  // Deploy MorpheusFactory (GA orchestrator)
  const MorpheusFactory = await ethers.getContractFactory("MorpheusFactory");
  const morpheus = await MorpheusFactory.deploy(await factory.getAddress(), await registry.getAddress(), deployer.address);
  await morpheus.waitForDeployment();
  console.log("MorpheusFactory:", await morpheus.getAddress());
  await (await morpheus.setFitnessOracle(deployer.address)).wait();

  // Create genesis pool traits
  const traits = {
    feeBps: 30,               // 0.30%
    slippageGuardBps: 250,    // 2.5% max impact
    cooldownBlocks: 0,        // 0 for smoother testing/demo
    mevProtection: true,
  };

  // Create pool
  const tx = await factory.createPool(
    await token0.getAddress(),
    await token1.getAddress(),
    ethers.ZeroAddress,
    traits
  );
  const rc = await tx.wait();
  const ev = rc?.logs
    .map((l: any) => {
      try { return factory.interface.parseLog(l); } catch { return null; }
    })
    .find((e: any) => e && e.name === "PoolCreated");
  if (!ev) throw new Error("PoolCreated event not found");
  const poolAddr = ev!.args[0] as string;
  console.log("Genesis pool:", poolAddr);

  // Seed liquidity (owner is deployer)
  const pool = await ethers.getContractAt("EvolvablePool", poolAddr);
  const seedAmt = ethers.parseUnits("100000", 18);
  await (await token0.approve(poolAddr, seedAmt)).wait();
  await (await token1.approve(poolAddr, seedAmt)).wait();
  await (await pool.addLiquidity(seedAmt, seedAmt)).wait();

  // Seed DNA for genesis pool
  await (await morpheus.seedDNA(poolAddr)).wait();

  const deployments = {
    network: network.name,
    deployer: deployer.address,
    token0: await token0.getAddress(),
    token1: await token1.getAddress(),
    evolvablePoolImplementation: await impl.getAddress(),
    registry: await registry.getAddress(),
    factory: await factory.getAddress(),
    morpheusFactory: await morpheus.getAddress(),
    genesisPool: poolAddr,
    traits,
    timestamp: Date.now(),
  };
  save(deployments);
  console.log("Saved deployments to", DEPLOY_FILE);
  upsertMulti(network.name, deployments);
  console.log("Updated multi-network deployments at", MULTI_FILE);

  // Mirror to frontend/public for auto-load in the UI
  try {
    fs.mkdirSync(FRONTEND_PUBLIC, { recursive: true });
    fs.writeFileSync(FRONTEND_DEPLOY, JSON.stringify(deployments, null, 2));
    console.log("Copied deployments to", FRONTEND_DEPLOY);
  } catch (e) {
    console.warn("Warning: failed to copy deployments.json to frontend/public:", (e as any)?.message || e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
