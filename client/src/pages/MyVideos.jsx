import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { videoApi } from "../api/client.js";
import { useWallet } from "../context/WalletContext.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import { formatDate, shortenTitle } from "../utils/format.js";

export default function MyVideos() {
  const navigate = useNavigate();
  const { account, getMyVideoIds } = useWallet();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) {
      setVideos([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [ids, data] = await Promise.all([getMyVideoIds(), videoApi.list(1, 50)]);
        if (cancelled) return;
        const mine = data.videos.filter((video) => ids.includes(video.number));
        setVideos(mine);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, getMyVideoIds]);

  if (!account) {
    return (
      <div className="page">
        <h1 className="page-heading">My Videos</h1>
        <p className="page-subheading">Videos you own or have unlocked live here.</p>
        <EmptyState
          title="Wallet not connected"
          description="Connect your MetaMask wallet to see the videos you've unlocked."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-heading">My Videos</h1>
      <p className="page-subheading">
        {videos.length > 0
          ? `You have access to ${videos.length} ${videos.length === 1 ? "video" : "videos"}.`
          : "Videos you own or have unlocked appear here."}
      </p>

      {loading && (
        <div style={{ display: "grid", placeItems: "center", padding: 48 }}>
          <Spinner size={32} />
        </div>
      )}

      {!loading && videos.length === 0 && (
        <EmptyState
          title="Nothing here yet"
          description="Browse the home page and unlock your first video with credits."
          action={
            <button className="btn btn--primary" onClick={() => navigate("/")}>
              Discover videos
            </button>
          }
        />
      )}

      {!loading && videos.length > 0 && (
        <div className="video-grid">
          {videos.map((video) => (
            <MyVideoCard key={video._id} video={video} onOpen={() => navigate(`/video/${video.number}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyVideoCard({ video, onOpen }) {
  return (
    <article className="video-card" onClick={onOpen} style={{ cursor: "pointer" }}>
      <div className="video-card__media">
        <video
          className="video-card__video"
          muted
          playsInline
          preload="metadata"
          src={video.videoPath}
        />
        <span className="video-card__badge">#{video.number}</span>
      </div>
      <div className="video-card__body">
        <h3 className="video-card__title">{shortenTitle(video.title)}</h3>
        <p className="video-card__description">{shortenTitle(video.description, 90)}</p>
        <div className="video-card__meta">
          <span className="muted">{formatDate(video.uploadedAt)}</span>
          <button className="video-card__cta" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            Watch
          </button>
        </div>
      </div>
    </article>
  );
}
