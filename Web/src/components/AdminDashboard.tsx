import { useState } from "react";
import {
  Activity,
  Bell,
  BrainCircuit,
  ChevronDown,
  CircleHelp,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import type { AdminDocumentRecord, AdminPromptLabState, DocumentJob, JsonSchemaOutput } from "../types";
import {
  mockAdminAnalytics,
  mockAdminDocuments,
  mockPromptLabState,
} from "../data/mockData";
import { AdminOverview } from "./admin/AdminOverview";
import { AdminPromptConfig } from "./admin/AdminPromptConfig";
import { AdminReviewQueue } from "./admin/AdminReviewQueue";
import { AdminJobsHistory } from "./admin/AdminJobsHistory";
import { AdminUserSettings } from "./admin/AdminUserSettings";

type AdminView = "dashboard" | "documents" | "document-detail" | "users" | "prompt";

interface AdminDashboardProps {
  jobs: DocumentJob[];
  onUpdateJob: (updatedJob: DocumentJob, updatedJson?: JsonSchemaOutput) => void;
  showToast: (message: string) => void;
  setViewMode: (mode: "user" | "admin") => void;
}

export function AdminDashboard({ jobs, onUpdateJob, showToast, setViewMode }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [dateRange] = useState("25 ส.ค. 2025 - 26 ส.ค. 2025");
  const [documents, setDocuments] = useState<AdminDocumentRecord[]>(mockAdminDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(mockAdminDocuments[0]?.id ?? "");
  const [promptLab, setPromptLab] = useState<AdminPromptLabState>(mockPromptLabState);

  function openDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setActiveView("document-detail");
  }

  function handleSaveDocument(documentId: string, nextJson: JsonSchemaOutput, correctionReason: string) {
    const normalizedReason = correctionReason.trim() || "ปรับแก้ field เพื่อแก้ข้อมูลตกหล่นจากผู้ใช้หรือ SLM";

    setDocuments((current) =>
      current.map((document) => {
        if (document.id !== documentId) return document;

        const changedFields = (Object.keys(nextJson) as Array<keyof JsonSchemaOutput>).filter((field) => {
          const previousValue = JSON.stringify(document.jsonOutput[field]);
          const nextValue = JSON.stringify(nextJson[field]);
          return previousValue !== nextValue;
        });

        const correctionHistory = changedFields.map((field, index) => ({
          id: `${document.id}-corr-${document.correctionHistory.length + index + 1}`,
          field,
          previousValue: String(document.jsonOutput[field] ?? ""),
          nextValue: String(nextJson[field] ?? ""),
          reason: normalizedReason,
          correctedBy: "สมชาย วงศ์สวัสดิ์",
          correctedAt: "27 ส.ค. 2026 10:15",
        }));

        const updatedDocument: AdminDocumentRecord = {
          ...document,
          jsonOutput: nextJson,
          status: "success",
          statusLabel: "ปรับแก้แล้ว รอใช้เป็น feedback",
          result: `${Math.max(document.overallConfidence, 92)}%`,
          overallConfidence: Math.max(document.overallConfidence, 92),
          missingFields: [],
          conflictingFields: [],
          queueReasons: ["แก้ไขแล้ว ใช้เป็น feedback สำหรับ prompt lab"],
          reviewNotes: [normalizedReason, ...document.reviewNotes],
          correctionHistory: [...correctionHistory, ...document.correctionHistory],
          reviewItems: document.reviewItems.map((item) => ({ ...item, status: "resolved" })),
        };

        onUpdateJob(
          {
            id: document.id,
            fileName: document.fileName,
            type: document.type,
            status: "success",
            statusLabel: "admin corrected",
            startedAt: document.date,
            result: updatedDocument.result,
          },
          nextJson,
        );

        return updatedDocument;
      }),
    );

    showToast("บันทึกการแก้ไข mock data แล้ว พร้อมใช้เป็น feedback สำหรับ prompt");
  }

  function renderContent() {
    switch (activeView) {
      case "dashboard":
        return (
          <AdminOverview
            analytics={mockAdminAnalytics}
            documents={documents}
            onOpenDocument={openDocument}
            onOpenPromptLab={() => setActiveView("prompt")}
          />
        );
      case "documents":
        return (
          <AdminReviewQueue
            documents={documents}
            onOpenDocument={openDocument}
          />
        );
      case "document-detail":
        return (
          <AdminJobsHistory
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={setSelectedDocumentId}
            onBack={() => setActiveView("documents")}
            onSaveDocument={handleSaveDocument}
            showToast={showToast}
          />
        );
      case "users":
        return <AdminUserSettings showToast={showToast} />;
      case "prompt":
        return (
          <AdminPromptConfig
            value={promptLab}
            documents={documents}
            onChange={setPromptLab}
            onSave={() => {
              showToast("บันทึก Prompt Lab ในโหมด mock แล้ว");
            }}
          />
        );
    }
  }

  const activeMenuTitle =
    activeView === "dashboard"
      ? "ภาพรวมระบบ"
      : activeView === "documents"
        ? "เอกสารทั้งหมด"
        : activeView === "document-detail"
          ? "Document Detail"
          : activeView === "users"
            ? "จัดการผู้ใช้งาน"
            : "Prompt Configuration";

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-900">
      <aside className="sticky top-0 flex h-screen w-[280px] shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 text-slate-300">
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-slate-800 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">AI DocProcessor</h1>
              <p className="text-[10px] font-semibold text-blue-400">Admin Console</p>
            </div>
          </div>

          <div className="space-y-7 px-4 py-6">
            <div className="space-y-1.5">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-500">เมนูหลัก</p>
              {[
                { id: "dashboard" as const, name: "ภาพรวมระบบ", icon: LayoutDashboard },
                { id: "documents" as const, name: "เอกสารทั้งหมด", icon: FileSearch },
                { id: "users" as const, name: "จัดการผู้ใช้งาน", icon: Users },
                { id: "prompt" as const, name: "Prompt Configuration", icon: Settings },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveView(item.id);
                    showToast(`สลับหน้า: ${item.name}`);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    activeView === item.id ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${activeView === item.id ? "text-white" : "text-slate-400"}`} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                AD
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-extrabold text-white">Super Admin</p>
                <p className="text-[10px] font-medium text-slate-500">admin@logiai.com</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("user")}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-red-400"
              title="สลับไปยังมุมมองผู้ใช้"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white px-8">
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-slate-900">{activeMenuTitle}</h2>
            <p className="text-xs font-medium text-slate-500">แผงหลังบ้านสำหรับติดตามผลเอกสาร จัดการผู้ใช้ และปรับ prompt ของ SLM</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setViewMode("user")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              สลับมุมมองผู้ใช้
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm sm:flex">
              <Activity className="h-4 w-4 text-slate-400" />
              <span>{dateRange}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>

            <span className="hidden text-[11px] font-bold text-slate-400 lg:inline">อัปเดตล่าสุด: mock mode</span>

            <div className="flex items-center gap-1">
              <button type="button" className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                <Bell className="h-5 w-5" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
              </button>
              <button type="button" className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                <CircleHelp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col space-y-8 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
