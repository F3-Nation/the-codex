"use client";

import { Suspense } from "react";
import { SubmissionFormContent } from "./SubmissionForm";

export function SubmissionForm() {
  return (
    <Suspense fallback={<div>Loading form...</div>}>
      <SubmissionFormContent />
    </Suspense>
  );
}
