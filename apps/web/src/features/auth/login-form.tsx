"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  Eye,
  EyeOff,
  Phone,
  UserRound,
  LockKeyhole,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/schemas";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
export function LoginForm() {
  const [show, setShow] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", remember: true },
  });
  return (
    <div className="card w-full max-w-sm p-7 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
      <p className="mt-2 text-sm text-slate-500">
        Sign in to your Gaavli admin account
      </p>
      <form
        className="mt-7 space-y-5"
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            await api("/auth/login", {
              method: "POST",
              body: JSON.stringify(values),
            });
            router.replace("/");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <div className="field">
          <label htmlFor="identifier">Email or Mobile Number</label>
          <div className="relative">
            <UserRound
              className="absolute left-3 top-3 text-slate-400"
              size={16}
            />
            <input
              id="identifier"
              autoComplete="username"
              placeholder="admin@gaavli.com"
              style={{ paddingLeft: 36 }}
              aria-invalid={!!errors.identifier}
              {...register("identifier")}
            />
          </div>
          {errors.identifier && (
            <p className="field-error">{errors.identifier.message}</p>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="relative">
            <LockKeyhole
              className="absolute left-3 top-3 text-slate-400"
              size={16}
            />
            <input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              style={{ paddingLeft: 36, paddingRight: 40 }}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-3 text-slate-400"
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="field-error">{errors.password.message}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("remember")} />
            Remember me
          </label>
          <Link
            className="font-semibold text-emerald-800 hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle size={16} className="animate-spin" />}
          {isSubmitting ? "Signing in…" : "Sign In"}
        </Button>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          OR
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <div title="Coming soon">
          <Button type="button" variant="outline" disabled className="w-full">
            <Phone size={15} />
            Sign in with OTP
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Coming soon
          </p>
        </div>
      </form>
    </div>
  );
}
