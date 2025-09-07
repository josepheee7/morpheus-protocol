import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

// Security audit script for Morpheus Protocol
async function runSecurityAudit() {
  console.log("🔒 Starting Morpheus Protocol Security Audit...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`Auditor: ${deployer.address}`);

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments.json");
  if (!fs.existsSync(deployFile)) {
    console.error("❌ No deployment file found. Deploy contracts first.");
    return;
  }

  const deployment = JSON.parse(fs.readFileSync(deployFile, "utf-8"));
  
  // Security checks
  const checks = [];

  // 1. Contract ownership verification
  console.log("\n📋 Checking contract ownership...");
  try {
    const registry = await ethers.getContractAt("Registry", deployment.registry);
    const factory = await ethers.getContractAt("PoolFactory", deployment.factory);
    
    const registryOwner = await registry.owner();
    const factoryOwner = await factory.owner();
    
    checks.push({
      name: "Registry Ownership",
      status: registryOwner === deployer.address ? "✅ PASS" : "❌ FAIL",
      details: `Owner: ${registryOwner}`
    });
    
    checks.push({
      name: "Factory Ownership", 
      status: factoryOwner === deployer.address ? "✅ PASS" : "❌ FAIL",
      details: `Owner: ${factoryOwner}`
    });
  } catch (error) {
    checks.push({
      name: "Ownership Check",
      status: "❌ ERROR",
      details: `Failed to verify ownership: ${error}`
    });
  }

  // 2. Pool configuration validation
  console.log("\n🏊 Checking pool configurations...");
  try {
    const registry = await ethers.getContractAt("Registry", deployment.registry);
    const pools = await registry.allPools();
    
    for (let i = 0; i < Math.min(pools.length, 5); i++) {
      const poolAddr = pools[i];
      const pool = await ethers.getContractAt("EvolvablePool", poolAddr);
      const poolDesc = await registry.getPool(poolAddr);
      
      // Check trait bounds
      const traits = poolDesc.traits;
      const feeBpsValid = traits.feeBps <= 1000; // ≤10%
      const slippageValid = traits.slippageGuardBps <= 2000; // ≤20%
      const cooldownValid = traits.cooldownBlocks <= 1000;
      
      checks.push({
        name: `Pool ${i + 1} Trait Validation`,
        status: (feeBpsValid && slippageValid && cooldownValid) ? "✅ PASS" : "❌ FAIL",
        details: `Fee: ${traits.feeBps}bps, Slippage: ${traits.slippageGuardBps}bps, Cooldown: ${traits.cooldownBlocks}`
      });
    }
  } catch (error) {
    checks.push({
      name: "Pool Configuration Check",
      status: "❌ ERROR", 
      details: `Failed to check pools: ${error}`
    });
  }

  // 3. Access control verification
  console.log("\n🔐 Checking access controls...");
  try {
    const registry = await ethers.getContractAt("Registry", deployment.registry);
    const factory = await ethers.getContractAt("PoolFactory", deployment.factory);
    
    const registryFactory = await registry.factory();
    const factoryRegistry = await factory.registry();
    
    checks.push({
      name: "Registry-Factory Link",
      status: (registryFactory === deployment.factory && factoryRegistry === deployment.registry) ? "✅ PASS" : "❌ FAIL",
      details: `Registry factory: ${registryFactory}, Factory registry: ${factoryRegistry}`
    });
  } catch (error) {
    checks.push({
      name: "Access Control Check",
      status: "❌ ERROR",
      details: `Failed to verify access controls: ${error}`
    });
  }

  // 4. Emergency pause functionality
  console.log("\n⏸️ Testing emergency controls...");
  try {
    const registry = await ethers.getContractAt("Registry", deployment.registry);
    const pools = await registry.allPools();
    
    if (pools.length > 0) {
      const pool = await ethers.getContractAt("EvolvablePool", pools[0]);
      const initialPaused = await pool.paused();
      
      // Test pause (only if we're the owner)
      const poolOwner = await pool.owner();
      if (poolOwner === deployer.address) {
        await pool.setPaused(true);
        const paused = await pool.paused();
        await pool.setPaused(initialPaused); // Restore original state
        
        checks.push({
          name: "Emergency Pause",
          status: paused ? "✅ PASS" : "❌ FAIL",
          details: `Pause functionality working`
        });
      } else {
        checks.push({
          name: "Emergency Pause",
          status: "⚠️ SKIP",
          details: `Not pool owner, cannot test pause`
        });
      }
    }
  } catch (error) {
    checks.push({
      name: "Emergency Controls",
      status: "❌ ERROR",
      details: `Failed to test emergency controls: ${error}`
    });
  }

  // 5. Gas usage analysis
  console.log("\n⛽ Analyzing gas usage...");
  try {
    const factory = await ethers.getContractAt("PoolFactory", deployment.factory);
    
    // Estimate gas for pool creation
    const traits = { feeBps: 300, slippageGuardBps: 1000, cooldownBlocks: 10, mevProtection: true };
    const gasEstimate = await factory.createPool.estimateGas(
      deployment.token0,
      deployment.token1,
      ethers.ZeroAddress,
      0,
      traits
    );
    
    checks.push({
      name: "Gas Efficiency",
      status: gasEstimate < 500000n ? "✅ PASS" : "⚠️ HIGH",
      details: `Pool creation: ${gasEstimate.toString()} gas`
    });
  } catch (error) {
    checks.push({
      name: "Gas Analysis",
      status: "❌ ERROR",
      details: `Failed to analyze gas: ${error}`
    });
  }

  // Generate report
  console.log("\n" + "=".repeat(60));
  console.log("🔒 MORPHEUS PROTOCOL SECURITY AUDIT REPORT");
  console.log("=".repeat(60));
  
  let passCount = 0;
  let failCount = 0;
  let errorCount = 0;
  
  checks.forEach((check, index) => {
    console.log(`\n${index + 1}. ${check.name}`);
    console.log(`   Status: ${check.status}`);
    console.log(`   Details: ${check.details}`);
    
    if (check.status.includes("PASS")) passCount++;
    else if (check.status.includes("FAIL")) failCount++;
    else if (check.status.includes("ERROR")) errorCount++;
  });
  
  console.log("\n" + "=".repeat(60));
  console.log(`📊 SUMMARY: ${passCount} passed, ${failCount} failed, ${errorCount} errors`);
  
  if (failCount === 0 && errorCount === 0) {
    console.log("🎉 All security checks passed! Protocol is ready for production.");
  } else if (failCount > 0) {
    console.log("⚠️ Security issues detected. Please review and fix before production deployment.");
  } else {
    console.log("🔍 Some checks could not be completed. Manual review recommended.");
  }
  
  // Save audit report
  const auditReport = {
    timestamp: new Date().toISOString(),
    network: network.name,
    auditor: deployer.address,
    checks,
    summary: { passed: passCount, failed: failCount, errors: errorCount }
  };
  
  const auditFile = path.resolve(__dirname, "../audit-report.json");
  fs.writeFileSync(auditFile, JSON.stringify(auditReport, null, 2));
  console.log(`\n📄 Audit report saved to: ${auditFile}`);
}

runSecurityAudit()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Audit failed:", error);
    process.exit(1);
  });
