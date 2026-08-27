import { Bell, CircleHelp, Cloud, Database, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import type { UserSession } from "./LoginPage";
import { Logo } from "./Logo";

interface AppHeaderProps {
  user?: UserSession | null;
  onLogout?: () => void;
  onOpenCloudHistory?: () => void;
}

export function AppHeader({ user, onLogout, onOpenCloudHistory }: AppHeaderProps) {
  const initial = user?.name ? user.name.charAt(0) : "U";
  const name = user?.name || "ผู้ใช้งานระบบ";
  const role = user?.role || "ผู้ดูแลระบบ";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white shadow-xs">
      <div className="mx-auto flex h-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo & Product Title */}
        <div className="flex items-center gap-3.5">
          <Logo theme="dark" size="sm" />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-navy sm:text-lg">
                LogiAI
              </h1>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-primary border border-blue-200/60">
                Logistics to JSON Schema
              </span>
            </div>
            <p className="hidden text-[11px] font-medium text-slate-500 md:block">
              PaddleOCR (GPU) + Qwen2.5 SLM Multimodal Architecture
            </p>
          </div>
        </div>

        {/* Right: Cloud Sync Button, Status Badges & Profile */}
        <div className="flex items-center gap-2.5">
          {onOpenCloudHistory && (
            <button
              type="button"
              onClick={onOpenCloudHistory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition hover:bg-amber-100 hover:border-amber-400"
              title="เปิดคลังเอกสาร & JSON ที่บันทึกบน Google Cloud Firestore"
            >
              <Cloud className="h-4 w-4 text-amber-600" />
              <span className="font-extrabold">Firebase Cloud</span>
            </button>
          )}

          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>CUDA GPU Ready</span>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-xs">
              {initial}
            </div>
            <div className="hidden text-left leading-tight lg:block">
              <p className="max-w-[120px] truncate text-xs font-bold text-navy">{name}</p>
              <p className="text-[10px] font-medium text-slate-500">{role}</p>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                title="ออกจากระบบ"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
