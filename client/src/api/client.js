import { API_URL } from "../config.js";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.details = data.details;
    throw error;
  }

  return data;
}

export const videoApi = {
  list: (page = 1, limit = 12) => request(`/videos?page=${page}&limit=${limit}`),
  search: (query) => request(`/videos/search?q=${encodeURIComponent(query)}`),
  get: (id) => request(`/videos/${id}`),
  upload: (formData) =>
    request("/videos", {
      method: "POST",
      body: formData,
    }),
};

export const healthApi = {
  check: () => request("/health"),
};
