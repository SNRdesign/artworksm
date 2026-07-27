/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Role,
  DocType,
  ProjectStatus,
  UserAccount,
  Project,
  NotificationLog,
  DigitalStamp,
  RevisionNotes
} from "./types";
import {
  isWorkingHour,
  addWorkingHours,
  getWorkingMinutesBetween,
  checkTimeBasedEvents,
  generateDigitalSignature,
  formatIndonesianDate
} from "./utils";

import AdminPanel from "./components/AdminPanel";
import DesignPanel from "./components/DesignPanel";
import ProductPanel from "./components/ProductPanel";
import PurchasingPanel from "./components/PurchasingPanel";
import ContentApprovalSheet from "./components/ContentApprovalSheet";
import LoginPage from "./components/LoginPage";

import {
  subscribeUsers,
  subscribeProjects,
  subscribeNotifications,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  saveNotificationToFirestore,
  clearNotificationsInFirestore,
  seedInitialFirestoreData,
} from "./lib/firebase";

import {
  Shield,
  FileSpreadsheet,
  AlertOctagon,
  Users,
  CheckSquare,
  Lock,
  Layers,
  HelpCircle,
  Clock,
  Printer,
  ChevronDown,
  UserCheck,
  FileCheck,
  FileSearch,
  AlertCircle,
  Trash2,
  LogOut,
  Palette,
  FileCheck2,
  UserCog,
  ShoppingBag
} from "lucide-react";

// Initial Demo Accounts
const DEFAULT_USERS: UserAccount[] = [
  {
    id: "user-admin",
    username: "admin.iksan",
    email: "admin.iksan@sansico.co.id",
    fullName: "Iksan Cahyadi (Admin)",
    role: Role.ADMINISTRATOR,
    isActive: true,
    password: "sansico123",
    invitationStatus: "ACTIVE",
    createdAt: "2026-07-20T03:00:00.000Z",
  },
  {
    id: "user-desain",
    username: "desain.ari",
    email: "desain.ari@sansico.co.id",
    fullName: "Ari Desainer Alkes",
    role: Role.DESAIN,
    isActive: true,
    password: "sansico123",
    invitationStatus: "ACTIVE",
    createdAt: "2026-07-20T03:00:00.000Z",
  },
  {
    id: "user-produk",
    username: "produk.budi",
    email: "produk.budi@sansico.co.id",
    fullName: "Budi PIC Produk",
    role: Role.PRODUK,
    isActive: true,
    password: "sansico123",
    invitationStatus: "ACTIVE",
    createdAt: "2026-07-20T03:00:00.000Z",
  },
  {
    id: "user-purchasing",
    username: "purchasing.citra",
    email: "purchasing.citra@sansico.co.id",
    fullName: "Citra Purchasing Lead",
    role: Role.PURCHASING,
    isActive: true,
    password: "sansico123",
    invitationStatus: "ACTIVE",
    createdAt: "2026-07-20T03:00:00.000Z",
  },
];

// Initial Demo Project to populate the app beautifully on first load
const DEFAULT_PROJECTS: Project[] = [
  {
    id: "proj-2",
    name: "d3TEKS1 HCG Test Kehamilan (Strip)",
    docType: DocType.INNER_BOX,
    version: 1,
    status: ProjectStatus.PENDING_PRODUCT,
    createdAt: "2026-07-20T14:15:00.000Z",
    updatedAt: "2026-07-20T14:15:00.000Z",
    createdBy: "Ari Desainer Alkes",
    designChecklist: {
      namaProduk: true,
      nie: true,
      konten: true,
      ref: true,
    },
    artworkText: "d3TEKS1® HCG Test Kehamilan (Strip)\n25 Perangkat Uji / Box\nKEMENKES RI AKD 20101221725\nREF 402216\nDiproduksi Oleh: PT MERAH PUTIH MANUFAKTURA, Jawa Barat\nDidistribusikan Oleh: PT SANSICO NATURA RESOURCES, DKI Jakarta\nSimpan di suhu 2°C - 30°C",
    artworkImagePlaceholder: "pregnancy_test_mockup",
    refCode: "REF 402216",
    nieNumber: "KEMENKES RI AKD 20101221725",
    pdfFileName: "d3TEKS1_HCG_Test_Kehamilan_Strip.pdf",
    pdfFileSize: "1.8 MB",
    pdfUploadedAt: "2026-07-20T14:15:00.000Z",
    revisions: [],
    purchasingChecklist: { validasiNie: false },
    productChecklist: {},
    lastStatusChangedAt: "2026-07-20T14:15:00.000Z",
  },
  {
    id: "proj-1",
    name: "Sansico Infusion Bag 500ml",
    docType: DocType.INNER_BOX,
    version: 1,
    status: ProjectStatus.PENDING_PRODUCT,
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-20T08:00:00.000Z",
    createdBy: "Ari Desainer Alkes",
    designChecklist: {
      namaProduk: true,
      nie: true,
      konten: true,
      ref: true,
    },
    artworkText: "Sansico Infusion Bag 500ml\nREF-INF-500ML\nKEMENKES RI AKD 20902220192\nSterile EO | Single Use Only\nStore: 15°C - 30°C",
    artworkImagePlaceholder: "infusion_bag_mockup",
    refCode: "REF-INF-500ML",
    nieNumber: "KEMENKES RI AKD 20902220192",
    pdfFileName: "Sansico_Infusion_Bag_500ml_Layout.pdf",
    pdfFileSize: "1.4 MB",
    pdfUploadedAt: "2026-07-20T08:00:00.000Z",
    revisions: [],
    purchasingChecklist: { validasiNie: false },
    productChecklist: {},
    lastStatusChangedAt: "2026-07-20T08:00:00.000Z",
  }
];

