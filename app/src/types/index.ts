// Core data types for the Symptom Tracker app

export type Symptom = {
  id: string;
  name: string;
  createdAt: string; // ISO date string
};

/** Severity on a 1-5 scale: 1 = mild, 5 = severe */
export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export type LogEntry = {
  symptomId: string;
  severity: SeverityLevel;
};

export type DailyLog = {
  date: string; // YYYY-MM-DD
  entries: LogEntry[];
  note?: string;
};

export type AppSettings = {
  symptoms: Symptom[];
  reminderTime: string | null; // "HH:MM" format, or null if no reminder
  hasCompletedOnboarding: boolean;
  accountEmail: string | null;
};
