"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const isInIframe = typeof window !== "undefined" && window !== window.parent;

  return (
    <>
      {!isInIframe && <Header />}
      <main className="flex-grow">{children}</main>
      {!isInIframe && <Footer />}
    </>
  );
}
