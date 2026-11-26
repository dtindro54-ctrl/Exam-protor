import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Columns2,
  CornerDownLeft,
  Home,
  Lock,
  QrCode,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ExamBrowserConfig, ExamSession, SimulatorLogEntry } from '../types/exam';
import { decodeExamQrPayload, encodeExamQrPayload } from '../utils/examCrypto';
import { playEmergencyAlarm, stopEmergencyAlarm } from '../utils/alarmAudio';

interface DeviceSimulatorViewProps {
  config: ExamBrowserConfig;
  activeSession: ExamSession | null;
}

type SimScreen = 'locked_dialog' | 'camera_scan' | 'exam_active' | 'terminated';

const SAMPLE_QUESTIONS = [
  {
    number: 1,
    prompt: 'Jika f(x) = 3x² - 4x + 2, berapakah nilai dari f(2)?',
    options: ['6', '8', '10', '12'],
  },
  {
    number: 2,
    prompt: 'Turunan pertama dari fungsi g(x) = 4x³ - 2x + 7 adalah...',
    options: ['12x² - 2', '12x² + 7', '4x² - 2', '8x² - 2'],
  },
  {
    number: 3,
    prompt: 'Nilai limit x mendekati 3 untuk (x² - 9) / (x - 3) adalah...',
    options: ['0', '3', '6', '9'],
  },
];

