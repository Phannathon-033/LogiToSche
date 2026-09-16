import { BarChart3, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import type { UserSession } from "./LoginPage";
import { Logo } from "./Logo";

interface AppHeaderProps {
  user?: UserSession | null;
  onLogout?: () => void;
  onOpenSignIn?: () => void;
  onOpenEvaluation?: () => void;
  onToggleAdmin?: () => void;
  isAdmin?: boolean;
}

export function AppHeader({
  user,
  onLogout,
  onOpenSignIn,
  onOpenEvaluation,
  onToggleAdmin,
  isAdmin,
}: AppHeaderProps) {
  const initial = user?.name ? user.name.charAt(0) : "U";
  const name = user?.name || "ผู้ใช้งานระบบ";
  const role = user?.role || "ผู้ดูแลระบบ";

  return (
    <header className="sticky top-0 z-30 h-13 border-b border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-md sm:h-14">
      <div className="flex h-full w-full items-center justify-between px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3.5">
          <Logo theme="dark" size="sm" />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="hidden text-xs font-extrabold uppercase tracking-wide text-slate-500 md:inline">Docs to JSON</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {onOpenEvaluation && (
            <button
              type="button"
              onClick={onOpenEvaluation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-1.5 text-xs font-black text-indigo-700 shadow-2xs transition hover:border-indigo-300 hover:shadow-xs hover:scale-[1.02]"
              title="เปิดหน้าทดสอบ K-Fold Cross-Validation และ F1-Score"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden xs:inline">ทดสอบ K-Fold & F1</span>
              <span className="xs:hidden">K-Fold</span>
            </button>
          )}

          {isAdmin && onToggleAdmin && (
            <button
              type="button"
              onClick={onToggleAdmin}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              title="สลับไปยังหน้า Admin Console"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>Admin Console</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-xs">{initial}</div>
              <div className="hidden text-left leading-tight lg:block">
                <p className="max-w-[120px] truncate text-xs font-bold text-navy">{name}</p>
                <p className="text-[10px] font-medium text-slate-500">{role}</p>
              </div>
              {onLogout && (
                <button type="button" onClick={onLogout} className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="ออกจากระบบ" aria-label="ออกจากระบบ">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={onOpenSignIn} className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100">Sign in</button>
              <button type="button" onClick={onOpenSignIn} className="rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-rose-500/20 transition hover:scale-105 hover:from-rose-600 hover:to-red-600">Get Started</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
