import PublicShell from "../public-shell";
import DeletionForm from "./deletion-form";

export const metadata = {
  title: "Delete account | ValX",
  description: "Request deletion of a ValX account and associated data."
};

export default function DeleteAccountPage() {
  return (
    <PublicShell eyebrow="DATA CONTROL" title="Delete your ValX account">
      <p>
        You can start account deletion inside the ValX app or use this page.
        Deletion signs out every session and queues the account for review.
      </p>
      <p>
        ValX deletes information it no longer needs. Records required by law or
        an active dispute may be retained in restricted form for the applicable
        retention period.
      </p>
      <DeletionForm />
    </PublicShell>
  );
}
