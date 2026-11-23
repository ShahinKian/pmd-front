"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, RefreshCw, ShieldCheck, Orbit, UserRound, LockKeyhole } from "lucide-react";
import { SiteLogo } from "@/components/svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusAlert from "@/components/ui/status-alert";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
import { cn } from "@/lib/utils";
import { useSWRConfig } from "swr";

export default function LoginPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"userName" | "password" | "captcha", string>>>({});
  const [touched, setTouched] = useState<string[]>([]);
  const validateField = (name: string, value: string) => {
    if (!value.trim()) return name === "userName" ? "نام کاربری الزامی است." : name === "password" ? "رمز عبور الزامی است." : "کد امنیتی الزامی است.";
    return "";
  };
  const updateValidation = (name: string, value: string) => {
    if (!["userName","password","captcha"].includes(name)) return;
    setFieldErrors(current => ({...current, [name]: validateField(name, value)}));
  };
  const [captchaVersion, setCaptchaVersion] = useState(1);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [captchaSrc, setCaptchaSrc] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const captchaInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let imageUrl = "";
    setCaptchaSrc("");
    setCaptchaFailed(false);
    setCaptchaLoading(true);

    async function loadCaptcha() {
      try {
        const response = await fetch(`/api/auth/captcha?render=png-v1&v=${Date.now()}-${captchaVersion}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "image/png" },
          signal: controller.signal,
        });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png")) {
          throw new Error("Invalid captcha image response.");
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        imageUrl = URL.createObjectURL(blob);
        setCaptchaSrc(imageUrl);
      } catch {
        if (!controller.signal.aborted) {
          setCaptchaFailed(true);
          setCaptchaLoading(false);
        }
      }
    }
    void loadCaptcha();
    return () => {
      controller.abort();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [captchaVersion]);

  function refreshCaptcha() {
    if (captchaInput.current) captchaInput.current.value = "";
    setCaptchaFailed(false);
    setCaptchaSrc("");
    setCaptchaLoading(true);
    setCaptchaVersion(version => version + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (captchaLoading || captchaFailed || !captchaSrc) return;
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const names = ["userName","password","captcha"] as const;
    const errors = Object.fromEntries(names.map(name => [name, validateField(name, String(form.get(name) ?? ""))]));
    setFieldErrors(errors);
    setTouched([...names]);
    const invalid = names.find(name => errors[name]);
    if (invalid) { formElement.querySelector<HTMLInputElement>(`[name="${invalid}"]`)?.focus(); return; }
    setLoading(true);

    try {
      await apiClient.post("/auth/login", {
        userName: String(form.get("userName") ?? ""),
        password: String(form.get("password") ?? ""),
        captcha: String(form.get("captcha") ?? ""),
      });

      await mutate(() => true, undefined, { revalidate: false });

      const candidate = new URLSearchParams(window.location.search).get("returnTo");
      const returnTo =
        candidate?.startsWith("/") && !candidate.startsWith("//")
          ? candidate
          : "/dashboard";

      router.replace(returnTo);
    } catch (error) {
      setMessage(apiErrorMessage(error, "ورود به سامانه انجام نشد."));
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-[#f6f7fb] text-foreground dark:bg-[#161623]">
      <div className="flex min-h-dvh w-full flex-col lg:flex-row">
        <div className="relative hidden min-h-dvh w-full items-center justify-center overflow-hidden bg-[#211d3c] px-10 lg:flex lg:w-[47%]">
          <div className="relative z-10 max-w-xl rounded-3xl border border-white/10 bg-white/5 px-10 py-14 shadow-2xl backdrop-blur">
            <div className="text-4xl leading-[56px] 2xl:text-6xl 2xl:leading-[80px] font-semibold">
              <span className="text-white">سامانه ثبت عملکرد</span>
            </div>
            <div className="mt-6 text-lg font-medium leading-10 text-[#d3d1ea]">
              سامانه مدیریت پیش‌بینی، شناسنامه عملکرد و فرآیندهای برنامه
            </div>

            <div className="mt-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-5 text-[#e6e2ff]">
              <ShieldCheck className="h-6 w-6" />
              <div>
                <div className="font-semibold">ورود امن به سامانه</div>
                <div className="mt-1 text-sm opacity-80">
                  اعتبارسنجی CAPTCHA قبل از ارسال اطلاعات ورود به سرویس انجام می‌شود.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-dvh w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-[53%]">
          <div className="w-full max-w-[490px] rounded-3xl border border-border bg-card p-5 shadow-[0_20px_60px_-35px_#29204470] sm:p-9">
            <div className="w-full py-2">
              <span className="grid size-12 place-items-center rounded-xl bg-[#b8a6ff] text-[#242044]"><Orbit className="size-7" /></span>
              <div className="2xl:mt-8 mt-6 2xl:text-3xl text-2xl font-bold text-default-900">
                ورود به سامانه ثبت عملکرد
              </div>
              <div className="2xl:text-lg text-base text-default-600 2xl:mt-2 leading-6">
                نام کاربری، رمز عبور و کد امنیتی را وارد کنید.
              </div>

              <form onSubmit={submit} noValidate className="mt-7 space-y-5" onBlurCapture={(event) => { const input = event.target as HTMLInputElement; if (input.name && ["userName","password","captcha"].includes(input.name)) { setTouched(current => current.includes(input.name) ? current : [...current, input.name]); updateValidation(input.name, input.value); } }} onInputCapture={(event) => { const input = event.target as HTMLInputElement; if (touched.includes(input.name)) updateValidation(input.name, input.value); }}>
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
                    aria-invalid={Boolean(fieldErrors.userName)}
                    size="lg"
                    required
                  />
                </div>

                {fieldErrors.userName ? <p role="alert" className="mt-1 text-xs text-destructive">{fieldErrors.userName}</p> : null}

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
                      aria-invalid={Boolean(fieldErrors.password)}
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

                {fieldErrors.password ? <p role="alert" className="mt-1 text-xs text-destructive">{fieldErrors.password}</p> : null}

                <div className="mt-3.5">
                  <Label htmlFor="captcha" className="mb-2 font-medium text-default-600">
                    کد امنیتی
                  </Label>

                  <div className="rounded-2xl border border-border bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-white">
                        {captchaSrc && !captchaFailed ? <img
                          key={captchaVersion}
                          src={captchaSrc}
                          alt="کد امنیتی"
                          width={240}
                          height={66}
                          className="block h-[66px] w-full object-contain"
                          draggable={false}
                          onLoad={() => setCaptchaLoading(false)}
                          onError={() => { setCaptchaFailed(true); setCaptchaLoading(false); }}
                        /> : captchaFailed ? (
                          <div className="flex h-[66px] items-center justify-center px-3 text-center text-xs text-red-600">
                            دریافت کد امنیتی ناموفق بود
                          </div>
                        ) : <div role="status" className="flex h-[66px] items-center justify-center text-sm text-default-500">
                          در حال دریافت کد امنیتی…
                        </div>}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-[66px] w-12 shrink-0"
                        onClick={refreshCaptcha}
                        disabled={loading || captchaLoading}
                        title="تغییر کد امنیتی"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </Button>
                    </div>

                    <Input
                      disabled={loading}
                      id="captcha"
                      name="captcha"
                      ref={captchaInput}
                      inputMode="numeric"
                      autoComplete="off"
                      dir="ltr"
                      className="mt-3 text-center text-lg font-semibold tracking-[0.25em]"
                      aria-invalid={Boolean(fieldErrors.captcha)}
                      placeholder="پاسخ عبارت بالا"
                      size="lg"
                      required
                    />

                    {fieldErrors.captcha ? <p role="alert" className="mt-2 text-xs text-destructive">{fieldErrors.captcha}</p> : null}
                    <p className="mt-2 text-xs leading-5 text-default-500">
                      پاسخ عبارت داخل تصویر را وارد کنید. کد امنیتی پس از هر تلاش ورود تغییر می‌کند.
                    </p>
                  </div>
                </div>

                {message ? (
                  <StatusAlert
                    type="error"
                    title="ورود ناموفق بود"
                    message={message}
                    dismissible
                    onDismiss={() => setMessage("")}
                    className="mt-4"
                  />
                ) : null}

                <Button className="mt-6 w-full" disabled={loading || captchaLoading || captchaFailed} size="lg">
                  {loading && <Loader2 className="ltr:mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
                  {loading ? "در حال بررسی و ورود..." : "ورود"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
