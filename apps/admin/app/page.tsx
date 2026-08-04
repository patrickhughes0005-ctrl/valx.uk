import type { Metadata } from "next";
import AdminAuthGate from "./admin-auth-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ValX Admin",
  robots: { index: false, follow: false, noarchive: true }
};

export default function Home() {
  return <AdminAuthGate apiUrl={process.env.NEXT_PUBLIC_API_URL ?? ""} />;
}
