/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Project, DocType, ProjectStatus, UserAccount, Role } from "../types";
import { PlusCircle, Image, CheckCircle, AlertOctagon, HelpCircle, History, RefreshCw, UploadCloud, FileText, Trash2, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { dataUrlToBlobUrl } from "../lib/fileStorage";

interface DesignPanelProps {
  currentUser: UserAccount;
  projects: Project[];
  onCreateProject: (
    name: string,
    docType: DocType,
    refCode: string,
    nieNumber: string,
    artworkText: string,
    pdfFileName?: string,
    pdfFileSize?: string,
    pdfFileUrl?: string
  ) => void;
  onUpdateProject: (
    projectId: string,
    refCode: string,
    nieNumber: string,
    artworkText: string,
    checklist: { namaProduk: boolean; nie: boolean; konten: boolean; ref: boolean },
    pdfFileName?: string,
    pdfFileSize?: string,
    pdfFileUrl?: string
  ) => void;
  onDeleteProject?: (projectId: string) => void;
}

const DEMO_PDFS = [
  {
    name: "d3TEKS1_HCG_Test_Kehamilan_Strip.pdf",
    size: "1.8 MB",
    extracted: {
      name: "d3TEKS1 HCG Test Kehamilan (Strip)",
      docType: DocType.INNER_BOX,
      refCode: "REF 402216",
      nieNumber: "KEMENKES RI AKD 20101221725",
      artworkText: "d3TEKS1® HCG Test Kehamilan (Strip)\n25 Perangkat Uji / Box\nKEMENKES RI AKD 20101221725\nREF 402216\nDiproduksi Oleh: PT MERAH PUTIH MANUFAKTURA, Jawa Barat\nDidistribusikan Oleh: PT SANSICO NATURA RESOURCES, DKI Jakarta\nSimpan di suhu 2°C - 30°C",
    }
  },
  {
    name: "Sansico_Syringe_Set_10ml_V1_Final.pdf",
    size: "1.2 MB",
    extracted: {
      name: "Sansico Syringe Set 10ml",
      docType: DocType.INNER_BOX,
      refCode: "REF-SYN-10ML",
      nieNumber: "KEMENKES RI AKD 20902120034",
      artworkText: "Sansico Syringe Set 10ml\nREF-SYN-10ML\nKEMENKES RI AKD 20902120034\nSterile R | Single Use Only\nSuhu Penyimpanan: 15°C s.d 30°C",
    }
  },
  {
    name: "Sansico_Bottle_Label_S-M_50ml.pdf",
    size: "820 KB",
    extracted: {
      name: "Sansico Antiseptic Liquid 50ml",
      docType: DocType.LABEL_BOTOL,
      refCode: "REF-ANT-50ML",
      nieNumber: "KEMENKES RI AKD 20501110092",
      artworkText: "Sansico Antiseptic Liquid 50ml\nREF-ANT-50ML\nKEMENKES RI AKD 20501110092\nSuhu Penyimpanan: 15°C s.d 30°C\nSimbol Steril (R)",
    }
  },
  {
    name: "Sansico_Catheter_IFU_Brosur.pdf",
    size: "2.4 MB",
    extracted: {
      name: "Sansico Foley Catheter 2-Way",
      docType: DocType.IFU,
      refCode: "REF-FOL-2WAY",
      nieNumber: "KEMENKES RI AKL 20902511032",
      artworkText: "Sansico Foley Catheter 2-Way\nREF-FOL-2WAY\nKEMENKES RI AKL 20902511032\nSterile Gas EO | Single Use Only\nSuhu Penyimpanan: 15°C s.d 30°C",
    }
  }
];

// Helper function to dynamically extract/simulate parsing metadata from custom or demo PDF filenames
function extractMetadataFromPdf(fileName: string, fallbackDocType: DocType) {
  const lowercaseName = fileName.toLowerCase();
  
  // 1. Try to find match in DEMO_PDFS
  const matchedDemo = DEMO_PDFS.find(d => d.name.toLowerCase() === lowercaseName);
  if (matchedDemo) {
    return {
      name: matchedDemo.extracted.name,
      docType: matchedDemo.extracted.docType,
      refCode: matchedDemo.extracted.refCode,
      nieNumber: matchedDemo.extracted.nieNumber,
      artworkText: matchedDemo.extracted.artworkText
    };
  }
  
  // 2. Otherwise parse custom name (supports pdf, image)
  const cleanName = fileName
    .replace(/\.(pdf|png|jpe?g|gif|webp)$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+Rev\s+\d+/i, "")
    .replace(/\s+V\d+/i, "")
    .replace(/_Layout_V\d+/i, "")
    .replace(/_Final/i, "")
    .trim();
    
  let guessedDocType = fallbackDocType;
  if (lowercaseName.includes("box") || lowercaseName.includes("dus") || lowercaseName.includes("kemasan")) {
    guessedDocType = DocType.INNER_BOX;
  } else if (lowercaseName.includes("pouch") || lowercaseName.includes("kantong")) {
    guessedDocType = DocType.POUCH;
  } else if (lowercaseName.includes("label") || lowercaseName.includes("botol") || lowercaseName.includes("sticker") || lowercaseName.includes("stiker")) {
    guessedDocType = DocType.LABEL_BOTOL;
  } else if (lowercaseName.includes("ifu") || lowercaseName.includes("brosur") || lowercaseName.includes("manual") || lowercaseName.includes("petunjuk")) {
    guessedDocType = DocType.IFU;
  } else if (lowercaseName.includes("carton") || lowercaseName.includes("master") || lowercaseName.includes("kardus")) {
    guessedDocType = DocType.MASTER_CARTON;
  } else if (lowercaseName.includes("qc") || lowercaseName.includes("pass") || lowercaseName.includes("sertifikat")) {
    guessedDocType = DocType.QC_PASS;
  }
  
  // Exact defaults matched to the user's high-fidelity uploaded images
  const refMatch = fileName.match(/REF\s*[-_]?\s*([0-9A-Z]+)/i);
  let refCode = "";
  if (refMatch) {
    refCode = `REF ${refMatch[1].toUpperCase()}`;
  } else {
    const digitMatch = fileName.match(/\b(\d{7})\b/);
    if (digitMatch) {
      refCode = `REF ${digitMatch[1]}`;
    } else {
      refCode = "REF 1002301";
    }
  }
  
  const nieMatch = fileName.match(/(AK[DL])\s*[-_]?\s*(\d+)/i);
  let nieNumber = "";
  if (nieMatch) {
    nieNumber = `KEMENKES RI ${nieMatch[1].toUpperCase()} ${nieMatch[2]}`;
  } else {
    const generalNieMatch = fileName.match(/\b(\d{11})\b/);
    if (generalNieMatch) {
      const isImport = lowercaseName.includes("import") || lowercaseName.includes("co-") || lowercaseName.includes("intl") || lowercaseName.includes("ltd");
      const niePrefix = isImport ? "AKL" : "AKD";
      nieNumber = `KEMENKES RI ${niePrefix} ${generalNieMatch[1]}`;
    } else {
      nieNumber = "KEMENKES RI AKD 20206620018";
    }
  }
  
  const isSterile = lowercaseName.includes("sterile") || lowercaseName.includes("steril");
  const sterileType = lowercaseName.includes("eo") ? "Sterile Gas EO" : "Sterile R";
  const sterileLine = isSterile ? `${sterileType} | Single Use Only` : "Non-Sterile | Untuk Penggunaan Medis";
  
  const artworkText = `${cleanName}\n${refCode}\n${nieNumber}\n${sterileLine}\nSuhu Penyimpanan: 15°C s.d 30°C\nDiproduksi oleh: PT Sansico Medika Indonesia\nTangerang, Indonesia`;
  
  return {
    name: cleanName,
    docType: guessedDocType,
    refCode,
    nieNumber,
    artworkText
  };
}

function splitRefCode(fullCode: string): { prefix: string; suffix: string } {
  if (!fullCode) return { prefix: "REF-", suffix: "" };
  const trimmed = fullCode.trim();
  if (trimmed.toUpperCase().startsWith("REF-")) {
    return { prefix: "REF-", suffix: trimmed.substring(4) };
  } else if (trimmed.toUpperCase().startsWith("REF ")) {
    return { prefix: "REF ", suffix: trimmed.substring(4) };
  } else if (trimmed.toUpperCase().startsWith("REF")) {
    return { prefix: "REF ", suffix: trimmed.substring(3).trim() };
  }
  return { prefix: "REF-", suffix: trimmed };
}

function splitNieNumber(fullNie: string): { prefix: string; suffix: string } {
  if (!fullNie) return { prefix: "KEMENKES RI AKD", suffix: "" };
  const trimmed = fullNie.trim();
  if (trimmed.toUpperCase().includes("AKL")) {
    const idx = trimmed.toUpperCase().indexOf("AKL");
    const suffix = trimmed.substring(idx + 3).trim();
    return { prefix: "KEMENKES RI AKL", suffix };
  } else if (trimmed.toUpperCase().includes("AKD")) {
    const idx = trimmed.toUpperCase().indexOf("AKD");
    const suffix = trimmed.substring(idx + 3).trim();
    return { prefix: "KEMENKES RI AKD", suffix };
  }
  return { prefix: "KEMENKES RI AKD", suffix: trimmed };
}

function applyDocTypePrefix(name: string, type: DocType): string {
  let cleanName = name.trim();
  cleanName = cleanName.replace(/^\[(INNER BOX|POUCH|LABEL BOTOL|IFU|QC PASS CERTIF|QC PASS|MASTER CARTON|LAINNYA)\]\s*[-]?\s*/i, "");
  
  let prefix = "";
  if (type === DocType.INNER_BOX) {
    prefix = "[INNER BOX] ";
  } else if (type === DocType.POUCH) {
    prefix = "[POUCH] ";
  } else if (type === DocType.LABEL_BOTOL) {
    prefix = "[LABEL BOTOL] ";
  } else if (type === DocType.IFU) {
    prefix = "[IFU] ";
  } else if (type === DocType.QC_PASS) {
    prefix = "[QC PASS] ";
  } else if (type === DocType.MASTER_CARTON) {
    prefix = "[MASTER CARTON] ";
  } else if (type === DocType.LAINNYA) {
    prefix = "[LAINNYA] ";
  }
  
  return prefix + cleanName;
}

export default function DesignPanel({
  currentUser,
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: DesignPanelProps) {
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  
  // PDF upload states
  const [pdfFile, setPdfFile] = useState<{ name: string; size: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Edit PDF upload states
  const [editPdfFile, setEditPdfFile] = useState<{ name: string; size: string } | null>(null);
  const [isEditScanning, setIsEditScanning] = useState(false);
  const [editScanProgress, setEditScanProgress] = useState(0);
  const [editScanStep, setEditScanStep] = useState("");
  const [editDragOver, setEditDragOver] = useState(false);
  const [editUploadedImageUrl, setEditUploadedImageUrl] = useState<string | null>(null);
  
  // Create state
  const [projName, setProjName] = useState("");
  const [docType, setDocType] = useState<DocType>(DocType.INNER_BOX);
  
  const [refSuffix, setRefSuffix] = useState("");
  const [niePrefix, setNiePrefix] = useState("KEMENKES RI AKD");
  const [nieSuffix, setNieSuffix] = useState("");
  const [artworkText, setArtworkText] = useState("");

  const refCode = refSuffix.trim() ? `REF-${refSuffix}` : "";
  const nieNumber = nieSuffix.trim() ? `${niePrefix} ${nieSuffix}` : "";

  const setRefCode = (fullVal: string) => {
    const { suffix } = splitRefCode(fullVal);
    setRefSuffix(suffix);
  };

  const setNieNumber = (fullVal: string) => {
    const { prefix, suffix } = splitNieNumber(fullVal);
    setNiePrefix(prefix);
    setNieSuffix(suffix);
  };
  
  // Checklist state for new project
  const [checkNama, setCheckNama] = useState(false);
  const [checkNie, setCheckNie] = useState(false);
  const [checkKonten, setCheckKonten] = useState(false);
  const [checkRef, setCheckRef] = useState(false);

  // Edit / Re-submit state for existing projects needing revision
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [editRefSuffix, setEditRefSuffix] = useState("");
  const [editNiePrefix, setEditNiePrefix] = useState("KEMENKES RI AKD");
  const [editNieSuffix, setEditNieSuffix] = useState("");
  const [editArtworkText, setEditArtworkText] = useState("");

  const editRefCode = editRefSuffix.trim() ? `REF-${editRefSuffix}` : "";
  const editNieNumber = editNieSuffix.trim() ? `${editNiePrefix} ${editNieSuffix}` : "";

  const setEditRefCode = (fullVal: string) => {
    const { suffix } = splitRefCode(fullVal);
    setEditRefSuffix(suffix);
  };

  const setEditNieNumber = (fullVal: string) => {
    const { prefix, suffix } = splitNieNumber(fullVal);
    setEditNiePrefix(prefix);
    setEditNieSuffix(suffix);
  };

  const [editCheckNama, setEditCheckNama] = useState(false);
  const [editCheckNie, setEditCheckNie] = useState(false);
  const [editCheckKonten, setEditCheckKonten] = useState(false);
  const [editCheckRef, setEditCheckRef] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const renderPdfPreview = (
    fileName: string, 
    sizeStr: string, 
    name: string, 
    ref: string, 
    nie: string, 
    text: string, 
    docType: string,
    imageUrl?: string | null
  ) => {
    const isPdf = fileName.toLowerCase().endsWith(".pdf") || (imageUrl ? imageUrl.includes("application/pdf") : false);
    const pdfBlobUrl = imageUrl && isPdf ? dataUrlToBlobUrl(imageUrl) : imageUrl;

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md font-sans text-left">
        {/* PDF Header Toolbar */}
        <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center justify-between text-white text-[11px] font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span className="truncate font-mono text-[9px] text-slate-200">{fileName} ({sizeStr})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[8px] bg-slate-900/60 px-1 py-0.5 rounded border border-slate-700">Maksimal 10 MB (Kualitas Cetak 100%)</span>
            <div className="h-4 w-[1px] bg-slate-700"></div>
            <span className="text-slate-400 font-mono text-[8px] bg-slate-900/60 px-1 py-0.5 rounded border border-slate-700 font-bold text-indigo-400">PDF PREVIEW</span>
          </div>
        </div>
        
        {/* PDF Main Document Sheet */}
        <div className="bg-slate-950 p-4 min-h-[220px] flex items-center justify-center relative overflow-hidden">
          {/* PDF Grid background simulation */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
          
          {imageUrl ? (
            <div className="bg-white border border-slate-300 shadow-xl rounded p-3 relative w-full max-w-sm flex flex-col items-center justify-center select-none overflow-hidden min-h-[180px]">
              {isPdf ? (
                <div className="w-full flex flex-col items-center">
                  <object 
                    data={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    type="application/pdf"
                    className="w-full h-[200px] rounded border border-slate-200"
                  >
                    <embed src={pdfBlobUrl || undefined} type="application/pdf" className="w-full h-[200px] rounded" />
                  </object>
                  <div className="mt-2 text-center">
                    <a 
                      href={pdfBlobUrl || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition shadow-xs cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka PDF Layar Penuh (Cetak Uncompressed 100%) ↗
                    </a>
                  </div>
                </div>
              ) : (
                <img src={imageUrl} alt="Uploaded Artwork" className="max-h-[190px] w-auto object-contain rounded border border-slate-100 shadow-sm" referrerPolicy="no-referrer" />
              )}
              <div className="text-[9px] text-slate-500 mt-2.5 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" /> Terbaca: {ref} • {nie}
              </div>
            </div>
          ) : (
            /* Render Page */
            <div className="bg-white border border-slate-300 shadow-xl rounded p-4 relative w-full max-w-sm text-[10px] text-slate-800 flex flex-col justify-between select-none">
              {/* Draft stamp watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                <span className="text-rose-700 font-extrabold text-[24px] tracking-widest border-4 border-rose-700 p-2 rounded-xl rotate-12 uppercase">PDF ORIGINAL LAYOUT</span>
              </div>
              
              {/* Margins indicator */}
              <div className="absolute inset-1.5 border border-dashed border-rose-200/50 pointer-events-none rounded"></div>
              
              <div className="flex justify-between items-start pb-2 border-b border-slate-100 relative">
                <div>
                  <span className="text-[7px] bg-indigo-50 text-indigo-700 font-bold px-1 py-0.5 rounded uppercase tracking-wider block mb-0.5">SANSICO MEDICA® LAYOUT</span>
                  <h4 className="font-bold text-slate-900 text-xs truncate max-w-[180px]">{name || "DRAFT ALKES"}</h4>
                </div>
                <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono px-1 rounded font-bold">
                  {ref || "REF-XXXX"}
                </span>
              </div>

              <div className="my-3 space-y-1 text-[9px] text-slate-600 font-mono">
                <div>NIE: <span className="font-bold text-slate-800">{nie || "KEMENKES RI AKD ..."}</span></div>
                <div className="text-[8px] text-slate-400 whitespace-pre-wrap leading-tight font-medium max-h-[70px] overflow-hidden">
                  {text || "Teks desain layout..."}
                </div>
              </div>

              <div className="flex justify-between items-center text-[7px] text-slate-400 border-t border-slate-100 pt-1">
                <span>DOKUMEN INTEGRAL (ASLI)</span>
                <span>Tipe: {docType}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* PDF Footer Status bar */}
        <div className="bg-slate-800 px-3 py-1.5 flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-700 font-mono">
          <span>Pratinjau PDF • Siap Dikirim</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LAYOUT AKTIF
          </span>
        </div>
      </div>
    );
  };

const readOriginalFileUncompressed = (fileObj: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve((reader.result as string) || "");
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(fileObj);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

  const startScanning = async (fileName: string, fileSizeStr: string, isEditing: boolean = false, fileObj?: File) => {
    if (fileObj && fileObj.size > 10 * 1024 * 1024) {
      const mbSize = (fileObj.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Ukuran berkas melebihi batas maksimal 10 MB (Ukuran berkas Anda: ${mbSize} MB). Harap pilih berkas PDF/gambar di bawah 10 MB.`);
      return;
    }

    const isEdit = isEditing;
    if (isEdit) {
      setIsEditScanning(true);
      setEditScanProgress(10);
      setEditScanStep("Mengunggah berkas desain...");
    } else {
      setIsScanning(true);
      setScanProgress(10);
      setScanStep("Mengunggah berkas desain...");
    }

    if (fileObj) {
      readOriginalFileUncompressed(fileObj).then((dataUrl) => {
        if (isEdit) {
          setEditUploadedImageUrl(dataUrl);
        } else {
          setUploadedImageUrl(dataUrl);
        }
      });
    } else {
      if (isEdit) {
        setEditUploadedImageUrl(null);
      } else {
        setUploadedImageUrl(null);
      }
    }

    // Set up progressive animation for the progress bar
    let progress = 10;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += 5;
        if (isEdit) {
          setEditScanProgress(progress);
          if (progress === 30) setEditScanStep("Membaca konten dokumen...");
          if (progress === 55) setEditScanStep("Menganalisis dengan Gemini AI...");
          if (progress === 75) setEditScanStep("Mengekstrak Kode REF & NIE Kemenkes...");
        } else {
          setScanProgress(progress);
          if (progress === 30) setScanStep("Membaca konten dokumen...");
          if (progress === 55) setScanStep("Menganalisis dengan Gemini AI...");
          if (progress === 75) setScanStep("Mengekstrak Kode REF & NIE Kemenkes...");
        }
      }
    }, 150);

    try {
      let parsed;
      if (fileObj) {
        // Read file as base64
        const base64Data = await fileToBase64(fileObj);
        
        // Call backend API
        const response = await fetch("/api/analyze-artwork", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: fileObj.name,
            mimeType: fileObj.type || "application/pdf",
            base64Data,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Gagal memproses file di server.");
        }

        parsed = await response.json();
      } else {
        // Mock fallback if no fileObj
        parsed = extractMetadataFromPdf(fileName, isEdit && editingProject ? editingProject.docType : docType);
      }

      // Stop the incremental interval, jump to 100%
      clearInterval(progressInterval);
      if (isEdit) {
        setEditScanProgress(100);
        setEditScanStep("Selesai menganalisis!");
      } else {
        setScanProgress(100);
        setScanStep("Selesai menganalisis!");
      }

      setTimeout(() => {
        if (isEdit) {
          setEditPdfFile({ name: fileName, size: fileSizeStr });
          setIsEditScanning(false);
          setEditRefCode(parsed.refCode || "");
          setEditNieNumber(parsed.nieNumber || "");
          setEditArtworkText(parsed.artworkText || "");
        } else {
          setPdfFile({ name: fileName, size: fileSizeStr });
          setIsScanning(false);
          const finalDocType = (parsed.docType as DocType) || docType;
          if (parsed.docType) setDocType(finalDocType);
          setProjName(applyDocTypePrefix(parsed.name || "", finalDocType));
          setRefCode(parsed.refCode || "");
          setNieNumber(parsed.nieNumber || "");
          setArtworkText(parsed.artworkText || "");
        }
      }, 300);

    } catch (error: any) {
      console.warn("Gemini AI extraction failed, falling back to smart filename regex parsing:", error);
      clearInterval(progressInterval);
      
      // Fallback
      const fallbackParsed = extractMetadataFromPdf(fileName, isEdit && editingProject ? editingProject.docType : docType);
      
      if (isEdit) {
        setEditScanProgress(100);
        setEditScanStep("Selesai (Menggunakan Fallback parsing)");
      } else {
        setScanProgress(100);
        setScanStep("Selesai (Menggunakan Fallback parsing)");
      }

      setTimeout(() => {
        if (isEdit) {
          setEditPdfFile({ name: fileName, size: fileSizeStr });
          setIsEditScanning(false);
          setEditRefCode(fallbackParsed.refCode);
          setEditNieNumber(fallbackParsed.nieNumber);
          setEditArtworkText(fallbackParsed.artworkText);
        } else {
          setPdfFile({ name: fileName, size: fileSizeStr });
          setIsScanning(false);
          setDocType(fallbackParsed.docType);
          setProjName(applyDocTypePrefix(fallbackParsed.name, fallbackParsed.docType));
          setRefCode(fallbackParsed.refCode);
          setNieNumber(fallbackParsed.nieNumber);
          setArtworkText(fallbackParsed.artworkText);
        }
      }, 300);
    }
  };

  const handleSelectDemoPdf = (demo: typeof DEMO_PDFS[0], isEditing: boolean = false) => {
    const isEdit = isEditing;
    if (isEdit) {
      setIsEditScanning(true);
      setEditScanProgress(0);
      setEditScanStep("Mengunduh berkas PDF...");
    } else {
      setIsScanning(true);
      setScanProgress(0);
      setScanStep("Mengunduh berkas PDF...");
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (isEdit) {
        setEditScanProgress(progress);
      } else {
        setScanProgress(progress);
      }

      if (progress === 40) {
        if (isEdit) setEditScanStep("Memverifikasi berkas...");
        else setScanStep("Memverifikasi berkas...");
      } else if (progress === 80) {
        if (isEdit) setEditScanStep("Menyusun pratinjau layout PDF...");
        else setScanStep("Menyusun pratinjau layout PDF...");
      } else if (progress >= 100) {
        clearInterval(interval);
        
        const parsed = demo.extracted;
        
        if (isEdit) {
          setEditPdfFile({ name: demo.name, size: demo.size });
          setIsEditScanning(false);
          setEditRefCode(parsed.refCode);
          setEditNieNumber(parsed.nieNumber);
          setEditArtworkText(parsed.artworkText);
          setEditUploadedImageUrl(null);
        } else {
          setPdfFile({ name: demo.name, size: demo.size });
          setIsScanning(false);
          setDocType(parsed.docType);
          setProjName(applyDocTypePrefix(parsed.name, parsed.docType));
          setRefCode(parsed.refCode);
          setNieNumber(parsed.nieNumber);
          setArtworkText(parsed.artworkText);
          setUploadedImageUrl(null);
        }
      }
    }, 120);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!pdfFile) {
      setErrorMessage("Blokir Proses Pengiriman: Anda wajib mengunggah dokumen PDF artwork desain terlebih dahulu!");
      return;
    }

    // Enforce mandatory checklists
    const isInnerBox = docType === DocType.INNER_BOX || docType === DocType.POUCH;
    if (!checkNama || !checkKonten || (isInnerBox && (!checkNie || !checkRef))) {
      setErrorMessage("Blokir Proses Pengiriman: Anda wajib memeriksa dan mencentang item checklist teknis yang diperlukan di bawah sebelum mengajukan dokumen ke Tim Produk!");
      return;
    }

    onCreateProject(
      applyDocTypePrefix(projName, docType).trim(),
      docType,
      refCode.trim(),
      nieNumber.trim(),
      artworkText.trim(),
      pdfFile.name,
      pdfFile.size,
      uploadedImageUrl || undefined
    );

    setProjName("");
    setRefCode("");
    setNieNumber("");
    setArtworkText("");
    setPdfFile(null);
    setCheckNama(false);
    setCheckNie(false);
    setCheckKonten(false);
    setCheckRef(false);

    setSuccessMessage("Proyek berhasil dibuat dan dikirim ke antrean Tim Produk dengan status 'Pending Review by Product'!");
    setActiveTab("list");
  };

  const handleEditInit = (proj: Project) => {
    setEditingProject(proj);
    setEditRefCode(proj.refCode);
    setEditNieNumber(proj.nieNumber);
    setEditArtworkText(proj.artworkText);
    setEditPdfFile(proj.pdfFileName && proj.pdfFileSize ? { name: proj.pdfFileName, size: proj.pdfFileSize } : null);
    setEditCheckNama(false);
    setEditCheckNie(false);
    setEditCheckKonten(false);
    setEditCheckRef(false);
    setErrorMessage("");
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (!editPdfFile) {
      setErrorMessage("Blokir Proses Pengiriman: Anda wajib mengunggah dokumen PDF revisi terlebih dahulu!");
      return;
    }

    const isInnerBox = editingProject.docType === DocType.INNER_BOX || editingProject.docType === DocType.POUCH;
    if (!editCheckNama || !editCheckKonten || (isInnerBox && (!editCheckNie || !editCheckRef))) {
      setErrorMessage("Blokir Proses Pengiriman: Semua item checklist teknis revisi yang diperlukan wajib dicentang!");
      return;
    }

    onUpdateProject(
      editingProject.id,
      editRefCode.trim(),
      editNieNumber.trim(),
      editArtworkText.trim(),
      {
        namaProduk: editCheckNama,
        nie: editCheckNie,
        konten: editCheckKonten,
        ref: editCheckRef,
      },
      editPdfFile.name,
      editPdfFile.size,
      editUploadedImageUrl || undefined
    );

    setEditingProject(null);
    setEditPdfFile(null);
    setSuccessMessage(`Proyek "${editingProject.name}" berhasil diresubmit ke V${editingProject.version + 1}!`);
  };

  // Pre-fill simulated values for ease of demo (Now triggers first demo PDF)
  const handleAutoFill = () => {
    const demo = DEMO_PDFS[0];
    setProjName(demo.extracted.name);
    setDocType(demo.extracted.docType);
    setRefCode(demo.extracted.refCode);
    setNieNumber(demo.extracted.nieNumber);
    setArtworkText(demo.extracted.artworkText);
    setPdfFile({ name: demo.name, size: demo.size });
  };

  return (
    <div className="space-y-6" id="design-panel-container">
      {/* Navigation tabs */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => { setActiveTab("create"); setEditingProject(null); }}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all duration-150 cursor-pointer ${
            activeTab === "create" && !editingProject
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
          id="tab-create-project"
        >
          Buat Proyek Artwork Baru
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`py-2 px-4 text-xs font-bold border-b-2 transition-all duration-150 cursor-pointer ${
            activeTab === "list" || editingProject
              ? "border-red-600 text-red-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
          id="tab-list-project"
        >
          Daftar Proyek & Status Revisi ({projects.length})
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-100/70 rounded-2xl text-emerald-800 text-xs font-semibold shadow-sm" id="success-msg">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50/60 border border-rose-100/70 rounded-2xl text-rose-800 text-xs font-semibold flex gap-2.5 items-center shadow-sm" id="error-msg">
          <AlertOctagon className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* RENDER EDITING PROJECT (REVISION FLOW) */}
      {editingProject && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                Revisi Diperlukan (V{editingProject.version} ➔ V{editingProject.version + 1})
              </span>
              <h3 className="font-display font-extrabold text-slate-800 text-base mt-2">
                Perbaikan Desain Proyek: {editingProject.name}
              </h3>
            </div>
            <button
              onClick={() => setEditingProject(null)}
              className="text-slate-400 hover:text-slate-800 text-xs font-semibold transition"
            >
              Batal
            </button>
          </div>

          {/* Show Product Team rejection remarks */}
          {editingProject.revisions.length > 0 && (
            <div className="bg-rose-50/40 border border-rose-100/75 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <History className="w-4 h-4 text-rose-600" />
                Catatan Revisi Terstruktur dari Tim Produk:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-700">
                <div className="bg-white p-3 rounded-xl border border-rose-100/60 shadow-sm/30">
                  <span className="block font-display font-bold text-rose-700 text-[9px] uppercase tracking-wider mb-0.5">Komponen Salah</span>
                  <div className="text-slate-800 text-[11px] font-medium">{editingProject.revisions[editingProject.revisions.length - 1].notes.component}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-rose-100/60 shadow-sm/30">
                  <span className="block font-display font-bold text-rose-700 text-[9px] uppercase tracking-wider mb-0.5">Keterangan Kesalahan</span>
                  <div className="text-slate-800 text-[11px] font-medium">{editingProject.revisions[editingProject.revisions.length - 1].notes.currentError}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-rose-100/60 shadow-sm/30">
                  <span className="block font-display font-bold text-rose-700 text-[9px] uppercase tracking-wider mb-0.5">Sesuai NIE Master</span>
                  <div className="text-slate-800 text-[11px] font-medium">{editingProject.revisions[editingProject.revisions.length - 1].notes.correctData}</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 text-right pt-1 font-mono">
                Ditolak oleh: {editingProject.revisions[editingProject.revisions.length - 1].rejectedBy} pada {new Date(editingProject.revisions[editingProject.revisions.length - 1].rejectedAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}

          <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="form-update-project">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
                  Nama Proyek & Tipe Dokumen
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editingProject.name} (${editingProject.docType})`}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed font-medium"
                />
              </div>

              {!editPdfFile && !isEditScanning && (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setEditDragOver(true); }}
                  onDragLeave={() => setEditDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setEditDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      const sizeStr = file.size > 1024 * 1024 
                        ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
                        : Math.round(file.size / 1024) + " KB";
                      startScanning(file.name, sizeStr, true, file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-150 flex flex-col items-center justify-center min-h-[180px] ${
                    editDragOver 
                      ? "border-indigo-500 bg-indigo-50/40" 
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 bg-slate-50/10"
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700 font-display">Unggah Berkas PDF / Gambar Revisi</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                    Tarik file PDF atau gambar desain revisi ke sini, atau klik tombol untuk memilih file
                  </p>
                  <label className="mt-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold py-1.5 px-3 rounded-lg cursor-pointer shadow-sm transition">
                    Pilih Berkas Desain
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const file = files[0];
                          const sizeStr = file.size > 1024 * 1024 
                            ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
                            : Math.round(file.size / 1024) + " KB";
                          startScanning(file.name, sizeStr, true, file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {isEditScanning && (
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[180px]">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                  <p className="text-xs font-bold text-slate-700 font-display">{editScanStep}</p>
                  <div className="w-40 bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150" 
                      style={{ width: `${editScanProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 font-bold">{editScanProgress}%</span>
                </div>
              )}

              {editPdfFile && !isEditScanning && (
                <div className="space-y-4">
                  {/* File card */}
                  <div className="bg-rose-50/30 border border-rose-100/50 rounded-xl p-3 flex justify-between items-center shadow-sm">
                    <div className="flex gap-2.5 items-center min-w-0">
                      <div className="bg-rose-500 text-white rounded-lg p-2 shadow-sm">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate text-left">
                        <span className="text-[8px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">PDF Revisi Baru</span>
                        <p className="text-xs font-bold text-slate-800 font-mono truncate mt-0.5">{editPdfFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Ukuran: {editPdfFile.size}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setEditPdfFile(null);
                      }}
                      className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer font-sans text-xs"
                      title="Hapus file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Render the visual PDF preview */}
                  {renderPdfPreview(
                    editPdfFile.name,
                    editPdfFile.size,
                    editingProject.name,
                    editRefCode,
                    editNieNumber,
                    editArtworkText,
                    editingProject.docType
                  )}
                </div>
              )}



              {/* Auto-extracted input fields for updating project (revision) */}
              <div className="space-y-4 pt-3 border-t border-slate-100 text-left font-sans">
                {/* Editable Kode Produk (REF) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    Kode Produk (REF) {(editingProject?.docType === DocType.INNER_BOX || editingProject?.docType === DocType.POUCH) ? <span className="text-rose-500 font-bold">*</span> : <span className="text-slate-400 font-normal text-[9px] lowercase"> (opsional)</span>}
                  </label>
                  <div className="flex gap-2">
                    <div className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono font-bold select-none shrink-0">
                      REF-
                    </div>
                    <input
                      type="text"
                      required={editingProject?.docType === DocType.INNER_BOX || editingProject?.docType === DocType.POUCH}
                      placeholder={(editingProject?.docType === DocType.INNER_BOX || editingProject?.docType === DocType.POUCH) ? "Input manual kode produk, contoh: SYN-10ML atau 1002301" : "Opsional, contoh: SYN-10ML atau 1002301"}
                      value={editRefSuffix}
                      onChange={(e) => setEditRefSuffix(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Editable NIE */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    Nomor Izin Edar Kemenkes (NIE / AKD / AKL) {(editingProject?.docType === DocType.INNER_BOX || editingProject?.docType === DocType.POUCH) ? <span className="text-rose-500 font-bold">*</span> : <span className="text-slate-400 font-normal text-[9px] lowercase"> (opsional)</span>}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={editNiePrefix}
                      onChange={(e) => setEditNiePrefix(e.target.value)}
                      className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                    >
                      <option value="KEMENKES RI AKD">KEMENKES RI AKD</option>
                      <option value="KEMENKES RI AKL">KEMENKES RI AKL</option>
                    </select>
                    <input
                      type="text"
                      required={editingProject?.docType === DocType.INNER_BOX || editingProject?.docType === DocType.POUCH}
                      placeholder={(editingProject?.docType === DocType.INNER_BOX || editingProject?.docType === DocType.POUCH) ? "Input manual angka NIE, contoh: 20902120034" : "Opsional, contoh: 20902120034"}
                      value={editNieSuffix}
                      onChange={(e) => setEditNieSuffix(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Visual Design Mockup & Checklist */}
            <div className="space-y-4">


              {/* 4 CHECKLISTS ENFORCEMENT */}
              <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-indigo-900 block font-display uppercase tracking-wider">
                  Mandatory Technical Checklist (Tim Desain)
                </span>
                <p className="text-[11px] text-indigo-700/90 leading-tight">
                  Wajib centang ulang semua aspek teknis untuk mengonfirmasi kelayakan desain baru:
                </p>
                <div className="space-y-2 text-xs">
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={editCheckNama}
                      onChange={(e) => setEditCheckNama(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">Nama Produk:</strong> Tata letak benar dan teks jelas (tidak terpotong garis lipatan).
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={editCheckNie}
                      onChange={(e) => setEditCheckNie(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">NIE{(editingProject?.docType !== DocType.INNER_BOX && editingProject?.docType !== DocType.POUCH) && " (Bila Ada)"}:</strong> Posisi penulisan nomor AKD/AKL di desain sudah sesuai.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={editCheckKonten}
                      onChange={(e) => setEditCheckKonten(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">Konten:</strong> Gambar tajam dan simbol diletakkan pada posisi jaring box yang tepat.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={editCheckRef}
                      onChange={(e) => setEditCheckRef(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">REF{(editingProject?.docType !== DocType.INNER_BOX && editingProject?.docType !== DocType.POUCH) && " (Bila Ada)"}:</strong> Format kode produk menggunakan kata "REF".
                    </span>
                  </label>
                </div>
              </div>

              {/* RAPIH STATS COMPONENT (EDIT PROJECT FLOW) */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">
                    Statistik Berkas Alkes (Global)
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono font-medium">Aktif</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">🔬 Review Produk:</span>
                    <span className="font-mono font-extrabold text-slate-800 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length} Berkas
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">🎨 Revisi Desain:</span>
                    <span className="font-mono font-extrabold text-rose-600 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length} Berkas
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">📦 Siap Rilis:</span>
                    <span className="font-mono font-extrabold text-amber-600 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT).length} Berkas
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">🖨️ Selesai Cetak:</span>
                    <span className="font-mono font-extrabold text-emerald-600 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED).length} Berkas
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-revision"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition duration-150 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Ajukan Ulang Perbaikan Desain (V{editingProject.version + 1})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABS CONTENT: CREATE NEW PROJECT */}
      {activeTab === "create" && !editingProject && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
              Inisiasi Proyek Desain Artwork Baru
            </h3>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="form-create-project">
            <div className="space-y-4">
              {!pdfFile && !isScanning && (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      const sizeStr = file.size > 1024 * 1024 
                        ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
                        : Math.round(file.size / 1024) + " KB";
                      startScanning(file.name, sizeStr, false, file);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-150 flex flex-col items-center justify-center min-h-[220px] ${
                    dragOver 
                      ? "border-indigo-500 bg-indigo-50/40" 
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 bg-slate-50/10"
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-3 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700 font-display">Tarik & Lepas File Desain</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                    Seret file PDF atau gambar desain artwork di sini, atau klik tombol di bawah untuk memilih file dari komputer Anda
                  </p>
                  <label className="mt-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer shadow-sm transition">
                    Pilih File Desain
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const file = files[0];
                          const sizeStr = file.size > 1024 * 1024 
                            ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
                            : Math.round(file.size / 1024) + " KB";
                          startScanning(file.name, sizeStr, false, file);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {isScanning && (
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-700 font-display">{scanStep}</p>
                  <div className="w-48 bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-150" 
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1.5 font-bold">{scanProgress}%</span>
                </div>
              )}

              {pdfFile && !isScanning && (
                <div className="space-y-4">
                  {/* File card */}
                  <div className="bg-rose-50/30 border border-rose-100/50 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="bg-rose-500 text-white rounded-xl p-2.5 shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <span className="text-[8px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">Berkas Dokumen Desain</span>
                        <p className="text-xs font-bold text-slate-800 font-mono truncate mt-0.5">{pdfFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Ukuran: {pdfFile.size} • Siap Diajukan</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setPdfFile(null);
                        setUploadedImageUrl(null);
                      }}
                      className="p-2 hover:bg-rose-100 rounded-xl text-slate-400 hover:text-rose-600 transition cursor-pointer font-sans text-xs"
                      title="Hapus file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* PDF Visual Layout Preview */}
                  {renderPdfPreview(
                    pdfFile.name,
                    pdfFile.size,
                    projName,
                    refCode,
                    nieNumber,
                    artworkText,
                    docType,
                    uploadedImageUrl
                  )}
                </div>
              )}



              {/* Manual Form Input Fields */}
              <div className="space-y-4 pt-3 border-t border-slate-100 text-left font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    Nama Proyek Alkes (Otomatis / Dapat Diedit) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sansico Syringe Set 10ml"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    onBlur={() => setProjName(prev => applyDocTypePrefix(prev, docType))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider">
                    Tipe Dokumen Kemasan / Acuan <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { value: DocType.INNER_BOX, label: "Inner Box", desc: "Dus Dalam" },
                      { value: DocType.POUCH, label: "Pouch", desc: "Kantong Kemasan" },
                      { value: DocType.LABEL_BOTOL, label: "Label Botol", desc: "Stiker/Label" },
                      { value: DocType.IFU, label: "IFU", desc: "Brosur Petunjuk" },
                      { value: DocType.QC_PASS, label: "QC Pass", desc: "Sertifikat QC" },
                      { value: DocType.MASTER_CARTON, label: "Master Carton", desc: "Kardus Master" },
                      { value: DocType.LAINNYA, label: "Lainnya", desc: "Dokumen Lain" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setDocType(item.value);
                          setProjName(prev => applyDocTypePrefix(prev, item.value));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition duration-150 cursor-pointer ${
                          docType === item.value
                            ? "border-red-600 bg-red-50/60 text-red-700 font-bold ring-2 ring-red-500/10 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-bold tracking-wider">{item.label}</span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Kode Produk (REF) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    Kode Produk (REF) {(docType === DocType.INNER_BOX || docType === DocType.POUCH) ? <span className="text-rose-500 font-bold">*</span> : <span className="text-slate-400 font-normal text-[9px] lowercase"> (opsional)</span>}
                  </label>
                  <div className="flex gap-2">
                    <div className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono font-bold select-none shrink-0">
                      REF-
                    </div>
                    <input
                      type="text"
                      required={docType === DocType.INNER_BOX || docType === DocType.POUCH}
                      placeholder={(docType === DocType.INNER_BOX || docType === DocType.POUCH) ? "Input manual kode produk, contoh: SYN-10ML atau 1002301" : "Opsional, contoh: SYN-10ML atau 1002301"}
                      value={refSuffix}
                      onChange={(e) => setRefSuffix(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Editable NIE */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    Nomor Izin Edar Kemenkes (NIE / AKD / AKL) {(docType === DocType.INNER_BOX || docType === DocType.POUCH) ? <span className="text-rose-500 font-bold">*</span> : <span className="text-slate-400 font-normal text-[9px] lowercase"> (opsional)</span>}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={niePrefix}
                      onChange={(e) => setNiePrefix(e.target.value)}
                      className="text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                    >
                      <option value="KEMENKES RI AKD">KEMENKES RI AKD</option>
                      <option value="KEMENKES RI AKL">KEMENKES RI AKL</option>
                    </select>
                    <input
                      type="text"
                      required={docType === DocType.INNER_BOX || docType === DocType.POUCH}
                      placeholder={(docType === DocType.INNER_BOX || docType === DocType.POUCH) ? "Input manual angka NIE, contoh: 20902120034" : "Opsional, contoh: 20902120034"}
                      value={nieSuffix}
                      onChange={(e) => setNieSuffix(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Design Preview Mockup Side */}
            <div className="space-y-4">


              {/* Strict 4 Checklists */}
              <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-900">
                  <CheckCircle className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase font-display tracking-wider">
                    Mandatory Technical Checklist (Tim Desain)
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700/90 leading-tight">
                  Sebelum mengajukan proyek ke Tim Produk, Anda wajib memverifikasi secara langsung dan mencentang aspek teknis di bawah:
                </p>
                <div className="space-y-2 text-xs">
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={checkNama}
                      id="chk-nama-produk"
                      onChange={(e) => setCheckNama(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">Nama Produk:</strong> Tata letak benar dan teks jelas (tidak terpotong garis lipatan).
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={checkNie}
                      id="chk-nie"
                      onChange={(e) => setCheckNie(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">NIE{(docType !== DocType.INNER_BOX && docType !== DocType.POUCH) && " (Bila Ada)"}:</strong> Posisi penulisan nomor AKD/AKL di desain sudah sesuai.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={checkKonten}
                      id="chk-konten"
                      onChange={(e) => setCheckKonten(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">Konten:</strong> Gambar tajam dan simbol diletakkan pada posisi jaring box yang tepat.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                    <input
                      type="checkbox"
                      checked={checkRef}
                      id="chk-ref"
                      onChange={(e) => setCheckRef(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <strong className="text-slate-800">REF{(docType !== DocType.INNER_BOX && docType !== DocType.POUCH) && " (Bila Ada)"}:</strong> Format kode produk menggunakan kata "REF".
                    </span>
                  </label>
                </div>
              </div>

              {/* RAPIH STATS COMPONENT (CREATE FLOW) */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">
                    Statistik Berkas Alkes (Global)
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono font-medium">Aktif</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">🔬 Review Produk:</span>
                    <span className="font-mono font-extrabold text-slate-800 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length} Berkas
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">🎨 Revisi Desain:</span>
                    <span className="font-mono font-extrabold text-rose-600 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length} Berkas
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">📦 Siap Rilis:</span>
                    <span className="font-mono font-extrabold text-amber-600 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT).length} Berkas
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100/70 flex flex-col justify-between shadow-xs">
                    <span className="text-slate-500 font-semibold block">🖨️ Selesai Cetak:</span>
                    <span className="font-mono font-extrabold text-emerald-600 text-xs mt-1">
                      {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED).length} Berkas
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-project"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition duration-150 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Kirim Dokumen ke Tim Produk
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: PROJECTS LIST */}
      {(activeTab === "list" && !editingProject) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
              Status Berkas Proyek Milik Anda
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Total: {projects.length} Proyek Terdaftar
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              Belum ada proyek yang terdaftar. Gunakan tab "Buat Proyek Artwork Baru" untuk memulai.
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="border border-slate-100 rounded-2xl p-5 bg-slate-50/20 hover:bg-slate-50/50 transition duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                        {proj.docType} • V{proj.version}
                      </span>
                      <h4 className="font-display font-extrabold text-slate-800 text-sm mt-0.5">
                        {proj.name}
                      </h4>
                    </div>

                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        proj.status === ProjectStatus.FULLY_RELEASED
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : proj.status === ProjectStatus.APPROVED_PRODUCT
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : proj.status === ProjectStatus.NEED_REVISION
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {proj.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 font-display tracking-wider">Kode REF</span>
                      <span className="font-mono text-slate-700 font-bold">{proj.refCode}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 font-display tracking-wider">Nomor NIE</span>
                      <span className="font-mono text-slate-700 font-bold">{proj.nieNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 font-display tracking-wider">Diperbarui Pada</span>
                      <span className="text-slate-600 font-medium">
                        {new Date(proj.updatedAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center md:justify-end gap-2">
                      {currentUser.role === Role.ADMINISTRATOR && (
                        <button
                          onClick={() => handleEditInit(proj)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition duration-150 cursor-pointer shadow-sm"
                        >
                          ⚙️ Edit Proyek (Admin)
                        </button>
                      )}
                      {currentUser.role === Role.ADMINISTRATOR && onDeleteProject && (
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold py-1.5 px-3 rounded-xl transition duration-150 cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus Proyek
                        </button>
                      )}
                      {currentUser.role !== Role.ADMINISTRATOR && proj.status === ProjectStatus.NEED_REVISION && (
                        <button
                          onClick={() => handleEditInit(proj)}
                          id={`btn-fix-desain-${proj.id}`}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl transition duration-150 cursor-pointer shadow-sm"
                        >
                          ⚙️ Perbaiki Desain (Revisi)
                        </button>
                      )}
                      {currentUser.role !== Role.ADMINISTRATOR && proj.status === ProjectStatus.FULLY_RELEASED && (
                        <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                          🔒 Dokumen Terkunci
                        </span>
                      )}
                    </div>
                  </div>

                  {/* If needs revision, show the red comments box directly here too */}
                  {proj.status === ProjectStatus.NEED_REVISION && proj.revisions.length > 0 && (
                    <div className="bg-rose-50/50 border border-rose-100/60 rounded-xl p-3.5 mt-3.5 text-[11px] text-slate-600 space-y-1">
                      <div className="font-bold text-rose-800 flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                        Detail Revisi Diperlukan:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-sans">
                        <div className="bg-white p-2.5 rounded-lg border border-rose-100/40">
                          <strong className="text-rose-900 block text-[9px] uppercase tracking-wider mb-0.5">Komponen Salah:</strong>
                          <span className="font-medium text-slate-700">{proj.revisions[proj.revisions.length - 1].notes.component}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-rose-100/40">
                          <strong className="text-rose-900 block text-[9px] uppercase tracking-wider mb-0.5">Detail Kesalahan:</strong>
                          <span className="font-medium text-slate-700">{proj.revisions[proj.revisions.length - 1].notes.currentError}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-rose-100/40">
                          <strong className="text-rose-900 block text-[9px] uppercase tracking-wider mb-0.5">Data Seharusnya (NIE):</strong>
                          <span className="font-medium text-slate-700">{proj.revisions[proj.revisions.length - 1].notes.correctData}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
