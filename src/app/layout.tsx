import type { Metadata } from "next";
import "./globals.css";
import "@/styles/tiptap.css";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { Toaster } from "@/components/ui/toaster";
import { Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F3 Codex - Exicon & Lexicon",
  description: "The official Exicon and Lexicon for F3 Nation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-27VKFXK661"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-27VKFXK661');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen relative`}
        suppressHydrationWarning={true}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster />

        <Script id="iframe-height-reporter" strategy="afterInteractive">
          {`
            let lastHeight = 0;
            let isInIframe = false;

            // Check if we're in an iframe
            try {
              isInIframe = window !== window.parent;
            } catch (e) {
              isInIframe = true;
            }

            // Remove min-height constraint when in iframe to prevent double scroll
            if (isInIframe) {
              document.documentElement.style.height = 'auto';
              document.body.style.minHeight = 'auto';
              document.body.style.height = 'auto';
            }

            function sendHeight() {
              const height = Math.max(
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight,
                document.body.scrollHeight,
                document.body.offsetHeight
              );

              if (height !== lastHeight && isInIframe) {
                lastHeight = height;
                window.parent.postMessage({
                  type: 'frameHeight',
                  frameHeight: height
                }, "https://f3nation.com");
              }
            }

            if (isInIframe) {
              // Send height on various events
              window.addEventListener("load", sendHeight);
              window.addEventListener("resize", sendHeight);
              window.addEventListener("DOMContentLoaded", sendHeight);

              // Enhanced mutation observer for content changes
              const observer = new MutationObserver(() => {
                // Debounce the height calculation
                setTimeout(sendHeight, 100);
              });

              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class'],
                characterData: true
              });

              // Additional polling as fallback
              setInterval(sendHeight, 1000);

              // Initial height send
              setTimeout(sendHeight, 500);
            }
          `}
        </Script>
      </body>
    </html>
  );
}
