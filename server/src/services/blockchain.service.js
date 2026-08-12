import { Contract, Interface, JsonRpcProvider, getAddress, verifyMessage } from "ethers";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const abi = [
  "event VideoUploaded(uint256 indexed id, string title, string description, address indexed uploader)",
  "function hasVideoAccess(uint256 videoId, address viewer) view returns (bool)",
];

const iface = new Interface(abi);
let provider;
let contract;

function getChainClient() {
  if (!env.rpcUrl || !env.contractAddress) {
    throw new AppError(503, "Blockchain verification is not configured");
  }
  provider ||= new JsonRpcProvider(env.rpcUrl, env.chainId, { staticNetwork: true });
  contract ||= new Contract(env.contractAddress, abi, provider);
  return { provider, contract };
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
