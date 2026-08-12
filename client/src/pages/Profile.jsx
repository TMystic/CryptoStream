import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";
import { formatAddress } from "../utils/format.js";
import EmptyState from "../components/ui/EmptyState.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import "./profile.css";

export default function Profile() {
  const { account, credits, ethBalance, getAccountStats } = useWallet();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    if (account) getAccountStats().then((value) => active && setStats(value)).catch(() => active && setStats(null));
    return () => { active = false; };
  }, [account, credits, getAccountStats]);

  if (!account) return <div className="page"><EmptyState title="Connect your wallet" description="Your on-chain profile will appear here." /></div>;

  return (
    <div className="page profile-page">
      <section className="profile-hero card">
        <div className="profile-hero__avatar">{account.slice(2, 4).toUpperCase()}</div>
        <div className="profile-hero__copy"><span className="section-kicker">On-chain profile</span><h1>{formatAddress(account)}</h1><p>{account}</p></div>
        <Link to="/wallet" className="btn btn--primary">Buy credits</Link>
      </section>

      {!stats ? <div className="profile-loading"><Spinner /> Loading account activity…</div> : (
        <>
          <div className="profile-stats">
            <Stat label="Current balance" value={stats.current.toLocaleString()} detail="credits available" accent />
            <Stat label="Credits acquired" value={stats.bought.toLocaleString()} detail="total credited on-chain" />
            <Stat label="Credits spent" value={stats.spent.toLocaleString()} detail="uploads and unlocks" />
            <Stat label="Credits earned" value={stats.earned.toLocaleString()} detail="creator rewards and commission" />
          </div>
          <div className="profile-activity card"><div><span>Videos uploaded</span><strong>{stats.uploaded}</strong></div><div><span>Videos purchased</span><strong>{stats.purchased}</strong></div><div><span>Sepolia ETH</span><strong>{ethBalance}</strong></div></div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, detail, accent = false }) {
  return <article className={`profile-stat card${accent ? " profile-stat--accent" : ""}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
