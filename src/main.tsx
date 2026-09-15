import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CHUNK_RELOAD_KEY = "vanguard:chunk-reload";
const CHUNK_ERROR_PATTERN = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i;

const recoverFromOutdatedChunk = (event: Event | PromiseRejectionEvent) => {
  const preloadEvent = event as Event & { payload?: unknown };
  const reason = event instanceof PromiseRejectionEvent ? event.reason : preloadEvent.payload;
  const message = reason instanceof Error ? reason.message : String(reason ?? "");

  if (!CHUNK_ERROR_PATTERN.test(message)) return;

  const reloadKey = `${window.location.pathname}${window.location.search}`;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === reloadKey) return;

  event.preventDefault();
  sessionStorage.setItem(CHUNK_RELOAD_KEY, reloadKey);
  window.location.reload();
};

// A deployment can invalidate a page chunk that an already-open tab still references.
// Reload once so the browser receives the current entry file and its new chunk names.
window.addEventListener("vite:preloadError", recoverFromOutdatedChunk);
window.addEventListener("unhandledrejection", recoverFromOutdatedChunk);

window.setTimeout(() => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}, 10_000);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
