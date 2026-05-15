# MezoShop

A Bitcoin-native fashion commerce platform built on the Mezo blockchain. Users borrow MUSD stablecoin against their BTC collateral and spend it on fashion products — without selling their Bitcoin.

---

## Architecture

The project is split into three layers:

```
mezoshop/
  src/           React frontend (Vite, wagmi, RainbowKit)
  backend/       API server (Bun, Hono, SQLite)
  contracts/     Solidity lending contract (Hardhat, Mezo testnet)
```

**Frontend** handles wallet connection, the AI stylist chat, product browsing, cart, checkout, and the borrow/repay UI.

**Backend** serves the REST API, runs the AI chat agent (Gemini via Vercel AI SDK), calls the lending contract on-chain using a backend signer, and persists data in SQLite.

**Contracts** contains `MezoLending.sol` — a BTC-collateral lending contract deployed on Mezo testnet (chain ID 31611). Users deposit native BTC (the gas currency on Mezo EVM), borrow MUSD against it at 60% LTV, and repay to unlock their collateral.

---

## Prerequisites

- Node.js 18+
- Bun 1.0+
- A WalletConnect project ID (free at [cloud.walletconnect.com](https://cloud.walletconnect.com))
- A Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))
- MetaMask or Xverse wallet

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/Deonorla/Mezoshop.git
cd Mezoshop
npm install
```

### 2. Configure the frontend

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:3002
VITE_MERCHANT_ADDRESS=0x_your_wallet_address
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
GEMINI_API_KEY=your_gemini_api_key
MERCHANT_WALLET_ADDRESS=0x_your_wallet_address
FRONTEND_ORIGIN=http://localhost:3000
PORT=3002
LENDING_CONTRACT_ADDRESS=0x_deployed_contract_address
LENDING_SIGNER_PRIVATE_KEY=0x_signer_private_key
```

### 4. Start the backend

```bash
cd backend
bun run dev
```

The backend starts on `http://localhost:3002`.

### 5. Start the frontend

```bash
# from repo root
npm run dev
```

The frontend starts on `http://localhost:3000`.

---

## Lending Contract

The `MezoLending.sol` contract is deployed on Mezo testnet. To deploy your own instance:

### Prerequisites

- Mezo testnet BTC in a MetaMask wallet (get from [faucet.test.mezo.org](https://faucet.test.mezo.org))
- MUSD to fund the treasury (borrow from [testnet.mezo.org](https://testnet.mezo.org))

### Deploy

```bash
cd contracts
npm install
cp .env.example .env
# Add DEPLOYER_PRIVATE_KEY to contracts/.env

npx hardhat run scripts/deploy.ts --network mezoTestnet
```

The script logs the deployed contract address. Add it to `backend/.env` as `LENDING_CONTRACT_ADDRESS`.

### Fund the treasury

Transfer MUSD directly to the contract address. The contract holds a MUSD treasury that it lends to users. The admin (deployer) can recover funds at any time:

```bash
npx hardhat run scripts/admin-withdraw.ts --network mezoTestnet
```

### Contract parameters

| Parameter | Value |
|---|---|
| LTV cap | 60% |
| Liquidation threshold | 75% |
| Interest rate | 0% |
| Chain | Mezo testnet (31611) |
| Collateral | Native BTC (msg.value) |
| Borrowable asset | MUSD (ERC20) |

---

## API Reference

All endpoints require `X-Wallet-Address: 0x...` header.

### Cart

| Method | Path | Description |
|---|---|---|
| GET | `/api/cart` | List cart items |
| POST | `/api/cart` | Add item |
| DELETE | `/api/cart` | Clear cart |
| DELETE | `/api/cart/:itemId` | Remove item |

### Orders

| Method | Path | Description |
|---|---|---|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |

### Products

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | Search/list products |
| GET | `/api/products/:id` | Get product by ID |

### Borrow / Lending

| Method | Path | Description |
|---|---|---|
| GET | `/api/borrow/position` | On-chain position (BTC locked, MUSD debt) |
| GET | `/api/borrow/history` | Transaction history |
| POST | `/api/borrow` | Execute borrow |
| POST | `/api/borrow/lock` | Record a BTC lock transaction |
| POST | `/api/repay` | Execute repay |

### Profile & Wishlist

| Method | Path | Description |
|---|---|---|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Create or update profile |
| GET | `/api/wishlist` | Get wishlisted product IDs |
| POST | `/api/wishlist/:productId` | Add to wishlist |
| DELETE | `/api/wishlist/:productId` | Remove from wishlist |

### Chat

| Method | Path | Description |
|---|---|---|
| POST | `/api/chat` | Stream AI stylist response |

---

## Deployment

### Backend — Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo, set root directory to `backend`
3. Set start command: `bun run src/index.ts`
4. Add all variables from `backend/.env.example` in the Railway dashboard
5. Note the generated service URL

### Frontend — Vercel

1. Import the repo at [vercel.com](https://vercel.com)
2. Framework: Vite, root directory: `/`, output: `dist`
3. Add environment variables:
   - `VITE_API_URL` — your Railway backend URL
   - `VITE_WALLETCONNECT_PROJECT_ID`
   - `VITE_MERCHANT_ADDRESS`
4. Deploy

After deploying, update `FRONTEND_ORIGIN` in Railway to your Vercel URL and redeploy the backend.

---

## Wallet Support

| Wallet | Connection | BTC Collateral | Notes |
|---|---|---|---|
| MetaMask | EVM direct | Mezo EVM BTC | Get testnet BTC from faucet |
| Xverse | Via Mezo Passport | Native Bitcoin | Bridge required via testnet.mezo.org |

---

## Tech Stack

**Frontend**
- React 18, TypeScript, Vite
- wagmi v2, viem, RainbowKit
- Mezo Passport (Bitcoin wallet integration)
- TanStack Query, Tailwind CSS, Motion

**Backend**
- Bun runtime, Hono framework
- Vercel AI SDK, Google Gemini
- viem (on-chain reads and writes)
- SQLite via bun:sqlite

**Contracts**
- Solidity 0.8.24, Hardhat
- OpenZeppelin SafeERC20
- Deployed on Mezo testnet (chain ID 31611)

---

## License

MIT
