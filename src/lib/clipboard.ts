export interface CopyResult {
  success: boolean;
  method: "clipboard" | "fallback" | "textArea" | "selection";
  error?: string;
}

/**
 * Attempts to copy text to clipboard with multiple fallback strategies
 * for iframe and cross-origin contexts
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {


  // Strategy 1: Modern Clipboard API (works in most contexts)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);

      return { success: true, method: "clipboard" };
    } catch (error) {
      console.warn("[Clipboard] Clipboard API failed:", error);
    }
  } else {
    console.log("[Clipboard] Clipboard API not available or not secure context");
  }

  // Strategy 2: Textarea fallback (works in iframes)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    `;

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      console.log("[Clipboard] Success via TextArea method");
      return { success: true, method: "textArea" };
    } else {
      console.warn("[Clipboard] TextArea execCommand returned false");
    }
  } catch (error) {
    console.warn("[Clipboard] TextArea copy failed:", error);
  }

  // Strategy 3: Selection API fallback
  try {
    const range = document.createRange();
    const span = document.createElement("span");
    span.textContent = text;
    span.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      opacity: 0;
      pointer-events: none;
    `;

    document.body.appendChild(span);
    range.selectNode(span);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);

      const successful = document.execCommand("copy");
      selection.removeAllRanges();
      document.body.removeChild(span);

      if (successful) {
        console.log("[Clipboard] Success via Selection API");
        return { success: true, method: "selection" };
      } else {
        console.warn("[Clipboard] Selection execCommand returned false");
      }
    }

    document.body.removeChild(span);
  } catch (error) {
    console.warn("[Clipboard] Selection copy failed:", error);
  }

  console.error("[Clipboard] All copy methods failed");
  return {
    success: false,
    method: "fallback",
    error:
      "All copy methods failed. This may be due to browser security restrictions in iframe context.",
  };
}

/**
 * Checks if we're running in an iframe
 */
export function isInIframe(): boolean {
  try {
    return window !== window.parent;
  } catch {
    return true; // Assume iframe if we can't access parent
  }
}

/**
 * Shows a user-friendly copy prompt for iframe contexts
 */
export function showCopyPrompt(text: string): void {
  // Create a modal-like prompt for manual copying
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.8);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    position: relative;
    box-sizing: border-box;
  `;

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.cssText = `
    width: 100%;
    min-height: 80px;
    max-height: 200px;
    margin: 16px 0;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  `;
  textArea.readOnly = true;

  modal.innerHTML = `
    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">Copy Content</h3>
    <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
      Automatic copy failed. Please use the buttons below to copy manually:
    </p>
  `;

  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  `;

  const copyButton = document.createElement("button");
  copyButton.textContent = "Copy";
  copyButton.style.cssText = `
    padding: 8px 16px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  copyButton.onclick = () => {
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    try {
      const successful = document.execCommand("copy");
      if (successful) {
        copyButton.textContent = "Copied!";
        copyButton.style.background = "#28a745";
        setTimeout(() => {
          copyButton.textContent = "Copy";
          copyButton.style.background = "#007bff";
        }, 2000);
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const selectButton = document.createElement("button");
  selectButton.textContent = "Select All";
  selectButton.style.cssText = `
    padding: 8px 16px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  selectButton.onclick = () => {
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
  };

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.cssText = `
    padding: 8px 16px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  closeButton.onclick = () => {
    document.body.removeChild(overlay);
  };

  buttonContainer.appendChild(copyButton);
  buttonContainer.appendChild(selectButton);
  buttonContainer.appendChild(closeButton);
  modal.appendChild(textArea);
  modal.appendChild(buttonContainer);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);

  // Auto-select text and focus
  setTimeout(() => {
    textArea.focus();
    textArea.select();
  }, 100);

  // Close on escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleEscape);
    }
  };
}
