/**
 * Determines the appropriate base URL for entry links based on current route
 */
export function getEntryBaseUrl(entryType: "exicon" | "lexicon"): string {
  // Check if we're on special routes (lexicon-2 or exicon-2)
  if (typeof window !== "undefined") {
    let currentPath = window.location.pathname;

    // If we're in an iframe, try to get the parent's pathname from the URL
    if (isInIframe()) {
      try {
        // Try to get parent URL if accessible
        if (window.parent && window.parent.location) {
          currentPath = window.parent.location.pathname;
        }
      } catch (e) {
        // If we can't access parent, check the current URL or search params
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("entryId") && window.location.pathname === "/") {
          // We might be on the root path but serving special route content
          // Check the referrer or other indicators
          currentPath = window.location.pathname;
        }
      }
    }

    if (currentPath.startsWith("/lexicon-2")) {
      return entryType === "lexicon" ? "lexicon-2" : "exicon";
    }
    if (currentPath.startsWith("/exicon-2")) {
      return entryType === "exicon" ? "exicon-2" : "lexicon";
    }
  }

  // Default routes
  return entryType;
}

/**
 * Generates the appropriate URL for copying based on current context
 */
export function generateEntryUrl(
  entryId: string,
  entryType: "exicon" | "lexicon",
): string {
  const baseRoute = getEntryBaseUrl(entryType);
  const encodedId = encodeURIComponent(entryId);
  return `https://f3nation.com/${baseRoute}?entryId=${encodedId}`;
}

/**
 * Determines if the current page is running in an iframe
 */
export function isInIframe(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window !== window.parent;
  } catch (e) {
    return true;
  }
}

/**
 * Gets the appropriate back URL for a given entry type, considering iframe context
 */
export function getBackUrl(entryType: "exicon" | "lexicon"): string {
  if (isInIframe()) {
    // When in iframe, we need to detect the parent URL to determine the correct route
    let parentHost = "f3nation.com";
    let baseRoute: string = entryType; // default

    try {
      // Try to get the parent window's URL
      if (window.parent && window.parent.location) {
        const parentUrl = window.parent.location.href;
        if (parentUrl.includes("/lexicon-2")) {
          baseRoute = entryType === "lexicon" ? "lexicon-2" : "exicon";
        } else if (parentUrl.includes("/exicon-2")) {
          baseRoute = entryType === "exicon" ? "exicon-2" : "lexicon";
        } else if (parentUrl.includes("/lexicon")) {
          baseRoute = "lexicon";
        } else if (parentUrl.includes("/exicon")) {
          baseRoute = "exicon";
        }

        // Extract host from parent URL
        const parentHostMatch = parentUrl.match(/https?:\/\/([^\/]+)/);
        if (parentHostMatch) {
          parentHost = parentHostMatch[1];
        }
      }
    } catch (e) {
      // If we can't access parent URL, fall back to defaults
      // Check our own URL for hints
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/lexicon-2")) {
        baseRoute = entryType === "lexicon" ? "lexicon-2" : "exicon";
      } else if (currentPath.startsWith("/exicon-2")) {
        baseRoute = entryType === "exicon" ? "exicon-2" : "lexicon";
      }
    }

    return `https://${parentHost}/${baseRoute}`;
  }

  // Not in iframe, use local routing
  const baseRoute = getEntryBaseUrl(entryType);
  return `/${baseRoute}`;
}
