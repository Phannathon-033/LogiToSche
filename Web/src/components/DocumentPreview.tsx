import {
  Download,
  Eye,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  Search,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DocumentPreviewProps {
  previewUrl: string | null;
  previewName: string;
  progress?: number;
  onToast: (message: string) => void;
}

export function DocumentPreview({
  previewUrl,
  previewName,
  progress,
  onToast,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isScanning = progress !== undefined && progress > 0 && progress < 100;

  // Zoom controls
  function handleZoomIn() {
    setZoom((prev) => Math.min(prev + 0.25, 3.5));
  }

  function handleZoomOut() {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }

  function handleResetZoom() {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
  }

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Pan handlers when zoomed in
  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    setIsPanning(true);
    setStartPos({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanning || zoom <= 1) return;
    setPanPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-[460px]">
      {/* Header Toolbar with Real Functional Zoom & Fullscreen Buttons */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-black text-slate-900">
            ตัวอย่างเอกสาร (Document Preview)
          </h3>
        </div>

        {/* Action Buttons: Zoom Out, Zoom In, Reset, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
            title="ย่อขนาด (-25%)"
            aria-label="ย่อขนาด"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          {/* Zoom Percentage Badge / Reset */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-mono font-extrabold text-blue-600 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
            title="คลิกเพื่อรีเซ็ตขนาด 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3.5}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
            title="ขยายขนาด (+25%)"
            aria-label="ขยายขนาด"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <div className="mx-0.5 h-4 w-px bg-slate-200" />

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => {
              setIsFullscreen(true);
              setZoom(1.25);
            }}
            className="flex h-7 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 text-xs font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-100 hover:border-indigo-300"
            title="เปิดโหมดเต็มจอภาพขนาดใหญ่ (Fullscreen)"
            aria-label="เปิดโหมดเต็มจอ"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">เต็มจอ</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 min-h-[420px] max-h-[580px] overflow-auto rounded-xl border border-slate-200 bg-slate-100/70 p-3 shadow-inner select-none ${
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
      >
        <div
          className="mx-auto flex items-center justify-center transition-transform duration-150 ease-out origin-top"
          style={{
            transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`ตัวอย่างเอกสาร ${previewName}`}
              className="max-h-[540px] w-auto max-w-full rounded-lg object-contain shadow-md bg-white border border-slate-200"
              draggable={false}
            />
          ) : (
            <InvoiceMockup />
          )}

          {/* Scanning Animation Overlay */}
          {isScanning && (
            <div className="absolute inset-0 z-10 overflow-hidden rounded-lg bg-blue-900/10 backdrop-blur-[1px]">
              <div className="animate-scan-line absolute left-0 right-0 h-1 bg-blue-600 shadow-[0_0_12px_2px_rgba(37,99,235,0.7)]" />
              <div className="absolute inset-0 grid place-items-center opacity-90">
                <div className="flex animate-pulse-slow flex-col items-center gap-2 rounded-2xl bg-white/95 px-6 py-5 shadow-xl ring-1 ring-black/5 backdrop-blur-sm">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Search className="h-7 w-7 animate-bounce-slight" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-900">กำลังสแกนและวิเคราะห์...</p>
                    <p className="text-xs font-bold text-blue-600">{progress}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pan hint when zoomed */}
        {zoom > 1 && (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm flex items-center gap-1 shadow-sm">
            <Move className="h-3 w-3" />
            <span>คลิกค้างเพื่อเลื่อนภาพ (Pan)</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN LIGHTBOX MODAL (เปิดเต็มจอภาพความละเอียดสูงคมชัด 100%)       */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 p-4 sm:p-6 backdrop-blur-md animate-fadeIn">
          {/* Modal Top Bar */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-900/90 px-4 py-3 border border-slate-800 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm font-black tracking-tight">{previewName}</p>
                <p className="text-xs text-slate-400">โหมดเต็มจอภาพความละเอียดสูง (High-Resolution View)</p>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                title="ย่อขนาด (-25%)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="flex h-8 items-center rounded-lg bg-slate-800 px-3 text-xs font-mono font-bold text-cyan-400 hover:bg-slate-700"
                title="รีเซ็ตขนาด 100%"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                title="ขยายขนาด (+25%)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="mx-1 h-5 w-px bg-slate-700" />

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 px-3 text-xs font-black text-white transition shadow-sm"
                title="ปิดโหมดเต็มจอ (ESC)"
              >
                <X className="h-4 w-4" />
                <span>ปิด (ESC)</span>
              </button>
            </div>
          </div>

          {/* Modal Image Viewer with Zoom & Pan */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div
              className="transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`เต็มจอ ${previewName}`}
                  className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-2xl bg-white"
                  draggable={false}
                />
              ) : (
                <InvoiceMockup />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceMockup() {
  return (
    <article className="rounded-xl bg-white p-6 text-xs leading-normal text-slate-900 shadow-xl border border-slate-200 max-w-md">
      <div className="flex justify-between gap-6 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">BILL OF LADING / INVOICE</h3>
          <p className="font-extrabold text-blue-600 mt-1">Siam Global Logistics Co., Ltd.</p>
          <p className="text-slate-500 text-[11px]">88/9 Sukhumvit Rd, Khlong Toei, Bangkok 10110</p>
          <p className="text-slate-500 text-[11px]">Tel: +66 2 123 4567 · info@siamlogistics.co.th</p>
        </div>
        <div className="text-right space-y-1 text-[11px]">
          <p className="font-mono font-bold text-slate-800">Doc No: <b className="text-blue-600">BL-2024-88910</b></p>
          <p className="font-mono text-slate-600">Date: 2024-08-25</p>
          <p className="font-mono text-slate-600">Due: 2024-09-25</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 text-[11px] border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-400 uppercase text-[10px]">Shipper / ผู้ส่ง:</p>
          <p className="font-black text-slate-800">Siam Global Logistics Co., Ltd.</p>
          <p className="text-slate-500">Bangkok, Thailand</p>
        </div>
        <div>
          <p className="font-bold text-slate-400 uppercase text-[10px]">Consignee / ผู้รับ:</p>
          <p className="font-black text-slate-800">Tokyo Freight Corp.</p>
          <p className="text-slate-500">Chiyoda-ku, Tokyo, Japan</p>
        </div>
      </div>

      <table className="mt-3 w-full text-left text-xs font-sans">
        <thead className="bg-slate-100 text-slate-600 font-extrabold rounded-lg">
          <tr>
            <th className="p-2">Description</th>
            <th className="p-2 text-center">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Amount (USD)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[11px]">
          <tr>
            <td className="p-2 font-medium">Auto Spare Parts (Container TGHU1234567)</td>
            <td className="p-2 text-center font-bold">200</td>
            <td className="p-2 text-right font-mono">79.00</td>
            <td className="p-2 text-right font-mono font-bold">15,800.00</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 border-t border-slate-200 pt-3 text-right space-y-1 text-xs">
        <p className="text-slate-500">Subtotal: <span className="font-mono font-bold text-slate-800">15,800.00 USD</span></p>
        <p className="text-slate-500">VAT (0% Export): <span className="font-mono font-bold text-slate-800">0.00 USD</span></p>
        <p className="text-sm font-black text-emerald-700">Total Amount: <span className="font-mono">15,800.00 USD</span></p>
      </div>
    </article>
  );
}
