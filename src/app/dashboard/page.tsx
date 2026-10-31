import type { Metadata } from "next";
import { Suspense } from "react";
import { SAMPLE_DATA } from "@/lib/ph/preview";
import { DashboardSkeleton, LiveDashboard } from "./live-dashboard";
import { SampleDashboard } from "./sample-dashboard";

export const metadata: Metadata = { title: "Agent dashboard", robots: { index: false, follow: false } };

export default function DashboardPage() {
  if (SAMPLE_DATA) return <SampleDashboard />;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LiveDashboard />
    </Suspense>
  );
}
