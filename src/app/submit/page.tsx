import { PageContainer } from "@/components/layout/PageContainer";
import { SubmissionForm } from "@/components/submission/SubmissionFormWrapper";
import { FilePlus2 } from "lucide-react";

export const metadata = {
  title: "Submit Entry - F3 Codex",
  description:
    "Submit new entries or suggest edits for the F3 Exicon and Lexicon.",
};

// This page is now a server component by default and can fetch data.
// However, SubmissionForm is a client component that fetches its own tags.
export default function SubmitPage() {
  return (
    <PageContainer>
      <div className="mb-8 text-center">
        <FilePlus2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-bold">Submit an Entry</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Help grow the F3 Codex! Your contributions are valuable.
        </p>
      </div>
      <SubmissionForm />
    </PageContainer>
  );
}
