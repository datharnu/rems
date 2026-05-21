/**
 * API routing:
 * - Local dev / Docker: same-origin `/api` and `/health` (Vite or nginx proxy).
 * - Split deploy (e.g. Render static site + API): set VITE_API_URL at build time.
 */
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api` : "/api";
export const HEALTH_URL = API_ORIGIN ? `${API_ORIGIN}/health` : "/health";
