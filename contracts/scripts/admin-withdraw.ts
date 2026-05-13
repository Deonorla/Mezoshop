/**
 * Admin withdrawal script — recovers MUSD from the MezoLending contract treasury.
 * Only works if called from the deployer wallet (admin).
 *
 * Usage:
 *   npx hardhat run scripts/admin-withdraw.ts --network mezoTestnet
 *
 * Set WITHDRAW_AMOUNT and WITHDRAW_TO before running, or it defaults to
 * withdrawing all MUSD back to the deployer wallet.
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const CONTRACT = "0xd00867f1Fe750C4aE5391949c937Dbb5eD5CC976";
const MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

const ABI = [
  "function adminWithdrawMUSD(uint256 amount, address to) external",
  "function treasuryBalance() view returns (uint256)",
  "function admin() view returns (address)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Caller:", signer.address);

  const contract = new ethers.Contract(CONTRACT, ABI, signer);
  const musd = new ethers.Contract(MUSD, ERC20_ABI, signer);

  const admin = await contract.admin();
  console.log("Contract admin:", admin);

  if (admin.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("ERROR: You are not the admin. Only the deployer can withdraw.");
    process.exit(1);
  }

  const treasury = await contract.treasuryBalance();
  console.log("Treasury balance:", ethers.formatUnits(treasury, 18), "MUSD");

  if (treasury === 0n) {
    console.log("Treasury is empty.");
    return;
  }

  // Withdraw all MUSD back to the deployer
  const to = signer.address;
  console.log(`\nWithdrawing ${ethers.formatUnits(treasury, 18)} MUSD to ${to}...`);
  const tx = await contract.adminWithdrawMUSD(treasury, to);
  await tx.wait();
  console.log("✅ Withdrawn! Tx:", tx.hash);

  const newBalance = await musd.balanceOf(signer.address);
  console.log("Your MUSD balance:", ethers.formatUnits(newBalance, 18));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
