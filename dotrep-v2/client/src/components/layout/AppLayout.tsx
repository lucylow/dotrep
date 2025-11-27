import { ReactNode } from "react";
import { UnifiedSidebar } from "./UnifiedSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * AppLayout - Consistent layout wrapper for all dApp pages
 * Provides sidebar navigation and header for all pages except landing
 */
export function AppLayout({ children }: AppLayoutProps) {
  return <UnifiedSidebar>{children}</UnifiedSidebar>;
}

