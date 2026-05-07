import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/layout/console-shell";
import { getSessionUser } from "@/lib/api/server";

export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return <ConsoleShell user={user}>{children}</ConsoleShell>;
}
