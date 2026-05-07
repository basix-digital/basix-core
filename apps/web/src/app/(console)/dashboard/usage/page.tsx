import { Suspense } from "react";
import { UsageDashboardPage } from "@/components/usage/usage-dashboard-page";

export default function UsageRoute() {
  return (
    <Suspense>
      <UsageDashboardPage />
    </Suspense>
  );
}
