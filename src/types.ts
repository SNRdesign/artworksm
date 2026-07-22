/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Role {
  ADMINISTRATOR = "Administrator",
  DESAIN = "Tim Desain",
  PRODUK = "Tim Produk",
  PURCHASING = "Tim Purchasing",
}

export enum DocType {
  INNER_BOX = "Inner Box",
  POUCH = "Pouch",
  LABEL_BOTOL = "Label Botol",
  IFU = "IFU",
  QC_PASS = "QC Pass Certif",
  MASTER_CARTON = "Master Carton",
  LAINNYA = "Lainnya",
}

export enum ProjectStatus {
  DRAFT = "Draft",
  PENDING_PRODUCT = "Pending Review by Product",
  NEED_REVISION = "Need Revision",
  APPROVED_PRODUCT = "Approved by Product",
  HOLD_PURCHASING = "On Hold / Pending by Purchasing",
  FULLY_RELEASED = "Fully Released for Printing",
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  password?: string;
  invitationStatus?: "PENDING" | "PENDING_APPROVAL" | "ACTIVE" | "REVOKED";
  invitedAt?: string;
  invitedBy?: string;
  createdAt: string;
}

export interface RevisionNotes {
  component: string;      // Komponen yang salah
  currentError: string;   // Keterangan kesalahan desain saat ini
  correctData: string;    // Data yang seharusnya sesuai NIE
}

export interface DigitalStamp {
  stampedBy: string;
  stampedRole: Role;
  stampedAt: string;
  version: string;
  hash: string; // digital signature simulation
}

export interface Project {
  id: string;
  name: string;
  docType: DocType;
  version: number; // e.g. 1, 2, 3...
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string; // Desainer name
  
  // Design Phase Info
  designChecklist: {
    namaProduk: boolean;
    nie: boolean;
    konten: boolean;
    ref: boolean;
  };
  artworkText: string; // Text content in the artwork design
  artworkImagePlaceholder: string; // Custom image generator prompt/url or style
  refCode: string;
  nieNumber: string; // e.g. Kemenkes RI AKD 12345
  pdfFileName?: string; // Uploaded PDF filename
  pdfFileSize?: string; // Uploaded PDF size
  pdfUploadedAt?: string; // Uploaded PDF timestamp
  pdfFileUrl?: string; // Base64 or Object URL of uploaded artwork (for real preview)

  // NIE official document fields uploaded by Product Team
  nieFileName?: string;
  nieFileSize?: string;
  nieFileUrl?: string;
  
  // Product Phase Info
  productPic?: string;
  productChecklist: Record<string, boolean>; // Dynamic based on DocType
  productApprovedAt?: string;
  productStamp?: DigitalStamp;
  
  // Revision History
  revisions: {
    version: number;
    notes: RevisionNotes;
    rejectedBy: string;
    rejectedAt: string;
    artworkTextBefore: string;
  }[];

  // Purchasing Phase Info
  purchasingPic?: string;
  purchasingChecklist: {
    validasiNie: boolean;
  };
  purchasingApprovedAt?: string;
  purchasingStamp?: DigitalStamp;
  
  // Hold Info
  holdUntil?: string; // ISO string for the countdown estimation
  holdReason?: string;
  holdAlarmSet?: boolean;
  
  // Log stamps
  designStamp?: DigitalStamp;

  // Track hours for alerts
  lastStatusChangedAt: string; // simulated ISO string
}

export interface NotificationLog {
  id: string;
  timestamp: string; // Simulated time
  type: "INFO" | "WARNING" | "SYSTEM";
  message: string;
  projectId?: string;
  projectName?: string;
}
