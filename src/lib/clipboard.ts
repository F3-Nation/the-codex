/**
 * Utility functions for clipboard operations with iframe support
 */

/**
 * Attempts to copy text to clipboard with fallback for iframe environments
 * @param text - The text to copy
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // First try the modern clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
    }
  }

  // Fallback for iframe or unsupported browsers
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    return success;
  } catch (err) {
    console.error('All clipboard methods failed:', err);
    return false;
  }
}

/**
 * Checks if we're running in an iframe
 */
export function isInIframe(): boolean {
  try {
    return window !== window.parent;
  } catch {
    return true;
  }
}
