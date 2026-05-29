"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";

export function DashboardNav({ userEmail }: { userEmail: string }) {
  return (
    <header className="dashboard-nav">
      <Link href="/" className="dashboard-nav-brand" aria-label="Nyabag home">
        <img src="/assets/logo.svg" alt="Nyabag" />
      </Link>

      <form action={signOut}>
        <button
          type="submit"
          className="theme-toggle"
          title={`Sign out (${userEmail})`}
          aria-label="Sign out"
        >
          <LogOut size={14} />
        </button>
      </form>
    </header>
  );
}
