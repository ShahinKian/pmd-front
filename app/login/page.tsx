"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userName: String(form.get("userName") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setMessage(body?.errors ?? body?.message ?? "ورود انجام نشد.");
      setLoading(false);
      return;
    }

    const candidate = new URLSearchParams(window.location.search).get("returnTo");
    const returnTo =
      candidate?.startsWith("/") && !candidate.startsWith("//")
        ? candidate
        : "/dashboard";

    router.replace(returnTo);
    router.refresh();
  }

  return (
    <main>
      <h1>سامانه ثبت عملکرد</h1>
      <h2>ورود به سامانه</h2>
      <form onSubmit={submit}>
        <label>
          نام کاربری
          <input name="userName" autoComplete="username" required />
        </label>
        <label>
          رمز عبور
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "در حال ورود..." : "ورود"}
        </button>
        {message ? <p role="alert">{message}</p> : null}
      </form>
    </main>
  );
}
