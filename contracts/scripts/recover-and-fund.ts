import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const OLD_CONTRACT = "0xB3b1980CE53efcB48f1b30bA2cFdd178a6C727F0";
const NEW_CONTRACT = "0xd00867f1Fe750C4aE5391949c937Dbb5eD5CC976";
const MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

const OLD_ABI = [
  "function treasuryBalance() view returns (uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Account:", signer.address);

  const musd = new ethers.Contract(MUSD, ERC20_ABI, signer);

  // Check old contract balance
  const oldBalance = await musd.balanceOf(OLD_CONTRACT);
  console.log("Old contract MUSD:", ethers.formatUnits(oldBalance, 18));

  // The old contract has no withdrawal — we can't recover it
  // But we can fund the new contract from our wallet MUSD
  const walletBalance = await musd.balanceOf(signer.address);
  console.log("Wallet MUSD:", ethers.formatUnits(walletBalance, 18));

  if (walletBalance === 0n) {
    console.log("No MUSD in wallet to fund new contract");
    return;
  }

  // Transfer all wallet MUSD to new contract
  console.log(`\nTransferring ${ethers.formatUnits(walletBalance, 18)} MUSD to new contract...`);
  const tx = await musd.transfer(NEW_CONTRACT, walletBalance);
  await tx.wait();
  console.log("✅ Funded! Tx:", tx.hash);

  const newBalance = await musd.balanceOf(NEW_CONTRACT);
  console.log("New contract MUSD treasury:", ethers.formatUnits(newBalance, 18));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
