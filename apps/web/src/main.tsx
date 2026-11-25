import { Toaster } from "@sdr/ui/components/ui/sonner";
import { TooltipProvider } from "@sdr/ui/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { bootstrapTokenFromHash } from "./lib/api";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

bootstrapTokenFromHash();

const container = document.getElementById("root");
if (!container) throw new Error("Elemen #root tidak ditemukan");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <App />
        <Toaster richColors position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
