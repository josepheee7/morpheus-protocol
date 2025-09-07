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
  const [operator] = await ethers.getSigners();
  console.log(`Operator: ${operator.address} on ${network.name}`);

  const morpheus = await ethers.getContractAt("MorpheusFactory", dep.morpheusFactory);

  // Example: report a fitness tuple and evolve one generation using GA
  const target = process.env.TARGET_POOL || dep.genesisPool;
  const gasEff = Number(process.env.FIT_GAS || 8000);      // 0..10000 bps
  const profitability = Number(process.env.FIT_PROFIT || 7000);
  const userSat = Number(process.env.FIT_USER || 7500);

  console.log("Reporting fitness:", { gasEff, profitability, userSat });
  await (await morpheus.reportFitness(target, gasEff, profitability, userSat)).wait();

  // Optionally bias child DNA components via TARGET_TRAITS env (comma-separated 3 numbers)
  let tgt: number[] = [];
  const envT = process.env.TARGET_TRAITS;
  if (envT) {
    const parts = envT.split(",").map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    if (parts.length === 3) tgt = parts;
  }

  console.log("Evolving child from:", target, " with targetTraits:", tgt);
  const tx = await morpheus.evolveContract(target, tgt);
  const rc = await tx.wait();
  console.log("Evolved. Tx:", rc?.hash);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
