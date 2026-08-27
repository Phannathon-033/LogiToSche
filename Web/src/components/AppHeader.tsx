import { Cloud, LogOut } from "lucide-react";
import type { UserSession } from "./LoginPage";
import { Logo } from "./Logo";

interface AppHeaderProps {
  user?: UserSession | null;
  onLogout?: () => void;
  onOpenCloudHistory?: () => void;
  onOpenSignIn?: () => void;
  onOpenFeatures?: () => void;
  onOpenWorkflow?: () => void;
  onOpenPricing?: () => void;
}

export function AppHeader({
  user,
  onLogout,
  onOpenCloudHistory,
  onOpenSignIn,
  onOpenFeatures,
  onOpenWorkflow,
  onOpenPricing,
}: AppHeaderProps) {
  const initial = user?.name ? user.name.charAt(0) : "U";
  const name = user?.name || "ผู้ใช้งานระบบ";
  const role = user?.role || "ผู้ดูแลระบบ";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3.5">
          <Logo theme="dark" size="sm" />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="hidden text-xs font-extrabold tracking-wide text-slate-500 uppercase md:inline">
            Docs to JSON
          </span>
        </div>

        {/* Center: Navigation Links (Features, Workflow, Pricing) */}
        <nav className="hidden items-center gap-8 md:flex">
          <button
            type="button"
            onClick={onOpenFeatures}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Features
          </button>
          <button
            type="button"
            onClick={onOpenWorkflow}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Workflow
          </button>
          <button
            type="button"
            onClick={onOpenPricing}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Pricing
          </button>
        </nav>

        {/* Right: Cloud Sync Button & User Actions */}
        <div className="flex items-center gap-3">
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

          {user ? (
            /* Logged in User Profile Pill */
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
          ) : (
            /* Not logged in: Sign In + Get Started */
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenSignIn}
                className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={onOpenSignIn}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-rose-500/20 transition hover:from-rose-600 hover:to-red-600 hover:scale-105"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
