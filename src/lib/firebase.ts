import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  onSnapshot, 
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserAccount, Project, NotificationLog } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with custom databaseId from configuration if present
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Firestore Collection References
export const USERS_COL = 'users';
export const PROJECTS_COL = 'projects';
export const NOTIFICATIONS_COL = 'notifications';

// --- Realtime Sync Helpers ---

// Subscribe to Users collection
export function subscribeUsers(
  callback: (users: UserAccount[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(collection(db, USERS_COL), (snapshot) => {
    const list: UserAccount[] = snapshot.docs.map((docSnap) => docSnap.data() as UserAccount);
    callback(list);
  }, (err) => {
    console.error("Firestore users subscription error:", err);
    if (onError) onError(err);
  });
}

// Subscribe to Projects collection
export function subscribeProjects(
  callback: (projects: Project[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(collection(db, PROJECTS_COL), async (snapshot) => {
    const rawList: Project[] = snapshot.docs.map((docSnap) => docSnap.data() as Project);
    
    // Hydrate full uncompressed file URLs from IndexedDB or Firestore subcollection chunks
    const hydratedList = await Promise.all(
      rawList.map((p) => hydrateProjectFiles(p))
    );

    // Sort projects by createdAt descending
    hydratedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(hydratedList);
  }, (err) => {
    console.error("Firestore projects subscription error:", err);
    if (onError) onError(err);
  });
}

// Subscribe to Notifications collection
export function subscribeNotifications(
  callback: (logs: NotificationLog[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(collection(db, NOTIFICATIONS_COL), (snapshot) => {
    const list: NotificationLog[] = snapshot.docs.map((docSnap) => docSnap.data() as NotificationLog);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(list);
  }, (err) => {
    console.error("Firestore notifications subscription error:", err);
    if (onError) onError(err);
  });
}

// --- Data Sanitizer for Firestore (Replaces undefined with null) ---
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, any>)[key];
    cleaned[key] = val === undefined ? null : sanitizeForFirestore(val);
  }
  return cleaned as T;
}

// --- CRUD Operations ---

// Save or Update a User
export async function saveUserToFirestore(user: UserAccount) {
  try {
    await setDoc(doc(db, USERS_COL, user.id), sanitizeForFirestore(user), { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn("Firestore write quota exceeded for saveUser. Saved locally.");
    } else {
      console.error("Error saving user to Firestore:", err);
    }
  }
}

import { saveFileToIndexedDB, getFileFromIndexedDB } from "./fileStorage";

const CHUNK_SIZE = 600000; // 600KB per chunk to safely fit within Firestore 1MB document limit

async function saveChunksToFirestore(projectId: string, subColName: string, fullDataUrl: string) {
  if (!fullDataUrl) return;
  try {
    const totalChunks = Math.ceil(fullDataUrl.length / CHUNK_SIZE);
    const chunksCol = collection(db, PROJECTS_COL, projectId, subColName);
    const existingSnap = await getDocs(chunksCol);
    
    const batch = writeBatch(db);
    existingSnap.docs.forEach((d) => batch.delete(d.ref));
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = fullDataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(chunksCol, `chunk_${i}`);
      batch.set(chunkRef, { index: i, data: chunkStr });
    }
    await batch.commit();
  } catch (err) {
    console.error(`Error saving ${subColName} chunks to Firestore for project ${projectId}:`, err);
  }
}

export async function loadChunksFromFirestore(projectId: string, subColName: string): Promise<string> {
  try {
    const chunksCol = collection(db, PROJECTS_COL, projectId, subColName);
    const snap = await getDocs(chunksCol);
    if (snap.empty) return "";
    const sorted = snap.docs
      .map((d) => d.data() as { index: number; data: string })
      .sort((a, b) => a.index - b.index);
    return sorted.map((c) => c.data).join("");
  } catch (err) {
    console.error(`Error loading ${subColName} chunks from Firestore for project ${projectId}:`, err);
    return "";
  }
}

export async function hydrateProjectFiles(project: Project): Promise<Project> {
  let pdfUrl = project.pdfFileUrl;
  let nieUrl = project.nieFileUrl;

  const pdfCacheKey = `pdf_${project.id}_${project.updatedAt || project.version || 'v1'}`;
  const nieCacheKey = `nie_${project.id}_${project.updatedAt || 'v1'}`;

  // 1. Check versioned local IndexedDB first
  if (!pdfUrl) {
    const cachedPdf = await getFileFromIndexedDB(pdfCacheKey);
    if (cachedPdf) pdfUrl = cachedPdf;
  }
  if (!nieUrl) {
    const cachedNie = await getFileFromIndexedDB(nieCacheKey);
    if (cachedNie) nieUrl = cachedNie;
  }

  // 2. Fetch latest chunks from Firestore if flagged and missing or updated
  if (!pdfUrl && (project as any).hasPdfChunks) {
    pdfUrl = await loadChunksFromFirestore(project.id, "pdfChunks");
    if (pdfUrl) {
      await saveFileToIndexedDB(pdfCacheKey, pdfUrl);
    }
  }

  if (!nieUrl && (project as any).hasNieChunks) {
    nieUrl = await loadChunksFromFirestore(project.id, "nieChunks");
    if (nieUrl) {
      await saveFileToIndexedDB(nieCacheKey, nieUrl);
    }
  }

  return {
    ...project,
    pdfFileUrl: pdfUrl || project.pdfFileUrl,
    nieFileUrl: nieUrl || project.nieFileUrl,
  };
}

// Save or Update a Project losslessly
export async function saveProjectToFirestore(project: Project) {
  try {
    let pdfUrlToStore: string | undefined = project.pdfFileUrl;
    let nieUrlToStore: string | undefined = project.nieFileUrl;
    let hasPdfChunks = Boolean((project as any).hasPdfChunks);
    let hasNieChunks = Boolean((project as any).hasNieChunks);

    const pdfCacheKey = `pdf_${project.id}_${project.updatedAt || project.version || 'v1'}`;
    const nieCacheKey = `nie_${project.id}_${project.updatedAt || 'v1'}`;

    if (project.pdfFileUrl) {
      await saveFileToIndexedDB(pdfCacheKey, project.pdfFileUrl);
      if (project.pdfFileUrl.length > CHUNK_SIZE) {
        hasPdfChunks = true;
        await saveChunksToFirestore(project.id, "pdfChunks", project.pdfFileUrl);
        pdfUrlToStore = undefined; // Kept in chunks subcollection & IndexedDB
      } else {
        hasPdfChunks = false;
      }
    }

    if (project.nieFileUrl) {
      await saveFileToIndexedDB(nieCacheKey, project.nieFileUrl);
      if (project.nieFileUrl.length > CHUNK_SIZE) {
        hasNieChunks = true;
        await saveChunksToFirestore(project.id, "nieChunks", project.nieFileUrl);
        nieUrlToStore = undefined; // Kept in chunks subcollection & IndexedDB
      } else {
        hasNieChunks = false;
      }
    }

    const docToSave = sanitizeForFirestore({
      ...project,
      pdfFileUrl: pdfUrlToStore || null,
      nieFileUrl: nieUrlToStore || null,
      hasPdfChunks,
      hasNieChunks,
    });

    await setDoc(doc(db, PROJECTS_COL, project.id), docToSave, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn("Firestore write quota exceeded for saveProject. Saved in IndexedDB/Local storage.");
    } else {
      console.error("Error saving project to Firestore:", err);
    }
  }
}

// Delete a Project
export async function deleteProjectFromFirestore(projectId: string) {
  try {
    await deleteDoc(doc(db, PROJECTS_COL, projectId));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn("Firestore write quota exceeded for deleteProject.");
    } else {
      console.error("Error deleting project from Firestore:", err);
    }
  }
}

// Delete a User
export async function deleteUserFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn("Firestore write quota exceeded for deleteUser.");
    } else {
      console.error("Error deleting user from Firestore:", err);
    }
  }
}

