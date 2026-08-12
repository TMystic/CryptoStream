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
  playback: (id, authorization) =>
    request(`/videos/${id}/playback`, {
      method: "POST",
      body: JSON.stringify(authorization),
    }),
  requestUpload: (payload) =>
    request("/videos/upload-request", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  finalizeUpload: (transactionHash) =>
    request("/videos/upload-finalize", {
      method: "POST",
      body: JSON.stringify({ transactionHash }),
    }),
};

export function uploadFile(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed with status ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Storage upload was interrupted")));
    xhr.send(file);
  });
}

export const healthApi = {
  check: () => request("/health"),
};
