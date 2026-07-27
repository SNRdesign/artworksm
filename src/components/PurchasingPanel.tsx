/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Project, ProjectStatus, UserAccount, Role } from "../types";
import { dataUrlToBlobUrl } from "../lib/fileStorage";
import { 
  ShieldCheck, 
  AlertOctagon, 
  FileSignature, 
  KeyRound, 
  FileText, 
  Trash2, 
  Download, 
  Clock, 
  Play, 
  Pause, 
  Calendar,
  History,
  Search,
  Filter,
  CheckCircle2,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  FolderArchive
} from "lucide-react";

interface PurchasingPanelProps {
  currentUser: UserAccount;
  projects: Project[];
  onRelease: (projectId: string, picName: string) => void;
  onHold?: (projectId: string, holdUntil: string, reason: string) => void;
  onUpdateHoldTime?: (projectId: string, newHoldUntil: string) => void;
  onDeleteProject?: (projectId: string) => void;
  currentSimulatedTime?: string;
}

export default function PurchasingPanel({
  currentUser,
  projects,
  onRelease,
  onHold,
  onUpdateHoldTime,
  onDeleteProject,
  currentSimulatedTime = new Date().toISOString(),
}: PurchasingPanelProps) {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isChecklistChecked, setIsChecklistChecked] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  
  // Hold Form states
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [holdHours, setHoldHours] = useState("1"); // Default hold duration: 1 hour
  const [customHoldDateTime, setCustomHoldDateTime] = useState(""); // Custom calendar choice

  // History Search, Filter & Sort states
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"ALL" | "FULLY_RELEASED">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"date_desc" | "date_asc" | "category_asc" | "category_desc" | "name_asc">("date_desc");
  const [expandedRevisions, setExpandedRevisions] = useState<Record<string, boolean>>({});

  const approvedAndHeldProjects = projects.filter(
    (p) => p.status === ProjectStatus.APPROVED_PRODUCT || p.status === ProjectStatus.HOLD_PURCHASING
  );

  // Extract unique document categories (docTypes) available in projects
  const availableCategories = Array.from(
    new Set(projects.map((p) => p.docType).filter(Boolean))
  );

  // History Projects: filtered by status, category, search query, and sorted
  const historyProjects = projects
    .filter((p) => {
      if (historyStatusFilter === "FULLY_RELEASED") {
        return p.status === ProjectStatus.FULLY_RELEASED;
      }
      // "ALL" -> include fully released, approved, or projects with purchasing stamps / pdfs
      return (
        p.status === ProjectStatus.FULLY_RELEASED || 
        p.status === ProjectStatus.APPROVED_PRODUCT || 
        !!p.purchasingApprovedAt || 
        !!p.pdfFileName
      );
    })
    .filter((p) => {
      if (selectedCategory === "ALL") return true;
      return p.docType === selectedCategory;
    })
    .filter((p) => {
      if (!historySearchQuery.trim()) return true;
      const q = historySearchQuery.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.refCode && p.refCode.toLowerCase().includes(q)) ||
        (p.nieNumber && p.nieNumber.toLowerCase().includes(q)) ||
        (p.docType && p.docType.toLowerCase().includes(q)) ||
        (p.pdfFileName && p.pdfFileName.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortOrder === "date_desc" || sortOrder === "date_asc") {
        const timeA = new Date(a.purchasingApprovedAt || a.productApprovedAt || a.pdfUploadedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.purchasingApprovedAt || b.productApprovedAt || b.pdfUploadedAt || b.createdAt || 0).getTime();
        return sortOrder === "date_desc" ? timeB - timeA : timeA - timeB;
      }
      if (sortOrder === "category_asc") {
        return a.docType.localeCompare(b.docType);
      }
      if (sortOrder === "category_desc") {
        return b.docType.localeCompare(a.docType);
      }
      if (sortOrder === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  useEffect(() => {
    setIsChecklistChecked(false);
    setWarningMessage("");
    setShowHoldForm(false);
    setHoldReason("");
  }, [selectedProjectId]);

  const toggleRevisionExpand = (projectId: string) => {
    setExpandedRevisions((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Helper to calculate countdown string between currentSimulatedTime and holdUntil
  const getCountdownString = (holdUntilStr?: string) => {
    if (!holdUntilStr) return "Waktu habis";
    const target = new Date(holdUntilStr).getTime();
    const current = new Date(currentSimulatedTime).getTime();
    const diffMs = target - current;
    
    if (diffMs <= 0) {
      return "Waktu telah habis! (ALARM EXPIRED)";
    }
    
    const diffSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} Jam`);
    if (mins > 0) parts.push(`${mins} Menit`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} Detik`);
    
    return parts.join(" ");
  };

  const handleDownloadPdf = (
    proj: Project, 
    targetVersion?: number, 
    revisionNotesStr?: string, 
    targetArtworkText?: string
  ) => {
    const vNum = targetVersion || proj.version;
    const cleanProjName = proj.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = targetVersion && targetVersion !== proj.version
      ? `${cleanProjName}_Layout_V${vNum}.pdf`
      : proj.pdfFileName || `${cleanProjName}_Layout_V${vNum}.pdf`;

    const artworkContent = targetArtworkText || proj.artworkText || "";

    // 1. If project has actual pdfFileUrl and downloading current version
    if (proj.pdfFileUrl && (!targetVersion || targetVersion === proj.version)) {
      try {
        if (proj.pdfFileUrl.startsWith("data:")) {
          const parts = proj.pdfFileUrl.split(";base64,");
          if (parts.length === 2) {
            const contentType = parts[0].split(":")[1] || "application/pdf";
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; ++i) {
              uInt8Array[i] = raw.charCodeAt(i);
            }
            const isImage = contentType.includes("image");
            const blob = new Blob([uInt8Array], { type: isImage ? contentType : "application/pdf" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = url;
            link.download = isImage ? fileName.replace(/\.pdf$/i, ".png") : fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
          }
        }
      } catch (err) {
        console.error("Gagal mendownload berkas asli, menggunakan PDF generator:", err);
      }

      if (proj.pdfFileUrl.startsWith("blob:") || proj.pdfFileUrl.startsWith("http")) {
        const link = document.createElement("a");
        link.href = proj.pdfFileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }

    // 2. Generate valid PDF document blob tailored to this exact project/version
    const sanitize = (text: string) => {
      if (!text) return "";
      return text
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/[^\x20-\x7E]/g, " ");
    };

    const pName = sanitize(proj.name);
    const docType = sanitize(proj.docType);
    const refCode = sanitize(proj.refCode);
    const nieNumber = sanitize(proj.nieNumber);
    const createdBy = sanitize(proj.createdBy);
    const uploadDate = sanitize(proj.pdfUploadedAt ? new Date(proj.pdfUploadedAt).toLocaleString("id-ID") : "-");
    const productPic = sanitize(proj.productPic || proj.productStamp?.stampedBy || "Lead Product Team");
    const purchasingPic = sanitize(proj.purchasingPic || proj.purchasingStamp?.stampedBy || "Citra (Lead Purchasing)");
    const releaseDate = sanitize(proj.purchasingApprovedAt ? new Date(proj.purchasingApprovedAt).toLocaleString("id-ID") : new Date().toLocaleString("id-ID"));
    const hash = sanitize(proj.purchasingStamp?.hash || `HASH-${proj.id.toUpperCase()}-V${vNum}-SIGN-OK`);

    const rawLines = artworkContent.split("\n");

    const pdfTextLines: string[] = [
      `BT`,
      `/F1 14 Tf`,
      `40 800 Td (SANSICO MEDICA INDONESIA - ARTWORK CETAK RESMI) Tj`,
      `/F1 9 Tf`,
      `0 -20 Td (=================================================================================) Tj`,
      `0 -15 Td (DOKUMEN RESMI ARSIP & HISTORI CETAKAN ARTWORK ALKES) Tj`,
      `0 -10 Td (=================================================================================) Tj`,
      `0 -25 Td (1. IDENTITAS DOKUMEN ARTWORK) Tj`,
      `0 -15 Td (   ID Proyek                    : ${sanitize(proj.id)}) Tj`,
      `0 -15 Td (   Nama Produk / Alat Kesehatan : ${pName}) Tj`,
      `0 -15 Td (   Jenis Kemasan / Dokumen    : ${docType}   |   Versi Artwork : V${vNum}) Tj`,
      `0 -15 Td (   Kode Produk (REF Code)     : ${refCode}) Tj`,
      `0 -15 Td (   Nomor Izin Edar (NIE)       : ${nieNumber}) Tj`,
      `0 -15 Td (   Desainer PIC               : ${createdBy}   |   Tgl Unggah : ${uploadDate}) Tj`,
      `0 -25 Td (2. PERSETUJUAN & STEMPEL DIGITAL) Tj`,
      `0 -15 Td (   ACC Tim Produk (PIC)       : ${productPic}) Tj`,
      `0 -15 Td (   Release Tim Purchasing (PIC): ${purchasingPic}) Tj`,
      `0 -15 Td (   Tanggal Release Cetak       : ${releaseDate}) Tj`,
      `0 -15 Td (   Kode Stempel Digital (Hash) : ${hash}) Tj`,
    ];

    if (revisionNotesStr) {
      pdfTextLines.push(`0 -15 Td (   Catatan Revisi Versi Ini   : ${sanitize(revisionNotesStr)}) Tj`);
    }

    pdfTextLines.push(`0 -25 Td (3. KONTEN TEKS KEMASAN (ARTWORK TEXT CONTENT)) Tj`);

    for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
      const line = sanitize(rawLines[i].trim());
      if (line) {
        pdfTextLines.push(`0 -13 Td (   * ${line.slice(0, 75)}) Tj`);
      }
    }

    pdfTextLines.push(`0 -25 Td (=================================================================================) Tj`);
    pdfTextLines.push(`0 -15 Td (DOKUMEN INI SAH DITERBITKAN OLEH SISTEM UNTUK VERIFIKASI VENDOR CETAK) Tj`);
    pdfTextLines.push(`0 -10 Td (=================================================================================) Tj`);
    pdfTextLines.push(`ET`);

    const streamContent = pdfTextLines.join("\n");
    const streamLength = streamContent.length;

    const pdfStructure = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000238 00000 n 
0000000309 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${309 + streamLength + 45}
%%EOF`;

    const blob = new Blob([pdfStructure], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReleaseSubmit = () => {
    if (!selectedProject) return;

    if (!isChecklistChecked) {
      setWarningMessage("Gagal Release: Anda wajib mencentang persetujuan validasi fisik NIE / AKD / AKL!");
      return;
    }

    setWarningMessage("");
    onRelease(selectedProject.id, currentUser.fullName);
    setSelectedProjectId("");
  };

  const handleHoldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !onHold) return;

    if (!holdReason.trim()) {
      setWarningMessage("Harap isi alasan hold terlebih dahulu!");
      return;
    }

    // Determine target hold expiration date (holdUntil)
    let holdUntilDate = new Date(currentSimulatedTime);
    if (customHoldDateTime) {
      holdUntilDate = new Date(customHoldDateTime);
    } else {
      const hours = parseFloat(holdHours);
      // We will calculate a real Date based on adding hours to simulated time
      holdUntilDate.setMinutes(holdUntilDate.getMinutes() + Math.round(hours * 60));
    }

    setWarningMessage("");
    onHold(selectedProject.id, holdUntilDate.toISOString(), holdReason);
    setShowHoldForm(false);
    setHoldReason("");
  };

  const handleQuickAddHoldTime = (additionalHours: number) => {
    if (!selectedProject || !selectedProject.holdUntil || !onUpdateHoldTime) return;
    
    const currentHold = new Date(selectedProject.holdUntil);
    currentHold.setMinutes(currentHold.getMinutes() + Math.round(additionalHours * 60));
    
    onUpdateHoldTime(selectedProject.id, currentHold.toISOString());
  };

  const handleResumePrinting = () => {
    if (!selectedProject) return;
    
    // Move project back to approved product so they can sign & release
    selectedProject.status = ProjectStatus.APPROVED_PRODUCT;
    selectedProject.holdUntil = undefined;
    selectedProject.holdReason = undefined;
    selectedProject.holdAlarmSet = false;
    
    setWarningMessage("");
    setSelectedProjectId(selectedProject.id); // Refresh state
  };

  return (
    <div className="space-y-6" id="purchasing-panel-container">
      {/* Disclaimer Banner */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-emerald-800/80">
        <div className="flex gap-3 items-start">
          <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-extrabold text-sm text-emerald-300 uppercase tracking-wide">
              TIM PURCHASING — PINTU GERBANG UTAMA SEBELUM CETAK (RELEASE GUARD)
            </h3>
            <p className="text-xs text-emerald-100/90 leading-relaxed mt-2 font-medium">
              Tugas utama Anda adalah meniadakan risiko salah cetak massal. Sistem mewajibkan Anda untuk memverifikasi dokumen cetak aslinya. Anda juga memiliki akses penuh ke seluruh Riwayat Dokumen Cetak untuk mengunduh ulang file cetak kapan saja.
            </p>
          </div>
        </div>
      </div>

      {/* TOP TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("active")}
          id="tab-purchasing-active"
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === "active"
              ? "border-emerald-600 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Verifikasi & Rilis Cetak
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}>
            {approvedAndHeldProjects.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          id="tab-purchasing-history"
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
            activeTab === "history"
              ? "border-emerald-600 text-emerald-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          Riwayat Dokumen Cetak
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
            activeTab === "history" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}>
            {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED || p.status === ProjectStatus.APPROVED_PRODUCT || !!p.pdfFileName).length}
          </span>
        </button>
      </div>

      {/* TAB 1: VERIFIKASI & RILIS CETAK (ACTIVE QUEUE) */}
      {activeTab === "active" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Approved projects waiting for release */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
                Antrean Rilis Cetak ({approvedAndHeldProjects.length})
              </h4>
            </div>

            {approvedAndHeldProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                Tidak ada proyek berstatus "Approved by Product" yang siap rilis cetak saat ini.
              </div>
            ) : (
              <div className="space-y-2">
                {approvedAndHeldProjects.map((p) => {
                  const isHeld = p.status === ProjectStatus.HOLD_PURCHASING;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      id={`btn-select-release-${p.id}`}
                      className={`w-full text-left p-3.5 rounded-xl text-xs border transition duration-150 flex items-center justify-between cursor-pointer ${
                        selectedProjectId === p.id
                          ? isHeld 
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-xs"
                            : "bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 truncate max-w-[170px]">{p.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">
                          {p.docType} • V{p.version}
                        </div>
                        {isHeld && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            On Hold / Pending
                          </span>
                        )}
                      </div>
                      {isHeld ? (
                        <Pause className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Columns: Verification and final Release Action */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    {selectedProject.status === ProjectStatus.HOLD_PURCHASING ? (
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                        ⏸ STATUS: DITANGGUHKAN / ON HOLD
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                        Menunggu Gerbang Terakhir (V{selectedProject.version})
                      </span>
                    )}
                    <h3 className="font-display font-extrabold text-slate-800 text-base mt-2">
                      Verifikasi Fisik Proyek: {selectedProject.name}
                    </h3>
                  </div>
                  {currentUser.role === Role.ADMINISTRATOR && onDeleteProject && (
                    <button
                      onClick={() => {
                        onDeleteProject(selectedProject.id);
                        setSelectedProjectId("");
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold py-1.5 px-3 rounded-xl transition duration-150 cursor-pointer shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Proyek
                    </button>
                  )}
                </div>

                {warningMessage && (
                  <div className="p-4 bg-rose-50/60 border border-rose-100/70 rounded-2xl text-rose-800 text-xs font-semibold flex gap-2.5 items-center shadow-sm animate-shake" id="purchasing-warning-msg">
                    <AlertOctagon className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{warningMessage}</span>
                  </div>
                )}

                {/* Countdown Calendar Display if on hold */}
                {selectedProject.status === ProjectStatus.HOLD_PURCHASING && (
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-2xl p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider font-display">
                        <Clock className="w-4.5 h-4.5 text-amber-600 animate-pulse" />
                        Estimasi Kalender Mundur Hold
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Alarm Set: Aktif
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/80 p-3 rounded-xl border border-amber-200/50 space-y-1 text-left">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Batas Estimasi</span>
                        <strong className="text-slate-800 font-mono text-xs block">
                          {selectedProject.holdUntil ? new Date(selectedProject.holdUntil).toLocaleString("id-ID") : "-"}
                        </strong>
                        <span className="text-[10px] text-slate-500 block italic leading-tight">
                          Alasan: {selectedProject.holdReason || "Tidak didefinisikan"}
                        </span>
                      </div>

                      <div className="bg-amber-600/10 p-3 rounded-xl border border-amber-400/30 flex flex-col justify-center items-center text-center">
                        <span className="text-[9px] text-amber-800 font-bold uppercase block mb-1">Sisa Waktu Penangguhan</span>
                        <strong className="text-amber-900 font-mono text-base font-extrabold tracking-tight">
                          {getCountdownString(selectedProject.holdUntil)}
                        </strong>
                      </div>
                    </div>

                    {/* Add hold time controls ("Menambah Waktu") */}
                    <div className="bg-white/90 p-4 rounded-xl border border-amber-200/50 space-y-2.5">
                      <span className="text-[10px] text-slate-700 font-extrabold uppercase block font-display tracking-wider">
                        ➕ Tambah Durasi Penangguhan (Menambah Waktu)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleQuickAddHoldTime(1)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition"
                        >
                          +1 Jam
                        </button>
                        <button
                          onClick={() => handleQuickAddHoldTime(3)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition"
                        >
                          +3 Jam
                        </button>
                        <button
                          onClick={() => handleQuickAddHoldTime(6)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition"
                        >
                          +6 Jam
                        </button>
                        <button
                          onClick={() => handleQuickAddHoldTime(24)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1.5 px-2.5 rounded-lg transition"
                        >
                          +1 Hari
                        </button>
                      </div>
                    </div>

                    {/* Resume button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleResumePrinting}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition duration-150 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        Lanjutkan & Loloskan Cetak (Resume)
                      </button>
                    </div>
                  </div>
                )}

                {/* PDF & Document Image Reference Card */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase mb-1 font-display tracking-wider">
                      Dokumen Cetak ACC & Pratinjau Gambar
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Silakan periksa pratinjau gambar dokumen serta unduh file cetakan resmi yang telah disetujui (ACC) oleh Tim Produk:
                    </p>
                  </div>

                  {/* Document Image Preview if available */}
                  {selectedProject.pdfFileUrl && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs text-center space-y-2">
                      <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Pratinjau Visual Dokumen Cetak</span>
                      {selectedProject.pdfFileUrl.startsWith("data:image/") || selectedProject.pdfFileUrl.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i) ? (
                        <img
                          src={selectedProject.pdfFileUrl}
                          alt="Gambar Dokumen Cetak"
                          className="max-h-56 mx-auto object-contain rounded border border-slate-100 p-1"
                        />
                      ) : (
                        (() => {
                          const pdfBlobUrl = dataUrlToBlobUrl(selectedProject.pdfFileUrl);
                          return (
                            <div className="flex flex-col items-center">
                              <object
                                data={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                type="application/pdf"
                                className="w-full h-64 border-0 rounded bg-white"
                              >
                                <embed src={pdfBlobUrl} type="application/pdf" className="w-full h-64 rounded" />
                              </object>
                              <a
                                href={pdfBlobUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition shadow-xs cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Buka PDF Layar Penuh (Kualitas Cetak 100%) ↗
                              </a>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/60 p-3.5 rounded-xl text-xs text-slate-700 shadow-sm">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-5 h-5 text-rose-500 flex-shrink-0" />
                      <div className="truncate text-left">
                        <span className="text-[8px] text-slate-400 block font-sans uppercase tracking-wider font-bold">Dokumen Rilis Cetak Utama</span>
                        <strong className="font-mono text-[10px] text-slate-800 block truncate">
                          {selectedProject.pdfFileName || `${selectedProject.name.replace(/\s+/g, '_')}_Layout_V${selectedProject.version}.pdf`}
                        </strong>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          Ukuran: {selectedProject.pdfFileSize || "1.2 MB"} • Versi: V{selectedProject.version}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadPdf(selectedProject)}
                      className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold py-2 px-3 rounded-lg transition duration-150 cursor-pointer shadow-sm shrink-0"
                      title="Unduh Cetakan ACC"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Cetakan
                    </button>
                  </div>
                </div>

                {/* Safety Checklist Checkbox */}
                {selectedProject.status !== ProjectStatus.HOLD_PURCHASING && (
                  <div className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-900 uppercase font-display tracking-wider">
                        Pernyataan Pertanggungjawaban Rilis Cetak
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-emerald-800/90 leading-relaxed font-medium">
                      Dengan mencentang pernyataan di bawah, Anda secara sadar mengonfirmasi kelayakan desain untuk dipublikasikan ke pihak ketiga (vendor cetak) dan memikul tanggung jawab keabsahan nomor izin edar alkes.
                    </p>

                    <div className="space-y-2 text-xs">
                      <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer select-none hover:text-slate-800 transition">
                        <input
                          type="checkbox"
                          checked={isChecklistChecked}
                          onChange={(e) => setIsChecklistChecked(e.target.checked)}
                          id="chk-purchasing-validation"
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>
                          [Wajib Dicentang] Validasi NIE / AKD / AKL: Saya memastikan bahwa urutan karakter nomor izin edar pada artwork ini cocok total dengan dokumen asli tanpa ada kesalahan ketik sekecil apa pun.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-4">
                  
                  {/* Hold Action Section */}
                  {selectedProject.status !== ProjectStatus.HOLD_PURCHASING && (
                    <div className="w-full sm:w-auto">
                      {!showHoldForm ? (
                        <button
                          type="button"
                          onClick={() => setShowHoldForm(true)}
                          id="btn-trigger-hold-form"
                          className="w-full sm:w-auto text-xs font-bold py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Hold / Pending Cetakan
                        </button>
                      ) : (
                        <form onSubmit={handleHoldSubmit} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3 max-w-sm text-left shadow-sm">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-800 mb-1">
                            <Calendar className="w-4 h-4 text-amber-500" />
                            Atur Penangguhan (Hold)
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Alasan Hold/Pending:</label>
                            <input
                              type="text"
                              required
                              placeholder="Contoh: Menunggu keputusan warna kemasan"
                              value={holdReason}
                              onChange={(e) => setHoldReason(e.target.value)}
                              className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-lg py-1.5 px-2.5 text-xs outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Batas Waktu Estimasi:</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <select
                                  value={holdHours}
                                  onChange={(e) => {
                                    setHoldHours(e.target.value);
                                    setCustomHoldDateTime("");
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none"
                                >
                                  <option value="0.5">30 Menit</option>
                                  <option value="1">1 Jam</option>
                                  <option value="3">3 Jam</option>
                                  <option value="6">6 Jam</option>
                                  <option value="24">1 Hari</option>
                                  <option value="48">2 Hari</option>
                                </select>
                              </div>
                              <div className="text-[10px] text-slate-400 self-center">atau pilih tanggal manual:</div>
                            </div>
                            <input
                              type="datetime-local"
                              value={customHoldDateTime}
                              onChange={(e) => {
                                setCustomHoldDateTime(e.target.value);
                                setHoldHours("");
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs outline-none"
                            />
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowHoldForm(false)}
                              className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 py-1 px-3 rounded-lg transition cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white py-1 px-3 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3 h-3" />
                              Set Hold & Alarm
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Release Action Button */}
                  {selectedProject.status !== ProjectStatus.HOLD_PURCHASING && (
                    <button
                      onClick={handleReleaseSubmit}
                      disabled={!isChecklistChecked}
                      id="btn-release-sign"
                      className={`w-full sm:w-auto text-xs font-bold py-2.5 px-6 rounded-xl transition duration-150 shadow-sm flex items-center justify-center gap-1.5 ${
                        isChecklistChecked
                          ? "bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                          : "bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed"
                      }`}
                    >
                      <FileSignature className="w-4 h-4" />
                      RELEASE & SIGN (KUNCI PERMANEN & KIRIM VENDOR)
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400 text-xs font-medium italic">
                Silakan pilih salah satu proyek di antrean sebelah kiri untuk memproses final safety release.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT DOKUMEN CETAK (PRINT DOCUMENT HISTORY) */}
      {activeTab === "history" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6" id="purchasing-history-section">
          {/* Header & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="font-display font-extrabold text-slate-800 text-base flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-emerald-600" />
                Arsip & Riwayat Dokumen Cetak
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Gunakan fitur ini untuk mencari dan mengunduh ulang file cetak PDF resmi jika file sebelumnya tertumpuk, terhapus, atau hilang.
              </p>
            </div>

            {/* Status Filter Pills (Semua Dokumen & Fully Released) */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setHistoryStatusFilter("ALL")}
                id="btn-filter-history-all"
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  historyStatusFilter === "ALL"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Semua Dokumen
              </button>
              <button
                onClick={() => setHistoryStatusFilter("FULLY_RELEASED")}
                id="btn-filter-history-released"
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  historyStatusFilter === "FULLY_RELEASED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Fully Released
              </button>
            </div>
          </div>

          {/* Search, Category Filter, and Sort Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Box */}
            <div className="relative md:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Cari berdasarkan Nama, REF, NIE, Jenis Dokumen..."
                id="txt-search-history"
                className="w-full bg-slate-50 border border-slate-200/80 focus:border-emerald-500 focus:bg-white rounded-xl py-2 pl-10 pr-4 text-xs font-medium outline-none transition"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 md:col-span-4">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                id="select-category-filter"
                className="w-full bg-slate-50 border border-slate-200/80 focus:border-emerald-500 focus:bg-white rounded-xl py-2 px-3 text-xs font-semibold outline-none transition text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Kategori ({availableCategories.length})</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order Dropdown */}
            <div className="flex items-center gap-2 md:col-span-3">
              <span className="text-xs text-slate-400 font-bold shrink-0">Urutkan:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                id="select-sort-order"
                className="w-full bg-slate-50 border border-slate-200/80 focus:border-emerald-500 focus:bg-white rounded-xl py-2 px-3 text-xs font-semibold outline-none transition text-slate-700 cursor-pointer"
              >
                <option value="date_desc">📅 Tanggal Terbaru</option>
                <option value="date_asc">📅 Tanggal Terlama</option>
                <option value="category_asc">🏷️ Kategori (A - Z)</option>
                <option value="category_desc">🏷️ Kategori (Z - A)</option>
                <option value="name_asc">🔤 Nama Proyek (A - Z)</option>
              </select>
            </div>
          </div>

          {/* Document History Cards List */}
          {historyProjects.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic space-y-2">
              <FolderArchive className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Tidak ada dokumen cetak yang cocok dengan pencarian / filter Anda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyProjects.map((p) => {
                const isReleased = p.status === ProjectStatus.FULLY_RELEASED;
                const isApprovedProduct = p.status === ProjectStatus.APPROVED_PRODUCT;
                const isExpanded = !!expandedRevisions[p.id];

                return (
                  <div 
                    key={p.id}
                    className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 space-y-4 transition duration-150 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display font-extrabold text-slate-800 text-sm">{p.name}</h4>
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                            {p.docType}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md font-mono">
                            V{p.version}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap font-medium">
                          <span>REF: <strong className="text-slate-700 font-mono">{p.refCode}</strong></span>
                          <span>•</span>
                          <span>NIE: <strong className="text-slate-700 font-mono">{p.nieNumber}</strong></span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div>
                        {isReleased ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ✓ FULLY RELEASED FOR PRINTING
                          </span>
                        ) : isApprovedProduct ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                            ACC PRODUK (SIAP RILIS)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                            {p.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PDF Details & Download Bar */}
                    <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 truncate">
                        <FileText className="w-6 h-6 text-rose-500 shrink-0" />
                        <div className="truncate text-left">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Berkas PDF Layout Cetak Official</span>
                          <strong className="font-mono text-[11px] text-slate-800 block truncate">
                            {p.pdfFileName || `${p.name.replace(/\s+/g, '_')}_Layout_V${p.version}.pdf`}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            Ukuran: {p.pdfFileSize || "1.2 MB"} • Tanggal Unggah: {p.pdfUploadedAt ? new Date(p.pdfUploadedAt).toLocaleString("id-ID") : "-"}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadPdf(p)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition duration-150 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Unduh PDF Cetak
                      </button>
                    </div>

                    {/* Stamp & Approval Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] bg-white border border-slate-100 p-3 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Persetujuan Tim Produk</span>
                        <div className="text-slate-700 font-semibold">
                          PIC: {p.productPic || p.productStamp?.stampedBy || "Lead Product Team"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.productApprovedAt ? new Date(p.productApprovedAt).toLocaleString("id-ID") : "-"}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Rilis Stempel Tim Purchasing</span>
                        <div className="text-slate-700 font-semibold">
                          PIC: {p.purchasingPic || p.purchasingStamp?.stampedBy || (isReleased ? "Citra (Lead Purchasing)" : "Belum Dirilis")}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.purchasingApprovedAt ? new Date(p.purchasingApprovedAt).toLocaleString("id-ID") : "-"}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Revision History if available */}
                    {p.revisions && p.revisions.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => toggleRevisionExpand(p.id)}
                          className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {isExpanded ? "Sembunyikan" : "Tampilkan"} Riwayat Revisi & Versi Lampau ({p.revisions.length})
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-2 pl-3 border-l-2 border-slate-200">
                            {p.revisions.map((rev, idx) => (
                              <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                  <span className="font-bold text-slate-700">Versi V{rev.version}</span>
                                  <span>{new Date(rev.rejectedAt).toLocaleString("id-ID")}</span>
                                </div>
                                <div className="text-rose-700 font-medium text-[10px]">
                                  Revisi ({rev.notes.component}): Salah "{rev.notes.currentError}" → Seharusnya "{rev.notes.correctData}"
                                </div>
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => handleDownloadPdf(
                                      p, 
                                      rev.version, 
                                      `Salah "${rev.notes.currentError}" -> Seharusnya "${rev.notes.correctData}"`, 
                                      rev.artworkTextBefore
                                    )}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold py-1 px-2.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Download className="w-3 h-3 text-slate-600" />
                                    Unduh PDF Versi V{rev.version}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
