import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Decode Morpheus DNA blob and recreate pool via PoolFactory on target chain

async function main() {
  const file = process.env.DNA_FILE;
  if (!file) throw new Error(`Provide DNA_FILE env path to .hex`);
  const data = fs.readFileSync(path.resolve(file), "utf-8").trim();
  const bytes = data.startsWith("0x") ? data : ("0x" + data);

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const [ver, generation, parentHash, dnaTraits, fitness, birthBlock, token0, token1, traits] = coder.decode([
    "uint8","uint256","bytes32","uint256[3]","uint256","uint256","address","address","tuple(uint16 feeBps, uint16 slippageGuardBps, uint16 cooldownBlocks, bool mevProtection)"
  ], bytes);

  console.log("Decoded DNA:", { ver, generation: generation.toString(), parentHash, token0, token1, traits });

  // Use PoolFactory on this network
  const factoryAddr = process.env.FACTORY;
  if (!factoryAddr) throw new Error(`Provide FACTORY address on target network`);
  const parent = process.env.PARENT || ethers.ZeroAddress; // optional linkage

  const factory = await ethers.getContractAt("PoolFactory", factoryAddr);
  const tx = await factory.createPool(token0, token1, parent, traits);
  const rc = await tx.wait();

  // Parse PoolCreated event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev = rc?.logs.map((l: any) => { try { return factory.interface.parseLog(l) } catch { return null } }).find((e: any) => e && e.name === 'PoolCreated');
  if (ev) {
    console.log(`Recreated pool: ${ev.args.pool}`);
  } else {
    console.log(`Pool recreated. Tx: ${rc?.hash}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
