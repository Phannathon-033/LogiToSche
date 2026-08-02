import { Bot, Braces, FileText, X } from "lucide-react";
import { menuItems } from "../data/mockData";

interface AppSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ activeMenu, onMenuChange, open, onClose }: AppSidebarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="ปิดเมนู"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-950/35 transition lg:hidden ${open ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[230px] flex-col border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:z-20 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div className="min-w-0">
            <p className="text-xl font-black leading-none text-navy">LogiAI</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Docs to JSON</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-blue-50 lg:hidden" aria-label="ปิดเมนู">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-5" aria-label="เมนูหลัก">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = item.label === activeMenu;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  onMenuChange(item.label);
                  onClose();
                }}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-bold transition ${
                  active ? "bg-blue-50 text-primary shadow-[inset_3px_0_0_#2563EB]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mx-3 mb-5 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-center">
          <p className="text-sm font-extrabold text-navy">ระบบรองรับ 13 ฟิลด์สำคัญ</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            ข้อมูลที่ไม่ตรงกับฟิลด์จะถูกเก็บใน <span className="font-bold text-ink">"other"</span>
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-primary">
            <FlowIcon icon="doc" />
            <span className="text-slate-400">→</span>
            <FlowIcon icon="ai" />
            <span className="text-slate-400">→</span>
            <FlowIcon icon="json" />
          </div>
        </div>

        <div className="px-4 pb-6 text-xs text-slate-500">
          <p>เวอร์ชัน 1.0.0</p>
          <p className="mt-3">© 2024 LogiAI Solutions</p>
        </div>
      </aside>
    </>
  );
}

function FlowIcon({ icon }: { icon: "doc" | "ai" | "json" }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded border border-blue-200 bg-white">
      {icon === "doc" ? <FileText className="h-5 w-5" aria-hidden="true" /> : icon === "ai" ? <Bot className="h-5 w-5" aria-hidden="true" /> : <Braces className="h-5 w-5" aria-hidden="true" />}
    </span>
  );
}
