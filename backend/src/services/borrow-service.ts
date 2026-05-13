import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "../db/client";
import { env } from "../lib/env";
import { fetchBtcPriceUSD } from "../lib/coingecko";

// ── Mezo testnet chain definition ─────────────────────────────────────────────

const mezoTestnet = {
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.test.mezo.org"] },
    public: { http: ["https://rpc.test.mezo.org"] },
  },
} as const;

// ── ABI (minimal — only the functions we call) ────────────────────────────────

const LENDING_ABI = [
  {
    name: "getPosition",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "collateralBTC", type: "uint256" },
      { name: "debtMUSD", type: "uint256" },
    ],
  },
  {
    name: "borrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "musdAmount", type: "uint256" },
      { name: "btcPriceUSD", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "repay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "musdAmount", type: "uint256" },
      { name: "borrower", type: "address" },
    ],
    outputs: [],
  },
] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BorrowPosition {
  btcLocked: number;
  btcPriceUSD: number;
  collateralValueUSD: number;
  totalBorrowable: number;
  alreadyBorrowed: number;
  available: number;
}

export interface BorrowTx {
  type: "borrow" | "repay" | "lock";
  amount: number;
  date: string;
  status: string;
  txHash: string;
}

interface LendingTxRow {
  id: string;
  wallet_address: string;
  type: string;
  amount_musd: number;
  tx_hash: string;
  status: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getContractAddress(): `0x${string}` {
  const addr = env.LENDING_CONTRACT_ADDRESS;
  if (!addr || addr === "") {
    throw new Error(
      "LENDING_CONTRACT_ADDRESS is not set. Deploy the contract first and add it to backend/.env"
    );
  }
  return addr as `0x${string}`;
}

function getSignerAccount() {
  const key = env.LENDING_SIGNER_PRIVATE_KEY;
  if (!key || key === "") {
    throw new Error(
      "LENDING_SIGNER_PRIVATE_KEY is not set. Add a funded signer key to backend/.env"
    );
  }
  return privateKeyToAccount(key as `0x${string}`);
}

function getPublicClient() {
  return createPublicClient({ chain: mezoTestnet, transport: http() });
}

function getWalletClient() {
  return createWalletClient({
    account: getSignerAccount(),
    chain: mezoTestnet,
    transport: http(),
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

class BorrowService {
  /**
   * Reads the on-chain position for a wallet and computes derived fields.
   */
  async getPosition(walletAddress: string): Promise<BorrowPosition> {
    const contractAddress = getContractAddress();
    const publicClient = getPublicClient();

    const [collateralWei, debtWei] = await publicClient.readContract({
      address: contractAddress,
      abi: LENDING_ABI,
      functionName: "getPosition",
      args: [walletAddress as `0x${string}`],
    });

    const btcPriceUSD = await fetchBtcPriceUSD();

    // Convert from wei (1e18) to whole units
    const btcLocked = Number(formatUnits(collateralWei, 18));
    const alreadyBorrowed = Number(formatUnits(debtWei, 18));

    const collateralValueUSD = btcLocked * btcPriceUSD;
    const totalBorrowable = Math.floor(collateralValueUSD * 0.6);
    const available = Math.max(0, totalBorrowable - alreadyBorrowed);

    return {
      btcLocked,
      btcPriceUSD,
      collateralValueUSD,
      totalBorrowable,
      alreadyBorrowed,
      available,
    };
  }

  /**
   * Fetches BTC price, calls MezoLending.borrow() on behalf of the user,
   * waits for confirmation, and records the transaction in SQLite.
   */
  async executeBorrow(
    walletAddress: string,
    amountMusd: number
  ): Promise<{ txHash: string; btcPriceUSD: number }> {
    const contractAddress = getContractAddress();
    const publicClient = getPublicClient();
    const walletClient = getWalletClient();

    const btcPriceUSD = await fetchBtcPriceUSD();

    // Convert MUSD amount to wei (18 decimals)
    const musdWei = parseUnits(String(amountMusd), 18);
    // Convert BTC price to 8-decimal integer for the contract
    const btcPriceScaled = BigInt(Math.round(btcPriceUSD * 1e8));

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: LENDING_ABI,
      functionName: "borrow",
      args: [musdWei, btcPriceScaled, walletAddress as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Record in SQLite
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.query<void, [string, string, string, number, string, string]>(
      `INSERT INTO lending_transactions (id, wallet_address, type, amount_musd, tx_hash, created_at)
       VALUES (?, ?, 'borrow', ?, ?, ?)`
    ).run(id, walletAddress, amountMusd, txHash, createdAt);

    return { txHash, btcPriceUSD };
  }

  /**
   * Calls MezoLending.repay() on behalf of the user,
   * waits for confirmation, and records the transaction in SQLite.
   */
  async executeRepay(
    walletAddress: string,
    amountMusd: number
  ): Promise<{ txHash: string }> {
    const contractAddress = getContractAddress();
    const publicClient = getPublicClient();
    const walletClient = getWalletClient();

    const musdWei = parseUnits(String(amountMusd), 18);

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: LENDING_ABI,
      functionName: "repay",
      args: [musdWei, walletAddress as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Record in SQLite
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.query<void, [string, string, number, string, string]>(
      `INSERT INTO lending_transactions (id, wallet_address, type, amount_musd, tx_hash, created_at)
       VALUES (?, ?, 'repay', ?, ?, ?)`
    ).run(id, walletAddress, amountMusd, txHash, createdAt);

    return { txHash };
  }

  /**
   * Records a BTC lock (deposit) transaction in SQLite.
   * Called by the frontend after the deposit tx is confirmed on-chain.
   */
  recordLock(walletAddress: string, amountBtc: number, txHash: string): void {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.query<void, [string, string, number, string, string]>(
      `INSERT OR IGNORE INTO lending_transactions (id, wallet_address, type, amount_musd, tx_hash, created_at)
       VALUES (?, ?, 'lock', ?, ?, ?)`
    ).run(id, walletAddress, amountBtc, txHash, createdAt);
  }

  /**
   * Returns borrow/repay/lock history for a wallet from SQLite, newest first.
   */
  getHistory(walletAddress: string): BorrowTx[] {
    const rows = db
      .query<LendingTxRow, [string]>(
        `SELECT * FROM lending_transactions
         WHERE wallet_address = ?
         ORDER BY created_at DESC`
      )
      .all(walletAddress);

    return rows.map((row) => ({
      type: row.type as "borrow" | "repay" | "lock",
      amount: row.amount_musd,
      date: row.created_at,
      status: row.status,
      txHash: row.tx_hash,
    }));
  }
}

export const borrowService = new BorrowService();
