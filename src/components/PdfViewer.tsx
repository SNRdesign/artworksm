import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle, 
  Loader2,
  Maximize2,
  RotateCcw,
  X
} from "lucide-react";

// Configure worker URL using Vite local asset import to avoid CDN/CORS errors
if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

interface PdfViewerProps {
  url?: string | null;
  fileName?: string;
  className?: string;
  maxHeight?: string;
  showControls?: boolean;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (total: number) => void;
  currentPage?: number;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  try {
    const base64Index = dataUrl.indexOf(";base64,");
    if (base64Index !== -1) {
      const base64 = dataUrl.substring(base64Index + 8).replace(/\s/g, "");
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  } catch (e) {
    console.error("Error decoding base64 dataUrl:", e);
  }
  return new Uint8Array(0);
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  fileName,
  className = "",
  maxHeight = "450px",
  showControls = true,
  onPageChange,
  onTotalPagesChange,
  currentPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const modalRenderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState<number>(currentPage || 1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0); // 1.0 = 100% fit
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState<boolean>(false);

  // Sync with external currentPage if provided
  useEffect(() => {
    if (currentPage && currentPage !== pageNum) {
      setPageNum(currentPage);
    }
  }, [currentPage]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreenModalOpen) {
        setIsFullscreenModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenModalOpen]);

