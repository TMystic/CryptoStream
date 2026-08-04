import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVideos } from "../hooks/useVideos.js";
import { videoApi } from "../api/client.js";
import VideoCard from "../components/VideoCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import "./home.css";

const SKELETON_COUNT = 8;

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const { videos, loading, error, pagination, loadMore } = useVideos({ initialQuery });

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim() === "") {
      navigate("/");
    }
  };

  // Debounced search driven from the home page's own input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== initialQuery) {
        const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "/";
        window.history.replaceState(null, "", params);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, initialQuery]);

  return (
    <div className="page">
      <div className="home-head">
        <div>
          <h1 className="page-heading">{query ? `Results for “${query}”` : "Discover Videos"}</h1>
          <p className="page-subheading">
            {query
              ? "Videos matching your search."
              : "Watch what you buy, own what you watch — access controlled by the blockchain."}
          </p>
        </div>
        <div className="home-search">
          <svg className="home-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search videos…"
            value={query}
            onChange={handleSearch}
            aria-label="Search videos"
          />
        </div>
      </div>

      {loading && <VideoGridSkeleton />}

      {!loading && error && (
        <EmptyState title="Couldn't load videos" description={error} />
      )}

      {!loading && !error && videos.length === 0 && (
        <EmptyState
          title={query ? "No results" : "No videos yet"}
          description={
            query
              ? "Try a different search term."
              : "Be the first to upload a video and earn credits."
          }
        />
      )}

      {!loading && !error && videos.length > 0 && (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video._id || video.number} video={video} />
            ))}
          </div>

          {pagination && pagination.page < pagination.pages && (
            <div className="home-load-more">
              <button className="btn btn--ghost" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VideoGridSkeleton() {
  return (
    <div className="video-grid">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="video-card">
          <div className="skeleton" style={{ aspectRatio: "16 / 9" }} />
          <div style={{ padding: 16 }}>
            <div className="skeleton" style={{ height: 16, width: "80%", marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 14 }} />
            <div className="skeleton" style={{ height: 30, width: "100%", borderRadius: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
