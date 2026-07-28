import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle, 
  Loader2,
  Maximize2,
  RotateCcw
} from "lucide-react";

// Configure worker URL using jsDelivr CDN matching version
if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  url?: string | null;
  fileName?: string;
  className?: string;
  maxHeight?: string;
  showControls?: boolean;
  onPageChange?: (page: number) => void;
  currentPage?: number;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  try {
    const base64Index = dataUrl.indexOf(";base64,");
    if (base64Index !== -1) {
      const base64 = dataUrl.substring(base64Index + 8);
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
  currentPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState<number>(currentPage || 1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0); // 1.0 = 100% fit
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with external currentPage if provided
  useEffect(() => {
    if (currentPage && currentPage !== pageNum) {
      setPageNum(currentPage);
    }
  }, [currentPage]);

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

  // Reset zoom & page when URL changes
  useEffect(() => {
    setScale(1.0);
    setPageNum(1);
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
          loadingTask = pdfjsLib.getDocument({ url });
        }

        const doc = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
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

  // Render Page onto Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || isImage) return;

    let renderTask: any = null;
    let isMounted = true;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate responsive base scale to fit container width
        const containerWidth = containerRef.current ? Math.max(containerRef.current.clientWidth - 40, 300) : 500;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const autoFitScale = containerWidth / unscaledViewport.width;
        
        // Effective scale combines autoFit with user scale modifier
        const effectiveScale = Math.max(autoFitScale * scale, 0.3);

        const viewport = page.getViewport({ scale: effectiveScale });

        // Crisp high-DPI canvas rendering
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.scale(outputScale, outputScale);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Canvas render error:", err);
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale, isImage]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 4.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.4));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  const openFullscreen = () => {
    if (!url) return;
    if (url.startsWith("data:")) {
      const bytes = dataUrlToUint8Array(url);
      const blob = new Blob([bytes], { type: isImage ? "image/png" : "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } else {
      window.open(url, "_blank");
    }
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
                  onClick={() => changePage(Math.max(1, pageNum - 1))}
                  disabled={pageNum <= 1}
                  className="p-0.5 hover:text-indigo-400 disabled:opacity-30 disabled:hover:text-white cursor-pointer transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 text-slate-200">{pageNum} / {numPages}</span>
                <button
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
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-800 hover:text-indigo-400 text-slate-300 rounded cursor-pointer transition active:scale-95"
                title="Perkecil (-25%)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetZoom}
                className="text-[10px] font-mono px-1.5 py-0.5 text-indigo-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition flex items-center gap-1"
                title="Reset Zoom ke 100%"
              >
                <span>{Math.round(scale * 100)}%</span>
                {scale !== 1.0 && <RotateCcw className="w-2.5 h-2.5 opacity-75" />}
              </button>

              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-800 hover:text-indigo-400 text-slate-300 rounded cursor-pointer transition active:scale-95"
                title="Perbesar (+25%)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Open Fullscreen / New Tab */}
            {url && (
              <button
                onClick={openFullscreen}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition shadow-xs cursor-pointer ml-1 active:scale-95"
                title="Buka Dokumen di Tab Baru"
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

        {error && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-rose-300 bg-rose-950/40 rounded-xl border border-rose-900/60 max-w-sm z-10 shadow-lg">
            <AlertCircle className="w-7 h-7 text-rose-400 mb-2" />
            <span className="text-xs font-bold mb-1">Gagal Memuat Pratinjau PDF</span>
            <span className="text-[11px] text-slate-400 mb-3">{error}</span>
            {url && (
              <button
                onClick={openFullscreen}
                className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition cursor-pointer shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka PDF di Tab Baru (Original Vector)
              </button>
            )}
          </div>
        )}

        {!loading && !error && (
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
    </div>
  );
};
