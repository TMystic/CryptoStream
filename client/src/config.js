export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || "0xF4260c4Ed0bfccdcB2244e0B816eE0A11e81c389";

export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";

export const VIDEO_COST_CREDITS = 100;
