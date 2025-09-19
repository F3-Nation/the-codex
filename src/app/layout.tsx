import type { Metadata } from 'next';
import './globals.css';
import { ConditionalLayout } from '@/components/layout/ConditionalLayout';
import { Toaster } from '@/components/ui/toaster';
import { Geist } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import Script from 'next/script';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'F3 Codex - Exicon & Lexicon',
  description: 'The official Exicon and Lexicon for F3 Nation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col relative`}
        suppressHydrationWarning={true}
      >
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster />

        <Script id="iframe-height-reporter" strategy="afterInteractive">
          {`
            let lastHeight = 0;
            let isInIframe = false;
            let resizeObserver = null;

            // Check if we're in an iframe
            try {
              isInIframe = window !== window.parent;
            } catch (e) {
              isInIframe = true;
            }

            // Remove height constraints when in iframe to prevent double scroll
            if (isInIframe) {
              document.documentElement.style.height = 'auto';
              document.documentElement.style.minHeight = 'auto';
              document.body.style.minHeight = 'auto';
              document.body.style.height = 'auto';

              // Remove any overflow constraints
              document.documentElement.style.overflow = 'visible';
              document.body.style.overflow = 'visible';
            }

            function getAccurateHeight() {
              // Wait for layout to settle
              return new Promise((resolve) => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const height = Math.max(
                      document.documentElement.scrollHeight,
                      document.documentElement.offsetHeight,
                      document.body.scrollHeight,
                      document.body.offsetHeight
                    );
                    resolve(height);
                  });
                });
              });
            }

            async function sendHeight() {
              if (!isInIframe) return;

              const height = await getAccurateHeight();

              if (height !== lastHeight && height > 0) {
                lastHeight = height;

                // Send additional device context for responsive handling
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                              || window.innerWidth <= 768;

                window.parent.postMessage({
                  type: 'frameHeight',
                  data: height,
                  deviceInfo: {
                    isMobile: isMobile,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    isLandscape: window.innerWidth > window.innerHeight
                  }
                }, "*");
              }
            }

            if (isInIframe) {
              // Send height on key events
              window.addEventListener("load", () => setTimeout(sendHeight, 100));
              window.addEventListener("resize", sendHeight);
              window.addEventListener("DOMContentLoaded", sendHeight);

              // Use ResizeObserver for more accurate height detection
              if (window.ResizeObserver) {
                resizeObserver = new ResizeObserver(() => {
                  setTimeout(sendHeight, 50);
                });
                resizeObserver.observe(document.body);
                resizeObserver.observe(document.documentElement);
              }

              // Enhanced mutation observer for content changes
              const observer = new MutationObserver(() => {
                setTimeout(sendHeight, 50);
              });

              observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class'],
                characterData: true
              });

              // Initial height sends with progressive delays
              setTimeout(sendHeight, 100);
              setTimeout(sendHeight, 500);
              setTimeout(sendHeight, 1000);
              setTimeout(sendHeight, 2000);
            }
          `}
        </Script>
      </body>
    </html>
  );
}
