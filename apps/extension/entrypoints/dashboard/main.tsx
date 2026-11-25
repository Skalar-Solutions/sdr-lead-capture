import { Toaster } from "@sdr/ui/components/ui/sonner";
import { TooltipProvider } from "@sdr/ui/components/ui/tooltip";
import React from "react";
import ReactDOM from "react-dom/client";

import DashboardApp from "./DashboardApp";
import "@/assets/app.css";

const container = document.getElementById("root");
if (!container) throw new Error("Elemen #root tidak ditemukan");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <TooltipProvider>
      <DashboardApp />
      <Toaster richColors position="top-center" />
    </TooltipProvider>
  </React.StrictMode>,
);
