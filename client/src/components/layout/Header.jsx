import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext.jsx";
import ConnectWalletButton from "../ui/ConnectWalletButton.jsx";
import "./header.css";

export default function Header({ onMenuClick }) {
  const { credits, ethBalance, account, disconnect } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(search.trim() ? `/?q=${encodeURIComponent(search.trim())}` : "/");
  };

  return (
    <header className="header">
      <button className="header__menu" onClick={onMenuClick} aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </button>

      {location.pathname === "/" && (
        <form className="header__search" onSubmit={submitSearch}>
          <svg className="header__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="search" placeholder="Search videos" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search videos" />
        </form>
      )}

      <div className="header__right">
        {account && (
          <div className="header__stats">
            <div className="header__stat"><span className="header__stat-label">Credits</span><span className="header__stat-value header__stat-value--accent">{credits !== null ? credits.toLocaleString() : "—"}</span></div>
            <div className="header__stat"><span className="header__stat-label">ETH</span><span className="header__stat-value">{ethBalance}</span></div>
          </div>
        )}
        {!account && <ConnectWalletButton />}
        {account && (
          <div className="header__profile" ref={profileRef}>
            <button className="header__avatar" title="Open profile menu" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>{account.slice(2, 4).toUpperCase()}</button>
            {profileOpen && (
              <div className="profile-menu">
                <div className="profile-menu__identity"><span className="profile-menu__status" /><div><strong>Connected wallet</strong><span>{account.slice(0, 6)}…{account.slice(-4)}</span></div></div>
                <Link to="/profile" className="profile-menu__item" onClick={() => setProfileOpen(false)}>Profile & account</Link>
                <Link to="/wallet" className="profile-menu__item" onClick={() => setProfileOpen(false)}>Buy credits</Link>
                <button className="profile-menu__item profile-menu__item--danger" onClick={() => { disconnect(); setProfileOpen(false); }}>Disconnect wallet</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
