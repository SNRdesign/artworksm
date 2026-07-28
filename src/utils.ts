/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, ProjectStatus, NotificationLog, Role } from "./types";

/**
 * Helper to determine if a notification is relevant to a user's role.
 */
export function isNotificationForRole(notif: NotificationLog, userRole: Role): boolean {
  if (userRole === Role.ADMINISTRATOR) return true;

  if (notif.targetRoles && Array.isArray(notif.targetRoles) && notif.targetRoles.length > 0) {
    return notif.targetRoles.includes(userRole);
  }

  // Text-based fallback matching for older logs
  const msg = (notif.message || "").toLowerCase();
  if (userRole === Role.DESAIN) {
    return msg.includes("desain") || msg.includes("ditolak") || msg.includes("revisi") || msg.includes("kembali ke tim desain");
  }
  if (userRole === Role.PRODUK) {
    return msg.includes("produk") || msg.includes("ditinjau") || msg.includes("acc") || msg.includes("nie");
  }
  if (userRole === Role.PURCHASING) {
    return msg.includes("purchasing") || msg.includes("hold") || msg.includes("cetak") || msg.includes("rilis") || msg.includes("alarm expired");
  }
  return false;
}

/**
 * Checks if a given Date is within the working hours:
 * - Monday (1) to Friday (5)
 * - Between 08:00 and 17:00 (inclusive of 08:00:00 to 16:59:59)
 */
export function isWorkingHour(date: Date): boolean {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 0 || day === 6) return false;
  
  const hours = date.getHours();
  return hours >= 8 && hours < 17;
}

/**
 * Advances a date by N working hours
 */
export function addWorkingHours(startDateStr: string, hoursToAdd: number): string {
  const date = new Date(startDateStr);
  let remainingMinutes = hoursToAdd * 60;
  
  while (remainingMinutes > 0) {
    // Move forward by 1 minute
    date.setMinutes(date.getMinutes() + 1);
    if (isWorkingHour(date)) {
      remainingMinutes--;
    }
  }
  return date.toISOString();
}

/**
 * Calculates the total working minutes between two dates
 */
export function getWorkingMinutesBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (start >= end) return 0;
  
  let workingMinutes = 0;
  const current = new Date(start.getTime());
  
  // To avoid huge loops for long durations, we can advance in blocks or minute-by-minute
  // For safety in this simulator (typically small steps), we advance minute-by-minute
  const maxSafetySteps = 1000000; // safety valve
  let steps = 0;
  
  while (current < end && steps < maxSafetySteps) {
    steps++;
    current.setMinutes(current.getMinutes() + 1);
    if (isWorkingHour(current)) {
      workingMinutes++;
    }
  }
  
  return workingMinutes;
}

/**
 * Formats a Date nicely in Indonesian locale
 */
export function formatIndonesianDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return date.toLocaleDateString("id-ID", options);
}

/**
 * Simulates checking for notifications and reminders between two timestamps:
 * - Trigger task summary on crossing 08:00 AM
 * - Trigger urgent warning on crossing 14:00 PM
 * - Trigger 6-working-hour delay reminder for any pending projects
 */
