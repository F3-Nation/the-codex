/**
 * Cross-frame communication utilities for iframe integration
 */

export interface IframeBridgeMessage {
  type: 'IFRAME_MODAL_OPEN' | 'IFRAME_MODAL_CLOSE' | 'IFRAME_TOAST' | 'IFRAME_CLIPBOARD_SUCCESS' | 'IFRAME_CLIPBOARD_ERROR';
  data?: any;
  iframeId?: string;
}

export interface ToastMessage {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export interface ModalMessage {
  title?: string;
  description?: string;
  content?: string;
  className?: string;
}

/**
 * Sends a message to the parent window if running in an iframe
 */
export function sendToParent(message: IframeBridgeMessage): void {
  if (typeof window !== 'undefined' && window.parent !== window) {
    try {
      window.parent.postMessage(message, '*');
    } catch (error) {
      console.warn('Failed to send message to parent:', error);
    }
  }
}

/**
 * Opens a modal in the parent window
 */
export function openParentModal(modalData: ModalMessage): void {
  sendToParent({
    type: 'IFRAME_MODAL_OPEN',
    data: modalData
  });
}

/**
 * Closes any open modal in the parent window
 */
export function closeParentModal(): void {
  sendToParent({
    type: 'IFRAME_MODAL_CLOSE'
  });
}

/**
 * Shows a toast notification in the parent window
 */
export function showParentToast(toastData: ToastMessage): void {
  sendToParent({
    type: 'IFRAME_TOAST',
    data: toastData
  });
}

/**
 * Notifies parent of successful clipboard operation
 */
export function notifyClipboardSuccess(text: string): void {
  sendToParent({
    type: 'IFRAME_CLIPBOARD_SUCCESS',
    data: { text }
  });
}

/**
 * Notifies parent of failed clipboard operation
 */
export function notifyClipboardError(error: string): void {
  sendToParent({
    type: 'IFRAME_CLIPBOARD_ERROR',
    data: { error }
  });
}

/**
 * Sets up message listener for iframe responses (if needed)
 */
export function setupIframeListener(callback: (message: IframeBridgeMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object' && event.data.type?.startsWith('IFRAME_')) {
      callback(event.data);
    }
  };

  window.addEventListener('message', handler);

  return () => window.removeEventListener('message', handler);
}