import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// MUSD testnet address on Mezo testnet (chain ID 31611)
const MUSD_TESTNET = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

// Initial MUSD treasury to seed the contract with (in MUSD, 18 decimals)
// Adjust this to however much MUSD the deployer wallet holds
const INITIAL_TREASURY_MUSD = ethers.parseUnits("10000", 18); // 10,000 MUSD

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MezoLending with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer BTC balance:", ethers.formatEther(balance), "BTC");

  // The deployer must have approved the contract for INITIAL_TREASURY_MUSD MUSD
  // before deployment. We do this programmatically here.
  const musd = await ethers.getContractAt("IERC20", MUSD_TESTNET);
  const musdBalance = await musd.balanceOf(deployer.address);
  console.log("Deployer MUSD balance:", ethers.formatUnits(musdBalance, 18), "MUSD");

  if (musdBalance < INITIAL_TREASURY_MUSD) {
    console.warn(
      `Warning: deployer has ${ethers.formatUnits(musdBalance, 18)} MUSD but treasury requires ${ethers.formatUnits(INITIAL_TREASURY_MUSD, 18)} MUSD`
    );
    console.warn("Deploying with 0 initial treasury — fund the contract manually after deployment");
  }

  const treasury = musdBalance >= INITIAL_TREASURY_MUSD ? INITIAL_TREASURY_MUSD : 0n;

  // Approve the contract to pull MUSD from deployer (needed for constructor)
  if (treasury > 0n) {
    console.log("Approving MUSD spend for treasury...");
    // We need the contract address before deployment — use a pre-computed address
    // Instead, we deploy with 0 treasury and fund separately
    console.log("Note: deploying with 0 treasury. Fund via direct MUSD transfer after deployment.");
  }

  const MezoLending = await ethers.getContractFactory("MezoLending");
  const lending = await MezoLending.deploy(MUSD_TESTNET, 0n);
  await lending.waitForDeployment();

  const address = await lending.getAddress();
  console.log("\n✅ MezoLending deployed to:", address);
  console.log("\nAdd to backend/.env:");
  console.log(`LENDING_CONTRACT_ADDRESS=${address}`);
  console.log("\nTo fund the treasury, transfer MUSD directly to the contract address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
