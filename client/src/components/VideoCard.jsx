import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate, shortenTitle } from "../utils/format.js";
import PurchaseModal from "./PurchaseModal.jsx";
import "./video-card.css";

export default function VideoCard({ video }) {
  const navigate = useNavigate();
  const { account, hasAccess, busy } = useWallet();
  const { info: toastInfo, error: toastError } = useToast();
  const [locked, setLocked] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleClick = async () => {
    if (!account) {
      toastInfo("Connect your wallet to play videos");
      return;
    }
    setChecking(true);
    try {
      const granted = await hasAccess(video.number);
      if (granted) {
        navigate(`/video/${video.number}`);
      } else {
        setLocked(video);
      }
    } catch (err) {
      toastError("Could not verify access. Is the contract deployed on this network?");
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <article className="video-card">
        <div className="video-card__media">
          <div className="video-card__art" aria-hidden="true"><span>CS</span></div>
          <div className="video-card__overlay">
            <button
              className="video-card__play"
              onClick={handleClick}
              disabled={checking || busy}
              aria-label={`Play ${video.title}`}
            >
              {checking ? (
                <span className="video-card__spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.14v13.72c0 .81.9 1.3 1.58.86l10.7-6.86c.64-.41.64-1.32 0-1.73L9.58 4.28A1 1 0 0 0 8 5.14z" />
                </svg>
              )}
            </button>
          </div>
          <span className="video-card__badge">{video.number}</span>
        </div>

        <div className="video-card__body">
          <h3 className="video-card__title" title={video.title}>
            {shortenTitle(video.title)}
          </h3>
          <p className="video-card__description">{shortenTitle(video.description, 90)}</p>
          <div className="video-card__meta">
            <span className="muted">{formatDate(video.uploadedAt)}</span>
            <button className="video-card__cta" onClick={handleClick} disabled={checking || busy}>
              Play
            </button>
          </div>
        </div>
      </article>

      <PurchaseModal video={locked} onClose={() => setLocked(null)} />
    </>
  );
}
