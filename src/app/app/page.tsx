import type { Metadata } from "next";
import AppDashboard from "./client";

export const metadata: Metadata = {
  title: "Campeonatos",
};

export default function AppPage() {
  return <AppDashboard />;
}
