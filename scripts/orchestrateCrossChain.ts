import { JsonRpcProvider, Wallet, Contract, AbiCoder, ZeroAddress } from "ethers";
import fs from "fs";
import path from "path";
import "dotenv/config";

const MULTI_FILE = path.resolve(__dirname, "../deployments.multi.json");
const OUT_DIR = path.resolve(__dirname, "../out");

// Minimal ABIs
const MorpheusABI = [
  { inputs: [{ internalType: "address", name: "pool", type: "address" }, { internalType: "uint256", name: "gasEfficiency", type: "uint256" }, { internalType: "uint256", name: "profitability", type: "uint256" }, { internalType: "uint256", name: "userSatisfaction", type: "uint256" }], name: "reportFitness", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "parent", type: "address" }, { internalType: "uint256[]", name: "targetTraits", type: "uint256[]" }], name: "evolveContract", outputs: [{ internalType: "address", name: "child", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "contractAddr", type: "address" }, { internalType: "uint256", name: "targetChainId", type: "uint256" }], name: "migrateToChain", outputs: [{ internalType: "bytes", name: "dnaBlob", type: "bytes" }], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "parent", type: "address" }, { indexed: true, internalType: "address", name: "child", type: "address" }, { indexed: false, internalType: "uint256", name: "generation", type: "uint256" }, { indexed: false, internalType: "uint256", name: "fitnessImprovement", type: "uint256" }], name: "ContractEvolved", type: "event" }
];

const FactoryABI = [
  { inputs: [{ internalType: "address", name: "token0", type: "address" }, { internalType: "address", name: "token1", type: "address" }, { internalType: "address", name: "parent", type: "address" }, { components: [{ internalType: "uint16", name: "feeBps", type: "uint16" }, { internalType: "uint16", name: "slippageGuardBps", type: "uint16" }, { internalType: "uint16", name: "cooldownBlocks", type: "uint16" }, { internalType: "bool", name: "mevProtection", type: "bool" }], internalType: "struct Types.Traits", name: "traits", type: "tuple" }], name: "createPool", outputs: [{ internalType: "address", name: "newPool", type: "address" }], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [
      { indexed: true, internalType: "address", name: "pool", type: "address" },
      { indexed: true, internalType: "address", name: "token0", type: "address" },
      { indexed: true, internalType: "address", name: "token1", type: "address" },
      { indexed: false, internalType: "address", name: "parent", type: "address" },
      { indexed: false, internalType: "uint32", name: "generation", type: "uint32" },
      { indexed: false, internalType: "address", name: "owner", type: "address" }
    ], name: "PoolCreated", type: "event" }
];

type NetworkKey = "amoy" | "baseSepolia" | "arbitrumSepolia";
const CHAIN_IDS: Record<NetworkKey, number> = { amoy: 80002, baseSepolia: 84532, arbitrumSepolia: 421614 };

function getArg(key: string, def?: string) {
  const env = process.env[key.toUpperCase()];
  if (env !== undefined) return env;
  const match = process.argv.find((a) => a === `--${key}` || a.startsWith(`--${key}=`));
  if (!match) return def;
  const [, val] = match.split("=");
  return val ?? "";
}

function readJSON(p: string, fallback: any) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return fallback; }
}

function upsertMulti(net: string, patch: any, addPool?: string) {
  const agg = readJSON(MULTI_FILE, {});
  const prev = agg[net] || {};
  const pools: string[] = Array.from(new Set([...(prev.pools || []), ...(addPool ? [addPool] : [])]));
  agg[net] = { ...prev, ...patch, pools };
  agg.updatedAt = Date.now();
  fs.writeFileSync(MULTI_FILE, JSON.stringify(agg, null, 2));
}

