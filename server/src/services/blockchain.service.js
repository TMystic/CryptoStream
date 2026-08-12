import { Contract, Interface, JsonRpcProvider, Wallet, getAddress, verifyMessage } from "ethers";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const abi = [
  "event VideoUploaded(uint256 indexed id, string title, string description, address indexed uploader)",
  "function hasVideoAccess(uint256 videoId, address viewer) view returns (bool)",
  "function sponsoredUploadVideo(address uploader,string title,string description,uint256 deadline,bytes signature)",
  "function sponsoredBuyVideo(address buyer,uint256 videoNumber,uint256 deadline,bytes signature)",
];

const iface = new Interface(abi);
let provider;
let contract;
let relayerContract;

function getChainClient() {
  if (!env.rpcUrl || !env.contractAddress) {
    throw new AppError(503, "Blockchain verification is not configured");
  }
  provider ||= new JsonRpcProvider(env.rpcUrl, env.chainId, { staticNetwork: true });
  contract ||= new Contract(env.contractAddress, abi, provider);
  return { provider, contract };
}

function getRelayerContract() {
  const { provider: rpc } = getChainClient();
  if (!env.relayerPrivateKey) throw new AppError(503, "Sponsored transactions are not configured");
  relayerContract ||= new Contract(env.contractAddress, abi, new Wallet(env.relayerPrivateKey, rpc));
  return relayerContract;
}

export async function relayUpload({ uploader, title, description, deadline, signature }) {
  const streaming = getRelayerContract();
  await streaming.sponsoredUploadVideo.staticCall(uploader, title, description, deadline, signature);
  const tx = await streaming.sponsoredUploadVideo(uploader, title, description, deadline, signature);
  const receipt = await tx.wait();
  const event = receipt.logs.map((log) => {
    try { return iface.parseLog(log); } catch { return null; }
  }).find((entry) => entry?.name === "VideoUploaded");
  if (!event) throw new AppError(500, "Sponsored upload was confirmed without a registration event");
  return { transactionHash: receipt.hash, number: Number(event.args.id) };
}

export async function relayPurchase({ buyer, videoNumber, deadline, signature }) {
  const streaming = getRelayerContract();
  await streaming.sponsoredBuyVideo.staticCall(buyer, videoNumber, deadline, signature);
  const tx = await streaming.sponsoredBuyVideo(buyer, videoNumber, deadline, signature);
  const receipt = await tx.wait();
  return { transactionHash: receipt.hash };
}

export async function verifyVideoRegistration({ transactionHash, number, title, description, uploader }) {
  const { provider: rpc } = getChainClient();
  const receipt = await rpc.getTransactionReceipt(transactionHash);
  if (!receipt || receipt.status !== 1) throw new AppError(400, "Registration transaction is not confirmed");
  if (receipt.to?.toLowerCase() !== env.contractAddress.toLowerCase()) {
    throw new AppError(400, "Transaction was sent to a different contract");
  }

  const event = receipt.logs
    .map((log) => {
      try { return iface.parseLog(log); } catch { return null; }
    })
    .find((entry) => entry?.name === "VideoUploaded");

  if (!event) throw new AppError(400, "Transaction does not contain a video registration");
  const matches =
    Number(event.args.id) === number &&
    event.args.title === title &&
    event.args.description === description &&
    event.args.uploader.toLowerCase() === uploader.toLowerCase();
  if (!matches) throw new AppError(400, "Uploaded metadata does not match the on-chain registration");
}

export function playbackMessage({ number, address, expiresAt }) {
  return [
    "CryptoStream playback authorization",
    `Video: ${number}`,
    `Wallet: ${address.toLowerCase()}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
}

export async function verifyPlaybackAuthorization({ number, address, expiresAt, signature }) {
  const now = Date.now();
  if (expiresAt <= now || expiresAt > now + 10 * 60 * 1000) {
    throw new AppError(401, "Playback authorization has expired");
  }

  let normalized;
  try { normalized = getAddress(address); } catch { throw new AppError(400, "Invalid wallet address"); }
  const recovered = verifyMessage(playbackMessage({ number, address: normalized, expiresAt }), signature);
  if (recovered.toLowerCase() !== normalized.toLowerCase()) {
    throw new AppError(401, "Invalid playback signature");
  }

  const { contract: streaming } = getChainClient();
  if (!(await streaming.hasVideoAccess(number, normalized))) {
    throw new AppError(403, "This wallet does not have access to the video");
  }
}
