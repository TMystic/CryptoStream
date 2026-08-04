import { useWallet } from "../../context/WalletContext.jsx";
import { formatAddress } from "../../utils/format.js";

export default function ConnectWalletButton() {
  const { account, connecting, connect, disconnect } = useWallet();

  if (account) {
    return (
      <button className="btn btn--ghost btn--sm" onClick={disconnect} title={account}>
        <span className="badge badge--success" style={{ padding: "2px 8px" }}>
          ●
        </span>
        {formatAddress(account)}
      </button>
    );
  }

  return (
    <button className="btn btn--primary btn--sm" onClick={connect} disabled={connecting}>
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
