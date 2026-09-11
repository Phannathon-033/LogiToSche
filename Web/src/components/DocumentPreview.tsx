import {
  Download,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Crosshair,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface BoxBounds {
  index: number;
  text: string;
  conf: number;
  isLowConf: boolean;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  polygonPoints: string;
  isValid: boolean;
}

interface DocumentPreviewProps {
  previewUrl: string | null;
  previewName: string;
  progress?: number;
  ocrLines?: any[];
  selectedOcrIndex?: number | null;
  onSelectOcrIndex?: (index: number | null) => void;
  showAllBoxes?: boolean;
  onToggleShowAllBoxes?: () => void;
  onToast: (message: string) => void;
}

export function DocumentPreview({
  previewUrl,
  previewName,
  progress,
  ocrLines = [],
  selectedOcrIndex = null,
  onSelectOcrIndex,
  showAllBoxes = true,
  onToggleShowAllBoxes,
  onToast,
}: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Smooth zooming & panning animation refs (60fps/120fps RAF lerp)
  const targetZoomRef = useRef(1);
  const currentZoomRef = useRef(1);
  const targetPanRef = useRef({ x: 0, y: 0 });
  const currentPanRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const isScanning = progress !== undefined && progress > 0 && progress < 100;

  // Track image natural dimensions for SVG coordinate system
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.naturalWidth > 0 && target.naturalHeight > 0) {
      setNaturalSize({
        width: target.naturalWidth,
        height: target.naturalHeight,
      });
    }
  };

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  }, [previewUrl]);

  // Extents from actual OCR boxes to guarantee correct scale even if img natural size takes time
  const maxCoordsFromLines = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    for (const l of ocrLines || []) {
      const b = l.bounding_box || l.box;
      if (Array.isArray(b)) {
        for (const p of b) {
          if (Array.isArray(p)) {
            if (Number(p[0]) > maxX) maxX = Number(p[0]);
            if (Number(p[1]) > maxY) maxY = Number(p[1]);
          } else if (typeof p === "number") {
            if (Number(p) > maxX) maxX = Number(p);
          }
        }
      }
    }
    return { maxX, maxY };
  }, [ocrLines]);

  const effectiveNaturalSize = useMemo(() => {
    if (naturalSize && naturalSize.width > 0 && naturalSize.height > 0) {
      return naturalSize;
    }
    if (maxCoordsFromLines.maxX > 0 && maxCoordsFromLines.maxY > 0) {
      return {
        width: Math.max(800, Math.ceil(maxCoordsFromLines.maxX)),
        height: Math.max(1000, Math.ceil(maxCoordsFromLines.maxY)),
      };
    }
    return null;
  }, [naturalSize, maxCoordsFromLines]);

  // Compute all bounding box rectangles from PaddleOCR coordinate data
  const boxesWithBounds: BoxBounds[] = useMemo(() => {
    if (!ocrLines || ocrLines.length === 0) return [];

    return ocrLines.map((line: any, index: number) => {
      const rawBox = line.bounding_box || line.box;
      let minX = 0,
        minY = 0,
        maxX = 0,
        maxY = 0;
      let polygonPoints = "";
      let isValid = false;

      if (rawBox && Array.isArray(rawBox)) {
        // Format A: 4-point polygon [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
        if (rawBox.length >= 4 && Array.isArray(rawBox[0])) {
          const xs = rawBox.map((p: any) => (Array.isArray(p) ? Number(p[0]) || 0 : 0));
          const ys = rawBox.map((p: any) => (Array.isArray(p) ? Number(p[1]) || 0 : 0));
          minX = Math.round(Math.min(...xs));
          maxX = Math.round(Math.max(...xs));
          minY = Math.round(Math.min(...ys));
          maxY = Math.round(Math.max(...ys));
          polygonPoints = rawBox
            .map((p: any) => `${Math.round(p[0] || 0)},${Math.round(p[1] || 0)}`)
            .join(" ");
          isValid = maxX > minX && maxY > minY;
        }
        // Format B: 4 flat coords [xmin, ymin, xmax, ymax]
        else if (rawBox.length === 4 && typeof rawBox[0] === "number") {
          minX = Math.round(Number(rawBox[0]) || 0);
          minY = Math.round(Number(rawBox[1]) || 0);
          maxX = Math.round(Number(rawBox[2]) || 0);
          maxY = Math.round(Number(rawBox[3]) || 0);
          polygonPoints = `${minX},${minY} ${maxX},${minY} ${maxX},${maxY} ${minX},${maxY}`;
          isValid = maxX > minX && maxY > minY;
        }
        // Format C: 8 flat coords [x1, y1, x2, y2, x3, y3, x4, y4]
        else if (rawBox.length === 8 && typeof rawBox[0] === "number") {
          const xs = [rawBox[0], rawBox[2], rawBox[4], rawBox[6]].map(Number);
          const ys = [rawBox[1], rawBox[3], rawBox[5], rawBox[7]].map(Number);
          minX = Math.round(Math.min(...xs));
          maxX = Math.round(Math.max(...xs));
          minY = Math.round(Math.min(...ys));
          maxY = Math.round(Math.max(...ys));
          polygonPoints = `${rawBox[0]},${rawBox[1]} ${rawBox[2]},${rawBox[3]} ${rawBox[4]},${rawBox[5]} ${rawBox[6]},${rawBox[7]}`;
          isValid = maxX > minX && maxY > minY;
        }
      }

      // Format D: Fallback to position ONLY IF width > 0 and height > 0 (strictly NO fake defaults!)
      if (!isValid && line.position) {
        const px = Number(line.position.x);
        const py = Number(line.position.y);
        const pw = Number(line.position.width);
        const ph = Number(line.position.height);
        if (pw > 0 && ph > 0 && !isNaN(px) && !isNaN(py)) {
          minX = Math.round(px);
          minY = Math.round(py);
          maxX = Math.round(px + pw);
          maxY = Math.round(py + ph);
          polygonPoints = `${minX},${minY} ${maxX},${minY} ${maxX},${maxY} ${minX},${maxY}`;
          isValid = maxX > minX && maxY > minY;
        }
      }

      const rawConf = line.confidence ?? 0.95;
      const conf = rawConf > 1.0 ? rawConf / 100.0 : rawConf;
      const isLowConf = conf < 0.85;

      return {
        index,
        text: String(line.text || "").trim(),
        conf,
        isLowConf,
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
        polygonPoints,
        isValid,
      };
    });
  }, [ocrLines]);

  const validBoxesCount = useMemo(() => {
    return boxesWithBounds.filter((b) => b.isValid).length;
  }, [boxesWithBounds]);

  const selectedBox = useMemo(() => {
    if (selectedOcrIndex === null || selectedOcrIndex === undefined) return null;
    return boxesWithBounds.find((b) => b.index === selectedOcrIndex) || null;
  }, [boxesWithBounds, selectedOcrIndex]);

  // Auto scroll/center on selected bounding box if zoomed in
  useEffect(() => {
    if (selectedBox && zoom > 1 && containerRef.current && effectiveNaturalSize) {
      const container = containerRef.current;
      const relX = (selectedBox.minX + selectedBox.width / 2) / effectiveNaturalSize.width;
      const relY = (selectedBox.minY + selectedBox.height / 2) / effectiveNaturalSize.height;
      const targetScrollLeft = relX * container.scrollWidth - container.clientWidth / 2;
      const targetScrollTop = relY * container.scrollHeight - container.clientHeight / 2;
      container.scrollTo({
        left: targetScrollLeft,
        top: targetScrollTop,
        behavior: "smooth",
      });
    }
  }, [selectedBox, zoom, effectiveNaturalSize]);

  // Smooth RAF interpolation loop (60fps/120fps buttery glide)
  const startSmoothAnimation = () => {
    if (animFrameRef.current !== null) return;

    const tick = () => {
      const curZ = currentZoomRef.current;
      const tgtZ = targetZoomRef.current;
      const diffZ = tgtZ - curZ;

      const curP = currentPanRef.current;
      const tgtP = targetPanRef.current;
      const diffPx = tgtP.x - curP.x;
      const diffPy = tgtP.y - curP.y;

      const isZoomDone = Math.abs(diffZ) < 0.001;
      const isPanDone = Math.abs(diffPx) < 0.3 && Math.abs(diffPy) < 0.3;

      if (isZoomDone && isPanDone) {
        currentZoomRef.current = tgtZ;
        currentPanRef.current = { ...tgtP };
        setZoom(Number(tgtZ.toFixed(2)));
        setPanPosition({ x: Math.round(tgtP.x), y: Math.round(tgtP.y) });
        animFrameRef.current = null;
        return;
      }

      // Exponential damping factor: 0.20 provides rapid response with silky ease-out
      const factor = 0.20;
      const nextZ = curZ + diffZ * factor;
      const nextPx = curP.x + diffPx * factor;
      const nextPy = curP.y + diffPy * factor;

      currentZoomRef.current = nextZ;
      currentPanRef.current = { x: nextPx, y: nextPy };

      setZoom(Number(nextZ.toFixed(3)));
      setPanPosition({ x: nextPx, y: nextPy });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  // Zoom controls (smooth glide)
  function handleZoomIn() {
    const next = Math.min(targetZoomRef.current + 0.25, 4.0);
    targetZoomRef.current = Number(next.toFixed(2));
    startSmoothAnimation();
  }

  function handleZoomOut() {
    const next = Math.max(targetZoomRef.current - 0.25, 0.5);
    targetZoomRef.current = Number(next.toFixed(2));
    if (next <= 1) {
      targetPanRef.current = { x: 0, y: 0 };
    }
    startSmoothAnimation();
  }

  function handleResetZoom() {
    targetZoomRef.current = 1;
    targetPanRef.current = { x: 0, y: 0 };
    startSmoothAnimation();
  }

  // Smooth mouse wheel zoom with Zoom-to-Cursor
  const handleWheelZoom = (e: WheelEvent, container: HTMLDivElement, isFs: boolean = false) => {
    e.preventDefault();

    // Standardize delta across different mice & trackpads
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 25;
    else if (e.deltaMode === 2) delta *= 400;

    // Clamp single delta to avoid sudden leaps
    delta = Math.max(-120, Math.min(120, delta));

    // Continuous exponential zoom factor
    const zoomFactor = Math.exp(-delta * 0.0018);

    const oldTarget = targetZoomRef.current;
    const newTarget = Math.min(Math.max(Number((oldTarget * zoomFactor).toFixed(3)), 0.5), 4.0);

    if (Math.abs(newTarget - oldTarget) < 0.001) return;

    targetZoomRef.current = newTarget;

    // Zoom-to-cursor: keep mouse focus point stationary
    if (newTarget <= 1) {
      targetPanRef.current = { x: 0, y: 0 };
    } else {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - (rect.left + rect.width / 2);
      const mouseY = isFs
        ? e.clientY - (rect.top + rect.height / 2)
        : e.clientY - rect.top;

      const currentPan = targetPanRef.current;
      const scaleRatio = newTarget / oldTarget;

      let nextPanX = mouseX - scaleRatio * (mouseX - currentPan.x);
      let nextPanY = mouseY - scaleRatio * (mouseY - currentPan.y);

      // Safe boundaries to prevent document from flying out of sight
      const boundX = (rect.width * (newTarget - 1)) / 1.5 + 150;
      const boundY = (rect.height * (newTarget - 1)) + 150;
      nextPanX = Math.max(-boundX, Math.min(boundX, nextPanX));
      nextPanY = isFs
        ? Math.max(-boundY, Math.min(boundY, nextPanY))
        : Math.max(-boundY, Math.min(120, nextPanY));

      targetPanRef.current = { x: nextPanX, y: nextPanY };
    }

    startSmoothAnimation();
  };

  // Mouse wheel zoom for main preview
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      handleWheelZoom(e, container, false);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Mouse wheel zoom for fullscreen modal
  useEffect(() => {
    if (!isFullscreen) return;
    const fsContainer = fullscreenContainerRef.current;
    if (!fsContainer) return;

    const onWheel = (e: WheelEvent) => {
      handleWheelZoom(e, fsContainer, true);
    };

    fsContainer.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      fsContainer.removeEventListener("wheel", onWheel);
    };
  }, [isFullscreen]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        targetZoomRef.current = 1;
        currentZoomRef.current = 1;
        setZoom(1);
        targetPanRef.current = { x: 0, y: 0 };
        currentPanRef.current = { x: 0, y: 0 };
        setPanPosition({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Pan handlers when zoomed in
  function handleMouseDown(e: React.MouseEvent) {
    if (currentZoomRef.current <= 1) return;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPanning(true);
    setStartPos({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanning || currentZoomRef.current <= 1) return;
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    setPanPosition({ x: newX, y: newY });
    currentPanRef.current = { x: newX, y: newY };
    targetPanRef.current = { x: newX, y: newY };
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-[400px] lg:min-h-[440px] xl:min-h-[480px]">
      {/* Header Toolbar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 text-blue-600" />
          <h3 className="text-xs font-semibold text-slate-900">
            ตัวอย่างเอกสาร (Document Preview)
          </h3>
          {selectedBox && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-800">
              <Crosshair className="h-3 w-3 text-blue-600 shrink-0" />
              <span>กำลังส่อง #{selectedBox.index + 1}</span>
            </span>
          )}
        </div>

        {/* Action Buttons: Zoom, OCR Box Toggle, Reset, Fullscreen */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Toggle All OCR Bounding Boxes */}
          {validBoxesCount > 0 && (
            <button
              type="button"
              onClick={onToggleShowAllBoxes}
              className={`flex h-6.5 items-center gap-1 rounded-lg border px-2 text-[10.5px] font-bold shadow-xs transition ${
                showAllBoxes
                  ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
              title={
                showAllBoxes
                  ? "คลิกเพื่อซ่อนกรอบ OCR ทั้งหมด (แสดงเฉพาะจุดที่เลือก)"
                  : "คลิกเพื่อแสดงกรอบ OCR ทั้งหมดบนภาพ"
              }
            >
              <Target className="h-3 w-3 text-blue-600" />
              <span>กรอบ OCR</span>
              <span className="rounded-full bg-blue-200/80 px-1 py-0.2 font-mono text-[9px] text-blue-900">
                {validBoxesCount}
              </span>
            </button>
          )}

          {/* Deselect Box Button */}
          {selectedBox && (
            <button
              type="button"
              onClick={() => onSelectOcrIndex?.(null)}
              className="flex h-6.5 items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 text-[10.5px] font-bold text-amber-800 hover:bg-amber-100 transition shadow-xs"
              title="ยกเลิกการไฮไลท์กรอบนี้"
            >
              <X className="h-3 w-3 text-amber-700" />
              <span className="hidden sm:inline">ยกเลิกส่อง</span>
            </button>
          )}

          <div className="mx-0.5 h-3.5 w-px bg-slate-200" />

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
            title="ย่อขนาด (-25%) หรือเลื่อนลูกกลิ้งเมาส์ลง"
            aria-label="ย่อขนาด"
          >
            <ZoomOut className="h-3 w-3" />
          </button>

          {/* Zoom Percentage Badge / Reset */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="flex h-6.5 items-center rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-mono font-extrabold text-blue-600 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
            title="คลิกเพื่อรีเซ็ตขนาด 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 4.0}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40"
            title="ขยายขนาด (+25%) หรือเลื่อนลูกกลิ้งเมาส์ขึ้น"
            aria-label="ขยายขนาด"
          >
            <ZoomIn className="h-3 w-3" />
          </button>

          <div className="mx-0.5 h-3.5 w-px bg-slate-200" />

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => {
              setIsFullscreen(true);
              targetZoomRef.current = 1.25;
              currentZoomRef.current = 1.25;
              setZoom(1.25);
              targetPanRef.current = { x: 0, y: 0 };
              currentPanRef.current = { x: 0, y: 0 };
              setPanPosition({ x: 0, y: 0 });
            }}
            className="flex h-6.5 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2 text-[11px] font-bold text-indigo-700 shadow-xs transition hover:bg-indigo-100 hover:border-indigo-300"
            title="เปิดโหมดเต็มจอภาพขนาดใหญ่ (Fullscreen)"
            aria-label="เปิดโหมดเต็มจอ"
          >
            <Maximize2 className="h-3 w-3" />
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
        className={`relative flex-1 min-h-[360px] lg:min-h-[400px] xl:min-h-[440px] max-h-[540px] overflow-auto rounded-xl border border-slate-200 bg-slate-100/70 p-3 shadow-inner select-none ${
          zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        }`}
      >
        <div
          className="mx-auto flex items-center justify-center origin-top will-change-transform"
          style={{
            transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
          }}
        >
          {previewUrl ? (
            <div className="relative inline-block select-none overflow-visible rounded-lg border border-slate-200 shadow-md bg-white">
              <img
                ref={imgRef}
                src={previewUrl}
                alt={`ตัวอย่างเอกสาร ${previewName}`}
                onLoad={handleImageLoad}
                className="max-h-[460px] xl:max-h-[500px] w-auto max-w-full rounded-lg block"
                draggable={false}
              />

              {/* Interactive Bounding Box Overlay Layer */}
              {effectiveNaturalSize && effectiveNaturalSize.width > 0 && (
                <OcrBoundingBoxOverlay
                  boxesWithBounds={boxesWithBounds}
                  selectedBox={selectedBox}
                  selectedOcrIndex={selectedOcrIndex}
                  onSelectOcrIndex={onSelectOcrIndex}
                  hoveredBoxIndex={hoveredBoxIndex}
                  setHoveredBoxIndex={setHoveredBoxIndex}
                  showAllBoxes={showAllBoxes}
                  naturalSize={effectiveNaturalSize}
                />
              )}
            </div>
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
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN LIGHTBOX MODAL                                                 */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 p-4 sm:p-6 backdrop-blur-md animate-fadeIn">
          {/* Modal Top Bar */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-900/90 px-4 py-3 border border-slate-800 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm font-black tracking-tight">{previewName}</p>
                <p className="text-xs text-slate-400">
                  โหมดเต็มจอภาพความละเอียดสูงพร้อมตำแหน่ง OCR Bounding Box
                </p>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex items-center gap-2">
              {validBoxesCount > 0 && (
                <button
                  type="button"
                  onClick={onToggleShowAllBoxes}
                  className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition ${
                    showAllBoxes
                      ? "border-cyan-500/80 bg-cyan-950/60 text-cyan-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Target className="h-3.5 w-3.5 text-cyan-400" />
                  <span>กรอบ OCR ({validBoxesCount})</span>
                </button>
              )}

              {selectedBox && (
                <button
                  type="button"
                  onClick={() => onSelectOcrIndex?.(null)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-600/80 bg-amber-950/60 px-3 text-xs font-bold text-amber-300 hover:bg-amber-900/80 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>ยกเลิกส่อง (#{selectedBox.index + 1})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                title="ย่อขนาด (-25%) หรือเลื่อนลูกกลิ้งเมาส์ลง"
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
                disabled={zoom >= 4.0}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                title="ขยายขนาด (+25%) หรือเลื่อนลูกกลิ้งเมาส์ขึ้น"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="mx-1 h-5 w-px bg-slate-700" />

              <button
                type="button"
                onClick={() => {
                  setIsFullscreen(false);
                  targetZoomRef.current = 1;
                  currentZoomRef.current = 1;
                  setZoom(1);
                  targetPanRef.current = { x: 0, y: 0 };
                  currentPanRef.current = { x: 0, y: 0 };
                  setPanPosition({ x: 0, y: 0 });
                }}
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
            ref={fullscreenContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative flex-1 overflow-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div
              className="will-change-transform"
              style={{
                transform: `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`,
              }}
            >
              {previewUrl ? (
                <div className="relative inline-block select-none overflow-visible rounded-xl shadow-2xl bg-white border border-slate-700">
                  <img
                    src={previewUrl}
                    alt={`เต็มจอ ${previewName}`}
                    onLoad={handleImageLoad}
                    className="max-h-[82vh] w-auto max-w-full rounded-xl block"
                    draggable={false}
                  />

                  {/* Interactive Bounding Box Overlay Layer */}
                  {effectiveNaturalSize && effectiveNaturalSize.width > 0 && (
                    <OcrBoundingBoxOverlay
                      boxesWithBounds={boxesWithBounds}
                      selectedBox={selectedBox}
                      selectedOcrIndex={selectedOcrIndex}
                      onSelectOcrIndex={onSelectOcrIndex}
                      hoveredBoxIndex={hoveredBoxIndex}
                      setHoveredBoxIndex={setHoveredBoxIndex}
                      showAllBoxes={showAllBoxes}
                      naturalSize={effectiveNaturalSize}
                    />
                  )}
                </div>
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

// =========================================================================
// INTERACTIVE BOUNDING BOX OVERLAY COMPONENT (SVG + HUD Tooltip)
// =========================================================================
function OcrBoundingBoxOverlay({
  boxesWithBounds,
  selectedBox,
  selectedOcrIndex,
  onSelectOcrIndex,
  hoveredBoxIndex,
  setHoveredBoxIndex,
  showAllBoxes,
  naturalSize,
}: {
  boxesWithBounds: BoxBounds[];
  selectedBox: BoxBounds | null;
  selectedOcrIndex?: number | null;
  onSelectOcrIndex?: (index: number | null) => void;
  hoveredBoxIndex: number | null;
  setHoveredBoxIndex: (idx: number | null) => void;
  showAllBoxes: boolean;
  naturalSize: { width: number; height: number };
}) {
  if (!naturalSize || naturalSize.width <= 0) return null;

  return (
    <>
      <svg
        className="absolute inset-0 h-full w-full pointer-events-auto overflow-visible select-none"
        viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="box-glow-blue" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="box-glow-rose" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Unselected Boxes (rendered when showAllBoxes is true) */}
        {showAllBoxes &&
          boxesWithBounds.map((b) => {
            if (!b.isValid || b.index === selectedOcrIndex) return null;
            const isHovered = hoveredBoxIndex === b.index;
            return (
              <g
                key={`box-${b.index}`}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredBoxIndex(b.index)}
                onMouseLeave={() => setHoveredBoxIndex(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOcrIndex?.(b.index);
                }}
              >
                <polygon
                  points={b.polygonPoints}
                  vectorEffect="non-scaling-stroke"
                  stroke={
                    isHovered
                      ? b.isLowConf
                        ? "#f43f5e"
                        : "#2563eb"
                      : b.isLowConf
                      ? "rgba(244, 63, 94, 0.48)"
                      : "rgba(59, 130, 246, 0.38)"
                  }
                  strokeWidth={isHovered ? "2.5" : "1.2"}
                  fill={
                    isHovered
                      ? b.isLowConf
                        ? "rgba(244, 63, 94, 0.22)"
                        : "rgba(59, 130, 246, 0.2)"
                      : b.isLowConf
                      ? "rgba(244, 63, 94, 0.05)"
                      : "rgba(59, 130, 246, 0.04)"
                  }
                >
                  <title>{`#${b.index + 1}: ${b.text} (${Math.round(b.conf * 100)}%)`}</title>
                </polygon>
              </g>
            );
          })}

        {/* 2. Active Selected Box (Glow Aura, Solid Highlight, Dashed Reticle, 4 Corner L-Brackets) */}
        {selectedBox && selectedBox.isValid && (
          <g
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectOcrIndex?.(null);
            }}
          >
            {/* Luminous Glow Aura */}
            <polygon
              points={selectedBox.polygonPoints}
              vectorEffect="non-scaling-stroke"
              stroke={selectedBox.isLowConf ? "#f43f5e" : "#3b82f6"}
              strokeWidth="6"
              strokeOpacity="0.45"
              fill="none"
              filter={selectedBox.isLowConf ? "url(#box-glow-rose)" : "url(#box-glow-blue)"}
            />

            {/* Main Solid Highlighted Box */}
            <polygon
              points={selectedBox.polygonPoints}
              vectorEffect="non-scaling-stroke"
              stroke={selectedBox.isLowConf ? "#e11d48" : "#1d4ed8"}
              strokeWidth="2.5"
              fill={
                selectedBox.isLowConf
                  ? "rgba(244, 63, 94, 0.28)"
                  : "rgba(37, 99, 235, 0.26)"
              }
            />

            {/* Outer Pulsing Dashed Reticle Box */}
            <rect
              x={selectedBox.minX - 3}
              y={selectedBox.minY - 3}
              width={selectedBox.width + 6}
              height={selectedBox.height + 6}
              rx="3"
              vectorEffect="non-scaling-stroke"
              stroke={selectedBox.isLowConf ? "#fda4af" : "#93c5fd"}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              fill="none"
              className="animate-pulse"
            />

            {/* 4 Corner L-Brackets (High Precision Reticle) */}
            {(() => {
              const { minX, minY, maxX, maxY } = selectedBox;
              const len = Math.max(4, Math.min(10, selectedBox.width / 4, selectedBox.height / 4));
              const color = selectedBox.isLowConf ? "#be123c" : "#1e40af";
              return (
                <>
                  <path
                    d={`M ${minX - 3} ${minY - 3 + len} L ${minX - 3} ${minY - 3} L ${minX - 3 + len} ${minY - 3}`}
                    vectorEffect="non-scaling-stroke"
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${maxX + 3 - len} ${minY - 3} L ${maxX + 3} ${minY - 3} L ${maxX + 3} ${minY - 3 + len}`}
                    vectorEffect="non-scaling-stroke"
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${minX - 3} ${maxY + 3 - len} L ${minX - 3} ${maxY + 3} L ${minX - 3 + len} ${maxY + 3}`}
                    vectorEffect="non-scaling-stroke"
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M ${maxX + 3 - len} ${maxY + 3} L ${maxX + 3} ${maxY + 3} L ${maxX + 3} ${maxY + 3 - len}`}
                    vectorEffect="non-scaling-stroke"
                    stroke={color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Floating HUD Tooltip Badge over Selected Box */}
      {selectedBox && selectedBox.isValid && (
        <div
          style={{
            left: `${(selectedBox.minX / naturalSize.width) * 100}%`,
            top: `${(selectedBox.minY / naturalSize.height) * 100}%`,
            transform:
              selectedBox.minY / naturalSize.height < 0.08
                ? "translate(0, 100%) translateY(8px)"
                : "translate(0, -100%) translateY(-6px)",
          }}
          className={`absolute z-30 pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-black shadow-2xl backdrop-blur-md flex items-center gap-2 border animate-fadeIn transition-all ${
            selectedBox.isLowConf
              ? "bg-rose-950/95 text-rose-100 border-rose-500/80 ring-2 ring-rose-500/40"
              : "bg-slate-950/95 text-white border-blue-500/80 ring-2 ring-blue-500/40"
          }`}
        >
          <span className="flex items-center gap-1 font-mono text-[10px] rounded px-1.5 py-0.2 bg-white/10 text-cyan-300">
            <Target className="h-2.5 w-2.5" />
            #{selectedBox.index + 1}
          </span>
          <span className="max-w-[220px] truncate text-white font-bold">
            "{selectedBox.text}"
          </span>
          <span
            className={`font-mono text-[10px] font-black rounded px-1.5 py-0.2 ${
              selectedBox.isLowConf
                ? "bg-rose-500/30 text-rose-300"
                : "bg-emerald-500/30 text-emerald-300"
            }`}
          >
            {Math.round(selectedBox.conf * 100)}%
          </span>
        </div>
      )}
    </>
  );
}

function InvoiceMockup() {
  return (
    <article className="rounded-xl bg-white p-6 sm:p-8 text-xs leading-normal text-slate-900 shadow-xl border border-slate-200 max-w-2xl w-full">
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
