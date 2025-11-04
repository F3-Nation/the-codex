import { Suspense } from "react";
import AdminPanel from "./AdminPanel";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <AdminPanel />
    </Suspense>
  );
}
