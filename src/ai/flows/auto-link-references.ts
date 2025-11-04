// src/ai/flows/auto-link-references.ts
"use server";
/**
 * @fileOverview Automatically suggests and creates links to other entries within a given text.
 *
 * - autoLinkReferences - A function that enhances the input text by identifying and linking F3 terms.
 * - AutoLinkReferencesInput - The input type for the autoLinkReferences function.
 * - AutoLinkReferencesOutput - The return type for the autoLinkReferences function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const AutoLinkReferencesInputSchema = z.object({
  text: z.string().describe("The text to scan for F3 terms to link."),
  allEntryNames: z
    .array(z.string())
    .describe("An array of all known F3 entry names."),
});
export type AutoLinkReferencesInput = z.infer<
  typeof AutoLinkReferencesInputSchema
>;

const AutoLinkReferencesOutputSchema = z.object({
  linkedText: z.string().describe("The text with F3 terms linked."),
});
export type AutoLinkReferencesOutput = z.infer<
  typeof AutoLinkReferencesOutputSchema
>;

export async function autoLinkReferences(
  input: AutoLinkReferencesInput,
): Promise<AutoLinkReferencesOutput> {
  return autoLinkReferencesFlow(input);
}

const autoLinkReferencesPrompt = ai.definePrompt({
  name: "autoLinkReferencesPrompt",
  input: { schema: AutoLinkReferencesInputSchema },
  output: { schema: AutoLinkReferencesOutputSchema },
  prompt: `You are an AI assistant that helps enhance text by identifying and linking F3 terms within it.

  Given the following text and a list of all known F3 entry names, identify which F3 terms are present in the text.
  Wrap the identified F3 terms with <a href="/lexicon/{{term}}">{{term}}</a> to create a hyperlink to the corresponding entry.

  Text: {{{text}}}
  All Entry Names: {{allEntryNames}}

  Return the enhanced text with all identified F3 terms linked.
  If a term is mentioned multiple times, link all instances.
  Do not create links for terms that are not in the All Entry Names list.
  Do not modify any existing links in the provided text.
  If no terms are found in the text, simply return the original text.
  `,
});

const autoLinkReferencesFlow = ai.defineFlow(
  {
    name: "autoLinkReferencesFlow",
    inputSchema: AutoLinkReferencesInputSchema,
    outputSchema: AutoLinkReferencesOutputSchema,
  },
  async (input) => {
    const { output } = await autoLinkReferencesPrompt(input);
    return output!;
  },
);