// Clear all notifications in Firestore
export async function clearNotificationsInFirestore() {
  try {
    const snap = await getDocs(collection(db, NOTIFICATIONS_COL));
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn("Firestore write quota exceeded for clearNotifications.");
    } else {
      console.error("Error clearing notifications in Firestore:", err);
    }
  }
}

// Save or Update a Notification Log
export async function saveNotificationToFirestore(log: NotificationLog) {
  try {
    await setDoc(doc(db, NOTIFICATIONS_COL, log.id), sanitizeForFirestore(log), { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn("Firestore write quota exceeded for saveNotification.");
    } else {
      console.error("Error saving notification to Firestore:", err);
    }
  }
}

// Seed initial data if collection is empty
export async function seedInitialFirestoreData(
  defaultUsers: UserAccount[], 
  defaultProjects: Project[], 
  defaultNotifications: NotificationLog[]
) {
  try {
    const localSeeded = typeof window !== "undefined" && localStorage.getItem("sansico_db_has_seeded_v1");
    
    // Check system config doc in Firestore
    const configRef = doc(db, "_system", "app_config");
    const configSnap = await getDoc(configRef);

    if (localSeeded || configSnap.exists()) {
      // System was already initialized before; do NOT re-seed deleted items
      if (!localSeeded && typeof window !== "undefined") {
        localStorage.setItem("sansico_db_has_seeded_v1", "true");
      }
      return;
    }

    // First time setup only
    const userSnap = await getDocs(collection(db, USERS_COL));
    if (userSnap.empty) {
      console.log("Seeding default users to Firestore...");
      const batch = writeBatch(db);
      defaultUsers.forEach((u) => {
        batch.set(doc(db, USERS_COL, u.id), sanitizeForFirestore(u));
      });
      await batch.commit();
    }

    const projectSnap = await getDocs(collection(db, PROJECTS_COL));
    if (projectSnap.empty) {
      console.log("Seeding default projects to Firestore...");
      const batch = writeBatch(db);
      defaultProjects.forEach((p) => {
        batch.set(doc(db, PROJECTS_COL, p.id), sanitizeForFirestore(p));
      });
      await batch.commit();
    }

    const notifSnap = await getDocs(collection(db, NOTIFICATIONS_COL));
    if (notifSnap.empty && defaultNotifications.length > 0) {
      console.log("Seeding default notifications to Firestore...");
      const batch = writeBatch(db);
      defaultNotifications.forEach((n) => {
        batch.set(doc(db, NOTIFICATIONS_COL, n.id), sanitizeForFirestore(n));
      });
      await batch.commit();
    }

    // Mark system as seeded
    await setDoc(configRef, { seededAt: new Date().toISOString(), version: "1.0" });
    if (typeof window !== "undefined") {
      localStorage.setItem("sansico_db_has_seeded_v1", "true");
    }
  } catch (err) {
    console.error("Error seeding initial data to Firestore:", err);
  }
}
