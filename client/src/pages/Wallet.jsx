import { useState } from "react";
import { useWallet } from "../context/WalletContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import "./wallet.css";

export default function Wallet() {
  const { account, credits, ethBalance, buyCredits, busy } = useWallet();
  const { error: toastError } = useToast();
  const [amount, setAmount] = useState("");

  const handleBuy = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < 0.001) {
      toastError("Minimum purchase is 0.001 ETH");
      return;
    }
    try {
      await buyCredits(value.toFixed(6));
    } catch {
      // error already toasted by the context
    }
  };

  if (!account) {
    return (
      <div className="page">
        <h1 className="page-heading">Wallet</h1>
        <p className="page-subheading">Top up credits with test ETH and manage your balances.</p>
        <EmptyState
          title="Wallet not connected"
          description="Connect your MetaMask wallet to see your balances and buy credits."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-heading">Wallet</h1>
      <p className="page-subheading">
        Send test ETH to mint credits. 1,000 credits are minted per 0.001 ETH.
      </p>

      <div className="wallet-grid">
        <div className="wallet-card card">
          <div className="wallet-card__label">
            <span className="wallet-card__dot wallet-card__dot--accent" />
            Credit Balance
          </div>
          <div className="wallet-card__value wallet-card__value--accent">
            {credits !== null ? credits.toLocaleString() : "—"}
          </div>
          <div className="wallet-card__sub">1 credit ≈ 1 point · videos cost 100</div>
        </div>

        <div className="wallet-card card">
          <div className="wallet-card__label">
            <span className="wallet-card__dot" />
            ETH Balance
          </div>
          <div className="wallet-card__value">{ethBalance} ETH</div>
          <div className="wallet-card__sub">Connected wallet balance</div>
        </div>
      </div>

      <div className="wallet-buy card">
        <h2 className="wallet-buy__title">Buy Credits</h2>
        <p className="wallet-buy__text">
          Purchase credits with test ETH. Funds are forwarded to the platform recipient and credits
          are minted on-chain to your wallet.
        </p>

        <form className="wallet-buy__form" onSubmit={handleBuy}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label className="field__label" htmlFor="amount">Amount (ETH)</label>
            <input
              id="amount"
              className="field__input"
              type="number"
              min="0.001"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Minimum 0.001 ETH"
            />
          </div>
          <button type="submit" className="btn btn--primary wallet-buy__btn" disabled={busy}>
            {busy ? "Processing…" : "Buy Credits"}
          </button>
        </form>

        <div className="wallet-buy__estimate">
          <span>You receive</span>
          <strong>
            {Math.max(0, Math.floor((Number(amount) || 0) / 0.001)) * 1000}
            <span className="wallet-buy__estimate-unit"> credits</span>
          </strong>
        </div>
      </div>
    </div>
  );
}
