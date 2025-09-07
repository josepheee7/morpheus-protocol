import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import "dotenv/config";

const DEPLOY_FILE = path.resolve(__dirname, "../deployments.json");

function load(): any {
  if (!fs.existsSync(DEPLOY_FILE)) throw new Error(`deployments.json not found. Run npm run deploy first.`);
  return JSON.parse(fs.readFileSync(DEPLOY_FILE, "utf-8"));
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

async function main() {
  const dep = load();
  const [operator] = await ethers.getSigners();
  console.log(`Operator: ${operator.address} on ${network.name}`);

  const pool = await ethers.getContractAt("EvolvablePool", dep.genesisPool);
  const factory = await ethers.getContractAt("PoolFactory", dep.factory);
  const registry = await ethers.getContractAt("Registry", dep.registry);

  const token0 = await ethers.getContractAt("TestToken", dep.token0);
  const token1 = await ethers.getContractAt("TestToken", dep.token1);

  // Read metrics
  const avgImpact = await pool.getAveragePriceImpactBps();
  const numSwaps = await pool.numSwaps();
  const totalFees0 = await pool.totalFees0();
  const totalFees1 = await pool.totalFees1();

  console.log("Parent metrics:", {
    avgImpactBps: avgImpact.toString(),
    numSwaps: numSwaps.toString(),
    fees0: totalFees0.toString(),
    fees1: totalFees1.toString(),
  });

  // Load parent traits from deployments.json as baseline
  const parentTraits = dep.traits as { feeBps: number; slippageGuardBps: number; cooldownBlocks: number; mevProtection: boolean };

  // Simple heuristic mutation
  let feeBps = parentTraits.feeBps;
  const avg = Number(avgImpact);
  const swaps = Number(numSwaps);

  if (avg > parentTraits.slippageGuardBps * 0.8) {
    // price impact too high -> reduce fee slightly
    feeBps = feeBps - 5;
  } else if (swaps > 15) {
    // high demand -> try slightly higher fee to capture value
    feeBps = feeBps + 5;
  }
  feeBps = clamp(feeBps, 5, 300); // cap at 3%

  // Set guard around observed impact
  let slippageGuardBps = clamp(Math.floor(avg + 50), 50, 800);

  const cooldownBlocks = 0; // keep demo smooth
  const mevProtection = true;

  const traits = { feeBps, slippageGuardBps, cooldownBlocks, mevProtection };
  console.log("Child traits:", traits);

  // Create child pool
  const tx = await factory.createPool(dep.token0, dep.token1, dep.genesisPool, traits);
  const rc = await tx.wait();
  const ev = rc?.logs
    .map((l: any) => { try { return factory.interface.parseLog(l); } catch { return null; } })
    .find((e: any) => e && e.name === "PoolCreated");
  if (!ev) throw new Error("PoolCreated event not found");
  const childAddr = ev!.args[0] as string;
  console.log("Child pool:", childAddr);

  // Seed liquidity in child
  const child = await ethers.getContractAt("EvolvablePool", childAddr);
  const seedAmt = ethers.parseUnits("50000", 18);
  await (await token0.approve(childAddr, seedAmt)).wait();
  await (await token1.approve(childAddr, seedAmt)).wait();
  await (await child.addLiquidity(seedAmt, seedAmt)).wait();

  // Update deployments file with lastChild
  const updated = { ...dep, lastChild: childAddr, lastChildTraits: traits, updatedAt: Date.now() };
  fs.writeFileSync(DEPLOY_FILE, JSON.stringify(updated, null, 2));
  console.log("Updated deployments.json with child pool");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
