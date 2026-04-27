import { env } from "./env";

export const MUSD_TESTNET_ADDRESS = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";
export const MUSD_MAINNET_ADDRESS = "0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186";
export const MEZO_TESTNET_CHAIN_ID = 31611;
export const MEZO_MAINNET_CHAIN_ID = 31612;

export const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "decimals",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;

export const MERCHANT_ADDRESS = env.MERCHANT_WALLET_ADDRESS;
