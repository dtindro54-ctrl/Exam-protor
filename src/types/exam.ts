export type ScreenOrientation = 'portrait' | 'landscape' | 'unspecified';

export type ActiveView = 'qr' | 'config' | 'workflow' | 'simulator';

export interface ExamBrowserConfig {
  appName: string;
  applicationId: string;
  versionName: string;
  versionCode: number;
  minSdk: number;
  targetSdk: number;
  pinPengawas: string;
  qrPrefix: string;
  secretHeaderName: string;
  secretHeaderValue: string;
  screenOrientation: ScreenOrientation;
  triggerBranches: string;
  enableFlagSecure: boolean;
  enableLockTask: boolean;
  enableAntiSplitScreen: boolean;
  enableOnStopAlarm: boolean;
  enableBackProtection: boolean;
  enableVolumeDownExit: boolean;
  usesCleartextTraffic: boolean;
}

export interface ExamSession {
  id: string;
  title: string;
  subject: string;
  room: string;
  url: string;
  durationMinutes: number;
  createdAt: string;
}

export interface DecodedQrResult {
  valid: boolean;
  url?: string;
  encodedPart?: string;
  error?: string;
}

export interface GeneratedProjectFile {
  path: string;
  label: string;
  language: 'yaml' | 'kotlin' | 'xml' | 'gradle' | 'properties';
  content: string;
}

export interface SimulatorLogEntry {
  id: string;
  timestamp: string;
  event: string;
  callback: string;
  detail: string;
  severity: 'normal' | 'warning' | 'violation';
}

export const DEFAULT_CONFIG: ExamBrowserConfig = {
  appName: 'Exam Browser',
  applicationId: 'com.example.exambrowser',
  versionName: '1.0',
  versionCode: 1,
  minSdk: 24,
  targetSdk: 34,
  pinPengawas: '1234',
  qrPrefix: 'EXAMSEC::',
  secretHeaderName: 'X-Exam-Client',
  secretHeaderValue: 'EXAM-SECURE-2026',
  screenOrientation: 'portrait',
  triggerBranches: 'main, master, utama',
  enableFlagSecure: true,
  enableLockTask: true,
  enableAntiSplitScreen: true,
  enableOnStopAlarm: true,
  enableBackProtection: true,
  enableVolumeDownExit: true,
  usesCleartextTraffic: true,
};

export const DEFAULT_SESSIONS: ExamSession[] = [
  {
    id: 'uts-matematika-xi',
    title: 'UTS Matematika Wajib Kelas XI',
    subject: 'Matematika',
    room: 'Ruang Lab CBT 01',
    url: 'https://cbt.sekolah.sch.id/ujian/uts-matematika-xi',
    durationMinutes: 90,
    createdAt: '2026-11-20',
  },
  {
    id: 'pas-binggris-xii',
    title: 'PAS Bahasa Inggris Kelas XII',
    subject: 'Bahasa Inggris',
    room: 'Ruang Lab CBT 02',
    url: 'https://cbt.sekolah.sch.id/ujian/pas-bahasa-inggris-xii',
    durationMinutes: 120,
    createdAt: '2026-11-20',
  },
  {
    id: 'tryout-snbt-literasi',
    title: 'Tryout Literasi & Penalaran',
    subject: 'Umum',
    room: 'Aula Utama',
    url: 'https://exam.sekolah.sch.id/sesi/tryout-literasi-01',
    durationMinutes: 75,
    createdAt: '2026-11-19',
  },
];