export default function App() {
  // --- STATE PERSISTENCE IN LOCAL STORAGE ---
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem("sansico_users");
      const loaded = saved ? JSON.parse(saved) : null;
      return Array.isArray(loaded) ? loaded : DEFAULT_USERS;
    } catch (e) {
      console.warn("Failed to load users from localStorage, resetting to defaults", e);
      return DEFAULT_USERS;
    }
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("sansico_projects");
      let loaded: Project[] = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(loaded)) {
        loaded = DEFAULT_PROJECTS;
      }
      
      // Clean up loaded projects array to filter out null or corrupted objects
      loaded = loaded.filter((p: any) => p && typeof p === "object" && p.id && typeof p.name === "string");
      return loaded;
    } catch (e) {
      console.warn("Failed to load projects from localStorage, resetting to defaults", e);
      return DEFAULT_PROJECTS;
    }
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    try {
      const saved = localStorage.getItem("sansico_notifications");
      const loaded = saved ? JSON.parse(saved) : null;
      return Array.isArray(loaded) ? loaded : [];
    } catch (e) {
      console.warn("Failed to load notifications from localStorage, resetting", e);
      return [];
    }
  });

  // Simulated Time starts at the current user context time or fallback
  const [currentSimulatedTime, setCurrentSimulatedTime] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("sansico_simulated_time");
      return saved ? saved : "2026-07-20T03:04:10.000Z";
    } catch (e) {
      console.warn("Failed to load simulated time from localStorage, resetting to default", e);
      return "2026-07-20T03:04:10.000Z";
    }
  });

  // Realtime Clock State ticking every second
  const [realtimeDate, setRealtimeDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setRealtimeDate(now);
      setCurrentSimulatedTime(now.toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const savedSession = localStorage.getItem("sansico_session_user");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to parse session user from localStorage", e);
    }
    return DEFAULT_USERS[0];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem("sansico_session_user");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        return Boolean(parsed && parsed.id);
      }
    } catch (e) {
      console.warn("Failed to check session from localStorage", e);
    }
    return false;
  });

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    try {
      localStorage.setItem("sansico_session_user", JSON.stringify(user));
    } catch (e) {
      console.warn("Failed to save user session to localStorage", e);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem("sansico_session_user");
    } catch (e) {
      console.warn("Failed to remove user session from localStorage", e);
    }
  };

  // Selected project for viewing final approval sheet
  const [viewingSheetProject, setViewingSheetProject] = useState<Project | null>(null);

  // Active view tab for Administrator so they can perform CRUD across all roles/divisions
  const [adminActiveTab, setAdminActiveTab] = useState<string>("users");

  // Custom dialog state for confirmations and alerts to prevent iframe block
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Hapus", cancelText = "Batal") => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      confirmText,
      cancelText
    });
  };

  const showAlert = (title: string, message: string) => {
    setAlertDialog({
      isOpen: true,
      title,
      message
    });
  };

  // Sync state to localstorage with error handling for sandboxed iframes
  useEffect(() => {
    try {
      localStorage.setItem("sansico_users", JSON.stringify(users));
    } catch (e) {
      console.warn("Failed to save users to localStorage:", e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem("sansico_projects", JSON.stringify(projects));
    } catch (e) {
      console.warn("Failed to save projects to localStorage:", e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem("sansico_notifications", JSON.stringify(notifications));
    } catch (e) {
      console.warn("Failed to save notifications to localStorage:", e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem("sansico_simulated_time", currentSimulatedTime);
    } catch (e) {
      console.warn("Failed to save simulated time to localStorage:", e);
    }
  }, [currentSimulatedTime]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      try {
        localStorage.setItem("sansico_session_user", JSON.stringify(currentUser));
      } catch (e) {
        console.warn("Failed to sync current user session:", e);
      }
    }
  }, [currentUser, isLoggedIn]);

  useEffect(() => {
    try {
      // Strip heavy base64 strings specifically for localStorage to avoid 5MB quota errors without corrupting PDF base64
      const safeProjects = projects.map(p => ({
        ...p,
        pdfFileUrl: p.pdfFileUrl && p.pdfFileUrl.length > 50000 ? undefined : p.pdfFileUrl,
        nieFileUrl: p.nieFileUrl && p.nieFileUrl.length > 50000 ? undefined : p.nieFileUrl,
      }));
      localStorage.setItem("sansico_projects", JSON.stringify(safeProjects));
    } catch (e) {
      console.warn("Failed to sync projects to localStorage:", e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem("sansico_users", JSON.stringify(users));
    } catch (e) {
      console.warn("Failed to sync users to localStorage:", e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem("sansico_notifications", JSON.stringify(notifications));
    } catch (e) {
      console.warn("Failed to sync notifications to localStorage:", e);
    }
  }, [notifications]);

  // --- FIRESTORE REALTIME SUBSCRIPTIONS & INITIAL SEEDING ---
  useEffect(() => {
    // Seed initial data if collections are empty
    seedInitialFirestoreData(DEFAULT_USERS, DEFAULT_PROJECTS, []);

    // Subscribe to Users collection
    const unsubUsers = subscribeUsers((firestoreUsers) => {
      if (firestoreUsers.length > 0) {
        setUsers(firestoreUsers);
      }
    });

    // Subscribe to Projects collection
    const unsubProjects = subscribeProjects((firestoreProjects) => {
      setProjects(firestoreProjects);
    });

    // Subscribe to Notifications collection
    const unsubNotifs = subscribeNotifications((firestoreNotifs) => {
      setNotifications(firestoreNotifs);
    });

    return () => {
      unsubUsers();
      unsubProjects();
      unsubNotifs();
    };
  }, []);

  // --- BROWSER NOTIFICATION SYSTEM (HTML5 Notification API) ---
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const [lastNotifiedCount, setLastNotifiedCount] = useState<Record<string, number>>({});
  const lastNotificationIdRef = React.useRef<string | null>(null);

  const triggerBrowserNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "https://cdn-icons-png.flaticon.com/512/1041/1041885.png", // aesthetic bell icon
        });
        setTimeout(() => notif.close(), 6000);
      } catch (e) {
        console.warn("Browser Notification construct failed (probably sandboxed iframe):", e);
      }
    }
  };

  const requestNotificationPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const promise = Notification.requestPermission();
        if (promise && typeof promise.then === "function") {
          promise.then((permission) => {
            setNotificationPermission(permission);
            if (permission === "granted") {
              triggerBrowserNotification(
                "🔔 Notifikasi Diaktifkan!",
                "Anda akan menerima pemberitahuan desktop otomatis saat ada dokumen alkes yang butuh persetujuan Anda."
              );
            }
          }).catch((err) => {
            console.warn("Permohonan izin notifikasi ditolak/gagal di iframe sandbox:", err);
          });
        }
      } catch (err) {
        console.warn("Notification.requestPermission diblokir oleh kebijakan keamanan browser (iframe sandbox):", err);
      }
    } else {
      console.log("Browser tidak mendukung Web Notification API.");
    }
  };

  // Monitor any newly created audit logs or system warnings in notifications list
  useEffect(() => {
    if (notifications.length > 0) {
      const newestNotif = notifications[0];
      if (lastNotificationIdRef.current !== newestNotif.id) {
        const prevId = lastNotificationIdRef.current;
        lastNotificationIdRef.current = newestNotif.id;
        
        // Skip on initial page load to avoid spamming historical alerts
        if (prevId !== null) {
          const title = newestNotif.type === "WARNING" ? "⚠️ Peringatan Sistem Alkes" : "📢 Info Alur Kerja Alkes";
          triggerBrowserNotification(title, newestNotif.message);
        }
      }
    } else {
      lastNotificationIdRef.current = "";
    }
  }, [notifications]);

  // Monitor role switching or pending count updates for active role
  const projectStatusesString = projects.map(p => `${p.id}:${p.status}`).join(",");
  useEffect(() => {
    if (currentUser.role === Role.ADMINISTRATOR) return;

    let count = 0;
    let title = "";
    let body = "";

    if (currentUser.role === Role.DESAIN) {
      count = projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length;
      title = "Pembaruan Alur Kerja Desain";
      body = `Halo ${currentUser.fullName}, ada ${count} proyek yang memerlukan revisi dari Anda saat ini.`;
    } else if (currentUser.role === Role.PRODUK) {
      count = projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length;
      title = "Antrean Persetujuan Produk";
      body = `Halo ${currentUser.fullName}, ada ${count} berkas artwork yang menunggu persetujuan (ACC) Anda.`;
    } else if (currentUser.role === Role.PURCHASING) {
      count = projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT).length;
      title = "Antrean Rilis Cetak Purchasing";
      body = `Halo ${currentUser.fullName}, ada ${count} berkas artwork siap rilis cetak yang butuh tanda tangan Anda.`;
    }

    const userKey = currentUser.id;
    const prevCountForUser = lastNotifiedCount[userKey] ?? -1;

    if (count > 0 && count !== prevCountForUser) {
      triggerBrowserNotification(title, body);
      setLastNotifiedCount(prev => ({ ...prev, [userKey]: count }));
    } else if (count === 0 && prevCountForUser > 0) {
      setLastNotifiedCount(prev => ({ ...prev, [userKey]: 0 }));
    }
  }, [currentUser.id, projectStatusesString, currentUser.role]);

  // --- SILENT BACKGROUND WORKFLOW ENGINE ---
  // Automatically advances simulated time in the background so working hours pass and alerts can trigger desktop notifications.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSimulatedTime(prev => {
        const nextTime = addWorkingHours(prev, 10 / 60); // advance 10 working minutes
        // Silently check if any background warnings are triggered
        const newAlerts = checkTimeBasedEvents(projects, prev, nextTime);
        if (newAlerts.length > 0) {
          newAlerts.forEach(saveNotificationToFirestore);
        }
        return nextTime;
      });
    }, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, [projects]);

  // --- DETEKSI ALARM HOLD EXPIRED (TIM PURCHASING) ---
  useEffect(() => {
    const expiredList = projects.filter(p => 
      p.status === ProjectStatus.HOLD_PURCHASING && 
      p.holdUntil && 
      p.holdAlarmSet &&
      new Date(currentSimulatedTime) >= new Date(p.holdUntil)
    );

    if (expiredList.length > 0) {
      // Disarm those alarms in Firestore
      expiredList.forEach(p => {
        saveProjectToFirestore({ ...p, holdAlarmSet: false });

        // Trigger browser sound if possible or a desktop notification
        triggerBrowserNotification(
          "🚨 ALARM: Estimasi Hold Habis!",
          `Proyek "${p.name}" telah melewati estimasi hold cetak. Tindakan segera diperlukan!`
        );

        saveNotificationToFirestore({
          id: `alarm-expired-${p.id}-${Date.now()}`,
          timestamp: currentSimulatedTime,
          type: "WARNING",
          message: `[ALARM EXPIRED] Waktu hold cetak proyek "${p.name}" telah habis! Tim Purchasing wajib memberikan kepastian lanjut cetak atau menambah waktu hold.`,
          projectId: p.id,
          projectName: p.name,
        });
      });
    }
  }, [projects, currentSimulatedTime]);

  // --- ACTIONS ---

  // ADVANCE SIMULATED TIME
  const handleAdvanceTime = (hours: number) => {
    const oldTime = currentSimulatedTime;
    const newTime = addWorkingHours(oldTime, hours);
    setCurrentSimulatedTime(newTime);

    // Check if new notifications are triggered (summary, warnings, 6hr delays)
    const newAlerts = checkTimeBasedEvents(projects, oldTime, newTime);
    if (newAlerts.length > 0) {
      newAlerts.forEach(saveNotificationToFirestore);
    }
  };

  const handleAdvanceToTime = (targetHour: number, nextDay: boolean) => {
    const oldTime = currentSimulatedTime;
    const date = new Date(oldTime);
    
    if (nextDay) {
      // Advance to next working day (skipping weekend if applicable)
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6);
    }
    
    date.setHours(targetHour);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    // Safe guard to prevent moving backwards unless desired, but for jumps we allow it
    const newTime = date.toISOString();
    setCurrentSimulatedTime(newTime);

    const newAlerts = checkTimeBasedEvents(projects, oldTime, newTime);
    if (newAlerts.length > 0) {
      newAlerts.forEach(saveNotificationToFirestore);
    }
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    clearNotificationsInFirestore();
  };

  // ADMINISTRATOR PANEL: INVITE USER VIA EMAIL & APPROVE
  const handleInviteUser = (email: string, fullName: string, role: Role) => {
    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      username,
      email,
      fullName,
      role,
      isActive: false, // Inactive until approved
      invitationStatus: "PENDING",
      invitedAt: currentSimulatedTime,
      invitedBy: currentUser ? currentUser.fullName : "Administrator",
      createdAt: currentSimulatedTime,
    };
    setUsers(prev => [newUser, ...prev.filter(u => u.id !== newUser.id)]);
    saveUserToFirestore(newUser);
    const notif: NotificationLog = {
      id: `sys-invite-${Date.now()}`,
      timestamp: currentSimulatedTime,
      type: "INFO",
      message: `[UNDANGAN EMAIL] Administrator mengirim undangan pendaftaran ke "${email}" sebagai ${role}. Status: Menunggu Pengisian Formulir User.`,
    };
    setNotifications(prev => [notif, ...prev]);
    saveNotificationToFirestore(notif);
  };

  const handleRegisterOrConfirmUser = (data: { email: string; fullName: string; role: Role; username: string; password?: string }) => {
    const existingUser = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existingUser) {
      const updatedUser: UserAccount = {
        ...existingUser,
        fullName: data.fullName || existingUser.fullName,
        username: data.username || existingUser.username,
        role: data.role || existingUser.role,
        password: data.password || existingUser.password || "sansico123",
        invitationStatus: "PENDING_APPROVAL",
        isActive: false,
      };
      setUsers(prev => prev.map(u => u.id === existingUser.id ? updatedUser : u));
      saveUserToFirestore(updatedUser);
      const notif: NotificationLog = {
        id: `sys-confirm-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[FORMULIR DITERIMA] Pengguna "${updatedUser.fullName}" (${updatedUser.email}) telah mengisi formulir konfirmasi email. Menunggu ACC / Persetujuan dari Administrator.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    } else {
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        password: data.password || "sansico123",
        isActive: false,
        invitationStatus: "PENDING_APPROVAL",
        invitedAt: currentSimulatedTime,
        invitedBy: "Pengisian Formulir Mandiri",
        createdAt: currentSimulatedTime,
      };
      setUsers(prev => [newUser, ...prev]);
      saveUserToFirestore(newUser);
      const notif: NotificationLog = {
        id: `sys-reg-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[FORMULIR PENDAFTARAN] Pengguna baru "${newUser.fullName}" (${newUser.email}) telah mengirimkan formulir pendaftaran. Menunggu ACC / Persetujuan Administrator.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  const handleUpdateUserPassword = (userId: string, newPass: string) => {
    const userAcc = users.find(u => u.id === userId);
    if (userAcc) {
      const updatedUser: UserAccount = { ...userAcc, password: newPass };
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      saveUserToFirestore(updatedUser);
      const notif: NotificationLog = {
        id: `sys-pass-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[KATA SANDI DIUBAH] Administrator memperbarui kata sandi untuk akun "${userAcc.fullName}".`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  const handleApproveUser = (userId: string) => {
    const userAcc = users.find(u => u.id === userId);
    if (userAcc) {
      const updatedUser: UserAccount = {
        ...userAcc,
        isActive: true,
        invitationStatus: "ACTIVE",
      };
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      saveUserToFirestore(updatedUser);
      const notif: NotificationLog = {
        id: `sys-approve-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[KONFIRMASI APPROVED] Akun "${userAcc.fullName}" (${userAcc.email}) telah disetujui oleh Administrator. Pengguna kini dapat masuk ke Portal.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  const handleToggleUserActive = (userId: string) => {
    const userAcc = users.find(u => u.id === userId);
    if (userAcc) {
      const nextActive = !userAcc.isActive;
      const updatedUser: UserAccount = { ...userAcc, isActive: nextActive };
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      saveUserToFirestore(updatedUser);
      if (currentUser.id === userId) {
        setCurrentUser(updatedUser);
      }
    }
  };

  const handleDeleteUser = (userId: string) => {
    const userToDel = users.find(u => u.id === userId);
    if (!userToDel) return;

    if (userToDel.id === currentUser.id) {
      showAlert("Aksi Ditolak", "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!");
      return;
    }

    showConfirm(
      "Konfirmasi Hapus Akun",
      `Apakah Anda yakin ingin menghapus akun "${userToDel.fullName}" (${userToDel.role}) secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        setUsers(prev => prev.filter(u => u.id !== userId));
        deleteUserFromFirestore(userId);
        const notif: NotificationLog = {
          id: `sys-${Date.now()}`,
          timestamp: currentSimulatedTime,
          type: "WARNING",
          message: `[AKUN] Akun "${userToDel.fullName}" telah dihapus secara permanen oleh Administrator.`,
        };
        setNotifications(prev => [notif, ...prev]);
        saveNotificationToFirestore(notif);
      }
    );
  };

  // TIM DESAIN: CREATE NEW PROJECT
  const handleCreateProject = (
    name: string,
    docType: DocType,
    refCode: string,
    nieNumber: string,
    artworkText: string,
    pdfFileName?: string,
    pdfFileSize?: string,
    pdfFileUrl?: string
  ) => {
    // Generate simulated Design stamp log
    const designStamp: DigitalStamp = {
      stampedBy: currentUser.fullName,
      stampedRole: Role.DESAIN,
      stampedAt: currentSimulatedTime,
      version: "V1",
      hash: generateDigitalSignature(Role.DESAIN, currentUser.fullName, currentSimulatedTime),
    };

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      docType,
      version: 1,
      status: ProjectStatus.PENDING_PRODUCT,
      createdAt: currentSimulatedTime,
      updatedAt: currentSimulatedTime,
      createdBy: currentUser.fullName,
      designChecklist: {
        namaProduk: true,
        nie: true,
        konten: true,
        ref: true,
      },
      artworkText,
      artworkImagePlaceholder: "generic_plate_spec",
      refCode,
      nieNumber,
      pdfFileName,
      pdfFileSize,
      pdfUploadedAt: currentSimulatedTime,
      pdfFileUrl,
      revisions: [],
      purchasingChecklist: { validasiNie: false },
      productChecklist: {},
      designStamp,
      lastStatusChangedAt: currentSimulatedTime,
    };

    setProjects(prev => [newProject, ...prev]);
    saveProjectToFirestore(newProject);

    // Push immediate audit log notification
    const notif: NotificationLog = {
      id: `sys-${Date.now()}`,
      timestamp: currentSimulatedTime,
      type: "INFO",
      message: `[ALUR KERJA] Proyek "${name}" (V1) telah diinisiasi oleh ${currentUser.fullName} via file PDF "${pdfFileName || 'artwork.pdf'}" dan dikirim ke antrean Tim Produk.`,
    };
    setNotifications(prev => [notif, ...prev]);
    saveNotificationToFirestore(notif);
  };

  // TIM DESAIN: RESUBMIT UPDATED REVISION
  const handleUpdateProject = (
    projectId: string,
    refCode: string,
    nieNumber: string,
    artworkText: string,
    checklist: { namaProduk: boolean; nie: boolean; konten: boolean; ref: boolean },
    pdfFileName?: string,
    pdfFileSize?: string,
    pdfFileUrl?: string
  ) => {
    const targetProj = projects.find(p => p.id === projectId);
    if (!targetProj) return;

    const nextVer = targetProj.version + 1;
    const revNum = nextVer - 1;

    const cleanBaseName = (n: string) => {
      return n
        .replace(/\s+Rev\s+\d+/i, "")
        .replace(/\s+V\d+/i, "")
        .replace(/_Layout_V\d+/i, "")
        .replace(/_Final/i, "")
        .trim();
    };

    const baseProjectName = cleanBaseName(targetProj.name);
    const newProjectName = `${baseProjectName} Rev ${revNum}`;

    let finalPdfName = targetProj.pdfFileName;
    if (pdfFileName) {
      const cleanPdfBase = pdfFileName.replace(/\.pdf$/i, "");
      const cleanedPdfBaseName = cleanBaseName(cleanPdfBase);
      finalPdfName = `${cleanedPdfBaseName}_Rev_${revNum}.pdf`;
    }

    const newStamp: DigitalStamp = {
      stampedBy: currentUser.fullName,
      stampedRole: Role.DESAIN,
      stampedAt: currentSimulatedTime,
      version: `V${nextVer}`,
      hash: generateDigitalSignature(Role.DESAIN, currentUser.fullName, currentSimulatedTime),
    };

    const updatedProj: Project = {
      ...targetProj,
      name: newProjectName,
      refCode,
      nieNumber,
      artworkText,
      designChecklist: checklist,
      version: nextVer,
      status: ProjectStatus.PENDING_PRODUCT,
      designStamp: newStamp,
      pdfFileName: finalPdfName,
      pdfFileSize: pdfFileSize || targetProj.pdfFileSize,
      pdfFileUrl: pdfFileUrl || targetProj.pdfFileUrl,
      pdfUploadedAt: currentSimulatedTime,
      updatedAt: currentSimulatedTime,
      lastStatusChangedAt: currentSimulatedTime,
    };

    setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
    saveProjectToFirestore(updatedProj);

    const notif: NotificationLog = {
      id: `sys-${Date.now()}`,
      timestamp: currentSimulatedTime,
      type: "INFO",
      message: `[REVISI OK] Proyek "${newProjectName}" diperbarui ke V${nextVer} oleh Desainer via file PDF "${finalPdfName || 'artwork_revised.pdf'}" dan siap ditinjau kembali oleh Tim Produk.`,
    };
    setNotifications(prev => [notif, ...prev]);
    saveNotificationToFirestore(notif);
  };

  // TIM PRODUK: GIVE PERSUTUJUAN (ACC)
  const handleProductApprove = (projectId: string, picName: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const productStamp: DigitalStamp = {
        stampedBy: picName,
        stampedRole: Role.PRODUK,
        stampedAt: currentSimulatedTime,
        version: `V${proj.version}`,
        hash: generateDigitalSignature(Role.PRODUK, picName, currentSimulatedTime),
      };

      const updatedProj: Project = {
        ...proj,
        status: ProjectStatus.APPROVED_PRODUCT,
        productPic: picName,
        productApprovedAt: currentSimulatedTime,
        productStamp,
        updatedAt: currentSimulatedTime,
        lastStatusChangedAt: currentSimulatedTime,
      };

      setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
      saveProjectToFirestore(updatedProj);

      const notif: NotificationLog = {
        id: `sys-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[ALUR KERJA] Proyek "${proj.name}" disetujui (ACC) oleh Tim Produk (${picName}). Stempel Digital Produk berhasil diterbitkan.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  // TIM PRODUK: TOlAK DENGAN CATATAN REVISI
  const handleProductReject = (projectId: string, picName: string, notes: RevisionNotes) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const histItem = {
        version: proj.version,
        notes,
        rejectedBy: picName,
        rejectedAt: currentSimulatedTime,
        artworkTextBefore: proj.artworkText,
      };

      const updatedProj: Project = {
        ...proj,
        status: ProjectStatus.NEED_REVISION,
        revisions: [...proj.revisions, histItem],
        updatedAt: currentSimulatedTime,
        lastStatusChangedAt: currentSimulatedTime,
      };

      setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
      saveProjectToFirestore(updatedProj);

      const notif: NotificationLog = {
        id: `sys-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "WARNING",
        message: `[DITOLAK] Proyek "${proj.name}" (V${proj.version}) DITOLAK oleh Tim Produk (${picName}) karena kesalahan pada komponen "${notes.component}". Status kembali ke Tim Desain untuk revisi.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  // TIM PRODUK: UPLOAD DOKUMEN NIE RESMI
  const handleUploadNieDocument = (projectId: string, fileName: string, fileSize: string, fileUrl: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const updatedProj: Project = {
        ...proj,
        nieFileName: fileName || undefined,
        nieFileSize: fileSize || undefined,
        nieFileUrl: fileUrl || undefined,
        updatedAt: currentSimulatedTime,
      };

      setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
      saveProjectToFirestore(updatedProj);

      if (fileName) {
        const notif: NotificationLog = {
          id: `sys-${Date.now()}`,
          timestamp: currentSimulatedTime,
          type: "INFO",
          message: `[UNGGAH NIE] Berkas dokumen NIE pemerintah asli "${fileName}" berhasil diunggah untuk proyek "${proj.name}". Komparasi visual kini aktif.`,
        };
        setNotifications(prev => [notif, ...prev]);
        saveNotificationToFirestore(notif);
      }
    }
  };

  // TIM PURCHASING: RELEASE TO VENDOR
  const handlePurchasingRelease = (projectId: string, picName: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const purchasingStamp: DigitalStamp = {
        stampedBy: picName,
        stampedRole: Role.PURCHASING,
        stampedAt: currentSimulatedTime,
        version: `V${proj.version}`,
        hash: generateDigitalSignature(Role.PURCHASING, picName, currentSimulatedTime),
      };

      const updatedProj: Project = {
        ...proj,
        status: ProjectStatus.FULLY_RELEASED,
        purchasingPic: picName,
        purchasingApprovedAt: currentSimulatedTime,
        purchasingStamp,
        purchasingChecklist: { validasiNie: true },
        updatedAt: currentSimulatedTime,
        lastStatusChangedAt: currentSimulatedTime,
        holdUntil: undefined,
        holdReason: undefined,
        holdAlarmSet: false,
      };

      setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
      saveProjectToFirestore(updatedProj);

      const notif: NotificationLog = {
        id: `sys-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[RILIS UTAMA] ✓ BERHASIL DI-RELEASE! Proyek "${proj.name}" telah ditandatangani penuh oleh Purchasing (${picName}) dan dikunci permanen. Dokumen siap dicetak!`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  // TIM PURCHASING: HOLD CETAKAN
  const handlePurchasingHold = (projectId: string, holdUntil: string, reason: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const updatedProj: Project = {
        ...proj,
        status: ProjectStatus.HOLD_PURCHASING,
        holdUntil,
        holdReason: reason,
        holdAlarmSet: true, // arm alarm
        updatedAt: currentSimulatedTime,
        lastStatusChangedAt: currentSimulatedTime,
      };

      setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
      saveProjectToFirestore(updatedProj);

      const notif: NotificationLog = {
        id: `sys-hold-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "WARNING",
        message: `[HOLD CETAKAN] Proyek "${proj.name}" ditangguhkan (HOLD) oleh Purchasing dengan estimasi batas hingga ${new Date(holdUntil).toLocaleString("id-ID")}. Alasan: ${reason}.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  // TIM PURCHASING: MENAMBAH WAKTU HOLD
  const handlePurchasingUpdateHoldTime = (projectId: string, newHoldUntil: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      const updatedProj: Project = {
        ...proj,
        holdUntil: newHoldUntil,
        holdAlarmSet: true, // re-arm alarm
        updatedAt: currentSimulatedTime,
      };

      setProjects(prev => prev.map(p => p.id === projectId ? updatedProj : p));
      saveProjectToFirestore(updatedProj);

      const notif: NotificationLog = {
        id: `sys-hold-ext-${Date.now()}`,
        timestamp: currentSimulatedTime,
        type: "INFO",
        message: `[HOLD CETAKAN] Waktu Hold untuk Proyek "${proj.name}" ditambah hingga ${new Date(newHoldUntil).toLocaleString("id-ID")}.`,
      };
      setNotifications(prev => [notif, ...prev]);
      saveNotificationToFirestore(notif);
    }
  };

  // ADMINISTRATOR: DELETE PROJECT (CRUD Access)
  const handleDeleteProject = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    showConfirm(
      "Konfirmasi Hapus Proyek",
      `Apakah Anda yakin ingin menghapus proyek "${proj.name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      () => {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        deleteProjectFromFirestore(projectId);
        const notif: NotificationLog = {
          id: `sys-${Date.now()}`,
          timestamp: currentSimulatedTime,
          type: "WARNING",
          message: `[HAPUS] Proyek "${proj.name}" telah dihapus secara permanen oleh Administrator.`,
        };
        saveNotificationToFirestore(notif);
      }
    );
  };

  const handleAccountSwitch = (userId: string) => {
    const acc = users.find(u => u.id === userId);
    if (acc) {
      if (!acc.isActive) {
        showAlert("Akses Ditangguhkan", "Gagal Beralih: Akun ini dinonaktifkan oleh Administrator!");
        return;
      }
      setCurrentUser(acc);
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginPage 
        users={users} 
        onLogin={handleLogin} 
        onRegisterUser={handleRegisterOrConfirmUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col font-sans text-slate-800" id="main-app-root">
      {/* SINGLE UNIFIED TOP HEADER */}
      <header className="bg-white border-b border-slate-200 text-slate-800 shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white p-2 rounded-xl shadow-xs shrink-0">
              <Layers className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                Artwork Approval System
              </h1>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase font-bold">
                Sansico Medica Co. • Quality Assurance Division
              </p>
            </div>
          </div>

          {/* Unified Controls & Account Info */}
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            {/* Realtime Clock Badge */}
            <div className="flex items-center gap-2 font-mono font-bold text-slate-700 bg-red-50/80 px-3 py-1.5 rounded-xl border border-red-100">
              <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-[11px] font-sans">
                {realtimeDate.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} • {realtimeDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
              </span>
            </div>

            {/* Active User Badge */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
              <span className="font-bold text-slate-900">{currentUser.fullName}</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>

            {/* Notification Permission Toggle */}
            <button
              type="button"
              onClick={requestNotificationPermission}
              className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition-all duration-150 flex items-center gap-1 cursor-pointer font-sans shadow-2xs ${
                notificationPermission === "granted"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : notificationPermission === "denied"
                  ? "bg-slate-100 text-slate-500 border-slate-200"
                  : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              }`}
            >
              <span>
                {notificationPermission === "granted"
                  ? "Notifikasi Browser: Aktif"
                  : notificationPermission === "denied"
                  ? "Notifikasi Browser: Diblokir"
                  : "Aktifkan Notifikasi"}
              </span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
              title="Keluar dari Akun"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* EXPIRED HOLD CETAKAN ALARM BANNER */}
      {(() => {
        const expiredHolds = projects.filter(p => 
          p.status === ProjectStatus.HOLD_PURCHASING && 
          p.holdUntil && 
          new Date(currentSimulatedTime) >= new Date(p.holdUntil)
        );
        if (expiredHolds.length === 0) return null;

        return (
          <div className="bg-rose-500 text-white py-3 px-4 shadow-md animate-pulse">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl text-white">
                  <AlertCircle className="w-5 h-5 animate-spin-slow text-white" />
                </div>
                <div>
                  <strong className="text-xs font-bold block sm:inline font-display">ALARM WAJIB TINDAK (ESTIMASI HOLD HABIS):</strong>
                  <p className="text-[11px] text-rose-100 font-medium mt-0.5">
                    Ada {expiredHolds.length} proyek hold yang butuh kepastian lanjut cetak atau tambahan waktu hold!
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {expiredHolds.map(p => (
                  <div key={p.id} className="bg-rose-600/95 border border-white/10 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] text-rose-200 font-mono">Batas Hold: {p.holdUntil ? new Date(p.holdUntil).toLocaleString("id-ID") : "-"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // Kepastian lanjut cetak -> move back to APPROVED_PRODUCT
                          setProjects(prev => prev.map(proj => {
                            if (proj.id === p.id) {
                              return {
                                ...proj,
                                status: ProjectStatus.APPROVED_PRODUCT,
                                holdUntil: undefined,
                                holdReason: undefined,
                                holdAlarmSet: false,
                                updatedAt: currentSimulatedTime,
                              };
                            }
                            return proj;
                          }));
                          setNotifications(prev => [
                            {
                              id: `sys-resume-${Date.now()}`,
                              timestamp: currentSimulatedTime,
                              type: "INFO",
                              message: `[HOLD CETAKAN] Proyek "${p.name}" dilanjutkan untuk rilis cetak oleh Purchasing setelah alarm habis.`,
                            },
                            ...prev
                          ]);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
                      >
                        Lanjut Cetak
                      </button>
                      
                      <button
                        onClick={() => {
                          // Menambah waktu -> extend holdUntil by 1 hour (simulated)
                          const currentHold = p.holdUntil ? new Date(p.holdUntil) : new Date(currentSimulatedTime);
                          const nextHold = addWorkingHours(currentHold.toISOString(), 1);
                          handlePurchasingUpdateHoldTime(p.id, nextHold);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
                      >
                        Tambah 1 Jam Hold
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* DYNAMIC ROLE-BASED ACTIONABLE NOTIFICATION BANNER */}
      {currentUser.role !== Role.ADMINISTRATOR && (
        <div className="bg-white border-b border-slate-100 py-3.5 px-4 shadow-sm">
          <div className="max-w-7xl mx-auto">
            {currentUser.role === Role.DESAIN && (
              (() => {
                const revisionCount = projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length;
                
                if (revisionCount > 0) {
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-900 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="bg-rose-500 text-white rounded-xl p-2 shadow-sm flex-shrink-0">
                          <AlertOctagon className="w-4 h-4 animate-bounce" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block sm:inline font-display">TINDAKAN SEGERA DIBUTUHKAN:</strong>
                          <span className="text-xs ml-1 font-medium">Anda memiliki <strong className="font-extrabold">{revisionCount} proyek</strong> yang ditolak oleh Tim Produk dan memerlukan revisi serta unggahan ulang file PDF desain!</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-rose-100 text-rose-700 px-2 py-1 rounded-lg font-bold font-mono self-start sm:self-center">ROLE: TIM DESAIN</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-white rounded-xl p-2 shadow-sm flex-shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block sm:inline font-display">STATUS TIM DESAIN:</strong>
                          <span className="text-xs ml-1 font-medium">Semua aman! Tidak ada rancangan proyek Anda yang membutuhkan revisi dari Tim Produk saat ini.</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold font-mono self-start sm:self-center">ROLE: TIM DESAIN</span>
                    </div>
                  );
                }
              })()
            )}

            {currentUser.role === Role.PRODUK && (
              (() => {
                const pendingCount = projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length;
                
                if (pendingCount > 0) {
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="bg-indigo-600 text-white rounded-xl p-2 shadow-sm flex-shrink-0">
                          <Clock className="w-4 h-4 animate-spin-slow" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block sm:inline font-display">ANTREAN PERSETUJUAN (ACC):</strong>
                          <span className="text-xs ml-1 font-medium">Anda memiliki <strong className="font-extrabold">{pendingCount} dokumen artwork</strong> yang butuh peninjauan manual dan perbandingan ketat dengan master NIE Kemenkes!</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-bold font-mono self-start sm:self-center">ROLE: TIM PRODUK</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-white rounded-xl p-2 shadow-sm flex-shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block sm:inline font-display">STATUS TIM PRODUK:</strong>
                          <span className="text-xs ml-1 font-medium">Antrean bersih! Semua berkas artwork telah didelegasikan atau diputuskan statusnya.</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold font-mono self-start sm:self-center">ROLE: TIM PRODUK</span>
                    </div>
                  );
                }
              })()
            )}

            {currentUser.role === Role.PURCHASING && (
              (() => {
                const readyCount = projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT).length;
                
                if (readyCount > 0) {
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-900 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="bg-amber-500 text-white rounded-xl p-2 shadow-sm flex-shrink-0 font-bold">
                          <Printer className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block sm:inline font-display">ANTREAN RILIS CETAK (RELEASE):</strong>
                          <span className="text-xs ml-1 font-medium">Ada <strong className="font-extrabold">{readyCount} artwork</strong> siap dirilis ke vendor percetakan. Lakukan tanda tangan digital untuk meluncurkan rilis cetak!</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold font-mono self-start sm:self-center">ROLE: TIM PURCHASING</span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-900 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-white rounded-xl p-2 shadow-sm flex-shrink-0">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-bold block sm:inline font-display">STATUS TIM PURCHASING:</strong>
                          <span className="text-xs ml-1 font-medium">Hebat! Tidak ada berkas rilis cetak tertunda yang menunggu tanda tangan Anda saat ini.</span>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-bold font-mono self-start sm:self-center">ROLE: TIM PURCHASING</span>
                    </div>
                  );
                }
              })()
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
          {/* Active Division View Selector for Administrator */}
          {currentUser.role === Role.ADMINISTRATOR && (
            <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-50 text-red-600 p-2.5 rounded-xl">
                  <Shield className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-black text-slate-900 text-xs uppercase tracking-wider">Akses Kerja Multi-Divisi Administrator</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sebagai Administrator, Anda memiliki akses CRUD penuh dan kendali operasional langsung di seluruh divisi.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-end">
                <button
                  onClick={() => setAdminActiveTab("users")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    adminActiveTab === "users"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Akun Pengguna
                </button>
                <button
                  onClick={() => setAdminActiveTab("desain")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    adminActiveTab === "desain"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Divisi Desain
                </button>
                <button
                  onClick={() => setAdminActiveTab("produk")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    adminActiveTab === "produk"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Divisi Produk
                </button>
                <button
                  onClick={() => setAdminActiveTab("purchasing")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    adminActiveTab === "purchasing"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  Divisi Purchasing
                </button>
              </div>
            </div>
          )}

          {/* Render Panels depending on active user role and active admin tab */}
          {currentUser.role === Role.ADMINISTRATOR && adminActiveTab === "users" && (
            <AdminPanel
              currentUser={currentUser}
              users={users}
              onInviteUser={handleInviteUser}
              onApproveUser={handleApproveUser}
              onToggleUserActive={handleToggleUserActive}
              onDeleteUser={handleDeleteUser}
              onUpdateUserPassword={handleUpdateUserPassword}
            />
          )}

          {((currentUser.role === Role.ADMINISTRATOR && adminActiveTab === "desain") || currentUser.role === Role.DESAIN) && (
            <DesignPanel
              currentUser={currentUser}
              projects={projects}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {((currentUser.role === Role.ADMINISTRATOR && adminActiveTab === "produk") || currentUser.role === Role.PRODUK) && (
            <ProductPanel
              currentUser={currentUser}
              projects={projects}
              onApprove={handleProductApprove}
              onReject={handleProductReject}
              onUploadNieDocument={handleUploadNieDocument}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {((currentUser.role === Role.ADMINISTRATOR && adminActiveTab === "purchasing") || currentUser.role === Role.PURCHASING) && (
            <PurchasingPanel
              currentUser={currentUser}
              projects={projects}
              onRelease={handlePurchasingRelease}
              onHold={handlePurchasingHold}
              onUpdateHoldTime={handlePurchasingUpdateHoldTime}
              onDeleteProject={handleDeleteProject}
              currentSimulatedTime={currentSimulatedTime}
            />
          )}

          {/* Horizontal Modern Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Review Produk */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Review Produk</span>
                <span className="text-lg sm:text-xl font-black text-indigo-900 font-mono block">
                  {projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length} <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Berkas</span>
                </span>
              </div>
              <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
                <FileSearch className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            {/* Card 2: Revisi Desain */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Revisi Desain</span>
                <span className="text-lg sm:text-xl font-black text-rose-600 font-mono block">
                  {projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length} <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Berkas</span>
                </span>
              </div>
              <div className="bg-rose-50 text-rose-600 p-2 rounded-xl">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            {/* Card 3: Siap Rilis Cetak */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Siap Rilis Cetak</span>
                <span className="text-lg sm:text-xl font-black text-amber-600 font-mono block">
                  {projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT).length} <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Berkas</span>
                </span>
              </div>
              <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            {/* Card 4: Selesai Cetak */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4 transition-all duration-200 hover:shadow-md hover:border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Selesai Cetak</span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono block">
                  {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED).length} <span className="text-[10px] sm:text-xs font-semibold text-slate-400">Berkas</span>
                </span>
              </div>
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* 4. KANBAN BOARD / GLOBAL LIST FOR QUICK PREVIEW */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-slate-800 text-sm">
                  Kanban Alur Kerja Medis (Seluruh Proyek)
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Pembaruan: {new Date(currentSimulatedTime).toLocaleTimeString("id-ID")}
              </span>
            </div>

            {/* Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Col 1: Pending Product */}
              <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">
                    🔬 Review Produk
                  </span>
                  <span className="bg-slate-200/60 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length}
                  </span>
                </div>
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[260px] pr-0.5">
                  {projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).map(p => (
                    <div key={p.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 text-[11px] space-y-1">
                      <div className="font-bold text-slate-800 truncate">{p.name}</div>
                      <div className="text-slate-400 font-mono text-[9px]">{p.docType} V{p.version}</div>
                      <div className="text-slate-400 font-mono text-[9px] flex justify-between items-center">
                        <span>Oleh: {p.createdBy}</span>
                        {currentUser.role === Role.ADMINISTRATOR && (
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-0.5 ml-2 cursor-pointer"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {projects.filter(p => p.status === ProjectStatus.PENDING_PRODUCT).length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-[10px] italic">Kosong</div>
                  )}
                </div>
              </div>

              {/* Col 2: Need Revision (Desain) */}
              <div className="bg-rose-50/30 rounded-xl p-3 border border-rose-100/50 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-rose-100">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest font-display">
                    🎨 Revisi Desain
                  </span>
                  <span className="bg-rose-100/50 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length}
                  </span>
                </div>
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[260px] pr-0.5">
                  {projects.filter(p => p.status === ProjectStatus.NEED_REVISION).map(p => (
                    <div key={p.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-rose-100 text-[11px] space-y-1">
                      <div className="font-bold text-rose-900 truncate">{p.name}</div>
                      <div className="text-rose-400 font-mono text-[9px] flex justify-between items-center">
                        <span>{p.docType} V{p.version}</span>
                        {currentUser.role === Role.ADMINISTRATOR && (
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-0.5 ml-2 cursor-pointer"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Hapus
                          </button>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full overflow-hidden text-ellipsis whitespace-nowrap">
                        ⚠ Salah: {p.revisions[p.revisions.length - 1]?.notes.component}
                      </div>
                    </div>
                  ))}
                  {projects.filter(p => p.status === ProjectStatus.NEED_REVISION).length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-[10px] italic">Kosong</div>
                  )}
                </div>
              </div>

              {/* Col 3: Approved (Purchasing Gate) */}
              <div className="bg-amber-50/30 rounded-xl p-3 border border-amber-100/50 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-amber-100">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest font-display">
                    📦 Gate Purchasing
                  </span>
                  <span className="bg-amber-100/50 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT || p.status === ProjectStatus.HOLD_PURCHASING).length}
                  </span>
                </div>
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[260px] pr-0.5">
                  {projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT || p.status === ProjectStatus.HOLD_PURCHASING).map(p => (
                    <div key={p.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-amber-100 text-[11px] space-y-1">
                      <div className="font-bold text-amber-900 truncate">{p.name}</div>
                      <div className="text-amber-400 font-mono text-[9px] flex justify-between items-center">
                        <span>{p.docType} V{p.version}</span>
                        {currentUser.role === Role.ADMINISTRATOR && (
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-0.5 ml-2 cursor-pointer"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Hapus
                          </button>
                        )}
                      </div>
                      {p.status === ProjectStatus.HOLD_PURCHASING ? (
                        <div className="text-amber-600 font-semibold text-[9px] flex flex-col gap-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            ⏸ ON HOLD
                          </span>
                          <span className="text-[8px] text-slate-500 line-clamp-1 italic">
                            Alasan: {p.holdReason}
                          </span>
                        </div>
                      ) : (
                        <div className="text-emerald-700 font-semibold text-[9px]">✓ ACC Produk</div>
                      )}
                    </div>
                  ))}
                  {projects.filter(p => p.status === ProjectStatus.APPROVED_PRODUCT || p.status === ProjectStatus.HOLD_PURCHASING).length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-[10px] italic">Kosong</div>
                  )}
                </div>
              </div>

              {/* Col 4: Fully Released */}
              <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100/50 flex flex-col min-h-[220px]">
                <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest font-display">
                    🖨️ Released Cetak
                  </span>
                  <span className="bg-emerald-100/50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED).length}
                  </span>
                </div>
                <div className="space-y-2 flex-grow overflow-y-auto max-h-[260px] pr-0.5">
                  {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED).map(p => (
                    <div key={p.id} className="bg-white p-2.5 rounded-lg shadow-sm border border-emerald-100 text-[11px] space-y-1.5">
                      <div className="font-bold text-emerald-900 truncate">{p.name}</div>
                      <div className="text-emerald-400 font-mono text-[9px] flex justify-between items-center">
                        <span>{p.docType} V{p.version}</span>
                        {currentUser.role === Role.ADMINISTRATOR && (
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-0.5 ml-2 cursor-pointer"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Hapus
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setViewingSheetProject(p)}
                        id={`btn-view-sheet-${p.id}`}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2 rounded-lg text-[10px] transition duration-150 shadow-sm"
                      >
                        📄 Lihat Lembar ACC
                      </button>
                    </div>
                  ))}
                  {projects.filter(p => p.status === ProjectStatus.FULLY_RELEASED).length === 0 && (
                    <div className="text-center py-8 text-slate-300 text-[10px] italic">Kosong</div>
                  )}
                </div>
              </div>

            </div>
          </div>
      </main>

      {/* 5. MODAL: FULL AUTHORITATIVE APPROVAL SHEET VIEWER */}
      {viewingSheetProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl p-5 overflow-hidden max-h-[90vh] flex flex-col border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 no-print">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 font-display">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                DOKUMEN PENGESAHAN CETAK RESMI (TERKUNCI)
              </span>
              <button
                onClick={() => setViewingSheetProject(null)}
                className="text-slate-400 hover:text-slate-800 text-sm font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                id="btn-close-modal"
              >
                ✕ Tutup
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-1">
              <ContentApprovalSheet 
                project={viewingSheetProject} 
                onPrint={() => window.print()}
              />
            </div>

            <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center no-print">
              <span className="text-[10px] text-slate-400 font-mono">
                Sistem Otentikasi Sansico Medica
              </span>
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-1.5 px-4 rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                id="btn-print-action"
              >
                <Printer className="w-4 h-4" />
                Cetak Lembar Pengesahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.1. CUSTOM CONFIRMATION DIALOG (Non-blocking for Sandbox/Iframe) */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl flex-shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-sm">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-50">
              <button
                onClick={() => setConfirmDialog(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition duration-150 cursor-pointer"
              >
                {confirmDialog.cancelText || "Batal"}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                {confirmDialog.confirmText || "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.2. CUSTOM ALERT DIALOG (Non-blocking for Sandbox/Iframe) */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl flex-shrink-0">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-sm">
                  {alertDialog.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {alertDialog.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-50">
              <button
                onClick={() => setAlertDialog(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-xl transition duration-150 cursor-pointer shadow-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOTTOM METADATA FOOTER */}
      <footer className="bg-white text-slate-400 text-xs py-8 border-t border-slate-100 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-mono text-[9px] text-slate-400">
            © 2026 Artwork Approval System Sansico Medica. Hak Cipta Dilindungi Undang-Undang.
          </p>
          <p className="text-[9px] text-slate-400/80 max-w-2xl mx-auto leading-relaxed">
            Diterbitkan untuk memastikan pematuhan mutlak nomor NIE Kemenkes RI, melacak tanggung jawab berlapis, serta menghapus kesalahan produksi cetak.
          </p>
        </div>
      </footer>
    </div>
  );
}
