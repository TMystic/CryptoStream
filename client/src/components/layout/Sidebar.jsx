import { NavLink } from "react-router-dom";
import "./sidebar.css";

const navItems = [
  { to: "/", label: "Home", icon: <IconHome /> },
  { to: "/my-videos", label: "My Videos", icon: <IconLibrary /> },
  { to: "/upload", label: "Upload", icon: <IconUpload /> },
  { to: "/wallet", label: "Wallet", icon: <IconWallet /> },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div className={`sidebar-scrim ${open ? "sidebar-scrim--visible" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <NavLink to="/" className="sidebar__logo" onClick={onClose}>
          <span className="sidebar__logo-mark">C</span>
          Crypto<span className="sidebar__logo-accent">Stream</span>
        </NavLink>

        <nav className="sidebar__nav">
          <p className="sidebar__label">Browse</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              onClick={onClose}
            >
              <span className="sidebar__icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__footer-card">
            <p className="sidebar__footer-kicker">Protocol note</p>
            <p className="sidebar__footer-title">Your wallet is the key.</p>
            <p className="sidebar__footer-text">
              Purchases grant permanent on-chain access. Playback links remain private and short-lived.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
      <polyline points="8 10 12 14 16 10" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  );
}
