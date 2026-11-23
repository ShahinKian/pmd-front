"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, RefreshCw, ShieldCheck, Orbit, RadioTower, LockKeyhole } from "lucide-react";
import { RadioArtwork } from "@/components/auth/radio-artwork";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusAlert from "@/components/ui/status-alert";
import { apiClient, apiErrorMessage } from "@/lib/http/client";
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
    <main className="radio-login relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="radio-login-glow pointer-events-none absolute -right-20 -top-44 size-[550px] rounded-full bg-[#9572ec]/25 blur-[110px]" aria-hidden="true"/>
      <div className="radio-login-glow pointer-events-none absolute -bottom-60 -left-28 size-[550px] rounded-full bg-[#58a9d6]/20 blur-[115px]" aria-hidden="true"/>
      <div className="radio-login-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true"/>
      <div className="radio-login-shell relative z-10 grid w-full max-w-[1080px] overflow-hidden rounded-[2rem] border border-white/20 shadow-[0_35px_110px_-30px_#0c082c80] lg:grid-cols-[1.03fr_.97fr]">
        <section className="radio-login-intro relative hidden min-h-[640px] flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-12">
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl"><Orbit size={27}/></span>
            <div><strong className="block text-lg font-black">سامانه ثبت عملکرد</strong><span className="block text-xs text-[#d8cdf6]">مدیریت هوشمند فرآیندهای رادیویی</span></div>
          </div>
          <RadioArtwork/>
          <div className="relative z-10">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-[#e8dfff] backdrop-blur-lg"><RadioTower size={15}/> رادیو، در یک نگاه</span>
            <h2 className="max-w-md text-3xl font-black leading-[1.65]">از پیش‌بینی برنامه تا شناسنامه عملکرد؛ همه‌چیز در یک فضای یکپارچه</h2>
            <p className="mt-3 max-w-sm text-sm leading-8 text-[#d8cdf6]">مدیریت برنامه‌ها، شبکه‌ها و گردش‌کارها با دسترسی امن و تجربه‌ای سریع و ساده.</p>
            <div className="mt-6 flex items-center gap-2" aria-hidden="true">
              <span className="h-1.5 w-12 rounded-full bg-[#d1beff]"/><span className="size-1.5 rounded-full bg-white/40"/><span className="size-1.5 rounded-full bg-white/40"/>
            </div>
          </div>
        </section>
        <section className="radio-login-form relative flex min-h-[590px] flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
          <div className="mb-8 lg:hidden">
            <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#b8a6ff] text-[#211d3c]"><Orbit size={26}/></span>
            <span className="text-lg font-black">سامانه ثبت عملکرد</span>
          </div>
          <div className="mb-7">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><LockKeyhole size={13}/> ورود امن</span>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">خوش آمدید</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">برای ورود، اطلاعات حساب و کد امنیتی را وارد کنید.</p>
          </div>
          <form onSubmit={submit} noValidate className="grid gap-4"
            onBlurCapture={event => {
              const input=event.target as unknown as HTMLInputElement;
              if (input.name && ["userName","password","captcha"].includes(input.name)) {
                setTouched(current=>current.includes(input.name)?current:[...current,input.name]);
                updateValidation(input.name,input.value);
              }
            }}
            onInputCapture={event => {
              const input=event.target as unknown as HTMLInputElement;
              if(touched.includes(input.name))updateValidation(input.name,input.value);
            }}>
            <div className="field">
              <label htmlFor="userName" className="label">نام کاربری *</label>
              <Input id="userName" name="userName" autoComplete="username" dir="ltr" disabled={loading}
                size="lg" className="text-left" aria-invalid={Boolean(fieldErrors.userName)} required />
              {fieldErrors.userName ? <p role="alert" className="text-xs text-destructive">{fieldErrors.userName}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="password" className="label">رمز عبور *</label>
              <div className="relative">
                <Input id="password" name="password" autoComplete="current-password" dir="ltr"
                  type={showPassword ? "text" : "password"} disabled={loading}
                  size="lg" className="text-left" aria-invalid={Boolean(fieldErrors.password)} required />
                <button type="button" aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                  onClick={()=>setShowPassword(value=>!value)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-primary">
                  {showPassword ? <Eye className="size-5"/> : <EyeOff className="size-5"/>}
                </button>
              </div>
              {fieldErrors.password ? <p role="alert" className="text-xs text-destructive">{fieldErrors.password}</p> : null}
            </div>
            <div className="field">
              <label htmlFor="captcha" className="label">کد امنیتی *</label>
              <div className="rounded-2xl border border-border/60 bg-muted/50 p-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-white">
                    {captchaSrc && !captchaFailed ? (
                      <img key={captchaVersion} src={captchaSrc} alt="کد امنیتی" width={240} height={66}
                        className="block h-[66px] w-full object-contain" draggable={false}
                        onLoad={()=>setCaptchaLoading(false)}
                        onError={()=>{setCaptchaFailed(true);setCaptchaLoading(false);}}/>
                    ) : captchaFailed ? (
                      <div className="flex h-[66px] items-center justify-center px-3 text-center text-xs text-destructive">دریافت کد امنیتی ناموفق بود.</div>
                    ) : <div role="status" className="flex h-[66px] items-center justify-center text-sm text-muted-foreground">در حال دریافت کد امنیتی…</div>}
                  </div>
                  <Button type="button" variant="outline" color="secondary" size="icon" className="h-[66px] w-12 shrink-0"
                    onClick={refreshCaptcha} disabled={loading || captchaLoading} title="تغییر کد امنیتی"
                    aria-label="دریافت کد امنیتی جدید"><RefreshCw className="size-5"/></Button>
                </div>
                <Input id="captcha" name="captcha" ref={captchaInput} inputMode="numeric" autoComplete="off"
                  disabled={loading} dir="ltr" placeholder="پاسخ عبارت بالا" size="lg"
                  className="mt-3 text-center text-lg font-semibold tracking-[.2em]"
                  aria-invalid={Boolean(fieldErrors.captcha)} required />
                {fieldErrors.captcha ? <p role="alert" className="mt-1 text-xs text-destructive">{fieldErrors.captcha}</p> : null}
              </div>
            </div>
            {message ? <StatusAlert type="error" title="ورود ناموفق بود" message={message}
              dismissible onDismiss={()=>setMessage("")}/> : null}
            <Button type="submit" size="lg" className="w-full !h-12 !rounded-xl font-bold shadow-lg shadow-primary/15" disabled={loading || captchaLoading || captchaFailed}>
              {loading ? <Loader2 className="size-4 animate-spin"/> : <ShieldCheck className="size-4"/>}
              {loading ? "در حال بررسی و ورود..." : "ورود به سامانه"}
            </Button>
          </form>
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            <ShieldCheck size={16} className="text-primary"/> دسترسی ایمن به سامانه ثبت عملکرد
          </div>
        </section>
      </div>
    </main>
  );
}
