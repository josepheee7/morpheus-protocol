import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import "dotenv/config";

// Production deployment script with comprehensive validation
async function deployToProduction() {
  console.log("🚀 Starting Morpheus Protocol Production Deployment...");
  console.log(`Network: ${network.name}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.1")) {
    throw new Error("❌ Insufficient balance for deployment. Need at least 0.1 ETH.");
  }

  const deploymentData: any = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  console.log("\n📋 Step 1: Deploying Test Tokens...");
  
  // Deploy production-grade test tokens with proper metadata
  const TestToken = await ethers.getContractFactory("TestToken");
  
  const token0 = await TestToken.deploy(
    "Morpheus Token A", 
    "MORPHA", 
    deployer.address
  );
  await token0.waitForDeployment();
  
  const token1 = await TestToken.deploy(
    "Morpheus Token B", 
    "MORPHB", 
    deployer.address
  );
  await token1.waitForDeployment();
  
  deploymentData.contracts.token0 = await token0.getAddress();
  deploymentData.contracts.token1 = await token1.getAddress();
  
  console.log(`✅ Token A deployed: ${deploymentData.contracts.token0}`);
  console.log(`✅ Token B deployed: ${deploymentData.contracts.token1}`);

  // Mint initial supply
  const initialSupply = ethers.parseUnits("10000000", 18); // 10M tokens
  await (await token0.mint(deployer.address, initialSupply)).wait();
  await (await token1.mint(deployer.address, initialSupply)).wait();
  console.log("✅ Initial token supply minted");

  console.log("\n🏗️ Step 2: Deploying Core Infrastructure...");
  
  // Deploy EvolvablePool implementation
  const EvolvablePool = await ethers.getContractFactory("EvolvablePool");
  const poolImpl = await EvolvablePool.deploy();
  await poolImpl.waitForDeployment();
  deploymentData.contracts.poolImplementation = await poolImpl.getAddress();
  console.log(`✅ Pool Implementation: ${deploymentData.contracts.poolImplementation}`);

  // Deploy Registry
  const Registry = await ethers.getContractFactory("Registry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  deploymentData.contracts.registry = await registry.getAddress();
  console.log(`✅ Registry: ${deploymentData.contracts.registry}`);

  // Deploy PoolFactory
  const PoolFactory = await ethers.getContractFactory("PoolFactory");
  const factory = await PoolFactory.deploy(
    deploymentData.contracts.poolImplementation,
    deploymentData.contracts.registry
  );
  await factory.waitForDeployment();
  deploymentData.contracts.factory = await factory.getAddress();
  console.log(`✅ Pool Factory: ${deploymentData.contracts.factory}`);

  // Deploy MorpheusFactory (Advanced Evolution Engine)
  const MorpheusFactory = await ethers.getContractFactory("MorpheusFactory");
  const morpheus = await MorpheusFactory.deploy(
    deploymentData.contracts.registry,
    deploymentData.contracts.factory
  );
  await morpheus.waitForDeployment();
  deploymentData.contracts.morpheus = await morpheus.getAddress();
  console.log(`✅ Morpheus Factory: ${deploymentData.contracts.morpheus}`);

  console.log("\n⚙️ Step 3: Configuring System...");
  
  // Set factory in registry
  await (await registry.setFactory(deploymentData.contracts.factory)).wait();
  console.log("✅ Registry configured with factory");

  // Set morpheus as fitness oracle
  await (await morpheus.setFitnessOracle(deployer.address)).wait();
  console.log("✅ Fitness oracle configured");

  console.log("\n🧬 Step 4: Creating Genesis Pool...");
  
  // Create genesis pool with optimized traits
  const genesisTraits = {
    feeBps: 300,        // 3% fee
    slippageGuardBps: 1000,  // 10% max slippage
    cooldownBlocks: 5,       // 5 block cooldown
    mevProtection: true      // MEV protection enabled
  };

  const createTx = await factory.createPool(
    deploymentData.contracts.token0,
    deploymentData.contracts.token1,
    ethers.ZeroAddress, // no parent
    0, // generation 0
    genesisTraits
  );
  
  const createReceipt = await createTx.wait();
  const poolCreatedEvent = createReceipt?.logs.find((log: any) => {
    try {
      return factory.interface.parseLog(log as any)?.name === "PoolCreated";
    } catch {
      return false;
    }
  });
  
  if (poolCreatedEvent) {
    const parsedEvent = factory.interface.parseLog(poolCreatedEvent as any);
    deploymentData.contracts.genesisPool = parsedEvent?.args[0];
    console.log(`✅ Genesis Pool: ${deploymentData.contracts.genesisPool}`);
  }

  console.log("\n💧 Step 5: Adding Initial Liquidity...");
  
  if (deploymentData.contracts.genesisPool) {
    const genesisPool = await ethers.getContractAt("EvolvablePool", deploymentData.contracts.genesisPool);
    
    // Add substantial liquidity
    const liquidityAmount = ethers.parseUnits("100000", 18); // 100K tokens each
    
    await (await token0.approve(deploymentData.contracts.genesisPool, liquidityAmount)).wait();
    await (await token1.approve(deploymentData.contracts.genesisPool, liquidityAmount)).wait();
    
    await (await genesisPool.addLiquidity(liquidityAmount, liquidityAmount)).wait();
    console.log("✅ Initial liquidity added to genesis pool");
    
    // Set initial fitness score
    await (await morpheus.setFitness(
      deploymentData.contracts.genesisPool, 
      7500, // 75% fitness
      [7000, 8000, 7500] // [gas efficiency, profitability, user satisfaction]
    )).wait();
    console.log("✅ Genesis pool fitness score set");
  }

  console.log("\n🔒 Step 6: Security Validation...");
  
  // Verify all contracts are properly configured
  const registryFactory = await registry.factory();
  const factoryRegistry = await factory.registry();
  const morpheusRegistry = await morpheus.registry();
  
  if (registryFactory !== deploymentData.contracts.factory) {
    throw new Error("❌ Registry factory mismatch");
  }
  if (factoryRegistry !== deploymentData.contracts.registry) {
    throw new Error("❌ Factory registry mismatch");
  }
  if (morpheusRegistry !== deploymentData.contracts.registry) {
    throw new Error("❌ Morpheus registry mismatch");
  }
  
  console.log("✅ All contract links verified");

  console.log("\n📊 Step 7: Generating Production Config...");
  
  // Create production configuration
  const productionConfig = {
    ...deploymentData,
    frontend: {
      rpcUrl: process.env[`${network.name.toUpperCase()}_RPC_URL`] || "",
      explorerUrl: getExplorerUrl(network.name),
      chainId: parseInt(deploymentData.chainId)
    },
    features: {
      evolution: true,
      crossChain: true,
      mlAnalysis: true,
      realTimeMetrics: true
    },
    security: {
      pausable: true,
      slippageProtection: true,
      mevProtection: true,
      accessControl: true
    }
  };

  // Save deployment files
  const deployFile = path.resolve(__dirname, "../deployments.json");
  const prodConfigFile = path.resolve(__dirname, "../production-config.json");
  const multiFile = path.resolve(__dirname, "../deployments.multi.json");
  
  fs.writeFileSync(deployFile, JSON.stringify(deploymentData, null, 2));
  fs.writeFileSync(prodConfigFile, JSON.stringify(productionConfig, null, 2));
  
  // Update multi-chain deployment file
  let multiDeployments: any = {};
  if (fs.existsSync(multiFile)) {
    try {
      multiDeployments = JSON.parse(fs.readFileSync(multiFile, "utf-8"));
    } catch {}
  }
  
  multiDeployments[network.name] = {
    ...deploymentData.contracts,
    pools: [deploymentData.contracts.genesisPool].filter(Boolean),
    updatedAt: Date.now()
  };
  
  fs.writeFileSync(multiFile, JSON.stringify(multiDeployments, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("🎉 MORPHEUS PROTOCOL PRODUCTION DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name} (Chain ID: ${deploymentData.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`\n📋 Contract Addresses:`);
  console.log(`Registry: ${deploymentData.contracts.registry}`);
  console.log(`Factory: ${deploymentData.contracts.factory}`);
  console.log(`Morpheus: ${deploymentData.contracts.morpheus}`);
  console.log(`Genesis Pool: ${deploymentData.contracts.genesisPool}`);
  console.log(`Token A: ${deploymentData.contracts.token0}`);
  console.log(`Token B: ${deploymentData.contracts.token1}`);
  
  console.log(`\n📁 Files Generated:`);
  console.log(`- ${deployFile}`);
  console.log(`- ${prodConfigFile}`);
  console.log(`- ${multiFile}`);
  
  console.log(`\n🌐 Frontend Configuration:`);
  console.log(`Registry Address: ${deploymentData.contracts.registry}`);
  console.log(`Factory Address: ${deploymentData.contracts.factory}`);
  console.log(`Morpheus Address: ${deploymentData.contracts.morpheus}`);
  
  console.log(`\n🔗 Verification Commands:`);
  if (process.env.POLYGONSCAN_KEY && network.name === "amoy") {
    console.log(`npx hardhat verify --network amoy ${deploymentData.contracts.registry} "${deployer.address}"`);
    console.log(`npx hardhat verify --network amoy ${deploymentData.contracts.factory} "${deploymentData.contracts.poolImplementation}" "${deploymentData.contracts.registry}"`);
  }
  
  console.log("\n✅ Ready for Demo!");
}

function getExplorerUrl(networkName: string): string {
  const explorers: Record<string, string> = {
    "amoy": "https://amoy.polygonscan.com",
    "baseSepolia": "https://sepolia.basescan.org", 
    "arbitrumSepolia": "https://sepolia.arbiscan.io"
  };
  return explorers[networkName] || "";
}

deployToProduction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Production deployment failed:", error);
    process.exit(1);
  });
