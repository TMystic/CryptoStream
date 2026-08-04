import { useCallback, useEffect, useState } from "react";
import { videoApi } from "../api/client.js";

export function useVideos({ initialQuery = "" } = {}) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [query, setQuery] = useState(initialQuery);

  const load = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = query ? await videoApi.search(query) : await videoApi.list(pageNum);
        setVideos((prev) => (pageNum === 1 ? data.videos : [...prev, ...data.videos]));
        setPagination(data.pagination);
        setPage(pageNum);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, load]);

  return {
    videos,
    loading,
    error,
    page,
    pagination,
    query,
    setQuery,
    reload: () => load(page),
    loadMore: () => load(page + 1),
  };
}
