"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, RadioTower } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/http/client";

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
      router.refresh();
    } catch (error) {
      setMessage(apiErrorMessage(error, "نام کاربری یا رمز عبور صحیح نیست."));
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-visual">
        <div>
          <div className="brand-mark" style={{marginBottom:20}}><RadioTower size={24}/></div>
          <h2>سامانه ثبت عملکرد</h2>
          <p style={{maxWidth:500,lineHeight:2,color:"#cbd5e1"}}>
            مدیریت یکپارچه پیش‌بینی، شناسنامه عملکرد، طرح‌ها، تهیه‌کنندگان و فرآیندهای بررسی.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-logo">
            <div className="brand-mark"><RadioTower size={21}/></div>
            <div>
              <strong>سامانه ثبت عملکرد</strong>
              <div className="muted" style={{fontSize:12,marginTop:4}}>ورود کاربران</div>
            </div>
          </div>

          <h1 style={{fontSize:24,margin:"0 0 6px"}}>خوش آمدید</h1>
          <p className="muted" style={{fontSize:13,margin:"0 0 24px"}}>نام کاربری و رمز عبور خود را وارد کنید.</p>

          <form onSubmit={submit} className="grid" style={{gap:15}}>
            <label className="field">
              <span className="label">نام کاربری</span>
              <input className="input" name="userName" autoComplete="username" dir="ltr" required />
            </label>

            <label className="field">
              <span className="label">رمز عبور</span>
              <div style={{position:"relative"}}>
                <input
                  className="input"
                  style={{width:"100%",paddingLeft:42}}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  style={{position:"absolute",left:3,top:2,border:0}}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                >
                  {showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>
            </label>

            {message ? <div className="alert alert-error" role="alert">{message}</div> : null}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 size={17} className="spin"/> : null}
              {loading ? "در حال ورود..." : "ورود به سامانه"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
