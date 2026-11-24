import { createContext, useContext, type ReactNode } from "react";

/**
 * Container untuk komponen Radix yang memakai portal (Select, Tooltip, Dialog, ...).
 *
 * Di popup/dashboard nilainya null → portal ke document.body (default).
 * Di content script nilainya uiContainer di dalam Shadow DOM, supaya style tetap kebawa.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export interface PortalContainerProviderProps {
  container: HTMLElement | null;
  children?: ReactNode;
}

export function PortalContainerProvider({ container, children }: PortalContainerProviderProps) {
  return (
    <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
  );
}

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
