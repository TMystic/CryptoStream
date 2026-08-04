<div align="center">

# CryptoStream

### A Decentralised Video Streaming Service

Upload, discover, and monetize videos with **blockchain-enforced access control** — pay with test ETH, earn on-chain credits, and stream with MetaMask.

**Solidity** · **React** · **Express** · **MongoDB** · **Firebase Storage**

</div>

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Features](#features)
- [Monorepo Layout](#monorepo-layout)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Smart Contract Reference](#smart-contract-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

---

## Overview

CryptoStream is a full-stack decentralised video platform. A modern **React** frontend talks to an **Express** API for video metadata and storage, while a **Solidity** smart contract is the single source of truth for the credit economy and access control.

Instead of platform-issued subscriptions, viewers purchase **on-chain credits** by sending test ETH to the contract. Each video costs a fixed amount of credits to unlock, and access is recorded permanently on the blockchain — no central server decides who can watch what.

## How It Works

```mermaid
flowchart TD
    subgraph Client["React SPA (ethers + MetaMask)"]
        A[Connect Wallet]
        B[Upload Video]
        C[Buy Credits]
        D[Play Video]
    end

    subgraph Chain["Ethereum Network (StreamingService.sol)"]
        E[uploadVideo - register metadata]
        F[buyCredits - ETH to credits]
        G[buyVideo - credits to access]
        H[getAccessList / getVideosByAddress]
    end

    subgraph Server["Express API"]
        I[POST /api/videos - multer memory storage]
        J[Firebase Storage - video files]
        K[MongoDB - video metadata]
        L[GET /api/videos + search]
    end

    B --> E --> I --> J --> K
    C --> F
    D --> G --> H
    A --> L --> D
```

**Upload flow:** the frontend registers the video on-chain (`uploadVideo`), then streams the file to the API, which stores it in Firebase Storage and saves its metadata (title, description, download URL) in MongoDB.

**Access flow:** clicking *Play* queries the contract's access list. If the wallet has access, the video streams. Otherwise the user is prompted to spend 100 credits via `buyVideo`, which permanently grants access on-chain.

## Features

- **On-chain access control** — per-video access lists in the `videoAccess` mapping; `getVideo` is only callable by authorized addresses
- **Tokenized credit economy** — send ≥ 0.001 ETH to mint 1,000 credits per unit (1M credits per ETH); balances tracked in the `balances` mapping
- **Modern React frontend** — Vite + React 18, React Router, ethers v6, polished dark design system
- **Hardened smart contract** — Solidity 0.8.24, OpenZeppelin `Ownable`, custom errors, checks-effects-interactions, CEI-safe fund transfer, 14 unit tests
- **Structured Express API** — routes / controllers / models / middleware split, zod request validation, centralized error handling, pagination
- **Serverless-ready backend** — multer memory storage + Firebase Admin SDK (no temp files, works on Vercel)
- **Live search** — debounced, case-insensitive title search with proper regex escaping
- **MetaMask integration** — account/chain change listeners, transaction feedback, error extraction
- **Polished UX** — skeleton loaders, toast notifications, purchase modals, drag & drop uploads, empty states, responsive mobile layout

## Monorepo Layout

```
├── client/                     # React + Vite single-page app
│   └── src/
│       ├── components/         # Layout, VideoCard, PurchaseModal, UI primitives
│       ├── context/            # WalletProvider (ethers) + ToastProvider
│       ├── hooks/              # useVideos, useWallet
│       ├── pages/              # Home, VideoDetail, MyVideos, Upload, Wallet
│       ├── api/                # Typed fetch client
│       └── contracts/          # Compiled contract ABI
├── server/                     # Express API
│   └── src/
│       ├── config/             # env validation, MongoDB, Firebase Admin
│       ├── controllers/        # Request handlers with zod validation
│       ├── middleware/         # error, 404, validation
│       ├── models/             # Mongoose schemas
│       ├── routes/             # /api/videos, /api/health
│       ├── services/           # Firebase Storage uploads
│       └── utils/              # asyncHandler, AppError, escapeRegex
├── contracts/                  # Hardhat project
│   ├── contracts/              # StreamingService.sol
│   ├── test/                   # 14 unit tests
│   └── scripts/                # deploy.js
├── vercel.json                 # Vercel serverless + static deployment
└── .env.example                # All required environment variables
```

## Tech Stack

| Layer      | Technology                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| Frontend   | React 18, Vite 6, React Router 6, ethers v6                                  |
| Backend    | Node.js, Express 4, Multer (memory storage), zod                             |
| Storage    | Firebase Admin SDK (video files), MongoDB + Mongoose (metadata)              |
| Blockchain | Solidity 0.8.24, OpenZeppelin v5, Hardhat, ethers v6, MetaMask               |
| Testing    | Hardhat + Chai (contracts)                                                   |
| Deploy     | Vercel (`@vercel/node` + static build), npm workspaces                       |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18.17
- A [MongoDB](https://www.mongodb.com/atlas) database (local or Atlas)
- A [Firebase](https://console.firebase.google.com/) project with **Storage** enabled
- [MetaMask](https://metamask.io/) with a funded test-network account (e.g. Sepolia)

### Environment Variables

Copy `.env.example` to `.env` in the repo root and fill it in:

```bash
cp .env.example .env
```

```bash
# --- Server ---
PORT=3000
CORS_ORIGIN=*

MONGO_SERVER=mongodb+srv://<user>:<password>@cluster.mongodb.net/cryptostream

# Firebase Admin SDK — Firebase console -> Project settings -> Service accounts -> Generate new private key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_BASE64=<base64-encoded-private-key>   # recommended
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# --- Client ---
VITE_CONTRACT_ADDRESS=0xa25d735b938FE3d565F38f49e33e9e0f483bD30E
VITE_API_URL=            # leave empty to use the Vite dev proxy (/api)
```

> **Private key:** either base64-encode the service account key (recommended) or paste it raw with `\n` line breaks into `FIREBASE_PRIVATE_KEY`.

### Installation & Development

```bash
# 1. Clone & install (installs client, server and contracts workspaces)
git clone https://github.com/TMystic/Decentralised-Streaming-Service.git
cd Decentralised-Streaming-Service
npm install

# 2. Configure environment (see above)
cp .env.example .env

# 3. Start everything — API on :3000, React app on :5173
npm run dev
```

Open `http://localhost:5173` (Vite proxies `/api` to the Express server automatically).

### Smart Contract Deployment

```bash
# Compile the contract
npm run compile

# Local network (no deployment needed for tests)
npm run test

# Testnet — set RPC_URL and DEPLOYER_PRIVATE_KEY in .env, then:
npm run deploy:contracts --network=sepolia
```

The deploy script prints the contract address. Point the frontend at it:

```bash
# .env
VITE_CONTRACT_ADDRESS=<deployed-address>
```

Then restart the dev servers. The constructor takes `recipient` — the address that receives ETH from credit purchases (defaults to the deployer).

### Using the App

1. Connect MetaMask via **Connect Wallet** in the header.
2. In **Wallet**, enter ≥ 0.001 ETH and click **Buy Credits** — approve the transaction.
3. Upload a video from the **Upload** page (on-chain registration + file upload with progress).
4. Play videos from **Home**; unlocked videos appear under **My Videos**.

## API Reference

Base path: `/api` — served by the Express backend.

### `GET /api/health`

Liveness probe.

**Response:** `200 OK` — `{ "status": "ok", "uptime": 0.4, "timestamp": "…" }`

### `GET /api/videos`

Paginated list of videos, newest first.

| Query | Type | Default | Description          |
| ----- | ---- | ------- | -------------------- |
| `page` | int  | 1       | Page number          |
| `limit` | int | 12      | Items per page (≤ 50) |

**Response:** `200 OK` — `{ "videos": [...], "pagination": { "page", "limit", "total", "pages" } }`

### `GET /api/videos/search?q=`

Case-insensitive title search with escaped regex input.

**Response:** `200 OK` — `{ "videos": [...] }`

### `GET /api/videos/:id`

Fetch one video by its numeric id.

**Response:** `200 OK` — `{ "video": { ... } }` · `404` — `{ "error": "Video not found" }`

### `POST /api/videos`

Uploads a video file (`multipart/form-data`), stores it in Firebase Storage, and saves metadata to MongoDB.

| Field         | Type   | Required | Description      |
| ------------- | ------ | -------- | ---------------- |
| `videoFile`   | file   | yes      | Video file (≤ 300 MB) |
| `title`       | string | yes      | Video title (≤ 120 chars) |
| `description` | string | yes      | Description (≤ 2000 chars) |

**Response:** `201 Created` — `{ "message": "Video uploaded successfully", "video": { ... } }`

Validation failures return `400` with a `details` array of field-level issues.

## Smart Contract Reference

### `StreamingService` (`contracts/contracts/StreamingService.sol`)

| Function                          | Type    | Cost         | Description                                                |
| --------------------------------- | ------- | ------------ | ---------------------------------------------------------- |
| `buyCredits()`                    | payable | ≥ 0.001 ETH  | Mints 1,000 credits per 0.001 ETH sent; forwards ETH to `recipient` |
| `uploadVideo(title, description)` | public  | —            | Registers a video and grants the uploader access           |
| `buyVideo(videoNumber)`           | public  | 100 credits  | Grants the caller permanent access to a video              |
| `getVideo(_id)`                   | view    | —            | Returns video metadata — reverts if the caller has no access |
| `getAccessList(videoNumber)`      | view    | —            | Lists all addresses with access to a video                 |
| `getVideosByAddress(_addr)`       | view    | —            | Lists video ids an address owns or has purchased           |

**Constants:** `CREDIT_PRICE = 0.001 ether` · `CREDITS_PER_UNIT = 1000` · `VIDEO_COST = 100`

**Events:** `VideoUploaded(id, title, description, uploader)` · `VideoPurchased(videoId, buyer)` · `CreditsPurchased(buyer, ethAmount, credits)`

**Security notes:** funds are forwarded with a raw `call` inside a CEI pattern (reverts on failure instead of silently misbehaving); the recipient address is `immutable`; custom errors keep gas costs low and reverts readable.

### `Ownable`

Provided by OpenZeppelin v5 (`Ownable(msg.sender)`), including `transferOwnership`, `renounceOwnership`, and the `OwnershipTransferred` event.

## Testing

```bash
# Smart contract unit tests (14 tests)
npm run test
```

## Deployment

### Vercel (serverless API + static frontend)

The repo ships with `vercel.json` configured for the monorepo:

```bash
npm i -g vercel
vercel
```

Configure the same environment variables from `.env` in Vercel's dashboard (**Settings → Environment Variables**), including `MONGO_SERVER`, the Firebase Admin credentials, and `VITE_CONTRACT_ADDRESS`.

## Roadmap

- [ ] Streaming / transcoding pipeline (HLS or DASH)
- [ ] Signed-message wallet authentication for the API
- [ ] ERC-20 token instead of the internal credit mapping
- [ ] Creator payout splitting
- [ ] Backend integration tests (supertest + mongodb-memory-server)
- [ ] Docker Compose for local development
- [ ] CI pipeline (lint, test, build on GitHub Actions)

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

This project was built for **educational / hackathon purposes**. It uses test-network ETH only, and the smart contracts have not been audited. Do not use in production without a professional security review.
