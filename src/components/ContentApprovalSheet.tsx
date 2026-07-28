/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Project } from "../types";
import { ShieldCheck, Printer, Stamp, FileCheck, CheckCircle2, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { dataUrlToBlobUrl } from "../lib/fileStorage";
import { PdfViewer } from "./PdfViewer";
import { printApprovalSheetA4 } from "../lib/printUtils";

interface ContentApprovalSheetProps {
  project: Project;
  onPrint?: (pageNumber?: number) => void;
  onPageChange?: (pageNumber: number) => void;
}

export default function ContentApprovalSheet({ project, onPrint, onPageChange }: ContentApprovalSheetProps) {
  const [selectedPage, setSelectedPage] = React.useState<number>(1);

  const handlePageChange = (page: number) => {
    setSelectedPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const handlePrint = () => {
    printApprovalSheetA4(project, selectedPage);
    if (onPrint) {
      onPrint(selectedPage);
    }
  };

  // Determine if pdfFileUrl is an image or PDF
  const isImageFile = project.pdfFileUrl && (
    project.pdfFileUrl.startsWith("data:image/") ||
    project.pdfFileUrl.match(/\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i)
  );

  const isPdfFile = project.pdfFileUrl && (
    project.pdfFileUrl.startsWith("data:application/pdf") ||
    project.pdfFileUrl.toLowerCase().includes("application/pdf") ||
    (project.pdfFileName && project.pdfFileName.toLowerCase().endsWith(".pdf"))
  );

  const pdfBlobUrl = useMemo(() => {
    if (project.pdfFileUrl && isPdfFile) {
      return dataUrlToBlobUrl(project.pdfFileUrl);
    }
    return project.pdfFileUrl || "";
  }, [project.pdfFileUrl, isPdfFile]);

  return (
    <div
      className="bg-stone-50 border border-stone-300 rounded-xl shadow-2xl p-6 sm:p-8 max-w-4xl mx-auto space-y-6 font-sans relative overflow-hidden"
      id="approval-sheet-printable"
    >
      {/* Print Crop Marks Mock (Corner Graphics for Mood) */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-400 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-400 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-400 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-400 pointer-events-none"></div>

      {/* CMYK Color Plates Simulation */}
      <div className="absolute top-3 right-10 flex gap-1 pointer-events-none opacity-60">
        <span className="w-3.5 h-3.5 rounded-full bg-cyan-400" title="Cyan"></span>
        <span className="w-3.5 h-3.5 rounded-full bg-magenta-500" title="Magenta"></span>
        <span className="w-3.5 h-3.5 rounded-full bg-yellow-300" title="Yellow"></span>
        <span className="w-3.5 h-3.5 rounded-full bg-black" title="Black"></span>
      </div>

      {/* Header */}
      <div className="border-b-4 border-double border-slate-900 pb-4 text-center relative">
        <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
          ARTWORK APPROVAL SYSTEM SANSICO MEDICA
        </h1>
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mt-1">
          Dokumen Pengesahan Akhir Desain Cetak Medis (Locked Copy)
        </p>
        <div className="mt-2 text-[10px] text-emerald-700 font-mono bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-200">
          ✓ STATUS: FULLY RELEASED FOR PRINTING — DIKUNCI PERMANEN
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-slate-200 text-xs shadow-sm">
        <div>
          <span className="text-slate-400 font-bold uppercase text-[9px] block">Nama Proyek:</span>
          <span className="font-bold text-slate-800 text-sm">{project.name}</span>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[9px] block">Tipe Dokumen:</span>
          <span className="font-bold text-slate-800 text-sm">{project.docType}</span>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[9px] block">Versi Terakhir:</span>
          <span className="font-mono font-bold text-slate-800 text-sm">V{project.version}</span>
        </div>
        <div>
          <span className="text-slate-400 font-bold uppercase text-[9px] block">Nomor NIE Terverifikasi:</span>
          <span className="font-mono font-bold text-emerald-800 text-sm">{project.nieNumber}</span>
        </div>
      </div>

      {/* Plate Review Section (Visual & Image Document Preview - FULL WIDTH) */}
      <div className="border border-slate-300 rounded-lg bg-white p-4 relative shadow-inner">
        <div className="absolute top-2 left-2 bg-slate-900 text-white text-[9px] font-mono px-2 py-0.5 rounded tracking-widest uppercase flex items-center gap-1">
          <ImageIcon className="w-3 h-3 text-emerald-400" />
          Plate Review & Image Preview
        </div>
        
        {/* Dimensions/Ruler indicator lines */}
        <div className="border-b border-dashed border-slate-300 text-center text-[9px] text-slate-400 py-1 mb-4 mt-2">
          ◄── Scale 1:1 Print Ready Plate — Displaying Prepared Document Image (DocType: {project.docType}) ──►
        </div>

        {/* Main design plate layout & uploaded artwork image preview - Full Width */}
        <div className="w-full bg-slate-50 border-2 border-double border-slate-300 p-4 sm:p-5 rounded relative min-h-[220px] flex flex-col justify-between overflow-hidden">
          {/* Bleed line indicators */}
          <div className="absolute inset-1.5 border border-dashed border-rose-300/40 pointer-events-none"></div>
          
          {/* Fold line simulation */}
          <div className="absolute top-0 bottom-0 left-1/3 border-r border-dashed border-slate-300/70 pointer-events-none"></div>
          <div className="absolute top-0 bottom-0 left-2/3 border-r border-dashed border-slate-300/70 pointer-events-none"></div>

          <div className="flex justify-between items-start z-10 mb-2">
            <div>
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold block">Tampilan Gambar Dokumen Cetak</span>
              <div className="font-black text-slate-900 tracking-wide text-sm sm:text-base">
                {project.name}
              </div>
            </div>
            <span className="font-mono text-[9px] bg-slate-200 border border-slate-300 font-bold px-1.5 py-0.5 rounded">
              {project.refCode}
            </span>
          </div>

          {/* Render actual uploaded image/PDF if available */}
          {project.pdfFileUrl ? (
            <div className="my-2 z-10 w-full">
              <PdfViewer
                url={project.pdfFileUrl}
                fileName={project.pdfFileName || project.name}
                maxHeight="380px"
                onPageChange={handlePageChange}
                currentPage={selectedPage}
              />
            </div>
          ) : (
            /* High quality visual document mockup canvas representation */
            <div className="my-2 z-10 bg-white border border-slate-200/80 rounded-lg p-4 shadow-xs font-mono text-[10px] space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>DOKUMEN DESAIN CETAK RESMI ({project.docType.toUpperCase()})</span>
                </div>
                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  SIAP CETAK
                </span>
              </div>
              <div>NIE: <span className="font-bold underline text-slate-900">{project.nieNumber}</span></div>
              <div className="text-[10px] text-slate-700 whitespace-pre-wrap leading-relaxed font-sans border-t border-slate-100 pt-2 bg-slate-50/60 p-3 rounded border border-slate-100">
                {project.artworkText}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-[8px] text-slate-400 pt-1.5 border-t border-slate-200/60 z-10">
            <span>SANSICO S-M</span>
            <span>MEDICALLY COMPLIANT PLATE</span>
            <span>PLATE V{project.version}</span>
          </div>
        </div>
      </div>


      {/* SIGNATURE MATRIX TABLE (Tiga Divisi berlapis) */}
      <div className="border border-slate-300 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-1.5">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          Matriks Autentikasi Persetujuan 3 Divisi (Terkunci)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* 1. DESAIN DIVISION */}
          <div className="p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">KOLOM 1: DESAIN</span>
              <span className="text-xs font-bold text-slate-800">Verified Technical Layout</span>
            </div>

            {/* Rubber Stamp Design */}
            <div className="my-3 flex justify-center">
              <div className="border-2 border-dashed border-blue-500 rounded-lg p-2.5 max-w-[170px] text-center transform -rotate-2 bg-blue-50/20">
                <div className="text-[10px] font-black text-blue-600 tracking-widest uppercase">
                  ✓ VERIFIED TECH
                </div>
                <div className="text-[8px] text-blue-500 font-mono my-0.5">
                  SANSICO MEDICA
                </div>
                <div className="font-mono text-[8px] font-bold text-blue-700 uppercase bg-blue-100 px-1 py-0.2 rounded mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {project.createdBy}
                </div>
                <div className="text-[7px] text-blue-400 font-mono mt-0.5">
                  {new Date(project.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-sans space-y-0.5">
              <div>PIC: <strong>{project.createdBy}</strong></div>
              <div className="text-slate-400 text-[10px]">Tgl ACC: {new Date(project.createdAt).toLocaleDateString("id-ID")}</div>
              <div className="text-[9px] font-mono text-blue-700 truncate">SIG: {project.id.substring(0,10).toUpperCase()}</div>
            </div>
          </div>

          {/* 2. PRODUK DIVISION */}
          <div className="p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">KOLOM 2: PRODUK</span>
              <span className="text-xs font-bold text-slate-800">Verified Content & NIE</span>
            </div>

            {/* Rubber Stamp Product */}
            <div className="my-3 flex justify-center">
              {project.productStamp ? (
                <div className="border-2 border-dashed border-amber-600 rounded-lg p-2.5 max-w-[170px] text-center transform rotate-1 bg-amber-50/20">
                  <div className="text-[10px] font-black text-amber-600 tracking-widest uppercase">
                    ★ APPROVED CONTENT
                  </div>
                  <div className="text-[8px] text-amber-500 font-mono my-0.5">
                    MASTER NIE KEMENKES
                  </div>
                  <div className="font-mono text-[8px] font-bold text-amber-700 uppercase bg-amber-100 px-1 py-0.2 rounded mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {project.productStamp.stampedBy}
                  </div>
                  <div className="text-[7px] text-amber-500 font-mono mt-0.5">
                    {project.productStamp.hash}
                  </div>
                </div>
              ) : (
                <div className="text-slate-300 text-xs italic py-6">Stamp Belum Diterbitkan</div>
              )}
            </div>

            <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-sans space-y-0.5">
              <div>PIC: <strong>{project.productPic || "-"}</strong></div>
              <div className="text-slate-400 text-[10px]">Tgl ACC: {project.productApprovedAt ? new Date(project.productApprovedAt).toLocaleDateString("id-ID") : "-"}</div>
              <div className="text-[9px] font-mono text-amber-700 truncate">SIG: {project.productStamp?.hash || "-"}</div>
            </div>
          </div>

          {/* 3. PURCHASING DIVISION */}
          <div className="p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">KOLOM 3: PURCHASING</span>
              <span className="text-xs font-bold text-slate-800">Released to Vendor</span>
            </div>

            {/* Rubber Stamp Purchasing */}
            <div className="my-3 flex justify-center">
              {project.purchasingStamp ? (
                <div className="border-2 border-dashed border-emerald-600 rounded-lg p-2.5 max-w-[170px] text-center transform -rotate-1 bg-emerald-50/20">
                  <div className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">
                    ✦ FULLY RELEASED ✦
                  </div>
                  <div className="text-[8px] text-emerald-500 font-mono my-0.5">
                    SANSICO MEDICA
                  </div>
                  <div className="font-mono text-[8px] font-bold text-emerald-700 uppercase bg-emerald-100 px-1 py-0.2 rounded mt-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {project.purchasingStamp.stampedBy}
                  </div>
                  <div className="text-[7px] text-emerald-500 font-mono mt-0.5">
                    {project.purchasingStamp.hash}
                  </div>
                </div>
              ) : (
                <div className="text-slate-300 text-xs italic py-6">Stamp Belum Diterbitkan</div>
              )}
            </div>

            <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-sans space-y-0.5">
              <div>PIC: <strong>{project.purchasingPic || "-"}</strong></div>
              <div className="text-slate-400 text-[10px]">Tgl ACC: {project.purchasingApprovedAt ? new Date(project.purchasingApprovedAt).toLocaleDateString("id-ID") : "-"}</div>
              <div className="text-[9px] font-mono text-emerald-700 truncate">SIG: {project.purchasingStamp?.hash || "-"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Print disclaimer */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-4 border-t border-slate-200">
        <span>SANSICO-MEDICA-PRINT-READY-PLATE</span>
        <span>ID: {project.id}</span>
      </div>
    </div>
  );
}
