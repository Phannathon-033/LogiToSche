import { BookmarkCheck, Cloud, LogOut, ShieldCheck } from "lucide-react";
import type { UserSession } from "./LoginPage";
import { Logo } from "./Logo";

interface AppHeaderProps {
  user?: UserSession | null;
  onLogout?: () => void;
  onOpenCloudHistory?: () => void;
  onOpenGroundTruth?: () => void;
  onOpenSignIn?: () => void;
  onOpenFeatures?: () => void;
  onOpenWorkflow?: () => void;
  onOpenPricing?: () => void;
  onOpenAdmin?: () => void;
}

export function AppHeader({
  user,
  onLogout,
  onOpenCloudHistory,
  onOpenGroundTruth,
  onOpenSignIn,
  onOpenFeatures,
  onOpenWorkflow,
  onOpenPricing,
  onOpenAdmin,
}: AppHeaderProps) {
  const initial = user?.name ? user.name.charAt(0) : "U";
  const name = user?.name || "ผู้ใช้งานระบบ";
  const role = user?.role || "ผู้ดูแลระบบ";

  return (
    <header className="sticky top-0 z-30 h-13 border-b border-slate-200/90 bg-white/95 shadow-xs backdrop-blur-md sm:h-14">
      <div className="mx-auto flex h-full max-w-[1420px] items-center justify-between px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3.5">
          <Logo theme="dark" size="sm" />
          <div className="hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="hidden text-xs font-extrabold uppercase tracking-wide text-slate-500 md:inline">Docs to JSON</span>
        </div>

        <nav className="hidden items-center gap-8 md:flex" aria-label="ข้อมูลระบบ">
          <button type="button" onClick={onOpenFeatures} className="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Features</button>
          <button type="button" onClick={onOpenWorkflow} className="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Workflow</button>
          <button type="button" onClick={onOpenPricing} className="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Pricing</button>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hidden items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-xs transition hover:border-blue-300 hover:bg-blue-100 sm:inline-flex"
              title="เปิด Admin Console"
            >
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span>Admin Console</span>
            </button>
          )}
          {onOpenGroundTruth && (
            <button type="button" onClick={onOpenGroundTruth} className="hidden items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50/90 px-3.5 py-1.5 text-xs font-bold text-purple-900 shadow-xs transition hover:border-purple-400 hover:bg-purple-100 lg:inline-flex" title="เปิดดูคลังข้อมูลเฉลย Ground Truth และผลการประเมิน K-Fold Cross-Validation">
              <BookmarkCheck className="h-4 w-4 text-purple-600" />
              <span>Ground Truth & Benchmark</span>
            </button>
          )}
          {onOpenCloudHistory && (
            <button type="button" onClick={onOpenCloudHistory} className="hidden items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs transition hover:border-amber-400 hover:bg-amber-100 lg:inline-flex" title="เปิดคลังเอกสารและ JSON ที่บันทึกบน Google Cloud Firestore">
              <Cloud className="h-4 w-4 text-amber-600" />
              <span>Firebase Cloud</span>
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
