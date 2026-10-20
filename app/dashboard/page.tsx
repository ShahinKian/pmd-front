"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionPayload {
  user: {
    fullName: string;
    userName: string;
    roles: string[];
  };
  isSystemAdmin: boolean;
  roleLabels: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }
        if (!response.ok) throw new Error("session");
        return (await response.json()) as SessionPayload;
      })
      .then((data) => {
        if (active && data) setSession(data);
      })
      .catch(() => {
        if (active) setError("دریافت اطلاعات کاربر انجام نشد.");
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!session) return <main><p>در حال بارگذاری...</p></main>;

  return (
    <main>
      <h1>سامانه ثبت عملکرد</h1>
      <p>کاربر: {session.user.fullName || session.user.userName}</p>
      <p>سطح دسترسی: {session.roleLabels.join("، ")}</p>
      {session.isSystemAdmin ? (
        <section>
          <h2>مدیر سیستم</h2>
          <p>دسترسی مدیریتی سراسری سامانه مطابق Policyهای بک‌اند فعال است.</p>
        </section>
      ) : null}
      <button type="button" onClick={logout}>خروج</button>
    </main>
  );
}
