import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVideos } from "../hooks/useVideos.js";
import VideoCard from "../components/VideoCard.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import "./home.css";

const SKELETON_COUNT = 8;

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const { videos, loading, error, pagination, query, setQuery, loadMore } = useVideos({ initialQuery });

  useEffect(() => setQuery(initialQuery), [initialQuery, setQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== initialQuery) {
        navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/", { replace: true });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, initialQuery, navigate]);

  return (
    <div className="page">
      <div className="home-head">
        <div>
          <h1 className="page-heading">{query ? `Search results for “${query}”` : "Home"}</h1>
          <p className="page-subheading">{query ? "Videos matching your search." : "Videos recommended for you"}</p>
        </div>
      </div>

      {loading && <VideoGridSkeleton />}
      {!loading && error && <EmptyState title="Couldn't load videos" description={error} />}
      {!loading && !error && videos.length === 0 && (
        <EmptyState title={query ? "No results" : "No videos yet"} description={query ? "Try a different search term." : "Be the first to upload a video."} />
      )}
      {!loading && !error && videos.length > 0 && (
        <>
          <div className="video-grid">{videos.map((video) => <VideoCard key={video._id || video.number} video={video} />)}</div>
          {pagination && pagination.page < pagination.pages && <div className="home-load-more"><button className="btn btn--ghost" onClick={loadMore}>Load more</button></div>}
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
          <div style={{ padding: 16 }}><div className="skeleton" style={{ height: 16, width: "80%", marginBottom: 10 }} /><div className="skeleton" style={{ height: 12, width: "60%", marginBottom: 14 }} /><div className="skeleton" style={{ height: 30, width: "100%", borderRadius: 8 }} /></div>
        </div>
      ))}
    </div>
  );
}
