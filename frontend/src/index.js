import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Suppress benign ResizeObserver loop warning that triggers CRA's dev error overlay
if (typeof window !== "undefined") {
  const handler = (e) => {
    const msg = e?.message || e?.reason?.message || "";
    if (typeof msg === "string" && msg.includes("ResizeObserver loop")) {
      e.stopImmediatePropagation();
      e.preventDefault?.();
      return false;
    }
  };
  window.addEventListener("error", handler);
  window.addEventListener("unhandledrejection", handler);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
