import type { ReactNode } from "react";
import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function ConsoleShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background console-grid">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar user={user} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
