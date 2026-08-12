import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, ethers, formatEther } from "ethers";
import { CHAIN_ID, CHAIN_NAME, CONTRACT_ADDRESS, VIDEO_COST_CREDITS } from "../config.js";
import contractAbi from "../contracts/StreamingService.json";
import { useToast } from "./ToastContext.jsx";
import { transactionApi } from "../api/client.js";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { error: toastError, success: toastSuccess } = useToast();

  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [credits, setCredits] = useState(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const hasWallet = typeof window !== "undefined" && Boolean(window.ethereum);

  const refreshBalances = useCallback(
    async (addr, instance) => {
      if (!addr || !instance || !window.ethereum) return;

      try {
        const provider = new BrowserProvider(window.ethereum);
        const [balanceWei, creditsWei] = await Promise.all([
          provider.getBalance(addr),
          instance.balances(addr),
        ]);
        setEthBalance(Number(formatEther(balanceWei)).toFixed(4));
        setCredits(Number(creditsWei));
      } catch (err) {
        console.error("Failed to fetch balances:", err);
      }
    },
    []
  );

  const connect = useCallback(async () => {
    if (!hasWallet) {
      setError("MetaMask not detected. Install MetaMask to continue.");
      toastError("MetaMask not detected. Please install it.");
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        throw new Error(`Wrong network. Switch MetaMask to ${CHAIN_NAME} (chain ${CHAIN_ID}).`);
      }
      const signer = await provider.getSigner();
      const address = accounts[0];

      if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        throw new Error("The streaming contract address is not configured.");
      }

      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") throw new Error(`No streaming contract was found on ${CHAIN_NAME}.`);

      const instance = new Contract(CONTRACT_ADDRESS, contractAbi, signer);
      setContract(instance);
      setAccount(address);
      await refreshBalances(address, instance);
      toastSuccess(`Wallet connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      const reason = extractError(err);
      setError(reason);
      toastError(reason);
    } finally {
      setConnecting(false);
    }
  }, [hasWallet, refreshBalances, toastSuccess]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setContract(null);
    setCredits(null);
    setEthBalance("0");
    setError(null);
  }, []);

  const buyCredits = useCallback(
    async (amountEth) => {
      if (!contract || !account) throw new Error("Wallet not connected");

      setBusy(true);
      try {
        const value = ethers.parseEther(amountEth);
        const provider = contract.runner?.provider;
        if (!provider) throw new Error("Wallet provider is unavailable. Reconnect your wallet.");

        const [minimum, walletBalance] = await Promise.all([
          contract.CREDIT_PRICE(),
          provider.getBalance(account),
        ]);
        if (value < minimum) {
          throw new Error(`Minimum purchase is ${ethers.formatEther(minimum)} ETH`);
        }
        if (walletBalance <= value) {
          throw new Error(
            `Insufficient Sepolia ETH. Your wallet has ${Number(ethers.formatEther(walletBalance)).toFixed(6)} ETH, which must cover both the purchase and gas.`
          );
        }

        // A read-only simulation produces a useful contract error before MetaMask opens.
        await contract.buyCredits.staticCall({ value });

        let gasLimit;
        try {
          const estimate = await contract.buyCredits.estimateGas({ value });
          gasLimit = (estimate * 120n) / 100n;
        } catch {
          // Some wallet RPCs fail to estimate payable calls even when eth_call succeeds.
          gasLimit = 150_000n;
        }

        const feeData = await provider.getFeeData();
        const feePerGas = feeData.maxFeePerGas || feeData.gasPrice || 0n;
        const requiredBalance = value + gasLimit * feePerGas;
        if (walletBalance < requiredBalance) {
          throw new Error(
            `Insufficient Sepolia ETH. You need about ${Number(ethers.formatEther(requiredBalance)).toFixed(6)} ETH including gas.`
          );
        }

        const tx = await contract.buyCredits({ value, gasLimit });
        await tx.wait();
        await refreshBalances(account, contract);
        toastSuccess(`Purchased credits with ${amountEth} ETH`);
      } catch (err) {
        const reason = extractError(err);
        toastError(`Credit purchase failed: ${reason}`);
        throw new Error(reason, { cause: err });
      } finally {
        setBusy(false);
      }
    },
    [contract, account, refreshBalances, toastSuccess, toastError]
  );

  const buyVideo = useCallback(
    async (videoNumber) => {
      if (!contract || !account) throw new Error("Wallet not connected");

      setBusy(true);
      try {
        const currentCredits = Number(await contract.balances(account));
        if (currentCredits < VIDEO_COST_CREDITS) {
          throw new Error(
            `Insufficient credits. This wallet has ${currentCredits} credits and needs ${VIDEO_COST_CREDITS}.`
          );
        }
        const deadline = Math.floor(Date.now() / 1000) + 10 * 60;
        const nonce = await contract.nonces(account);
        const digest = await contract.purchaseAuthorizationHash(account, videoNumber, nonce, deadline);
        const signer = await new BrowserProvider(window.ethereum).getSigner();
        const signature = await signer.signMessage(ethers.getBytes(digest));
        await transactionApi.purchase({ buyer: account, videoNumber, deadline, signature });
        setCredits(currentCredits - VIDEO_COST_CREDITS);
        window.setTimeout(() => refreshBalances(account, contract), 1500);
        toastSuccess("Video unlocked successfully!");
        return true;
      } catch (err) {
        toastError(`Purchase failed: ${extractError(err)}`);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [contract, account, refreshBalances, toastSuccess, toastError]
  );

  const sponsorUpload = useCallback(async (title, description) => {
    if (!contract || !account) throw new Error("Wallet not connected");
    const existing = await transactionApi.recoverUpload({ uploader: account, title, description });
    if (existing.registration) {
      return existing.registration;
    }
    const deadline = Math.floor(Date.now() / 1000) + 10 * 60;
    const nonce = await contract.nonces(account);
    const digest = await contract.uploadAuthorizationHash(account, title, description, nonce, deadline);
    const signer = await new BrowserProvider(window.ethereum).getSigner();
    const signature = await signer.signMessage(ethers.getBytes(digest));
    const result = await transactionApi.upload({ uploader: account, title, description, deadline, signature });
    await refreshBalances(account, contract);
    return result;
  }, [contract, account, refreshBalances]);

  const hasAccess = useCallback(
    async (videoNumber) => {
      if (!contract || !account) return false;
      return contract.hasVideoAccess(videoNumber, account);
    },
    [contract, account]
  );

  const authorizePlayback = useCallback(
    async (videoNumber) => {
      if (!account || !window.ethereum) throw new Error("Wallet not connected");
      const expiresAt = Date.now() + 5 * 60 * 1000;
      const message = [
        "CryptoStream playback authorization",
        `Video: ${videoNumber}`,
        `Wallet: ${account.toLowerCase()}`,
        `Expires: ${expiresAt}`,
      ].join("\n");
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const signature = await signer.signMessage(message);
      return { address: account, expiresAt, signature };
    },
    [account]
  );

  const getMyVideoIds = useCallback(async () => {
    if (!contract || !account) return [];
    const ids = await contract.getVideosByAddress(account);
    return ids.map(Number);
  }, [contract, account]);

  const getAccountStats = useCallback(async () => {
    if (!contract || !account) return null;
    const [ids, currentBalance] = await Promise.all([
      contract.getVideosByAddress(account),
      contract.balances(account),
    ]);
    const records = await Promise.all(ids.map((id) => contract.videos(id)));
    const uploaded = records.filter((video) => video[3].toLowerCase() === account.toLowerCase()).length;
    const purchased = records.length - uploaded;
    const spent = (uploaded + purchased) * VIDEO_COST_CREDITS;
    return { uploaded, purchased, spent, bought: Number(currentBalance) + spent, earned: 0, current: Number(currentBalance) };
  }, [contract, account]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== account) {
        window.location.reload();
      }
    };
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [account, disconnect]);

  const value = useMemo(
    () => ({
      account,
      contract,
      credits,
      ethBalance,
      connecting,
      busy,
      error,
      hasWallet,
      connect,
      disconnect,
      buyCredits,
      buyVideo,
      hasAccess,
      getMyVideoIds,
      getAccountStats,
      authorizePlayback,
      sponsorUpload,
      refreshBalances,
    }),
    [
      account,
      contract,
      credits,
      ethBalance,
      connecting,
      busy,
      error,
      hasWallet,
      connect,
      disconnect,
      buyCredits,
      buyVideo,
      hasAccess,
      getMyVideoIds,
      getAccountStats,
      authorizePlayback,
      sponsorUpload,
      refreshBalances,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function extractError(err) {
  const message = err?.shortMessage || err?.message || "Unknown error";
  if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
    return "transaction was cancelled in MetaMask";
  }
  if (err?.code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(message)) {
    return "not enough Sepolia ETH for the purchase and network fee";
  }
  if (err?.code === "CALL_EXCEPTION" && (!err?.data || err.data === "0x")) {
    return "the wallet could not simulate this purchase; reconnect MetaMask and confirm Sepolia is selected";
  }
  if (message.includes("insufficient credits") || message.includes("InsufficientCredits")) {
    return "not enough credits — top up in the Wallet page";
  }
  if (message.includes("already have access") || message.includes("AlreadyHasAccess")) {
    return "you already have access to this video";
  }
  return message.replace(/^execution reverted: /, "");
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within a WalletProvider");
  return context;
}
