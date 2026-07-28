import { Project } from "../types";
import * as pdfjsLib from "pdfjs-dist";
import { getFileFromIndexedDB } from "./fileStorage";

if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/build/pdf.worker.min.mjs`;
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

export async function convertPdfToImageDataUrl(url: string, pageNumber: number = 1): Promise<string | null> {
  if (!url) return null;

  if (url.startsWith("data:image/") || url.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)) {
    return url;
  }

  try {
    let loadingTask: any;
    if (url.startsWith("data:")) {
      const bytes = dataUrlToUint8Array(url);
      if (bytes.length === 0) return null;
      loadingTask = pdfjsLib.getDocument({ data: bytes });
    } else {
      loadingTask = pdfjsLib.getDocument({ url });
    }

    const pdfDoc = await loadingTask.promise;
    const targetPage = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
    const page = await pdfDoc.getPage(targetPage);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Render page at scale 2.5 for crisp print quality
    const scale = 2.5;
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Gagal mengonversi PDF ke gambar untuk pencetakan:", err);
    return null;
  }
}

export async function printApprovalSheetA4(project: Project, pageNumber: number = 1) {
  let pdfUrl = project.pdfFileUrl;

  if (!pdfUrl) {
    try {
      const cached = await getFileFromIndexedDB(`pdf_${project.id}`);
      if (cached) pdfUrl = cached;
    } catch (e) {
      console.warn("Could not load cached pdf from indexedDB:", e);
    }
  }

  let displayImageUrl: string | null = null;
  if (pdfUrl) {
    displayImageUrl = await convertPdfToImageDataUrl(pdfUrl, pageNumber);
  }

  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    window.print();
    return;
  }

  const createdDateStr = new Date(project.createdAt).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const productDateStr = project.productApprovedAt 
    ? new Date(project.productApprovedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "-";

  const purchasingDateStr = project.purchasingApprovedAt
    ? new Date(project.purchasingApprovedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "-";

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Lembar Pengesahan Cetak A4 - ${project.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 12px;
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.4;
    }

    .a4-container {
      width: 100%;
      max-width: 195mm;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
      position: relative;
    }

    .header {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }

    .header h1 {
      font-size: 16px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
      color: #0f172a;
    }

    .header p {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin: 4px 0 0 0;
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      background-color: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 700;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      margin-bottom: 12px;
    }

    .meta-label {
      font-size: 8px;
      text-transform: uppercase;
      font-weight: 700;
      color: #94a3b8;
      display: block;
    }

    .meta-value {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .plate-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      padding: 10px;
      margin-bottom: 12px;
    }

    .plate-title {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }

    .plate-inner {
      background: #f8fafc;
      border: 2px double #cbd5e1;
      border-radius: 4px;
      padding: 10px;
      min-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .img-preview {
      max-height: 220px;
      max-width: 100%;
      object-fit: contain;
      margin: 6px auto;
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    .text-summary {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 8px;
      border-radius: 4px;
      font-size: 9px;
      color: #334155;
      white-space: pre-wrap;
      margin-top: 6px;
    }

    .matrix-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .matrix-header {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 12px;
      letter-spacing: 0.05em;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
    }

    .col-cell {
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
      border-right: 1px solid #e2e8f0;
    }

    .col-cell:last-child {
      border-right: none;
    }

    .stamp-container {
      margin: 8px 0;
      display: flex;
      justify-content: center;
    }

    .stamp-blue {
      border: 2px dashed #2563eb;
      background-color: #eff6ff;
      color: #1d4ed8;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: center;
      transform: rotate(-2deg);
      max-width: 150px;
    }

    .stamp-amber {
      border: 2px dashed #d97706;
      background-color: #fffbeb;
      color: #b45309;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: center;
      transform: rotate(1deg);
      max-width: 150px;
    }

    .stamp-emerald {
      border: 2px dashed #059669;
      background-color: #ecfdf5;
      color: #047857;
      border-radius: 6px;
      padding: 6px 10px;
      text-align: center;
      transform: rotate(-1deg);
      max-width: 150px;
    }

    .stamp-title {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stamp-sub {
      font-size: 7px;
      margin-top: 1px;
    }

    .stamp-pic {
      font-size: 8px;
      font-weight: 700;
      margin-top: 3px;
      padding: 1px 4px;
      border-radius: 3px;
      display: inline-block;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }

    @media print {
      body {
        padding: 0;
      }
      .a4-container {
        border: none;
        padding: 0;
      }
      .no-print-btn {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <div style="text-align: right; margin-bottom: 8px;" class="no-print-btn">
    <button onclick="window.print()" style="background:#0f172a; color:#fff; font-weight:bold; padding:8px 16px; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
      🖨️ Cetak / Simpan PDF (A4)
    </button>
  </div>

  <div class="a4-container">
    <div class="header">
      <h1>ARTWORK APPROVAL SYSTEM SANSICO MEDICA</h1>
      <p>Dokumen Pengesahan Akhir Desain Cetak Medis (Locked Copy)</p>
      <div class="status-badge">
        ✓ STATUS: FULLY RELEASED FOR PRINTING — DIKUNCI PERMANEN
      </div>
    </div>

    <div class="grid-4">
      <div>
        <span class="meta-label">Nama Proyek:</span>
        <span class="meta-value">${project.name}</span>
      </div>
      <div>
        <span class="meta-label">Tipe Dokumen:</span>
        <span class="meta-value">${project.docType}</span>
      </div>
      <div>
        <span class="meta-label">Versi Terakhir:</span>
        <span class="meta-value mono">V${project.version}</span>
      </div>
      <div>
        <span class="meta-label">Nomor NIE Terverifikasi:</span>
        <span class="meta-value mono" style="color:#047857;">${project.nieNumber || "Terverifikasi"}</span>
      </div>
    </div>

    <div class="plate-box">
      <div class="plate-title">◄── Scale 1:1 Print Ready Plate — Dokumen Visual Cetak ──►</div>
      <div class="plate-inner">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
          <div>
            <span style="font-size:8px; color:#94a3b8; font-weight:700; text-transform:uppercase;">Berkas Layout Desain</span>
            <div style="font-size:13px; font-weight:800; color:#0f172a;">${project.name}</div>
          </div>
          <span class="mono" style="background:#e2e8f0; font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px;">
            ${project.refCode || "-"}
          </span>
        </div>

        ${displayImageUrl ? `
          <img src="${displayImageUrl}" class="img-preview" alt="Artwork Preview" />
        ` : `
          <div class="text-summary">
            <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">TEKS KONTEN & SPESIFIKASI CETAK:</div>
            <div><strong>Nomor NIE:</strong> ${project.nieNumber || "-"}</div>
            <div><strong>Nama File PDF:</strong> ${project.pdfFileName || "Artwork_Document.pdf"}</div>
            ${project.artworkText ? `<div style="margin-top:6px;">${project.artworkText}</div>` : ""}
          </div>
        `}

        <div style="display:flex; justify-content:space-between; font-size:8px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:4px; margin-top:6px;" class="mono">
          <span>SANSICO S-M</span>
          <span>MEDICALLY COMPLIANT PLATE</span>
          <span>PLATE V${project.version}</span>
        </div>
      </div>
    </div>

    <div class="matrix-box">
      <div class="matrix-header">
        Matriks Autentikasi Persetujuan 3 Divisi (Terkunci)
      </div>
      <div class="matrix-grid">
        <!-- Kolom 1: Desain -->
        <div class="col-cell">
          <div>
            <span class="meta-label">KOLOM 1: DESAIN</span>
            <span style="font-weight:700; color:#1e293b;">Verified Technical Layout</span>
          </div>

          <div class="stamp-container">
            <div class="stamp-blue">
              <div class="stamp-title">✓ VERIFIED TECH</div>
              <div class="stamp-sub">SANSICO MEDICA</div>
              <div class="stamp-pic" style="background:#dbeafe; color:#1e40af;">${project.createdBy}</div>
              <div style="font-size:7px; color:#3b82f6; margin-top:2px;" class="mono">${createdDateStr}</div>
            </div>
          </div>

          <div style="border-top:1px solid #f1f5f9; padding-top:4px; font-size:10px; color:#475569;">
            <div>PIC: <strong>${project.createdBy}</strong></div>
            <div style="color:#94a3b8; font-size:9px;">Tgl ACC: ${createdDateStr}</div>
            <div class="mono" style="color:#1d4ed8; font-size:8px;">SIG: ${project.id.substring(0, 10).toUpperCase()}</div>
          </div>
        </div>

        <!-- Kolom 2: Produk -->
        <div class="col-cell">
          <div>
            <span class="meta-label">KOLOM 2: PRODUK</span>
            <span style="font-weight:700; color:#1e293b;">Verified Content & NIE</span>
          </div>

          <div class="stamp-container">
            ${project.productStamp ? `
              <div class="stamp-amber">
                <div class="stamp-title">★ APPROVED CONTENT</div>
                <div class="stamp-sub">MASTER NIE KEMENKES</div>
                <div class="stamp-pic" style="background:#fef3c7; color:#92400e;">${project.productStamp.stampedBy}</div>
                <div style="font-size:7px; color:#d97706; margin-top:2px;" class="mono">${project.productStamp.hash}</div>
              </div>
            ` : `
              <div style="color:#cbd5e1; font-style:italic; padding:12px 0;">Stamp Belum Diterbitkan</div>
            `}
          </div>

          <div style="border-top:1px solid #f1f5f9; padding-top:4px; font-size:10px; color:#475569;">
            <div>PIC: <strong>${project.productPic || "-"}</strong></div>
            <div style="color:#94a3b8; font-size:9px;">Tgl ACC: ${productDateStr}</div>
            <div class="mono" style="color:#b45309; font-size:8px;">SIG: ${project.productStamp?.hash || "-"}</div>
          </div>
        </div>

        <!-- Kolom 3: Purchasing -->
        <div class="col-cell">
          <div>
            <span class="meta-label">KOLOM 3: PURCHASING</span>
            <span style="font-weight:700; color:#1e293b;">Released to Vendor</span>
          </div>

          <div class="stamp-container">
            ${project.purchasingStamp ? `
              <div class="stamp-emerald">
                <div class="stamp-title">✦ FULLY RELEASED ✦</div>
                <div class="stamp-sub">SANSICO MEDICA</div>
                <div class="stamp-pic" style="background:#d1fae5; color:#065f46;">${project.purchasingStamp.stampedBy}</div>
                <div style="font-size:7px; color:#059669; margin-top:2px;" class="mono">${project.purchasingStamp.hash}</div>
              </div>
            ` : `
              <div style="color:#cbd5e1; font-style:italic; padding:12px 0;">Stamp Belum Diterbitkan</div>
            `}
          </div>

          <div style="border-top:1px solid #f1f5f9; padding-top:4px; font-size:10px; color:#475569;">
            <div>PIC: <strong>${project.purchasingPic || "-"}</strong></div>
            <div style="color:#94a3b8; font-size:9px;">Tgl ACC: ${purchasingDateStr}</div>
            <div class="mono" style="color:#047857; font-size:8px;">SIG: ${project.purchasingStamp?.hash || "-"}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>SANSICO-MEDICA-PRINT-READY-PLATE</span>
      <span>ID: ${project.id}</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
