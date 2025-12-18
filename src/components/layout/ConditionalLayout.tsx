"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const searchParams = useSearchParams();
  const embeddedParam = searchParams.get("embedded") === "true";

  const [programmaticIframeDetected, setProgrammaticIframeDetected] = useState(false);

  useEffect(() => {
    // Skip programmatic detection if URL parameter is already set
    if (embeddedParam || programmaticIframeDetected) {
      return;
    }

    // Detect iframe programmatically as fallback
    // This only runs once on mount to check browser state
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch (e) {
      // If accessing window.top throws an error, we're definitely in a cross-origin iframe
      inIframe = true;
    }

    if (inIframe) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgrammaticIframeDetected(true);
    }
  }, [embeddedParam, programmaticIframeDetected]);

  const isInIframe = embeddedParam || programmaticIframeDetected;

  return (
    <>
      {!isInIframe && <Header />}
      <main className="flex-grow">{children}</main>
      {!isInIframe && <Footer />}
    </>
  );
}
