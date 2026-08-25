import { ArrowRight, Briefcase, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldAlert, User, UserPlus } from "lucide-react";
import { useState } from "react";
import type { UserSession } from "./LoginPage";
import { Logo } from "./Logo";

interface RegisterPageProps {
  onRegister: (session: UserSession) => void;
  onSwitchToLogin: () => void;
}

const ROLES = [
  "เจ้าหน้าที่คีย์ข้อมูล (Data Operator)",
  "ผู้จัดการคลังสินค้า (Logistics Manager)",
  "เจ้าหน้าที่ตรวจสอบเอกสาร (Document Inspector)",
  "วิศวกรโลจิสติกส์ (Logistics Engineer)",
  "ผู้ดูแลระบบ (Admin)",
];

export function RegisterPage({ onRegister, onSwitchToLogin }: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล");
      return;
    }
    if (!email.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้งานหรืออีเมล");
      return;
    }
    if (!password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (!acceptTerms) {
      setError("กรุณายอมรับเงื่อนไขและข้อตกลงการใช้งาน");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const username = email.includes("@") ? email.split("@")[0] : email.trim();
      const session: UserSession = {
        username: username,
        name: name.trim(),
        role: role.split(" ")[0],
        email: email.includes("@") ? email.trim() : `${email.trim()}@logiai.co.th`,
      };
      onRegister(session);
    }, 500);
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-slate-50 font-sans text-slate-900 antialiased overflow-hidden">
      {/* Light Cyan & Blue Ambient Background Gradients */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-400/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-500/15 blur-[120px]" />

      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg space-y-6">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center text-center">
            <Logo theme="dark" size="lg" className="justify-center" />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              ระบบแปลงเอกสารโลจิสติกส์เป็น JSON Schema (PaddleOCR + Qwen SLM)
            </p>
          </div>

          {/* Register Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-6 text-center sm:text-left flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-cyan-600" />
                  <span>ลงทะเบียนบัญชีใหม่</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">กรอกข้อมูลเพื่อสร้างบัญชีเข้าใช้งานระบบ</p>
              </div>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-xs font-bold text-cyan-600 hover:text-cyan-800 transition-colors"
              >
                เข้าสู่ระบบ &rarr;
              </button>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  ชื่อ-นามสกุล (Full Name)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น สมชาย วงศ์สวัสดิ์"
                    className="w-full rounded-xl border border-slate-300/80 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  อีเมลองค์กร หรือ ชื่อผู้ใช้งาน
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="reg-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@logiai.co.th"
                    className="w-full rounded-xl border border-slate-300/80 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-role" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  บทบาท / แผนกในองค์กร
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300/80 bg-slate-50/70 py-2.5 pl-10 pr-8 text-sm text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 transition-all"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      id="reg-password"
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
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      id="reg-confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-300/80 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-600/20"
                  />
                  <span>ฉันยอมรับข้อตกลงนโยบายความเป็นส่วนตัวและการรักษาความปลอดภัยข้อมูลองค์กร</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 text-sm font-bold text-white transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>กำลังสร้างบัญชีผู้ใช้...</span>
                ) : (
                  <>
                    <span>ยืนยันการสมัครสมาชิก</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200/80 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>การันตีการคุ้มครองข้อมูลด้วยการยืนยันตัวตนระดับ Enterprise</span>
            </div>

          </div>

          <div className="text-center text-xs text-slate-500">
            มีบัญชีผู้ใช้อยู่แล้ว?{" "}
            <button type="button" onClick={onSwitchToLogin} className="font-bold text-cyan-600 hover:underline">
              เข้าสู่ระบบทันที
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white py-3.5 text-center text-xs font-medium text-slate-500">
        &copy; {new Date().getFullYear()} LogiAI Systems &bull; Enterprise Logistics Document Intelligence
      </footer>
    </div>
  );
}
