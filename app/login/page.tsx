"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { SiteLogo } from "@/components/svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);

    try {
      await apiClient.post("/auth/login", {
        userName: String(form.get("userName") ?? ""),
        password: String(form.get("password") ?? ""),
      });

      const candidate = new URLSearchParams(window.location.search).get("returnTo");
      const returnTo =
        candidate?.startsWith("/") && !candidate.startsWith("//")
          ? candidate
          : "/dashboard";

      router.replace(returnTo);
    } catch (error) {
      setMessage(apiErrorMessage(error, "نام کاربری یا رمز عبور صحیح نیست."));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center overflow-hidden w-full">
      <div className="min-h-screen basis-full flex flex-wrap w-full justify-center overflow-y-auto">
        <div className="basis-1/2 bg-primary w-full relative hidden xl:flex justify-center items-center bg-gradient-to-br from-primary-600 via-primary-400 to-primary-600">
          <div className="relative z-10 backdrop-blur bg-primary-foreground/40 py-14 px-16 rounded max-w-[640px]">
            <div className="text-4xl leading-[56px] 2xl:text-6xl 2xl:leading-[80px] font-semibold">
              <span className="text-default-900 dark:text-default-50">سامانه ثبت عملکرد</span>
            </div>
            <div className="mt-5 2xl:mt-8 text-default-900 dark:text-default-200 text-2xl font-medium leading-10">
              سامانه مدیریت پیش‌بینی، شناسنامه عملکرد و فرآیندهای برنامه
            </div>
          </div>
        </div>

        <div className="min-h-screen basis-full md:basis-1/2 w-full px-4 py-5 flex justify-center items-center">
          <div className="lg:w-[480px] w-full">
            <div className="w-full py-10">
              <SiteLogo className="h-10 w-10 2xl:w-14 2xl:h-14 text-primary" />
              <div className="2xl:mt-8 mt-6 2xl:text-3xl text-2xl font-bold text-default-900">
                ورود به سامانه ثبت عملکرد
              </div>
              <div className="2xl:text-lg text-base text-default-600 2xl:mt-2 leading-6">
                نام کاربری و رمز عبور خود را وارد کنید.
              </div>

              <form onSubmit={submit} className="mt-5 2xl:mt-7">
                <div>
                  <Label htmlFor="userName" className="mb-2 font-medium text-default-600">
                    نام کاربری
                  </Label>
                  <Input
                    disabled={loading}
                    id="userName"
                    name="userName"
                    autoComplete="username"
                    dir="ltr"
                    className="text-left"
                    size="lg"
                    required
                  />
                </div>

                <div className="mt-3.5">
                  <Label htmlFor="password" className="mb-2 font-medium text-default-600">
                    رمز عبور
                  </Label>
                  <div className="relative">
                    <Input
                      disabled={loading}
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      dir="ltr"
                      className={cn("peer text-left")}
                      size="lg"
                      required
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 -translate-y-1/2 left-4 text-default-400"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                    >
                      {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {message ? (
                  <div className="text-destructive mt-3 text-sm">{message}</div>
                ) : null}

                <Button className="w-full mt-6" disabled={loading} size="lg">
                  {loading && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                  {loading ? "در حال ورود..." : "ورود"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
