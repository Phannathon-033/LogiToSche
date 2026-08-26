import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldAlert, User } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

export interface UserSession {
  username: string;
  name: string;
  role: string;
  email: string;
}

interface LoginPageProps {
  onLogin: (session: UserSession) => void;
  onSwitchToRegister?: () => void;
}

const DEMO_ACCOUNTS: UserSession[] = [
  {
    username: "somchai.w",
    name: "สมชาย วงศ์สวัสดิ์",
    role: "Admin",
    email: "somchai.w@logiai.co.th",
  },
  {
    username: "operator.a",
    name: "อนันต์ สุขใจ",
    role: "User",
    email: "anan.s@logiai.co.th",
  },
  {
    username: "manager.p",
    name: "พิมลพรรณ สายชล",
    role: "User",
    email: "pimonpan.p@logiai.co.th",
  },
];

export function LoginPage({ onLogin, onSwitchToRegister }: LoginPageProps) {
  const [username, setUsername] = useState("somchai.w@logiai.co.th");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้งานหรืออีเมล");
      return;
    }
    if (!password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const matched = DEMO_ACCOUNTS.find(
        (acc) => acc.username === username.trim() || acc.email === username.trim(),
      );

      const session: UserSession = matched || {
        username: username.split("@")[0],
        name: username.split("@")[0].toUpperCase(),
        role: "User",
        email: username.includes("@") ? username : `${username}@logiai.co.th`,
      };

      onLogin(session);
    }, 400);
  }

  function handleSelectDemoAccount(acc: UserSession) {
    setUsername(acc.email);
    setPassword("password123");
    setError("");
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-slate-50 font-sans text-slate-900 antialiased overflow-hidden">
      {/* Light Cyan & Blue Ambient Background Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/15 blur-[120px]" />

      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center text-center">
            <Logo theme="dark" size="lg" className="justify-center" />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              ระบบแปลงเอกสารโลจิสติกส์เป็น JSON Schema (PaddleOCR + Qwen SLM)
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-6 text-center sm:text-left">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">เข้าสู่ระบบ (Sign In)</h2>
              <p className="mt-1 text-xs text-slate-500">กรอกข้อมูลบัญชีผู้ใช้งานเพื่อเข้าสู่ระบบ LogiAI</p>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  ชื่อผู้ใช้งาน หรือ อีเมล
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="name@logiai.co.th"
                    className="w-full rounded-xl border border-slate-300/80 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    รหัสผ่าน
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setError("กรุณาติดต่อผู้ดูแลระบบ IT เพื่อขอปลดล็อกรหัสผ่าน");
                    }}
                    className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 transition-colors"
                  >
                    ลืมรหัสผ่าน?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300/80 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600/20"
                  />
                  <span>จดจำบัญชีในเครื่องนี้</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 text-sm font-bold text-white transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>กำลังตรวจสอบสิทธิ์...</span>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Accounts Selection */}
            <div className="mt-6 pt-5 border-t border-slate-200/80">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-cyan-600" /> เลือกบัญชีทดสอบด่วน (Quick Demo Accounts)
              </p>
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs text-left ${
                      username === acc.email
                        ? "border-cyan-500/60 bg-cyan-50 font-bold text-cyan-800"
                        : "border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{acc.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shrink-0 ml-2">
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="text-center text-xs text-slate-500 space-y-2">
            <div>
              ยังไม่มีบัญชีผู้ใช้งาน?{" "}
              {onSwitchToRegister && (
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-bold text-cyan-600 hover:text-cyan-800 underline transition-colors"
                >
                  สมัครสมาชิกใหม่
                </button>
              )}
            </div>
            <div>ระบบความปลอดภัยมาตรฐานองค์กร ISO 27001 Certified &bull; LogiAI v1.0.0</div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white py-3.5 text-center text-xs font-medium text-slate-500">
        &copy; {new Date().getFullYear()} LogiAI Systems &bull; Enterprise Logistics Document Intelligence
      </footer>
    </div>
  );
}
