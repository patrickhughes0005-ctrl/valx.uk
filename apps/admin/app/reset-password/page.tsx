import type { Metadata } from "next";
import AdminResetPasswordForm from "./reset-password-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset Admin password | ValX",
  robots: { index: false, follow: false, noarchive: true }
};

export default async function AdminResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AdminResetPasswordForm
      apiUrl={process.env.NEXT_PUBLIC_API_URL ?? ""}
      token={token}
    />
  );
}
