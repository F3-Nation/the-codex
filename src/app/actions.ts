// src/app/actions.ts
"use server";

import {
  autoLinkReferences,
  type AutoLinkReferencesInput,
} from "@/ai/flows/auto-link-references";
import { getAllEntryNamesFromDatabase } from "@/lib/api"; // Import new DB function

export async function getLinkedText(text: string): Promise<string> {
  // --- BEGIN TEMPORARY FIX for "429 Too Many Requests" ---
  // AI-powered text linking is temporarily disabled here to prevent excessive API calls
  // when processing many entries on page load (e.g., ExiconPage, LexiconPage).
  // The current AI flow processes one text at a time, leading to N+1 API calls
  // for N entries, which can easily hit API rate limits (429 errors).
  //
  // TODO: To re-enable AI-powered linking for all entries, consider:
  // 1. Modifying the AI flow ('autoLinkReferences') to support batch processing of texts.
  // 2. Implementing a robust caching mechanism for linked text.
  // 3. Performing linking on-demand (e.g., when an entry is expanded or viewed individually).
  //
  // For now, we return the original text to ensure the application remains functional
  // without hitting API rate limits. The AI flow itself in 'src/ai/flows/auto-link-references.ts'
  // remains intact for potential future use or for individual processing tasks.

  // console.warn(
  //   "AI-powered text linking (getLinkedText) is currently defaulting to return original text " +
  //   "to avoid API rate limit issues. See src/app/actions.ts for details."
  // );
  return text; // Return original text, bypassing the AI call.
  // --- END TEMPORARY FIX ---

  /*
  // Original code that calls the AI - currently bypassed:
  if (!text || text.trim() === '') {
    return text;
  }
  try {
    const allEntryNames = await getAllEntryNamesFromDatabase(); // Fetch names from DB
    const input: AutoLinkReferencesInput = {
      text,
      allEntryNames,
    };
    const result = await autoLinkReferences(input);
    return result.linkedText;
  } catch (error) {
    console.error("Error linking references:", error);
    // It's important to return the original text on error to avoid breaking the page.
    return text; 
  }
  */
}
