import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { videoApi } from "../api/client.js";
import { useWallet } from "../context/WalletContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { VIDEO_COST_CREDITS } from "../config.js";
import PurchaseModal from "../components/PurchaseModal.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { formatDate } from "../utils/format.js";
import "./video-detail.css";

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, hasAccess, authorizePlayback, credits, connect } = useWallet();
  const { info: toastInfo, error: toastError } = useToast();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [authorizing, setAuthorizing] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!video || !account) {
      setUnlocked(false);
      return;
    }
    try {
      const granted = await hasAccess(video.number);
      setUnlocked(granted);
    } catch (err) {
      console.error(err);
      toastError("Could not verify access on-chain");
      setUnlocked(false);
    }
  }, [video, account, hasAccess, toastError]);

  const startPlayback = useCallback(async () => {
    if (!video || !account) return;
    setAuthorizing(true);
    try {
      const authorization = await authorizePlayback(video.number);
      const data = await videoApi.playback(video.number, authorization);
      setPlaybackUrl(data.url);
    } catch (err) {
      toastError(err?.code === 4001 ? "Playback authorization was cancelled" : err.message);
    } finally {
      setAuthorizing(false);
    }
  }, [video, account, authorizePlayback, toastError]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    videoApi
      .get(id)
      .then((data) => {
        if (!cancelled) setVideo(data.video);
      })
      .catch((err) => {
        if (!cancelled) toastError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, toastError]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  if (loading) {
    return (
      <div className="video-detail-loading">
        <Spinner size={36} />
      </div>
    );
  }

  if (!video) {
    return (
      <EmptyState
        title="Video not found"
        description="It may have been removed or never existed."
        action={<button className="btn btn--primary" onClick={() => navigate("/")}>Back to home</button>}
      />
    );
  }

  const enoughCredits = credits !== null && credits >= VIDEO_COST_CREDITS;

  return (
    <div className="page">
      <button className="video-detail-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="video-detail">
        <div className="video-detail__player-wrap">
          {unlocked && playbackUrl ? (
            <video className="video-detail__player" controls autoPlay playsInline src={playbackUrl} />
          ) : unlocked ? (
            <div className="video-detail__locked">
              <div className="video-detail__lock-icon video-detail__lock-icon--open">✓</div>
              <h2>You own this video</h2>
              <p>Authorize this playback session with your wallet. Signing is free and does not create a transaction.</p>
              <button className="btn btn--primary" onClick={startPlayback} disabled={authorizing}>
                {authorizing ? "Authorizing…" : "Start secure playback"}
              </button>
            </div>
          ) : (
            <div className="video-detail__locked">
              <div className="video-detail__lock-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2>This video is locked</h2>
              <p>
                Unlock it with {VIDEO_COST_CREDITS.toLocaleString()} credits. Access is granted
                permanently on-chain to your wallet.
              </p>
              {account ? (
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    if (!enoughCredits) {
                      toastInfo("Not enough credits — top up in the Wallet page");
                      navigate("/wallet");
                      return;
                    }
                    setShowPurchase(true);
                  }}
                >
                  Unlock for {VIDEO_COST_CREDITS.toLocaleString()} credits
                </button>
              ) : (
                <button className="btn btn--primary" onClick={connect}>
                  Connect wallet to unlock
                </button>
              )}
            </div>
          )}
        </div>

        <div className="video-detail__info">
          <div className="video-detail__meta-row">
            <span className="badge badge--gradient">#{video.number}</span>
            <span className="muted">{formatDate(video.uploadedAt)}</span>
            {unlocked && <span className="badge badge--success">Unlocked</span>}
          </div>
          <h1 className="video-detail__title">{video.title}</h1>
          <p className="video-detail__description">{video.description}</p>
        </div>
      </div>

      <PurchaseModal video={showPurchase ? video : null} onClose={() => setShowPurchase(false)} />
    </div>
  );
}
