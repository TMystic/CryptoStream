import app from "../../server/src/index.js";

// Client-root production entrypoint bundles the shared API and runtime diagnostics.
export default function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path || "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
  }
  const query = params.toString();
  req.url = `/api/${path}${query ? `?${query}` : ""}`;
  return app(req, res);
}
