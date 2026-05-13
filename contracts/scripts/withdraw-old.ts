import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// Old contract address
const OLD_CONTRACT = "0xB3b1980CE53efcB48f1b30bA2cFdd178a6C727F0";

const ABI = [
  "function getPosition(address user) view returns (uint256 collateralBTC, uint256 debtMUSD)",
  "function withdraw(uint256 btcAmount, uint256 btcPriceUSD) external",
];

// CoinGecko BTC price (approximate — just needs to pass the LTV check)
// Since debt is 0, any price works
const BTC_PRICE_USD = 80000n * 10n ** 8n; // $80,000 with 8 decimals

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Withdrawing from old contract with account:", signer.address);

  const contract = new ethers.Contract(OLD_CONTRACT, ABI, signer);

  // Check position
  const [collateral, debt] = await contract.getPosition(signer.address);
  console.log("Collateral:", ethers.formatEther(collateral), "BTC");
  console.log("Debt:", ethers.formatEther(debt), "MUSD");

  if (collateral === 0n) {
    console.log("No collateral to withdraw");
    return;
  }

  if (debt > 0n) {
    console.log("ERROR: You have outstanding debt. Repay first before withdrawing.");
    return;
  }

  console.log("Withdrawing", ethers.formatEther(collateral), "BTC...");
  const tx = await contract.withdraw(collateral, BTC_PRICE_USD);
  await tx.wait();
  console.log("✅ Withdrawn! Tx:", tx.hash);
  console.log("\nNow deposit into the new contract: 0x3B44ebEf1B398d94ab1c9c715a23B179D74042Ba");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
