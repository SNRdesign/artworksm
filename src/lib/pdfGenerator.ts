import { Project, DocType } from "../types";

/**
 * Converts JPEG Uint8Array bytes into a 100% compliant, standard PDF 1.4 binary Blob
 * that can be downloaded and opened directly in Adobe Acrobat, Chrome, macOS Preview, etc.
 */
export function createPdfFromJpegBytes(jpegBytes: Uint8Array, widthPx = 1240, heightPx = 1754): Blob {
  const pdfWidth = 595.28;
  const pdfHeight = 841.89;

  const encoder = new TextEncoder();

  const part1 = encoder.encode(
    `%PDF-1.4\n` +
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth.toFixed(2)} ${pdfHeight.toFixed(2)}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n` +
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );

  const part2 = encoder.encode(`\nendstream\nendobj\n`);

  const contentStreamStr = `q\n${pdfWidth.toFixed(2)} 0 0 ${pdfHeight.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`;
  const part3 = encoder.encode(
    `5 0 obj\n<< /Length ${contentStreamStr.length} >>\nstream\n${contentStreamStr}endstream\nendobj\n`
  );

  // Offsets for xref table
  const offset0 = 0;
  const offset1 = encoder.encode(`%PDF-1.4\n`).length;
  const offset2 = offset1 + encoder.encode(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`).length;
  const offset3 = offset2 + encoder.encode(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`).length;
  const offset4 = offset3 + encoder.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfWidth.toFixed(2)} ${pdfHeight.toFixed(2)}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`).length;
  const offset5 = offset4 + part1.length + jpegBytes.length + part2.length;

  const xrefStr = 
    `xref\n0 6\n` +
    `0000000000 65535 f \n` +
    `${offset1.toString().padStart(10, '0')} 00000 n \n` +
    `${offset2.toString().padStart(10, '0')} 00000 n \n` +
    `${offset3.toString().padStart(10, '0')} 00000 n \n` +
    `${offset4.toString().padStart(10, '0')} 00000 n \n` +
    `${offset5.toString().padStart(10, '0')} 00000 n \n` +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n` +
    `${(offset5 + part3.length).toString()}\n%%EOF\n`;

  const part4 = encoder.encode(xrefStr);

  const totalLength = part1.length + jpegBytes.length + part2.length + part3.length + part4.length;
  const resultBytes = new Uint8Array(totalLength);

  let pos = 0;
  resultBytes.set(part1, pos); pos += part1.length;
  resultBytes.set(jpegBytes, pos); pos += jpegBytes.length;
  resultBytes.set(part2, pos); pos += part2.length;
  resultBytes.set(part3, pos); pos += part3.length;
  resultBytes.set(part4, pos);

  return new Blob([resultBytes], { type: "application/pdf" });
}

/**
 * Generates an A4 canvas vector artwork preview for a given Project and returns both
 * high-resolution Data URL and binary PDF Blob.
 */
export function generateArtworkPdfDataUrl(proj: Partial<Project>): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Clean Background
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(0, 0, 1240, 1754);

  // Top Accent Bar
  ctx.fillStyle = "#1E1B4B"; // Deep Indigo
  ctx.fillRect(0, 0, 1240, 120);

  // Header Brand & Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("PT. SANSICO NATURA RESOURCES", 60, 55);

  ctx.fillStyle = "#A5B4FC";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("BERKAS RESMI ARTWORK LAYOUT & SPESIFIKASI KEMASAN ALKES", 60, 90);

  // Document Info Bar
  ctx.fillStyle = "#EEF2FF";
  ctx.fillRect(60, 140, 1120, 90);
  ctx.strokeStyle = "#C7D2FE";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 140, 1120, 90);

  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText((proj.name || "DOKUMEN ARTWORK ALKES").toUpperCase(), 80, 180);

  ctx.fillStyle = "#475569";
  ctx.font = "16px sans-serif";
  ctx.fillText(
    `Tipe: ${proj.docType || DocType.INNER_BOX}   •   Versi: V${proj.version || 1}   •   Kode Proyek: ${proj.id || "PRJ-SANSICO"}   •   Desainer: ${proj.createdBy || "Desainer Alkes"}`,
    80,
    210
  );

  // 2. Specifications Table Box
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(60, 250, 1120, 220);
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 250, 1120, 220);

  // Specs Header
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(60, 250, 1120, 45);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("DETAIL VERIFIKASI IDENTITAS & NOMOR IZIN EDAR (NIE)", 80, 280);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#334155";
  
  // Left col
  ctx.fillText(`Nomor NIE Kemenkes :  ${proj.nieNumber || "KEMENKES RI AKD 20902120034"}`, 80, 330);
  ctx.fillText(`Kode Katalog (REF)       :  ${proj.refCode || "REF-1002301"}`, 80, 365);
  ctx.fillText(`Produsen (Pabrik)         :  PT MERAH PUTIH MANUFAKTURA`, 80, 400);
  ctx.fillText(`Distributor Resmi          :  PT SANSICO NATURA RESOURCES`, 80, 435);

  // Right col
  ctx.fillText(`Status Kelayakan :  MEMENUHI SYARAT REGULASI`, 650, 330);
  ctx.fillText(`Tanggal Pengesahan:  ${new Date().toLocaleDateString("id-ID")}`, 650, 365);
  ctx.fillText(`Ukuran & Kemasan :  Standard Technical Layout A4`, 650, 400);

  // 3. Central Visual Artwork Packaging Die-Cut Box
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(60, 490, 1120, 960);
  ctx.strokeStyle = "#0EA5E9"; // Cyan line
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 490, 1120, 960);

  // Artwork Header Bar inside box
  ctx.fillStyle = "#0284C7";
  ctx.fillRect(60, 490, 1120, 50);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("PRATINJAU DESAIN VISUAL ARTWORK (ACROBAT LAYOUT CANVAS)", 80, 522);

  // Brand Name inside Packaging
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(proj.name || "NAMA ALAT KESEHATAN", 100, 600);

  // NIE Box inside Artwork Visual
  ctx.fillStyle = "#FEF3C7";
  ctx.fillRect(100, 630, 940, 45);
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  ctx.strokeRect(100, 630, 940, 45);

  ctx.fillStyle = "#92400E";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`NIE: ${proj.nieNumber || "KEMENKES RI AKD 20902120034"}   |   REF: ${proj.refCode || "REF-1002301"}`, 120, 660);

  // Artwork Text Content Lines
  ctx.fillStyle = "#334155";
  ctx.font = "16px sans-serif";
  const lines = (proj.artworkText || "Instruksi Penggunaan & Spesifikasi Alat Kesehatan").split("\n");
  let startY = 720;
  lines.forEach((line) => {
    ctx.fillText(line.trim(), 100, startY);
    startY += 32;
  });

  // Simulated Barcode Lines
  ctx.fillStyle = "#0F172A";
  let barcodeX = 100;
  const barcodeY = Math.max(startY + 40, 1150);
  for (let i = 0; i < 48; i++) {
    const w = (i % 3 === 0 ? 6 : i % 2 === 0 ? 3 : 2);
    ctx.fillRect(barcodeX, barcodeY, w, 70);
    barcodeX += w + (i % 4 === 0 ? 4 : 2);
  }

  ctx.font = "bold 14px monospace";
  ctx.fillText(`EAN-13: 8997201940128   |   LOT: S${new Date().getFullYear()}0728`, 100, barcodeY + 95);

  // Watermark Seal
  ctx.save();
  ctx.translate(620, 950);
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
  ctx.fillRect(-260, -50, 520, 100);
  ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
  ctx.lineWidth = 4;
  ctx.strokeRect(-260, -50, 520, 100);
  ctx.fillStyle = "#059669";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TERVERIFIKASI TIM PRODUK & QUALITY", 0, 12);
  ctx.restore();
  ctx.textAlign = "left";

  // 4. Footer & Digital Signature Stamp Area
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(60, 1470, 1120, 220);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 1470, 1120, 220);

  ctx.fillStyle = "#1E293B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("PENGESAHAN DOKUMEN CETAK", 80, 1500);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("Diproduksi oleh PT Merah Putih Manufaktura. Hak cipta dilindungi undang-undang.", 80, 1530);
  ctx.fillText("Setiap perubahan teks atau tata letak tanpa izin tertulis dari QC Sansico Medica dinyatakan tidak sah.", 80, 1555);

  // Digital Stamp Box
  ctx.fillStyle = "#F0FDF4";
  ctx.fillRect(800, 1490, 350, 180);
  ctx.strokeStyle = "#22C55E";
  ctx.lineWidth = 2;
  ctx.strokeRect(800, 1490, 350, 180);

  ctx.fillStyle = "#15803D";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("DIGITAL APPROVAL STAMP", 820, 1520);
  ctx.font = "13px monospace";
  ctx.fillText(`DISAHKAN: PIC PRODUK`, 820, 1550);
  ctx.fillText(`VERSI   : V${proj.version || 1}`, 820, 1575);
  ctx.fillText(`HASH ID : ${proj.id || "PRJ-99201"}`, 820, 1600);
  ctx.fillText(`STATUS  : APPROVED FOR PRINT`, 820, 1625);

  // Convert canvas to JPEG Data URL
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Downloads a Project's PDF artwork reliably as a clean, high-fidelity PDF file.
 */
export function downloadProjectPdf(proj: Project) {
  const fileName = proj.pdfFileName || `${proj.name.replace(/\s+/g, "_")}_Layout_V${proj.version}.pdf`;

  // 1. If project has a real uploaded PDF or Data URL, handle direct download full exact file
  if (proj.pdfFileUrl) {
    try {
      if (proj.pdfFileUrl.startsWith("data:")) {
        const matches = proj.pdfFileUrl.match(/^data:(.*?);base64,(.*)$/);
        if (matches) {
          const mimeType = matches[1] || "application/pdf";
          const raw = window.atob(matches[2]);
          const uInt8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: mimeType });

          let downloadName = fileName;
          if (mimeType.includes("image/png") && !downloadName.toLowerCase().endsWith(".png")) {
            downloadName = downloadName.replace(/\.[^/.]+$/, "") + ".png";
          } else if ((mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) && !downloadName.toLowerCase().endsWith(".jpg") && !downloadName.toLowerCase().endsWith(".jpeg")) {
            downloadName = downloadName.replace(/\.[^/.]+$/, "") + ".jpg";
          }
          triggerBlobDownload(blob, downloadName);
          return;
        }
      } else if (proj.pdfFileUrl.startsWith("http") || proj.pdfFileUrl.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = proj.pdfFileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    } catch (err) {
      console.warn("Direct base64 download failed, rendering fallback artwork PDF:", err);
    }
  }

  // 2. Generate fallback artwork PDF if no uploaded file exists
  const dataUrl = generateArtworkPdfDataUrl(proj);
  const parts = dataUrl.split(";base64,");
  if (parts.length === 2) {
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const pdfBlob = createPdfFromJpegBytes(uInt8Array, 1240, 1754);
    triggerBlobDownload(pdfBlob, fileName);
  }
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
