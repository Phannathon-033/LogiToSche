import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CircleHelp,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import type {
  AdminAnalyticsPoint,
  AdminDocumentRecord,
  AdminErrorCluster,
  AdminPromptLabState,
  DocumentJob,
  JsonSchemaOutput,
} from "../types";
import { getSlmPromptConfig, saveSlmPromptConfig } from "../services/slmApi";
const initialPromptLabState: AdminPromptLabState = {
  confidenceThreshold: 85,
  selectedModel: "qwen-2.5-1.5b",
  systemPrompt: "",
  fallbackRules: [],
  monitoredFields: [],
  fewShotExamples: [],
};

const initialDocuments: AdminDocumentRecord[] = [];
const initialAnalytics: AdminAnalyticsPoint[] = [];
const initialErrorClusters: AdminErrorCluster[] = [];
import { AdminOverview } from "./admin/AdminOverview";
import { AdminPromptConfig } from "./admin/AdminPromptConfig";
import { AdminReports } from "./admin/AdminReports";
import { AdminReviewQueue } from "./admin/AdminReviewQueue";
import { AdminJobsHistory } from "./admin/AdminJobsHistory";
import { AdminActivityLogs } from "./admin/AdminActivityLogs";
import { AdminUserSettings } from "./admin/AdminUserSettings";
import { GroundTruthViewerModal } from "./GroundTruthViewerModal";

type AdminView = "dashboard" | "documents" | "document-detail" | "users" | "prompt";
type PromptQualityTab = "prompt" | "reports";
type UsersSettingsTab = "users" | "activity";

interface AdminDashboardProps {
  onUpdateJob: (updatedJob: DocumentJob, updatedJson?: JsonSchemaOutput) => void;
  showToast: (message: string) => void;
  setViewMode: (mode: "user" | "admin") => void;
}

export function AdminDashboard({ onUpdateJob, showToast, setViewMode }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState<AdminDocumentRecord[]>(initialDocuments);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(initialDocuments[0]?.id ?? "");
  const [promptLab, setPromptLab] = useState<AdminPromptLabState>(initialPromptLabState);
  const [promptQualityTab, setPromptQualityTab] = useState<PromptQualityTab>("prompt");
  const [usersSettingsTab, setUsersSettingsTab] = useState<UsersSettingsTab>("users");
  const [groundTruthOpen, setGroundTruthOpen] = useState(false);
  const [promptConfigLoading, setPromptConfigLoading] = useState(true);
  const [promptConfigSaving, setPromptConfigSaving] = useState(false);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    let active = true;
    getSlmPromptConfig()
      .then((config) => {
        if (active) setPromptLab((current) => ({ ...current, ...config }));
      })
      .catch(() => {
        if (active) showToastRef.current("ไม่สามารถโหลดการตั้งค่า Prompt จาก backend ได้ ใช้ค่าเริ่มต้นแทน");
      })
      .finally(() => {
        if (active) setPromptConfigLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSavePromptConfig() {
    setPromptConfigSaving(true);
    try {
      const saved = await saveSlmPromptConfig(promptLab);
      setPromptLab((current) => ({ ...current, ...saved }));
      showToast("บันทึก Prompt Lab สำเร็จ");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "ไม่สามารถบันทึกการตั้งค่า Prompt ได้");
    } finally {
      setPromptConfigSaving(false);
    }
  }

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
            analytics={initialAnalytics}
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
        return (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-panel">
              {[
                ["users", "ผู้ใช้งาน", Users],
                ["activity", "Activity Log", Activity],
              ].map(([tab, label, Icon]) => (
                <button
                  key={tab as string}
                  type="button"
                  onClick={() => setUsersSettingsTab(tab as UsersSettingsTab)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    usersSettingsTab === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label as string}
                </button>
              ))}
            </div>
            {usersSettingsTab === "users" ? <AdminUserSettings /> : <AdminActivityLogs />}
          </>
        );
      case "prompt":
        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-panel">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  ["prompt", "Prompt Configuration", Settings],
                  ["reports", "Quality Reports", BarChart3],
                ].map(([tab, label, Icon]) => (
                  <button
                    key={tab as string}
                    type="button"
                    onClick={() => setPromptQualityTab(tab as PromptQualityTab)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                      promptQualityTab === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label as string}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setGroundTruthOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Ground Truth & Benchmark
              </button>
            </div>
            {promptQualityTab === "prompt" ? (
              <AdminPromptConfig
                value={promptLab}
                documents={documents}
                onChange={setPromptLab}
                onSave={handleSavePromptConfig}
                loading={promptConfigLoading}
                saving={promptConfigSaving}
              />
            ) : (
              <AdminReports documents={documents} errorClusters={initialErrorClusters} onOpenDocument={openDocument} />
            )}
            <GroundTruthViewerModal isOpen={groundTruthOpen} onClose={() => setGroundTruthOpen(false)} />
          </>
        );
    }
  }

  const activeMenuTitle =
    activeView === "dashboard"
      ? "Dashboard"
      : activeView === "documents"
        ? "Documents & Review Queue"
        : activeView === "document-detail"
          ? "Document Detail"
          : activeView === "users"
            ? "Users & Settings"
            : "Prompt & Quality";

  const adminMenuItems = [
    { id: "dashboard" as const, name: "Dashboard", icon: LayoutDashboard },
    { id: "documents" as const, name: "Documents", icon: FileSearch },
    { id: "users" as const, name: "Users & Settings", icon: Users },
    { id: "prompt" as const, name: "Prompt & Quality", icon: Settings },
  ];

  function selectAdminView(view: AdminView, name: string) {
    setActiveView(view);
    setSidebarOpen(false);
    showToast(`สลับหน้า: ${name}`);
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-900">
      <button
        type="button"
        aria-label="ปิดเมนู admin"
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-30 bg-slate-950/35 transition lg:hidden ${sidebarOpen ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[230px] shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:z-20 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xl font-black leading-none text-slate-900">LogiAI</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Admin Console</p>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 lg:hidden" aria-label="ปิดเมนู">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-5" aria-label="เมนู admin">
          <p className="px-4 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">เมนูหลัก</p>
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => selectAdminView(item.id, item.name)}
                className={`flex h-11 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-bold transition ${
                  active ? "bg-blue-50 text-blue-600 shadow-[inset_3px_0_0_#2563EB]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="mx-3 mb-5 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-center">
          <p className="text-sm font-extrabold text-slate-900">SLM Admin Workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">ติดตามคุณภาพ OCR, SLM และคิวตรวจสอบเอกสาร</p>
        </div>
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">AD</div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-extrabold text-slate-900">Super Admin</p>
                <p className="truncate text-[10px] font-medium text-slate-500">admin@logiai.com</p>
              </div>
            </div>
            <button type="button" onClick={() => setViewMode("user")} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="สลับไปยังมุมมองผู้ใช้" aria-label="สลับไปยังมุมมองผู้ใช้">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-10 flex min-h-[56px] items-center justify-between gap-3 border-b border-slate-200/90 bg-white/95 px-3 py-2.5 backdrop-blur-md shadow-sm sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 lg:hidden" aria-label="เปิดเมนู admin">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Admin Console</p>
              <h2 className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">{activeMenuTitle}</h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button type="button" onClick={() => setViewMode("user")} className="hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 sm:inline-flex">
              สลับมุมมองผู้ใช้
            </button>
            <button type="button" className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="การแจ้งเตือน">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
            </button>
            <button type="button" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="ช่วยเหลือ">
              <CircleHelp className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col space-y-6 p-3 sm:space-y-8 sm:p-5 lg:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