  const changePage = (newPage: number) => {
    setPageNum(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  // Check if it's an image instead of a PDF
  const isImage = Boolean(
    url && (
      url.startsWith("data:image/") || 
      url.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)
    )
  );

  // Reset states when URL changes
  useEffect(() => {
    setPdfDoc(null);
    setScale(1.0);
    setPageNum(1);
    setError(null);
    setUseIframeFallback(false);
  }, [url]);

  // Load PDF document
  useEffect(() => {
    if (!url || isImage) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        let loadingTask: any;

        if (url.startsWith("data:")) {
          const bytes = dataUrlToUint8Array(url);
          if (bytes.length === 0) {
            throw new Error("Data URL base64 kosong atau tidak valid");
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          try {
            loadingTask = pdfjsLib.getDocument({ url });
            const doc = await loadingTask.promise;
            if (isMounted) {
              setPdfDoc(doc);
              setNumPages(doc.numPages);
              if (onTotalPagesChange) onTotalPagesChange(doc.numPages);
              setPageNum(1);
              setLoading(false);
            }
            return;
          } catch (firstErr: any) {
            console.warn("Direct URL pdfjs load failed, trying fetch arrayBuffer fallback...", firstErr);
            const resp = await fetch(url);
            if (!resp.ok) {
              throw new Error(`HTTP error ${resp.status}`);
            }
            const buffer = await resp.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            loadingTask = pdfjsLib.getDocument({ data: bytes });
          }
        }

        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          if (onTotalPagesChange) onTotalPagesChange(doc.numPages);
          setPageNum(1);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to load PDF via pdfjs:", err);
        if (isMounted) {
          setError(err?.message || "Gagal memuat dokumen PDF");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [url, isImage]);

  // Render Page onto Canvas safely with task cancellation
  const renderCanvasOnTarget = async (
    targetCanvas: HTMLCanvasElement | null, 
    containerWidthOverride?: number, 
    isModal = false
  ) => {
    if (!pdfDoc || !targetCanvas || isImage) return;

    // Cancel existing render task for this target
    if (isModal) {
      if (modalRenderTaskRef.current) {
        try { modalRenderTaskRef.current.cancel(); } catch (e) {}
        modalRenderTaskRef.current = null;
      }
    } else {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (e) {}
        renderTaskRef.current = null;
      }
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const ctx = targetCanvas.getContext("2d");
      if (!ctx) return;

      const containerWidth = containerWidthOverride || (containerRef.current ? Math.max(containerRef.current.clientWidth - 40, 300) : 500);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const autoFitScale = containerWidth / unscaledViewport.width;
      
      const effectiveScale = Math.max(autoFitScale * scale, 0.3);
      const viewport = page.getViewport({ scale: effectiveScale });

      const outputScale = window.devicePixelRatio || 1;
      targetCanvas.width = Math.floor(viewport.width * outputScale);
      targetCanvas.height = Math.floor(viewport.height * outputScale);
      targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
      targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.scale(outputScale, outputScale);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      if (isModal) {
        modalRenderTaskRef.current = task;
      } else {
        renderTaskRef.current = task;
      }

      await task.promise;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("Canvas render error:", err);
      }
    }
  };

  useEffect(() => {
    renderCanvasOnTarget(canvasRef.current, undefined, false);
  }, [pdfDoc, pageNum, scale, isImage]);

  useEffect(() => {
    if (isFullscreenModalOpen) {
      renderCanvasOnTarget(modalCanvasRef.current, Math.min(window.innerWidth - 80, 1000), true);
    }
  }, [isFullscreenModalOpen, pdfDoc, pageNum, scale, isImage]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 4.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.4));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const openInNewTab = () => {
    if (!url) return;
    try {
      if (url.startsWith("data:")) {
        const bytes = dataUrlToUint8Array(url);
        const blob = new Blob([bytes], { type: isImage ? "image/png" : "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      } else {
        window.open(url, "_blank");
      }
    } catch (e) {
      console.warn("Could not open in new tab:", e);
    }
  };

  const toggleFullscreenModal = () => {
    setIsFullscreenModalOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`w-full flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner ${className}`}>
      {/* Top Toolbar */}
      {showControls && (
        <div className="bg-slate-800/95 border-b border-slate-700/80 px-3 py-2 flex flex-wrap items-center justify-between text-white text-xs gap-2 select-none z-10">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300 truncate max-w-[180px] sm:max-w-xs">
            <span className="truncate font-semibold">{fileName || "Dokumen_Layout.pdf"}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Page Navigation for PDF */}
            {!isImage && numPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-700 text-[11px] font-mono mr-1">
                <button
                  type="button"
                  onClick={() => changePage(Math.max(1, pageNum - 1))}
                  disabled={pageNum <= 1}
                  className="p-0.5 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-white cursor-pointer transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 text-slate-200">{pageNum} / {numPages}</span>
                <button
                  type="button"
                  onClick={() => changePage(Math.min(numPages, pageNum + 1))}
                  disabled={pageNum >= numPages}
                  className="p-0.5 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-white cursor-pointer transition"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-1.5 py-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-800 hover:text-indigo-400 text-slate-300 rounded cursor-pointer transition active:scale-95"
                title="Perkecil (-25%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="text-[10px] font-mono px-1.5 py-0.5 text-indigo-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition flex items-center gap-1"
                title="Reset Zoom ke 100%"
              >
                <span>{Math.round(scale * 100)}%</span>
                {scale !== 1.0 && <RotateCcw className="w-2.5 h-2.5 opacity-75" />}
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-800 hover:text-indigo-400 text-slate-300 rounded cursor-pointer transition active:scale-95"
                title="Perbesar (+25%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Open Fullscreen Modal */}
            {url && (
              <button
                type="button"
                onClick={toggleFullscreenModal}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer ml-1 active:scale-95"
                title="Buka Pratinjau Layar Penuh"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Layar Penuh</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Preview Scrollable Area */}
      <div 
        className="p-4 bg-slate-950 flex items-center justify-center relative overflow-auto w-full min-h-[240px]"
        style={{ maxHeight }}
      >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-20 pointer-events-none"></div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2.5 z-10">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
            <span className="text-xs font-mono text-slate-300">Memuat Render Dokumen...</span>
          </div>
        )}

        {error && !useIframeFallback && (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center text-rose-300 bg-slate-900/90 rounded-xl border border-rose-900/60 max-w-md z-10 shadow-lg w-full">
            <AlertCircle className="w-7 h-7 text-rose-400 mb-2" />
            <span className="text-xs font-bold mb-1">Pratinjau Canvas PDF Mengalami Kendala</span>
            <span className="text-[11px] text-slate-400 mb-3">{error}</span>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setUseIframeFallback(true)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition cursor-pointer shadow-md active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Tampilkan Frame PDF Native
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2 rounded-lg transition cursor-pointer border border-slate-700"
              >
                Tab Baru
              </button>
            </div>
          </div>
        )}

        {useIframeFallback && url && (
          <iframe 
            src={url} 
            title={fileName || "PDF Native Preview"} 
            className="w-full h-[400px] rounded-lg border border-slate-700 bg-white"
          />
        )}

        {!loading && !error && !useIframeFallback && (
          isImage ? (
            <div className="relative shadow-2xl rounded overflow-hidden bg-slate-900/50 p-2 flex items-center justify-center transition-all duration-150">
              <img
                src={url || ""}
                alt={fileName || "Artwork Preview"}
                className="rounded border border-slate-700 bg-white shadow-md transition-all duration-200"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                  maxHeight: scale === 1.0 ? `calc(${maxHeight} - 40px)` : "none",
                  maxWidth: scale === 1.0 ? "100%" : "none",
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="relative shadow-2xl rounded bg-white border border-slate-200 transition-all duration-150 m-auto">
              <canvas ref={canvasRef} className="block mx-auto" />
            </div>
          )
        )}
      </div>

      {/* Built-in Fullscreen Modal Overlay */}
      {isFullscreenModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 flex flex-col p-3 sm:p-6 backdrop-blur-md animate-fade-in text-white">
          {/* Modal Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md font-mono">
                  {fileName || "Dokumen_Layout.pdf"}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Pratinjau Layar Penuh High-Resolution Vector Artwork
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Page Controls */}
              {!isImage && numPages > 1 && (
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => changePage(Math.max(1, pageNum - 1))}
                    disabled={pageNum <= 1}
                    className="p-1 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-white cursor-pointer transition"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-slate-200 font-bold">{pageNum} / {numPages}</span>
                  <button
                    type="button"
                    onClick={() => changePage(Math.min(numPages, pageNum + 1))}
                    disabled={pageNum >= numPages}
                    className="p-1 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-white cursor-pointer transition"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:text-indigo-400 text-slate-300 rounded cursor-pointer transition"
                  title="Perkecil"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 text-indigo-300 hover:text-white font-bold transition"
                  title="Reset Zoom"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:text-indigo-400 text-slate-300 rounded cursor-pointer transition"
                  title="Perbesar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* External Tab Fallback */}
              <button
                type="button"
                onClick={openInNewTab}
                className="hidden md:inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer border border-slate-700"
                title="Buka di Tab Baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tab Baru</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFullscreenModalOpen(false)}
                className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow-lg active:scale-95 ml-2"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          {/* Modal Main View Canvas / Image */}
          <div className="flex-1 overflow-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-center relative shadow-inner">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none"></div>

            {isImage ? (
              <img
                src={url || ""}
                alt={fileName || "Artwork Fullscreen"}
                className="max-h-full max-w-full object-contain rounded border border-slate-700 shadow-2xl transition-all duration-200 bg-white"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative shadow-2xl rounded bg-white border border-slate-200 transition-all duration-150 m-auto">
                <canvas ref={modalCanvasRef} className="block mx-auto" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
