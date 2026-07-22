/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Project, DocType, ProjectStatus, UserAccount, RevisionNotes, Role } from "../types";
import { 
  CheckCircle, 
  XCircle, 
  AlertOctagon, 
  FileText, 
  ChevronRight, 
  Download, 
  Search, 
  Filter, 
  Check, 
  Eye,
  Sparkles,
  Info,
  Trash2
} from "lucide-react";

interface ProductPanelProps {
  currentUser: UserAccount;
  projects: Project[];
  onApprove: (projectId: string, picName: string) => void;
  onReject: (projectId: string, picName: string, notes: RevisionNotes) => void;
  onUploadNieDocument?: (projectId: string, fileName: string, fileSize: string, fileUrl: string) => void;
  onDeleteProject?: (projectId: string) => void;
}

export default function ProductPanel({
  currentUser,
  projects,
  onApprove,
  onReject,
  onUploadNieDocument,
  onDeleteProject,
}: ProductPanelProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Search & Filter State for Pending Projects
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("ALL");

  // Checklist dynamic state (we map checked states using an object id-checklist_key)
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});

  // Rejection Form Modal/State
  const [isRejecting, setIsRejecting] = useState(false);
  const [compName, setCompName] = useState("");
  const [errDesc, setErrDesc] = useState("");
  const [expectedData, setExpectedData] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const pendingProjects = projects.filter(
    (p) => p.status === ProjectStatus.PENDING_PRODUCT
  );

  // Apply Search & DocType Filter
  const filteredProjects = pendingProjects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.refCode && p.refCode.toLowerCase().includes(q)) ||
      (p.nieNumber && p.nieNumber.toLowerCase().includes(q)) ||
      (p.createdBy && p.createdBy.toLowerCase().includes(q));
    
    const matchesFilter = docTypeFilter === "ALL" || p.docType === docTypeFilter;
    return matchesSearch && matchesFilter;
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleDownloadPdf = (proj: Project) => {
    const fileName = proj.pdfFileName || `${proj.name.replace(/\s+/g, "_")}_Layout_V${proj.version}.pdf`;
    
    // If the project has an actual uploaded file URL (base64 or blob URL), download it directly!
    if (proj.pdfFileUrl) {
      try {
        if (proj.pdfFileUrl.startsWith("data:")) {
          const parts = proj.pdfFileUrl.split(";base64,");
          if (parts.length === 2) {
            const contentType = parts[0].split(":")[1] || "application/octet-stream";
            const raw = window.atob(parts[1]);
            const rawLength = raw.length;
            const uInt8Array = new Uint8Array(rawLength);
            for (let i = 0; i < rawLength; ++i) {
              uInt8Array[i] = raw.charCodeAt(i);
            }
            const blob = new Blob([uInt8Array], { type: contentType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
          }
        }
      } catch (err) {
        console.error("Gagal mendownload berkas asli:", err);
      }

      const link = document.createElement("a");
      link.href = proj.pdfFileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Fallback: Create a beautifully formatted PostScript / text representation that conforms to a valid tiny PDF file
    const simulatedPdfContent = `%PDF-1.4
%
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
<< /Length 450 >>
stream
BT
/F1 16 Tf
50 800 Td (SANSICO MEDICA - ARTWORK APPROVAL SYSTEM) Tj
/F1 10 Tf
0 -40 Td (========================================================================) Tj
0 -20 Td (DOKUMEN DETAIL ARTWORK UNTUK VERIFIKASI MANUAL) Tj
0 -10 Td (========================================================================) Tj
0 -30 Td (PROJECT ID: ${proj.id}) Tj
0 -20 Td (NAMA ALAT KESEHATAN (PRODUK): ${proj.name}) Tj
0 -20 Td (TIPE DOKUMEN: ${proj.docType}) Tj
0 -20 Td (VERSI ARTWORK: V${proj.version}) Tj
0 -20 Td (KODE PRODUK (REF): ${proj.refCode}) Tj
0 -20 Td (NOMOR IZIN EDAR (NIE): ${proj.nieNumber}) Tj
0 -20 Td (DESAINER: ${proj.createdBy}) Tj
0 -20 Td (TANGGAL UNGGAH: ${proj.pdfUploadedAt ? new Date(proj.pdfUploadedAt).toLocaleString("id-ID") : "-"}) Tj
0 -30 Td (KONTEN TEKS LENGKAP PADA DESAIN:) Tj
0 -20 Td (${proj.artworkText.slice(0, 70)}) Tj
0 -15 Td (${proj.artworkText.slice(70, 140)}) Tj
0 -15 Td (${proj.artworkText.slice(140, 210)}) Tj
0 -30 Td (========================================================================) Tj
0 -20 Td (SANSICO MEDICA QUALITY ASSURANCE AND REGULATORY COMPLIANCE SYSTEM) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000015 00000 n 
0000000062 00000 n 
0000000121 00000 n 
0000000244 00000 n 
0000000315 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
765
%%EOF`;

    const blob = new Blob([simulatedPdfContent], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Define checklists based on DocType
  const getChecklistItems = (type: DocType): string[] => {
    switch (type) {
      case DocType.INNER_BOX:
      case DocType.POUCH:
        return [
          "Nama Produk",
          "REF",
          "Nomor AKD/AKL",
          "Simbol",
          "Suhu",
          "Penulisan",
          "Gambar",
        ];
      case DocType.LABEL_BOTOL:
        return ["Nama Produk", "REF", "Nomor AKD/AKL", "Simbol", "Suhu"];
      case DocType.IFU:
        return [
          "Nama Produk",
          "REF",
          "Konten",
          "Simbol",
          "Suhu",
          "Tanggal Buat",
          "Versi",
        ];
      case DocType.QC_PASS:
      case DocType.MASTER_CARTON:
      case DocType.LAINNYA:
        return ["Nama Produk"];
      default:
        return [];
    }
  };

  const handleCheckboxChange = (itemKey: string) => {
    setWarningMessage("");
    setCheckedKeys((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const verifyAllChecked = (proj: Project): boolean => {
    const items = getChecklistItems(proj.docType);
    return items.every((item) => checkedKeys[`${proj.id}-${item}`] === true);
  };

  const getCheckedCount = (proj: Project): number => {
    const items = getChecklistItems(proj.docType);
    return items.filter((item) => checkedKeys[`${proj.id}-${item}`] === true).length;
  };

  const handleAcc = () => {
    if (!selectedProject) return;
    
    // Validate that all items are checked
    if (!verifyAllChecked(selectedProject)) {
      setWarningMessage("Blokir Proses: Seluruh checklist dinamis wajib dicentang secara manual untuk mengonfirmasi kesesuaian dengan dokumen NIE Kemenkes!");
      return;
    }

    setWarningMessage("");
    onApprove(selectedProject.id, currentUser.fullName);
    setSelectedProjectId("");
    setCheckedKeys({});
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRejectError("");

    if (!compName.trim() || !errDesc.trim() || !expectedData.trim()) {
      setRejectError("Wajib mengisi seluruh rincian formulir penolakan terstruktur!");
      return;
    }

    if (!selectedProject) return;

    onReject(selectedProject.id, currentUser.fullName, {
      component: compName.trim(),
      currentError: errDesc.trim(),
      correctData: expectedData.trim(),
    });

    // Reset Form
    setIsRejecting(false);
    setCompName("");
    setErrDesc("");
    setExpectedData("");
    setSelectedProjectId("");
    setCheckedKeys({});
    setWarningMessage("");
  };

  return (
    <div className="space-y-6" id="product-panel-container">
      {/* Overview stats header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md border border-slate-800">
        <div>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-extrabold uppercase px-3 py-1 rounded-full border border-indigo-500/20 tracking-wider">
            Sistem Verifikasi Kepatuhan Medis
          </span>
          <h3 className="font-display font-extrabold text-lg sm:text-xl mt-2.5 text-slate-100 tracking-tight">
            Antrean Peninjauan Dokumen Master NIE
          </h3>
          <p className="text-slate-400 text-xs mt-1 font-medium max-w-xl">
            Tim Produk bertanggung jawab memvalidasi keselarasan cetakan desain artwork dengan data registrasi Kementerian Kesehatan RI.
          </p>
        </div>
        <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700/60 p-4 rounded-xl text-right min-w-[150px] shadow-inner">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Antrean</span>
          <span className="text-2xl font-mono font-black text-amber-400 block mt-0.5">{pendingProjects.length} Berkas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Projects Pending Product ACC */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1 flex flex-col h-[700px]">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 flex-shrink-0">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h4 className="font-display font-extrabold text-slate-800 text-xs uppercase tracking-wider">Proyek Pending</h4>
            <span className="ml-auto bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
              {filteredProjects.length} filter
            </span>
          </div>

          {/* Interactive Search & Filter Sidebar */}
          <div className="space-y-3 mb-4 flex-shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Cari nama, REF, NIE, desainer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 bg-slate-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white text-slate-700 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setDocTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase transition shrink-0 cursor-pointer ${
                  docTypeFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/50"
                }`}
              >
                Semua ({pendingProjects.length})
              </button>
              {Object.values(DocType).map((type) => {
                const count = pendingProjects.filter(p => p.docType === type).length;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocTypeFilter(type)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase transition shrink-0 cursor-pointer ${
                      docTypeFilter === type
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/50"
                    }`}
                  >
                    {type} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Cards Scroller */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {filteredProjects.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs italic">
                {pendingProjects.length === 0 
                  ? "Tidak ada berkas artwork yang membutuhkan persetujuan saat ini."
                  : "Tidak ada proyek pending yang cocok dengan filter pencarian."
                }
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = selectedProjectId === p.id;
                
                // Assign a beautiful color theme for the document type tag
                let docTypeBadgeClass = "bg-slate-100 text-slate-700 border-slate-200/50";
                if (p.docType === DocType.INNER_BOX) docTypeBadgeClass = "bg-sky-50 text-sky-700 border-sky-100";
                else if (p.docType === DocType.LABEL_BOTOL) docTypeBadgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                else if (p.docType === DocType.IFU) docTypeBadgeClass = "bg-purple-50 text-purple-700 border-purple-100";
                else if (p.docType === DocType.QC_PASS) docTypeBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setIsRejecting(false);
                      setWarningMessage("");
                    }}
                    id={`btn-select-project-${p.id}`}
                    className={`w-full text-left p-4 rounded-xl text-xs border transition duration-150 flex items-center justify-between cursor-pointer shadow-xs ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium ring-1 ring-indigo-500/10"
                        : "bg-slate-50/50 hover:bg-slate-100 border-slate-100 text-slate-600"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold flex items-center gap-1.5 text-slate-800">
                        <span className="truncate">{p.name}</span>
                        <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono shrink-0">
                          V{p.version}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${docTypeBadgeClass}`}>
                          {p.docType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate">
                          Oleh {p.createdBy}
                        </span>
                      </div>
                      
                      {/* Technical specifications info mini-badge */}
                      <div className="mt-1.5 font-mono text-[9px] text-slate-400 font-semibold truncate">
                        REF: {p.refCode || "N/A"}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ml-2 transition ${isSelected ? "text-indigo-600 transform translate-x-1" : "text-slate-400"}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Columns: Comparison & Checklist Area */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProject ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
              {/* Active Selected Project Heading */}
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <span>{selectedProject.name}</span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-lg font-mono">
                      V{selectedProject.version}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                    Tipe Dokumen: <strong className="text-slate-800 font-bold">{selectedProject.docType}</strong> • Desainer: <strong className="text-slate-800 font-bold">{selectedProject.createdBy}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
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
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-mono uppercase tracking-wider font-bold">Kode Kontrol</span>
                    <span className="font-mono text-xs text-slate-800 font-extrabold">{selectedProject.id}</span>
                  </div>
                </div>
              </div>

              {warningMessage && (
                <div className="p-4 bg-rose-50 border border-rose-100/70 rounded-2xl text-rose-800 text-xs font-semibold flex gap-2.5 items-center shadow-sm animate-shake" id="product-warning-msg">
                  <AlertOctagon className="w-4.5 h-4.5 flex-shrink-0 text-rose-600" />
                  <span>{warningMessage}</span>
                </div>
              )}

              {/* Full Width Designer's Layout Viewer */}
              <div className="w-full">
                {/* 1. Artwork Design Layout */}
                <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/20 flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-900 font-display tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      🎨 LAYOUT DESAIN ASLI (BERKAS DESAINER)
                    </span>
                    <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-bold">
                      VERIFIKASI AKTIF
                    </span>
                  </div>

                  {/* Document Information Banner with Download */}
                  <div className="flex items-center justify-between gap-3 bg-white border border-indigo-100/60 p-3 rounded-xl text-xs text-slate-700 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-rose-500 flex-shrink-0" />
                      <div className="truncate text-left">
                        <span className="text-[8px] text-slate-400 block font-sans uppercase tracking-wider font-bold">Nama Berkas Desainer</span>
                        <strong className="font-mono text-[10px] text-indigo-950 block truncate" title={selectedProject.pdfFileName}>
                          {selectedProject.pdfFileName || `${selectedProject.name.replace(/\s+/g, '_')}_Layout_V${selectedProject.version}.pdf`}
                        </strong>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                          Ukuran: {selectedProject.pdfFileSize || "1.2 MB"} • Diunggah {new Date(selectedProject.pdfUploadedAt || selectedProject.updatedAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(selectedProject)}
                      className="flex-shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/60 p-2 rounded-xl transition duration-150 flex items-center gap-1 cursor-pointer font-extrabold font-sans text-[10px] shadow-xs active:scale-95"
                      title="Unduh Berkas Desain untuk Verifikasi"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>UNDUH PDF</span>
                    </button>
                  </div>

                  {/* Visual Document Viewer Simulator */}
                  <div className="bg-slate-100 border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
                    {/* PDF Reader Toolbar */}
                    <div className="bg-slate-800 text-slate-300 px-3 py-1.5 flex items-center justify-between font-mono text-[9px] border-b border-slate-700 select-none">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>ACROBAT LAYOUT VIEWER</span>
                      </span>
                      <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[8px] font-bold text-slate-200">
                        PAGE 1 OF 1
                      </span>
                    </div>

                    {/* PDF Content Area */}
                    <div className="p-3 bg-slate-900 min-h-[300px] flex items-center justify-center relative">
                      {selectedProject.pdfFileUrl ? (
                        <div className="w-full h-full flex flex-col items-center">
                          {(selectedProject.pdfFileName && selectedProject.pdfFileName.toLowerCase().endsWith(".pdf")) || (selectedProject.pdfFileUrl && selectedProject.pdfFileUrl.startsWith("data:application/pdf")) ? (
                            <div className="w-full">
                              <iframe 
                                src={`${selectedProject.pdfFileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                title="Actual PDF Preview"
                                className="w-full h-[360px] rounded border border-slate-700 bg-white"
                              />
                              <div className="mt-2 text-center">
                                <a 
                                  href={selectedProject.pdfFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                                >
                                  Buka PDF di Tab Baru ↗
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full flex flex-col items-center">
                              <img 
                                src={selectedProject.pdfFileUrl} 
                                alt="Actual Uploaded Artwork" 
                                className="max-h-[360px] w-auto object-contain rounded border border-slate-700 bg-white" 
                                referrerPolicy="no-referrer" 
                              />
                              <div className="mt-2 text-center">
                                <a 
                                  href={selectedProject.pdfFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                                >
                                  Buka Gambar di Tab Baru ↗
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Beautiful high-fidelity simulated packaging layout if pdfFileUrl is missing */
                        <div className="bg-white border border-slate-300 shadow-xl rounded p-4 relative w-full text-[10px] text-slate-800 flex flex-col justify-between select-none min-h-[220px]">
                          {/* Watermark */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                            <span className="text-rose-700 font-black text-[22px] tracking-widest border-4 border-rose-700 p-2 rounded-xl rotate-12 uppercase">SIMULASI ORIGINAL</span>
                          </div>
                          
                          {/* Margin line indicators */}
                          <div className="absolute inset-1.5 border border-dashed border-rose-200/50 pointer-events-none rounded"></div>
                          
                          {/* Fold guides simulation */}
                          <div className="absolute top-0 bottom-0 left-1/3 border-r border-dashed border-slate-200/40 pointer-events-none"></div>
                          <div className="absolute top-0 bottom-0 left-2/3 border-r border-dashed border-slate-200/40 pointer-events-none"></div>

                          <div className="flex justify-between items-start pb-2 border-b border-slate-100 relative z-10">
                            <div>
                              <span className="text-[7px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider block mb-0.5">SANSICO MEDICA®</span>
                              <h4 className="font-bold text-slate-900 text-xs truncate max-w-[140px]">{selectedProject.name}</h4>
                            </div>
                            <span className="text-[8px] bg-slate-100 border border-slate-200 text-slate-700 font-mono px-1 rounded font-bold shrink-0">
                              {selectedProject.refCode || "REF-BLANK"}
                            </span>
                          </div>

                          <div className="my-3 space-y-1.5 text-[9px] text-slate-600 font-mono relative z-10">
                            <div>NIE: <span className="font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded">{selectedProject.nieNumber || "KEMENKES RI AKD ..."}</span></div>
                            <div className="text-[8px] text-slate-400 whitespace-pre-wrap leading-normal font-sans border-t border-slate-100 pt-1 font-medium max-h-[70px] overflow-hidden">
                              {selectedProject.artworkText}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[7px] text-slate-400 border-t border-slate-100 pt-1 relative z-10">
                            <span>SANSICO MULTI-REGION</span>
                            <span>Tipe: {selectedProject.docType}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1 text-[10px] text-slate-400 font-medium italic leading-normal flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Periksa kejelasan huruf, letak penulisan, dan simbol pada jaring-jaring box.</span>
                  </div>
                </div>
              </div>

              {/* Lower Section: Checklist/Form Panel */}
              <div className="pt-4 border-t border-slate-100">
                {/* Checklist Content Verification or Rejection Form */}
                <div className="flex flex-col">
                  {!isRejecting ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide block font-display">
                              Checklist Kepatuhan Konten
                            </span>
                            <p className="text-[10px] text-slate-400 font-semibold leading-tight">
                              Pastikan semua komponen di bawah sesuai dengan data acuan register resmi:
                            </p>
                          </div>
                          <div className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1 font-mono font-black shrink-0">
                            <span className={verifyAllChecked(selectedProject) ? "text-emerald-600" : "text-amber-500"}>
                              {getCheckedCount(selectedProject)}/{getChecklistItems(selectedProject.docType).length}
                            </span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${verifyAllChecked(selectedProject) ? "bg-emerald-500" : "bg-indigo-600"}`}
                            style={{ width: `${(getCheckedCount(selectedProject) / getChecklistItems(selectedProject.docType).length) * 100}%` }}
                          ></div>
                        </div>

                        {/* Checklist Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                          {getChecklistItems(selectedProject.docType).map((item) => {
                            const itemKey = `${selectedProject.id}-${item}`;
                            const isChecked = checkedKeys[itemKey] || false;
                            return (
                              <label
                                key={item}
                                className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition duration-150 ${
                                  isChecked
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-extrabold shadow-sm/10"
                                    : "bg-white hover:bg-slate-100 border-slate-100 text-slate-600 font-bold"
                                }`}
                              >
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"}`}>
                                  {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCheckboxChange(itemKey)}
                                  className="hidden"
                                />
                                <span className="text-[11px] leading-tight truncate" title={item}>{item}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-slate-200/60 pt-3 flex flex-col sm:flex-row gap-2 justify-end">
                        <button
                          onClick={() => {
                            setIsRejecting(true);
                            setWarningMessage("");
                          }}
                          id="btn-trigger-reject"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/50 text-[10px] font-black py-2 px-3 rounded-xl transition duration-150 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          TOLAK (BUTUH REVISI)
                        </button>
                        <button
                          onClick={handleAcc}
                          id="btn-acc-product"
                          className={`text-[10px] font-black py-2 px-3 rounded-xl transition duration-150 flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            verifyAllChecked(selectedProject)
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 text-slate-400 border border-slate-200/40 cursor-not-allowed"
                          }`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          BERIKAN ACC
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* REJECTION REMARKS FORM */
                    <form onSubmit={handleRejectSubmit} className="bg-rose-50/40 border border-rose-100/60 rounded-2xl p-4 space-y-3 flex-1 flex flex-col justify-between" id="form-rejection-notes">
                      <div className="space-y-2">
                        <div className="border-b border-rose-100/50 pb-1.5">
                          <h4 className="font-display font-extrabold text-rose-800 text-xs uppercase flex items-center gap-1 tracking-wider">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                            Catatan Revisi Wajib Diisi
                          </h4>
                        </div>

                        {rejectError && (
                          <div className="p-2 bg-rose-100 border border-rose-200 text-rose-900 text-[10px] rounded-lg font-bold">
                            {rejectError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                              1. Komponen yang Salah
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="misal: Nomor NIE / Kode REF"
                              value={compName}
                              onChange={(e) => setCompName(e.target.value)}
                              className="w-full text-[11px] px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-700 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                              2. Keterangan Kesalahan Desain
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="misal: Angka 9 tercetak sebagai 8"
                              value={errDesc}
                              onChange={(e) => setErrDesc(e.target.value)}
                              className="w-full text-[11px] px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-700 font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                              3. Data Seharusnya Sesuai NIE
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="misal: AKD 20902120034"
                              value={expectedData}
                              onChange={(e) => setExpectedData(e.target.value)}
                              className="w-full text-[11px] px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white text-slate-700 font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRejecting(false);
                            setRejectError("");
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-2 px-3 rounded-xl transition cursor-pointer"
                        >
                          KEMBALI
                        </button>
                        <button
                          type="submit"
                          id="btn-submit-rejection"
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black py-2 px-3 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
                        >
                          KIRIM PENOLAKAN
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-16 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400 text-xs font-bold italic h-[700px] flex flex-col justify-center items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center shadow-3xs text-indigo-500/80 mb-2">
                <FileText className="w-5 h-5 animate-bounce" />
              </div>
              <span>Silakan pilih salah satu proyek di kolom antrean sebelah kiri untuk memulai peninjauan.</span>
              <span className="text-[10px] font-medium text-slate-400 not-italic uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-1 rounded-md mt-1">Antrean Peninjauan Manual</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
