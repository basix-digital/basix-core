"use client";

import { LogOut, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { consoleFetch } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session";

export function Topbar({ user }: { user: SessionUser | null }) {
  const router = useRouter();

  async function logout() {
    await consoleFetch("/api/auth/logout", { method: "POST" }).catch(
      () => null,
    );
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/88 px-4 backdrop-blur-xl lg:px-6">
      <div className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search tenants, apps, invoices" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground">
            {user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={logout}
          aria-label="Logout"
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
