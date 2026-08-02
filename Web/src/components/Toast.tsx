import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  return (
    <div
      role="status"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg"
    >
      <CheckCircle2 className="h-5 w-5 text-green-300" aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={onClose} className="rounded p-1 text-white/80 hover:bg-white/10 focus-visible:outline-white" aria-label="ปิดข้อความแจ้งเตือน">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
