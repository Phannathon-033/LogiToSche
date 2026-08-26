import { Bell, CircleHelp, LogOut } from "lucide-react";
import type { UserSession } from "./LoginPage";
import { Logo } from "./Logo";

interface AppHeaderProps {
  user?: UserSession | null;
  onLogout?: () => void;
}

export function AppHeader({ user, onLogout }: AppHeaderProps) {
  const initial = user?.name ? user.name.charAt(0) : "ส";
  const name = user?.name || "สมชาย วงศ์สวัสดิ์";
  const role = user?.role || "Admin";

  return (
    <header className="sticky top-0 z-30 h-[72px] bg-slate-950 border-b border-cyan-500/20 text-white shadow-md">
      <div className="flex h-full items-center gap-4 px-4 lg:px-6">
        <Logo theme="light" size="md" />

        <div className="hidden h-11 w-px bg-slate-800 lg:block" />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black leading-6 sm:text-2xl text-white tracking-tight">ระบบแปลงเอกสารโลจิสติกส์เป็น JSON Schema</h1>
          <p className="hidden truncate text-xs font-semibold text-cyan-400/90 sm:block">PaddleOCR + Qwen SLM Architecture (GPU Accelerated)</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="relative rounded-xl p-2 hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="การแจ้งเตือน">
            <Bell className="h-5 w-5 text-slate-300 hover:text-cyan-400 transition-colors" aria-hidden="true" />
            <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-cyan-500 text-[10px] font-black text-slate-950">5</span>
          </button>
          <button type="button" className="rounded-xl p-2 hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" aria-label="ช่วยเหลือ">
            <CircleHelp className="h-5 w-5 text-slate-300 hover:text-cyan-400 transition-colors" aria-hidden="true" />
          </button>
          
          <div className="hidden items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 md:flex">
            <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold shadow-sm">
              <span className="text-sm font-bold">{initial}</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </span>
            <span className="hidden text-left leading-tight xl:block">
              <span className="block text-xs font-bold text-slate-100 truncate max-w-[140px]">{name}</span>
              <span className="block text-[11px] text-cyan-400 font-semibold truncate max-w-[140px]">{role}</span>
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="ml-1 flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
                title="ออกจากระบบ"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">ออกจากระบบ</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
