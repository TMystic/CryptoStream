import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "../../context/WalletContext.jsx";
import ConnectWalletButton from "../ui/ConnectWalletButton.jsx";
import "./header.css";

export default function Header({ onMenuClick }) {
  const { credits, ethBalance, account } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const submitSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) {
      if (location.pathname === "/") navigate("/");
      return;
    }
    navigate(`/?q=${encodeURIComponent(search.trim())}`);
  };

  const showSearch = location.pathname === "/";

  return (
    <header className="header">
      <button className="header__menu" onClick={onMenuClick} aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {showSearch && (
        <form className="header__search" onSubmit={submitSearch}>
          <svg className="header__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search videos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search videos"
          />
        </form>
      )}

      <div className="header__right">
        {account && (
          <div className="header__stats">
            <div className="header__stat" title="Credit balance">
              <span className="header__stat-label">Credits</span>
              <span className="header__stat-value header__stat-value--accent">
                {credits !== null ? credits.toLocaleString() : "—"}
              </span>
            </div>
            <div className="header__stat" title="ETH balance">
              <span className="header__stat-label">ETH</span>
              <span className="header__stat-value">{ethBalance}</span>
            </div>
          </div>
        )}
        <ConnectWalletButton />
        {account && (
          <div className="header__avatar" title={account}>
            {account.slice(0, 2)}
          </div>
        )}
      </div>
    </header>
  );
}
