"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { isInIframe } from "@/lib/clipboard"
import { openParentModal, closeParentModal } from "@/lib/iframe-bridge"
import { cn } from "@/lib/utils"

const IframeDialog = DialogPrimitive.Root
const IframeDialogTrigger = DialogPrimitive.Trigger
const IframeDialogClose = DialogPrimitive.Close

const IframeDialogPortal = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Portal>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>
>(({ container, ...props }, _ref) => {
  const [isIframe, setIsIframe] = React.useState(false)
  const [portalContainer, setPortalContainer] = React.useState<Element | null>(null)

  React.useEffect(() => {
    const inIframe = isInIframe()
    setIsIframe(inIframe)

    if (typeof document !== 'undefined') {
      if (container) {
        setPortalContainer(container as Element)
      } else {
        let modalRoot = document.getElementById('iframe-modal-root')
        if (!modalRoot) {
          modalRoot = document.createElement('div')
          modalRoot.id = 'iframe-modal-root'
          modalRoot.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 2147483647;
            overflow: visible;
          `
          document.body.appendChild(modalRoot)
        }
        setPortalContainer(modalRoot)
      }
    }
  }, [container, isIframe])

  return (
    <DialogPrimitive.Portal
      container={portalContainer}
      {...props}
    />
  )
})
IframeDialogPortal.displayName = "IframeDialogPortal"

const IframeDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const [isIframe, setIsIframe] = React.useState(false)

  React.useEffect(() => {
    setIsIframe(isInIframe())
  }, [])

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // Always use maximum z-index
        "!z-[2147483646] !important",
        className
      )}
      style={{
        zIndex: 2147483646,
        position: 'fixed',
        pointerEvents: 'auto',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Break out of any parent clipping
        clipPath: 'none',
        clip: 'auto',
        overflow: 'visible',
        visibility: 'visible',
        opacity: 0.8
      }}
      {...props}
    />
  )
})
IframeDialogOverlay.displayName = "IframeDialogOverlay"

const IframeDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title?: string;
    description?: string;
  }
>(({ className, children, title, description, ...props }, ref) => {
  const [isIframe, setIsIframe] = React.useState(false)

  React.useEffect(() => {
    const inIframe = isInIframe()
    setIsIframe(inIframe)

    // If in iframe, send modal content to parent instead of rendering locally
    if (inIframe) {
      openParentModal({
        title,
        description,
        content: typeof children === 'string' ? children : undefined,
        className
      })
    }
  }, [isIframe, title, description, children, className])

  // Handle modal close in iframe
  const handleClose = React.useCallback(() => {
    if (isIframe) {
      closeParentModal()
    }
  }, [isIframe])

  // If in iframe, render a minimal placeholder or nothing
  if (isIframe) {
    return null
  }

  // Normal modal rendering for non-iframe context
  const modalClassName = cn(
    "fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
    className
  )

  return (
    <IframeDialogPortal>
      <IframeDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={modalClassName}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </IframeDialogPortal>
  )
})
IframeDialogContent.displayName = "IframeDialogContent"

// Re-export other dialog components unchanged
const IframeDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
IframeDialogHeader.displayName = "IframeDialogHeader"

const IframeDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
IframeDialogFooter.displayName = "IframeDialogFooter"

const IframeDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
IframeDialogTitle.displayName = "IframeDialogTitle"

const IframeDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
IframeDialogDescription.displayName = "IframeDialogDescription"

export {
  IframeDialog,
  IframeDialogPortal,
  IframeDialogOverlay,
  IframeDialogClose,
  IframeDialogTrigger,
  IframeDialogContent,
  IframeDialogHeader,
  IframeDialogFooter,
  IframeDialogTitle,
  IframeDialogDescription,
}