export function checkTimeBasedEvents(
  projects: Project[],
  fromTimeStr: string,
  toTimeStr: string
): NotificationLog[] {
  const logs: NotificationLog[] = [];
  const fromDate = new Date(fromTimeStr);
  const toDate = new Date(toTimeStr);
  
  if (fromDate >= toDate) return [];
  
  // We will scan hour-by-hour or step-by-step from fromDate to toDate
  // to detect crossing of 08:00 and 14:00, and for working hours elapsed.
  const tempDate = new Date(fromDate.getTime());
  
  // Track which days we already triggered the 08:00 and 14:00 alerts during this tick
  const triggeredAMDays = new Set<string>();
  const triggeredPMDays = new Set<string>();
  
  // Step through each minute or hour. Let's do 10-minute steps for speed,
  // but precise detection of boundaries.
  const stepMinutes = 10;
  while (tempDate < toDate) {
    const prevHour = tempDate.getHours();
    const prevDayStr = `${tempDate.getFullYear()}-${tempDate.getMonth()}-${tempDate.getDate()}`;
    
    tempDate.setMinutes(tempDate.getMinutes() + stepMinutes);
    if (tempDate > toDate) {
      tempDate.setTime(toDate.getTime());
    }
    
    const currHour = tempDate.getHours();
    const currDay = tempDate.getDay();
    const currDayStr = `${tempDate.getFullYear()}-${tempDate.getMonth()}-${tempDate.getDate()}`;
    
    // Only check working days (Monday-Friday) for daily triggers
    if (currDay !== 0 && currDay !== 6) {
      // 08:00 AM trigger (Task Summary)
      // If we crossed 08:00
      if (((prevHour < 8 && currHour >= 8) || (prevDayStr !== currDayStr && currHour >= 8)) && !triggeredAMDays.has(currDayStr)) {
        triggeredAMDays.add(currDayStr);
        
        // Find pending projects
        const pendingCount = projects.filter(
          p => p.status === ProjectStatus.PENDING_PRODUCT || p.status === ProjectStatus.NEED_REVISION
        ).length;
        
        if (pendingCount > 0) {
          const targetRoles: Role[] = [];
          if (projects.some(p => p.status === ProjectStatus.PENDING_PRODUCT)) targetRoles.push(Role.PRODUK);
          if (projects.some(p => p.status === ProjectStatus.NEED_REVISION)) targetRoles.push(Role.DESAIN);
          targetRoles.push(Role.ADMINISTRATOR);

          logs.push({
            id: `summary-${currDayStr}-${Date.now()}-${Math.random()}`,
            timestamp: new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 8, 0, 0).toISOString(),
            type: "INFO",
            message: `[PENGINGAT PAGI - 08:00] Terdapat ${pendingCount} berkas artwork yang tertahan dalam antrean persetujuan. Mohon segera diproses.`,
            targetRoles,
          });
        }
      }
      
      // 14:00 PM trigger (Urgent Warning)
      if (((prevHour < 14 && currHour >= 14) || (prevDayStr !== currDayStr && currHour >= 14)) && !triggeredPMDays.has(currDayStr)) {
        triggeredPMDays.add(currDayStr);
        
        const untouchedProjects = projects.filter(
          p => p.status === ProjectStatus.PENDING_PRODUCT || p.status === ProjectStatus.NEED_REVISION
        );
        
        if (untouchedProjects.length > 0) {
          const targetRoles: Role[] = [];
          if (untouchedProjects.some(p => p.status === ProjectStatus.PENDING_PRODUCT)) targetRoles.push(Role.PRODUK);
          if (untouchedProjects.some(p => p.status === ProjectStatus.NEED_REVISION)) targetRoles.push(Role.DESAIN);
          targetRoles.push(Role.ADMINISTRATOR);

          logs.push({
            id: `warning-${currDayStr}-${Date.now()}-${Math.random()}`,
            timestamp: new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 14, 0, 0).toISOString(),
            type: "WARNING",
            message: `[PERINGATAN WASPADA - 14:00] Tindakan diperlukan! ${untouchedProjects.length} proyek belum disentuh hari ini. Segera lakukan verifikasi demi menghindari keterlambatan cetak.`,
            targetRoles,
          });
        }
      }
    }
  }

  // Also verify individual project 6-working-hour pending reminders
  projects.forEach((proj) => {
    if (
      proj.status === ProjectStatus.PENDING_PRODUCT ||
      proj.status === ProjectStatus.NEED_REVISION ||
      proj.status === ProjectStatus.DRAFT
    ) {
      const workingMinutesSinceChange = getWorkingMinutesBetween(proj.lastStatusChangedAt, toTimeStr);
      const workingHoursSinceChange = workingMinutesSinceChange / 60;
      
      if (workingHoursSinceChange >= 6) {
        // Calculate how many 6-hour slots have passed
        const remindersCount = Math.floor(workingHoursSinceChange / 6);
        const prevWorkingMinutes = getWorkingMinutesBetween(proj.lastStatusChangedAt, fromTimeStr);
        const prevRemindersCount = Math.floor((prevWorkingMinutes / 60) / 6);
        
        // If we crossed a new 6-working-hour boundary
        if (remindersCount > prevRemindersCount) {
          let roleName = "";
          let targetRoles: Role[] = [Role.ADMINISTRATOR];
          if (proj.status === ProjectStatus.PENDING_PRODUCT) {
            roleName = "Tim Produk";
            targetRoles.push(Role.PRODUK);
          }
          if (proj.status === ProjectStatus.NEED_REVISION || proj.status === ProjectStatus.DRAFT) {
            roleName = "Tim Desain";
            targetRoles.push(Role.DESAIN);
          }
          
          logs.push({
            id: `6hr-${proj.id}-${remindersCount}-${Date.now()}`,
            timestamp: toTimeStr,
            type: "WARNING",
            message: `[PENGINGAT 6 JAM] Proyek "${proj.name}" (${proj.docType} V${proj.version}) telah tertahan selama ${Math.round(workingHoursSinceChange)} jam kerja di antrean ${roleName}. Mohon segera ditindaklanjuti!`,
            projectId: proj.id,
            projectName: proj.name,
            targetRoles,
          });
        }
      }
    }
  });
  
  return logs;
}

/**
 * Generates a unique 8-character cryptographic digital signature simulation hash
 */
export function generateDigitalSignature(role: string, name: string, dateStr: string): string {
  const input = `${role}-${name}-${dateStr}-${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return "SAN-SM-" + Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
}
