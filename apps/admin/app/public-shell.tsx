import Link from "next/link";
import type { ReactNode } from "react";

export default function PublicShell({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="ValX public information">
        <Link className="public-brand" href="/privacy">
          <span>V</span>
          <strong>ValX</strong>
        </Link>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
          <Link href="/delete-account">Delete account</Link>
        </div>
      </nav>
      <article className="public-document">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </article>
    </main>
  );
}
