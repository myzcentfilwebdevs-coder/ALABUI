import type { Metadata } from "next";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | ALAB Football Club",
  description: "ALAB Football Club member dashboard and role access portal.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
