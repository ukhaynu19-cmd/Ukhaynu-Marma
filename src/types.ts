/**
 * Types for the Teacher Class Reminder App
 */

export interface ClassSchedule {
  id: string | number;
  subject: string;
  section: string;
  day: string;
  time: string; // "HH:MM" 24h format
  room: string;
  color?: string; // Hex color or pre-defined tailwind color name
  notes?: string;
  enabled?: boolean; // Toggle reminders for this specific class
}

export type DaysOfWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface ReminderConfig {
  minutesBefore: number; // e.g. 10
  enableAudio: boolean; // Sound chime
  enableWebNotification: boolean; // System notification
}