function nowTimeString(): string {
  return new Date().toLocaleTimeString('id-ID', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function DeviceSimulatorView({ config, activeSession }: DeviceSimulatorViewProps) {
  const [screen, setScreen] = useState<SimScreen>('locked_dialog');
  const [loadedUrl, setLoadedUrl] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(true);
  const [alarmVisualActive, setAlarmVisualActive] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState((activeSession?.durationMinutes ?? 90) * 60);
  const [customQrInput, setCustomQrInput] = useState('');
  const [logs, setLogs] = useState<SimulatorLogEntry[]>([]);

  const toastTimerRef = useRef<number | null>(null);
  const alarmTimerRef = useRef<number | null>(null);

  const validSessionPayload = useMemo(() => {
    const targetUrl = activeSession?.url ?? 'https://cbt.sekolah.sch.id/ujian/uts-matematika-xi';
    return encodeExamQrPayload(targetUrl, config.qrPrefix);
  }, [activeSession, config.qrPrefix]);

  const appendLog = (
    event: string,
    callback: string,
    detail: string,
    severity: SimulatorLogEntry['severity'] = 'normal',
  ) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: nowTimeString(),
        event,
        callback,
        detail,
        severity,
      },
      ...prev.slice(0, 29),
    ]);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2800);
  };

  const triggerAlarm = (reason: string) => {
    setAlarmVisualActive(true);
    if (alarmSoundEnabled) {
      playEmergencyAlarm(2000);
    }
    if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current);
    alarmTimerRef.current = window.setTimeout(() => setAlarmVisualActive(false), 2100);
    appendLog('Alarm Darurat Aktif', 'ToneGenerator.startTone()', reason, 'violation');
  };

  useEffect(() => {
    if (screen !== 'exam_active') return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    return () => {
      stopEmergencyAlarm();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (alarmTimerRef.current) window.clearTimeout(alarmTimerRef.current);
    };
  }, []);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleResetSimulator = () => {
    stopEmergencyAlarm();
    setAlarmVisualActive(false);
    setScreen('locked_dialog');
    setLoadedUrl('');
    setShowPinDialog(false);
    setPinInput('');
    setSelectedAnswers({});
    setRemainingSeconds((activeSession?.durationMinutes ?? 90) * 60);
    appendLog(
      'Aplikasi Dimulai Ulang',
      'MainActivity.onCreate()',
      config.enableFlagSecure
        ? 'FLAG_SECURE diterapkan, menampilkan dialog kunci scan QR.'
        : 'Menampilkan dialog kunci scan QR.',
      'normal',
    );
  };

  const handleOpenScanner = () => {
    setScreen('camera_scan');
    appendLog(
      'Izin Kamera Terverifikasi',
      'barcodeLauncher.launch()',
      'ZXing ScanContract dibuka (orientationLocked).',
      'normal',
    );
  };

  const handleProcessQr = (qrRaw: string) => {
    const result = decodeExamQrPayload(qrRaw, config.qrPrefix);
    if (!result.valid || !result.url) {
      showToast('QR Code tidak valid atau bukan QR Ujian resmi!');
      appendLog(
        'QR Ditolak',
        'prosesQrTerenkripsi()',
        result.error || 'Format QR tidak sesuai prefix.',
        'warning',
      );
      setScreen('locked_dialog');
      return;
    }

    setLoadedUrl(result.url);
    setRemainingSeconds((activeSession?.durationMinutes ?? 90) * 60);
    setScreen('exam_active');
    appendLog(
      'Sesi Ujian Terkunci',
      'mulaiKunciUjian()',
      `WebView memuat ${result.url} dengan header ${config.secretHeaderName}: ${config.secretHeaderValue}${
        config.enableLockTask ? ' · startLockTask() aktif' : ''
      }`,
      'normal',
    );
  };

  const handlePressBack = () => {
    if (screen === 'terminated') return;
    if (config.enableBackProtection) {
      const msg = config.enableVolumeDownExit
        ? 'Tekan tombol Volume Bawah untuk keluar'
        : 'Tombol kembali dinonaktifkan selama ujian';
      showToast(msg);
      appendLog('Tombol Back Diblokir', 'OnBackPressedCallback', msg, 'warning');
    } else {
      setScreen('locked_dialog');
      appendLog('Tombol Back Ditekan', 'onBackPressed()', 'Proteksi Back nonaktif; kembali ke menu awal.', 'warning');
    }
  };

  const handlePressVolumeDown = () => {
    if (screen === 'terminated') return;
    if (!config.enableVolumeDownExit) {
      showToast('Pintasan Volume Bawah sedang dinonaktifkan di konfigurasi.');
      appendLog('Volume Bawah Diabaikan', 'onKeyDown()', 'Fitur keluar via Volume Bawah nonaktif.', 'normal');
      return;
    }
    setPinInput('');
    setShowPinDialog(true);
    appendLog('Dialog PIN Pengawas', 'onKeyDown(KEYCODE_VOLUME_DOWN)', 'Menampilkan dialog Akhiri Sesi Ujian.', 'normal');
  };

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === config.pinPengawas) {
      setShowPinDialog(false);
      setScreen('terminated');
      stopEmergencyAlarm();
      setAlarmVisualActive(false);
      appendLog(
        'Sesi Diakhiri Pengawas',
        'stopLockTask() · finishAffinity()',
        'PIN pengawas cocok. Aplikasi ditutup secara aman.',
        'normal',
      );
    } else {
      showToast('PIN Salah!');
      appendLog(
        'Percobaan PIN Gagal',
        'tampilkanDialogKeluar()',
        `Input PIN "${pinInput || '(kosong)'}" tidak cocok dengan PIN pengawas.`,
        'warning',
      );
    }
  };

  const handleSimulateSplitScreen = () => {
    if (screen !== 'exam_active') {
      showToast('Mulai sesi ujian terlebih dahulu untuk menguji Split Screen.');
      return;
    }
    if (!config.enableAntiSplitScreen) {
      showToast('Proteksi Anti Split-Screen sedang nonaktif di konfigurasi.');
      appendLog('Split Screen Tidak Diblokir', 'onMultiWindowModeChanged()', 'Modul Anti Split-Screen dinonaktifkan.', 'warning');
      return;
    }
    triggerAlarm('Split screen terdeteksi saat ujian aktif.');
    showToast('DILARANG SPLIT SCREEN!');
    appendLog(
      'Pelanggaran Split Screen',
      'onMultiWindowModeChanged(true)',
      'Sesi dihentikan paksa via finishAffinity().',
      'violation',
    );
    setScreen('terminated');
  };

  const handleSimulateLeaveApp = () => {
    if (screen !== 'exam_active') {
      showToast('Mulai sesi ujian terlebih dahulu untuk menguji perpindahan aplikasi.');
      return;
    }
    if (!config.enableOnStopAlarm) {
      showToast('Alarm keluar aplikasi sedang nonaktif di konfigurasi.');
      return;
    }
    triggerAlarm('Peserta menekan Home / berpindah aplikasi saat ujian aktif.');
    showToast('Peringatan: Aplikasi berpindah ke latar belakang!');
    appendLog(
      'Peserta Keluar Layar Ujian',
      'MainActivity.onStop()',
      'ujianAktif == true; alarm berbunyi 3 detik.',
      'violation',
    );
  };

  const handleSimulateScreenshot = () => {
    if (config.enableFlagSecure) {
      showToast('Tidak dapat mengambil screenshot karena kebijakan keamanan (FLAG_SECURE).');
      appendLog(
        'Screenshot Diblokir Sistem',
        'WindowManager.FLAG_SECURE',
        'Tangkapan layar dan screen recorder dicegah oleh Android.',
        'warning',
      );
    } else {
      showToast('Screenshot berhasil (FLAG_SECURE nonaktif).');
      appendLog(
        'Screenshot Diizinkan',
        'FLAG_SECURE nonaktif',
        'Perhatian: Aktifkan FLAG_SECURE pada menu Konfigurasi APK.',
        'warning',
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Simulator Keamanan ExamBrowser
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Uji alur scan QR terenkripsi, proteksi tombol Back, dialog PIN Volume Bawah, blokir Split-Screen, dan alarm <span className="font-mono text-slate-800">ToneGenerator</span> sebelum build APK.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !alarmSoundEnabled;
              setAlarmSoundEnabled(next);
              if (!next) stopEmergencyAlarm();
            }}
            className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {alarmSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{alarmSoundEnabled ? 'Suara Alarm Aktif' : 'Suara Alarm Bisu'}</span>
          </button>
          <button
            type="button"
            onClick={handleResetSimulator}
            className="h-9 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mulai Ulang APK</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Realistic Android Device Frame */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative flex items-center">
            {/* Hardware Frame */}
            <div
              className={`w-[320px] sm:w-[344px] h-[650px] rounded-[36px] bg-slate-900 p-3 border-2 transition-colors ${
                alarmVisualActive ? 'border-red-500' : 'border-slate-700'
              }`}
            >
              {/* Screen Bezel */}
              <div className="relative w-full h-full rounded-[26px] bg-white overflow-hidden flex flex-col">
                {/* Android Status Bar */}
                <div
                  className={`h-8 px-5 flex items-center justify-between text-[11px] font-mono tabular-nums transition-colors ${
                    alarmVisualActive
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-900 text-slate-200'
                  }`}
                >
                  <span>09:41</span>
                  <span className="truncate max-w-[140px] text-[10px]">
                    {screen === 'exam_active' && config.enableLockTask
                      ? 'Layar Disematkan'
                      : config.appName}
                  </span>
                  <span>100%</span>
                </div>

                {/* Screen Viewport */}
                <div className="relative flex-1 bg-slate-100 overflow-y-auto flex flex-col">
                  {/* State 1: Locked startup dialog */}
                  {screen === 'locked_dialog' && (
                    <div className="flex-1 bg-slate-900/45 flex items-center justify-center p-5">
                      <div className="w-full bg-white rounded-xl p-5 border border-slate-200 shadow-lg">
                        <h3 className="text-base font-bold text-slate-900">
                          {config.appName} Terkunci
                        </h3>
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                          Silakan pindai QR Code Ujian yang ditampilkan oleh pengawas.
                        </p>
                        <div className="mt-5 flex justify-end">
                          <button
                            type="button"
                            onClick={handleOpenScanner}
                            className="h-9 px-4 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
                          >
                            Scan QR Ujian
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* State 2: ZXing Camera Viewfinder */}
                  {screen === 'camera_scan' && (
                    <div className="flex-1 bg-slate-950 text-white p-5 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" />
                          ZXing Scanner
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            showToast('Scan dibatalkan');
                            appendLog('Scan Dibatalkan', 'barcodeLauncher', 'result.contents == null', 'normal');
                            setScreen('locked_dialog');
                          }}
                          className="text-slate-300 hover:text-white underline cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>

                      {/* Viewfinder box */}
                      <div className="my-4 flex flex-col items-center">
                        <div className="w-44 h-44 border-2 border-blue-400/80 rounded-xl relative flex items-center justify-center bg-slate-900/70">
                          <QrCode className="w-16 h-16 text-slate-500" />
                          <div className="absolute inset-x-3 top-1/2 h-0.5 bg-red-500/80" />
                        </div>
                        <p className="mt-3 text-xs text-slate-300 text-center">
                          Arahkan kamera ke QR Code Ujian
                        </p>
                      </div>

                      {/* Simulation Scan Triggers */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleProcessQr(validSessionPayload)}
                          className="w-full h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors cursor-pointer"
                        >
                          Pindai QR Sesi Aktif (Valid)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProcessQr('https://google.com/bukan-qr-ujian')}
                          className="w-full h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                        >
                          Pindai QR Umum (Uji Penolakan)
                        </button>
                        <div className="pt-1 flex gap-1.5">
                          <input
                            type="text"
                            value={customQrInput}
                            onChange={(e) => setCustomQrInput(e.target.value)}
                            placeholder="Tempel payload kustom..."
                            className="flex-1 h-8 px-2.5 rounded-md bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleProcessQr(customQrInput)}
                            disabled={!customQrInput.trim()}
                            className="h-8 px-2.5 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-[11px] font-medium text-white cursor-pointer"
                          >
                            Uji
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* State 3: Active WebView CBT Exam */}
                  {screen === 'exam_active' && (
                    <div className="flex-1 flex flex-col bg-white">
                      {/* WebView simulated CBT header */}
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {activeSession?.title ?? 'Portal Ujian CBT'}
                          </p>
                          <span className="text-xs font-mono font-semibold tabular-nums text-blue-700 shrink-0">
                            {formatTimer(remainingSeconds)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-mono text-slate-500 truncate">
                          {loadedUrl}
                        </p>
                        <p className="mt-1 text-[10px] font-mono text-emerald-700 truncate">
                          Header terkirim: {config.secretHeaderName}: {config.secretHeaderValue}
                        </p>
                      </div>

                      {/* Interactive sample CBT questions */}
                      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                        {SAMPLE_QUESTIONS.map((q) => (
                          <div key={q.number} className="pb-4 border-b border-slate-100 last:border-b-0">
                            <p className="text-xs font-semibold text-slate-900 leading-snug">
                              {q.number}. {q.prompt}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                              {q.options.map((opt) => {
                                const chosen = selectedAnswers[q.number] === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() =>
                                      setSelectedAnswers((prev) => ({ ...prev, [q.number]: opt }))
                                    }
                                    className={`px-2.5 py-1.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                                      chosen
                                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* State 4: Terminated (finishAffinity) */}
                  {screen === 'terminated' && (
                    <div className="flex-1 bg-slate-900 text-white p-6 flex flex-col items-center justify-center text-center">
                      <CheckCircle2 className="w-10 h-10 text-slate-400 mb-3" />
                      <h3 className="text-base font-semibold">Aplikasi Ditutup</h3>
                      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                        <span className="font-mono">finishAffinity()</span> dipanggil. Sesi ujian telah berakhir.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetSimulator}
                        className="mt-5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white cursor-pointer"
                      >
                        Buka {config.appName} Lagi
                      </button>
                    </div>
                  )}

                  {/* PIN Exit Dialog Overlay */}
                  {showPinDialog && (
                    <div className="absolute inset-0 z-20 bg-slate-900/60 flex items-center justify-center p-5">
                      <form
                        onSubmit={handleSubmitPin}
                        className="w-full bg-white rounded-xl p-5 border border-slate-200 shadow-lg"
                      >
                        <h3 className="text-sm font-bold text-slate-900">
                          Akhiri Sesi Ujian
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Masukkan PIN Pengawas ({config.pinPengawas}) untuk keluar dari mode terkunci.
                        </p>
                        <input
                          type="password"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="Masukkan PIN Pengawas"
                          autoFocus
                          className="mt-3 w-full h-9 px-3 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPinDialog(false)}
                            className="h-8 px-3 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="h-8 px-3.5 rounded-md bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 cursor-pointer"
                          >
                            Keluar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Android Toast */}
                  {toastMessage && (
                    <div className="absolute bottom-4 inset-x-4 z-30 flex justify-center pointer-events-none">
                      <div className="px-3.5 py-2 rounded-lg bg-slate-900/95 text-white text-[11px] leading-snug text-center shadow-md">
                        {toastMessage}
                      </div>
                    </div>
                  )}
                </div>

                {/* Android Navigation Bar */}
                <div className="h-11 bg-slate-950 px-8 flex items-center justify-between text-slate-400">
                  <button
                    type="button"
                    onClick={handlePressBack}
                    title="Tombol Back Android"
                    aria-label="Tombol Back Android"
                    className="h-8 px-3 rounded-md hover:bg-slate-800 hover:text-white inline-flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateLeaveApp}
                    title="Simulasi Tombol Home (onStop)"
                    aria-label="Simulasi Tombol Home"
                    className="h-8 px-3 rounded-md hover:bg-slate-800 hover:text-white inline-flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Home</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSimulateSplitScreen}
                    title="Simulasi Split Screen"
                    aria-label="Simulasi Split Screen"
                    className="h-8 px-3 rounded-md hover:bg-slate-800 hover:text-white inline-flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    <span>Split</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Physical Volume Down Button on Phone Side */}
            <button
              type="button"
              onClick={handlePressVolumeDown}
              title="Tekan Tombol Volume Bawah (Keluar dengan PIN)"
              className="hidden sm:flex -ml-0.5 flex-col items-center justify-center w-3 h-16 rounded-r-md bg-blue-700 hover:bg-blue-600 text-white transition-colors cursor-pointer"
              aria-label="Tombol Fisik Volume Bawah"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 text-center">
            Tekan tombol biru di sisi kanan perangkat atau kontrol uji di sebelah kanan untuk simulasi Volume Bawah.
          </p>
        </div>

        {/* Right: Security Test Controls & Interaction Event Log */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Panel Uji Perilaku Keamanan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Picu aksi perangkat keras dan skenario kecurangan untuk melihat respons <span className="font-mono">MainActivity.kt</span>.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePressVolumeDown}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-600/40 hover:bg-blue-50/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Lock className="w-4 h-4 text-blue-700" />
                  <span>Tekan Volume Bawah</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Buka dialog PIN pengawas (<span className="font-mono">{config.pinPengawas}</span>) untuk keluar.
                </p>
              </button>

              <button
                type="button"
                onClick={handlePressBack}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <CornerDownLeft className="w-4 h-4 text-slate-700" />
                  <span>Tekan Tombol Back</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Menguji blokir <span className="font-mono">OnBackPressedCallback</span>.
                </p>
              </button>

              <button
                type="button"
                onClick={handleSimulateSplitScreen}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span>Simulasi Split Screen</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Bunyikan alarm dan hentikan sesi via <span className="font-mono">finishAffinity()</span>.
                </p>
              </button>

              <button
                type="button"
                onClick={handleSimulateLeaveApp}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Keluar Aplikasi (onStop)</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Uji alarm darurat saat peserta berpindah ke aplikasi lain.
                </p>
              </button>

              <button
                type="button"
                onClick={handleSimulateScreenshot}
                className="sm:col-span-2 p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>Uji Tangkapan Layar (FLAG_SECURE)</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Memverifikasi status perlindungan screenshot dan perekam layar Android.
                </p>
              </button>
            </div>
          </section>

          {/* Interaction Event Log */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Catatan Aksi Simulator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Merekam callback Android yang terpicu dari interaksi pengujian Anda.
                </p>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-slate-700">Belum ada aktivitas pengujian</p>
                <p className="mt-1 text-xs text-slate-500">
                  Klik "Scan QR Ujian" pada layar perangkat atau tekan salah satu tombol uji di atas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
                    <tr>
                      <th className="py-2 pl-6 pr-3 w-24">Waktu</th>
                      <th className="py-2 px-3">Kejadian</th>
                      <th className="py-2 pl-3 pr-6">Callback / Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {logs.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2.5 pl-6 pr-3 font-mono tabular-nums text-slate-500 align-top whitespace-nowrap">
                          {entry.timestamp}
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              entry.severity === 'violation'
                                ? 'text-red-700'
                                : entry.severity === 'warning'
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {entry.event}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 pr-6 align-top">
                          <div className="font-mono text-slate-700">{entry.callback}</div>
                          <div className="text-slate-500 mt-0.5">{entry.detail}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
