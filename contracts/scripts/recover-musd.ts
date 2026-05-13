import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const OLD_CONTRACT = "0xB3b1980CE53efcB48f1b30bA2cFdd178a6C727F0";
const MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

// The old contract has no admin withdrawal function, so we need to check
// if there's any way to get the MUSD out. Since the contract holds MUSD
// as treasury and has no admin drain function, we'll check the balance first.

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// The old contract's treasuryBalance() view function
const OLD_CONTRACT_ABI = [
  "function treasuryBalance() view returns (uint256)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Checking old contract MUSD balance...");

  const musd = new ethers.Contract(MUSD, ERC20_ABI, signer);
  const oldContract = new ethers.Contract(OLD_CONTRACT, OLD_CONTRACT_ABI, signer);

  const balance = await musd.balanceOf(OLD_CONTRACT);
  console.log("Old contract MUSD balance:", ethers.formatUnits(balance, 18), "MUSD");

  const treasury = await oldContract.treasuryBalance();
  console.log("Treasury balance:", ethers.formatUnits(treasury, 18), "MUSD");

  console.log("\n⚠️  The old contract has no admin withdrawal function.");
  console.log("The 1,800 MUSD is locked in the old contract permanently.");
  console.log("You need to fund the new contract separately.");
  console.log("\nNew contract: 0x3B44ebEf1B398d94ab1c9c715a23B179D74042Ba");
  console.log("Your current MUSD balance:", ethers.formatUnits(await musd.balanceOf(signer.address), 18), "MUSD");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
