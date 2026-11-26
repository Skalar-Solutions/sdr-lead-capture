import { Toaster } from "@sdr/ui/components/ui/sonner";
import { TooltipProvider } from "@sdr/ui/components/ui/tooltip";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "@/assets/app.css";

const container = document.getElementById("root");
if (!container) throw new Error("Elemen #root tidak ditemukan");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
      <Toaster position="top-center" closeButton />
    </TooltipProvider>
  </React.StrictMode>,
);
