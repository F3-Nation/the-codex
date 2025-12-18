"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Robust iframe detection with error handling for cross-origin scenarios
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      // If accessing window.top throws an error, we're definitely in a cross-origin iframe
      setIsInIframe(true);
    }
  }, []);

  return (
    <>
      {!isInIframe && <Header />}
      <main className="flex-grow">{children}</main>
      {!isInIframe && <Footer />}
    </>
  );
}
