"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { isInIframe } from "@/lib/clipboard"
import { cn } from "@/lib/utils"

const IframeDialog = DialogPrimitive.Root
const IframeDialogTrigger = DialogPrimitive.Trigger
const IframeDialogClose = DialogPrimitive.Close

const IframeDialogPortal = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Portal>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>
>(({ container, ...props }, _ref) => {
  const [isIframe, setIsIframe] = React.useState(false)

  React.useEffect(() => {
    setIsIframe(isInIframe())
  }, [])

  // If in iframe and no specific container provided, use document.body
  const portalContainer = React.useMemo(() => {
    if (container) return container
    if (isIframe && typeof document !== 'undefined') {
      return document.body
    }
    return undefined
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
        // Higher z-index for iframe usage
        isIframe ? "z-[999999]" : "z-50",
        className
      )}
      {...props}
    />
  )
})
IframeDialogOverlay.displayName = "IframeDialogOverlay"

const IframeDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [isIframe, setIsIframe] = React.useState(false)

  React.useEffect(() => {
    setIsIframe(isInIframe())
  }, [])

  return (
    <IframeDialogPortal>
      <IframeDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          // Higher z-index for iframe usage
          isIframe ? "z-[999999]" : "z-50",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
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