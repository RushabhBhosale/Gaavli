"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  LockKeyhole,
  LoaderCircle,
  UserRound,
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
    <div className="auth-card">
      <Link href="/" className="auth-back">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to the public site
      </Link>
      <p className="auth-kicker">Admin access</p>
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-subtitle">
        Sign in with your administrator account to manage villages, sellers and
        services.
      </p>
      <form
        className="auth-form-body"
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            await api("/auth/login", {
              method: "POST",
              body: JSON.stringify(values),
            });
            router.replace("/admin");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <fieldset disabled={isSubmitting} className="contents">
          <div className="auth-field">
            <label htmlFor="identifier">Email or mobile number</label>
            <div className="auth-input">
              <UserRound size={18} aria-hidden="true" />
              <input
                id="identifier"
                autoComplete="username"
                autoFocus
                placeholder="admin@gaavli.com"
                aria-invalid={!!errors.identifier}
                aria-describedby={
                  errors.identifier ? "identifier-error" : undefined
                }
                {...register("identifier")}
              />
            </div>
            {errors.identifier && (
              <p id="identifier-error" className="auth-field-error">
                <CircleAlert size={13} aria-hidden="true" />
                {errors.identifier.message}
              </p>
            )}
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="auth-input">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                {...register("password")}
              />
              <button
                type="button"
                className="auth-eye"
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                onClick={() => setShow(!show)}
              >
                {show ? (
                  <EyeOff size={17} aria-hidden="true" />
                ) : (
                  <Eye size={17} aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="auth-field-error">
                <CircleAlert size={13} aria-hidden="true" />
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="auth-options">
            <label className="auth-check">
              <input type="checkbox" {...register("remember")} />
              Remember me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          {error && (
            <p role="alert" className="auth-error">
              <CircleAlert size={15} aria-hidden="true" />
              {error}
            </p>
          )}
          <Button className="auth-submit" type="submit">
            {isSubmitting && (
              <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </fieldset>
      </form>
    </div>
  );
}
