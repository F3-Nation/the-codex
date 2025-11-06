// src/components/shared/AILinkedText.tsx
"use client"; // Marked as client component. If AI linking is purely server-side, this might not be needed or used differently.

// This component is currently not used by EntryCard as AI linking is done server-side (or bypassed).
// It can be kept for other potential uses or removed if not needed.
// If re-enabled for dynamic client-side linking, it would need to call a server action.

interface AILinkedTextProps {
  text: string;
  // allEntryNames: string[]; // Removed as getLinkedText is a server action
  // For client-side dynamic linking, this component would need to invoke a server action.
  // For now, it's simplified as it's not actively used for AI linking in EntryCard.
}

// Async client components are not standard. This should ideally be a server component,
// or if used on client, it should call a server action.
// For now, it's simplified as its primary use case (AI linking in EntryCard) is handled differently.
export function AILinkedText({ text }: AILinkedTextProps) {
  if (!text) {
    return <p></p>;
  }
  // const linkedHtml = await getLinkedText(text, allEntryNames); // This would be a server action call
  const linkedHtml = text; // Placeholder: not calling AI for now

  // Ensure the output is treated as safe if it comes from a trusted AI source and is properly sanitized.
  // For this example, we trust the output of autoLinkReferences to be safe HTML.
  return <div dangerouslySetInnerHTML={{ __html: linkedHtml }} />;
}
