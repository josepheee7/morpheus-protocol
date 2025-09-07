import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const DEPLOY_FILE = path.resolve(__dirname, "../deployments.json");

function load(): any {
  if (!fs.existsSync(DEPLOY_FILE)) throw new Error(`deployments.json not found`);
  return JSON.parse(fs.readFileSync(DEPLOY_FILE, "utf-8"));
}

async function main() {
  const dep = load();
  const morpheusAddr = dep.morpheusFactory;
  if (!morpheusAddr) throw new Error(`morpheusFactory missing in deployments.json`);

  const pool = process.env.POOL || dep.genesisPool;
  const targetChain = Number(process.env.TARGET_CHAIN || 84532); // Base Sepolia default

  const morpheus = await ethers.getContractAt("MorpheusFactory", morpheusAddr);
  const dna: string = await morpheus.migrateToChain(pool, targetChain);

  const outDir = path.resolve(__dirname, "../out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outFile = path.join(outDir, `dna_${pool}_${targetChain}.hex`);
  fs.writeFileSync(outFile, dna);
  console.log("DNA exported:", outFile);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
