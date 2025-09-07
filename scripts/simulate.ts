import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import "dotenv/config";

const DEPLOY_FILE = path.resolve(__dirname, "../deployments.json");

function load(): any {
  if (!fs.existsSync(DEPLOY_FILE)) throw new Error(`deployments.json not found. Run npm run deploy first.`);
  return JSON.parse(fs.readFileSync(DEPLOY_FILE, "utf-8"));
}

async function main() {
  const dep = load();
  const [sender] = await ethers.getSigners();
  console.log(`Simulator: ${sender.address} on ${network.name}`);

  const token0 = await ethers.getContractAt("TestToken", dep.token0);
  const token1 = await ethers.getContractAt("TestToken", dep.token1);
  const pool = await ethers.getContractAt("EvolvablePool", dep.genesisPool);

  const amountSmall = ethers.parseUnits("100", 18); // small to keep price impact low

  // Approvals
  await (await token0.approve(dep.genesisPool, amountSmall * 1000n)).wait();
  await (await token1.approve(dep.genesisPool, amountSmall * 1000n)).wait();

  // Alternate swaps
  for (let i = 0; i < 25; i++) {
    const zeroForOne = i % 2 === 0;
    const tokenIn = zeroForOne ? dep.token0 : dep.token1;
    const tx = await pool.swapExactInput(tokenIn, amountSmall, 0, sender.address);
    const rc = await tx.wait();
    const ev = rc?.logs
      .map((l: any) => { try { return pool.interface.parseLog(l); } catch { return null; } })
      .find((e: any) => e && e.name === "Swap");
    if (ev) {
      console.log(`Swap ${i}: in=${ev.args.amountIn.toString()} out=${ev.args.amountOut.toString()} impactBps=${ev.args.priceImpactBps}`);
    }
  }

  const avgImpact = await pool.getAveragePriceImpactBps();
  const numSwaps = await pool.numSwaps();
  const [r0, r1] = await pool.getReserves();
  const totalFees0 = await pool.totalFees0();
  const totalFees1 = await pool.totalFees1();

  console.log("\n=== Simulation Summary ===");
  console.log("numSwaps:", numSwaps.toString());
  console.log("avgImpactBps:", avgImpact.toString());
  console.log("reserves:", r0.toString(), r1.toString());
  console.log("fees0:", totalFees0.toString(), "fees1:", totalFees1.toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
