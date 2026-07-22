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
export function subscribeUsers(callback: (users: UserAccount[]) => void) {
  return onSnapshot(collection(db, USERS_COL), (snapshot) => {
    const list: UserAccount[] = snapshot.docs.map((docSnap) => docSnap.data() as UserAccount);
    callback(list);
  }, (err) => {
    console.error("Firestore users subscription error:", err);
  });
}

// Subscribe to Projects collection
export function subscribeProjects(callback: (projects: Project[]) => void) {
  return onSnapshot(collection(db, PROJECTS_COL), (snapshot) => {
    const list: Project[] = snapshot.docs.map((docSnap) => docSnap.data() as Project);
    // Sort projects by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.error("Firestore projects subscription error:", err);
  });
}

// Subscribe to Notifications collection
export function subscribeNotifications(callback: (logs: NotificationLog[]) => void) {
  return onSnapshot(collection(db, NOTIFICATIONS_COL), (snapshot) => {
    const list: NotificationLog[] = snapshot.docs.map((docSnap) => docSnap.data() as NotificationLog);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(list);
  }, (err) => {
    console.error("Firestore notifications subscription error:", err);
  });
}

// --- CRUD Operations ---

// Save or Update a User
export async function saveUserToFirestore(user: UserAccount) {
  try {
    await setDoc(doc(db, USERS_COL, user.id), user, { merge: true });
  } catch (err) {
    console.error("Error saving user to Firestore:", err);
  }
}

// Save or Update a Project
export async function saveProjectToFirestore(project: Project) {
  try {
    await setDoc(doc(db, PROJECTS_COL, project.id), project, { merge: true });
  } catch (err) {
    console.error("Error saving project to Firestore:", err);
  }
}

// Delete a Project
export async function deleteProjectFromFirestore(projectId: string) {
  try {
    await deleteDoc(doc(db, PROJECTS_COL, projectId));
  } catch (err) {
    console.error("Error deleting project from Firestore:", err);
  }
}

// Delete a User
export async function deleteUserFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (err) {
    console.error("Error deleting user from Firestore:", err);
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
  } catch (err) {
    console.error("Error clearing notifications in Firestore:", err);
  }
}

// Save or Update a Notification Log
export async function saveNotificationToFirestore(log: NotificationLog) {
  try {
    await setDoc(doc(db, NOTIFICATIONS_COL, log.id), log, { merge: true });
  } catch (err) {
    console.error("Error saving notification to Firestore:", err);
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
        batch.set(doc(db, USERS_COL, u.id), u);
      });
      await batch.commit();
    }

    const projectSnap = await getDocs(collection(db, PROJECTS_COL));
    if (projectSnap.empty) {
      console.log("Seeding default projects to Firestore...");
      const batch = writeBatch(db);
      defaultProjects.forEach((p) => {
        batch.set(doc(db, PROJECTS_COL, p.id), p);
      });
      await batch.commit();
    }

    const notifSnap = await getDocs(collection(db, NOTIFICATIONS_COL));
    if (notifSnap.empty && defaultNotifications.length > 0) {
      console.log("Seeding default notifications to Firestore...");
      const batch = writeBatch(db);
      defaultNotifications.forEach((n) => {
        batch.set(doc(db, NOTIFICATIONS_COL, n.id), n);
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