async function main() {
  const SRC = (getArg("src", "amoy") as NetworkKey);
  const TGT = (getArg("tgt", "baseSepolia") as NetworkKey);
  const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY missing in env");

  const RPCS: Record<NetworkKey, string | undefined> = {
    amoy: process.env.AMOY_RPC_URL,
    baseSepolia: process.env.BASE_SEPOLIA_RPC_URL,
    arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL,
  };
  const srcRpc = RPCS[SRC]; const tgtRpc = RPCS[TGT];
  if (!srcRpc || !tgtRpc) throw new Error(`RPC URL missing for ${!srcRpc ? SRC : TGT}`);

  const agg: any = readJSON(MULTI_FILE, {});
  const srcDefaults = (agg[SRC] || {});
  const tgtDefaults = (agg[TGT] || {});

  const srcPool = getArg("pool", srcDefaults.genesisPool);
  const srcMorpheus = getArg("morpheus", srcDefaults.morpheusFactory);
  const tgtFactory = getArg("factory", tgtDefaults.factory);
  if (!srcPool || !srcMorpheus || !tgtFactory) {
    throw new Error("Missing addresses. Provide --pool/--morpheus/--factory or ensure deployments.multi.json contains them for the src/tgt networks");
  }

  const gasEff = Number(getArg("fit_gas", "8000"));
  const profit = Number(getArg("fit_profit", "7000"));
  const user = Number(getArg("fit_user", "7500"));
  const targetTraitsStr = getArg("target_traits");
  const targetTraits = targetTraitsStr ? targetTraitsStr.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)) : [];

  const srcProvider = new JsonRpcProvider(srcRpc as string);
  const tgtProvider = new JsonRpcProvider(tgtRpc as string);
  const srcSigner = new Wallet(PRIVATE_KEY, srcProvider);
  const tgtSigner = new Wallet(PRIVATE_KEY, tgtProvider);

  // 1) Report fitness on source
  const morpheus = new Contract(srcMorpheus, MorpheusABI, srcSigner);
  console.log(`[SRC:${SRC}] Reporting fitness for`, srcPool, { gasEff, profit, user });
  await (await morpheus.reportFitness(srcPool, gasEff, profit, user)).wait();

  // 2) Evolve to child
  console.log(`[SRC:${SRC}] Evolving child...`);
  const tx = await morpheus.evolveContract(srcPool, targetTraits);
  const rc = await tx.wait();
  let child = "";
  for (const log of rc.logs) {
    try { const ev = morpheus.interface.parseLog(log); if (ev && ev.name === "ContractEvolved") { child = ev.args.child; break; } } catch {}
  }
  if (!child) throw new Error("ContractEvolved event not found; cannot determine child address");
  console.log(`[SRC:${SRC}] Child evolved:`, child);

  // 3) Export DNA for child via static call (no gas)
  const tgtChainId = CHAIN_IDS[TGT];
  const dna: string = await morpheus.migrateToChain.staticCall(child, tgtChainId);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);
  const dnaFile = path.join(OUT_DIR, `dna_${child}_${tgtChainId}.hex`);
  fs.writeFileSync(dnaFile, dna);
  console.log(`[SRC:${SRC}] DNA exported to`, dnaFile);

  // 4) Decode and import on target via PoolFactory
  const coder = AbiCoder.defaultAbiCoder();
  const [ver, generation, parentHash, dnaTraits, fitness, birthBlock, token0, token1, traits] = coder.decode([
    "uint8","uint256","bytes32","uint256[3]","uint256","uint256","address","address","tuple(uint16 feeBps, uint16 slippageGuardBps, uint16 cooldownBlocks, bool mevProtection)"
  ], dna);
  console.log(`[TGT:${TGT}] Decoded DNA v${Number(ver)} gen ${generation.toString()} tokens:`, token0, token1, "traits:", traits);

  const factory = new Contract(tgtFactory, FactoryABI, tgtSigner);
  const tx2 = await factory.createPool(token0, token1, ZeroAddress, traits);
  const rc2 = await tx2.wait();
  let imported = "";
  for (const log of rc2.logs) {
    try { const ev = factory.interface.parseLog(log); if (ev && ev.name === "PoolCreated") { imported = ev.args.pool; break; } } catch {}
  }
  console.log(`[TGT:${TGT}] Imported pool:`, imported || "<unknown>", "Tx:", rc2?.hash);

  // 5) Update multi-network aggregator
  upsertMulti(SRC, {}, child);
  upsertMulti(TGT, { lastImportedTx: rc2?.hash }, imported || undefined);

  console.log(`Done. Child on ${SRC}: ${child}. Imported on ${TGT} (see tx).`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
