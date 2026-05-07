"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { consoleFetch } from "@/lib/api/client";
import { loginSchema } from "@/lib/api/validators";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setError(null);

    try {
      await consoleFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      router.replace(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Invalid credentials",
      );
    }
  }

  return (
    <Card className="w-full max-w-md border-border/90 bg-card/92 p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md border border-primary/30 bg-primary/12 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-normal text-foreground">
            Basix Core Console
          </h1>
          <p className="text-sm text-muted-foreground">Admin access</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-xs text-red-300">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-xs text-red-300">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-md border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          Sign in
          <ArrowRight />
        </Button>
      </form>
    </Card>
  );
}
