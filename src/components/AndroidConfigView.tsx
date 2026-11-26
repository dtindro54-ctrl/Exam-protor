import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_CONFIG, ExamBrowserConfig, ScreenOrientation } from '../types/exam';
import { isValidApplicationId } from '../utils/examCrypto';

interface AndroidConfigViewProps {
  config: ExamBrowserConfig;
  onChange: (next: ExamBrowserConfig) => void;
  onGoToWorkflow: () => void;
}

interface SecurityToggleItem {
  key: keyof Pick<
    ExamBrowserConfig,
    | 'enableFlagSecure'
    | 'enableLockTask'
    | 'enableAntiSplitScreen'
    | 'enableOnStopAlarm'
    | 'enableBackProtection'
    | 'enableVolumeDownExit'
    | 'usesCleartextTraffic'
  >;
  title: string;
  apiRef: string;
  description: string;
}

const SECURITY_TOGGLES: SecurityToggleItem[] = [
  {
    key: 'enableFlagSecure',
    title: 'Blokir Screenshot & Rekam Layar',
    apiRef: 'WindowManager.LayoutParams.FLAG_SECURE',
    description: 'Mencegah peserta mengambil tangkapan layar maupun merekam layar selama aplikasi berjalan.',
  },
  {
    key: 'enableLockTask',
    title: 'Mode Kiosk / Sematkan Layar',
    apiRef: 'startLockTask() · lockTaskMode="if_whitelisted"',
    description: 'Mengunci aplikasi di layar utama Android saat URL ujian berhasil dimuat.',
  },
  {
    key: 'enableAntiSplitScreen',
    title: 'Anti Split-Screen & Multi-Window',
    apiRef: 'onMultiWindowModeChanged() · resizeableActivity="false"',
    description: 'Membunyikan alarm darurat dan menutup sesi otomatis jika perangkat masuk mode layar belah.',
  },
  {
    key: 'enableOnStopAlarm',
    title: 'Alarm Keluar Aplikasi',
    apiRef: 'onStop() · TONE_CDMA_EMERGENCY_RINGBACK',
    description: 'Memicu nada alarm 3 detik melalui STREAM_ALARM bila peserta berpindah ke aplikasi lain.',
  },
  {
    key: 'enableBackProtection',
    title: 'Kunci Tombol Kembali (Back)',
    apiRef: 'OnBackPressedCallback',
    description: 'Menonaktifkan navigasi kembali sistem Android agar peserta tidak sengaja keluar dari ujian.',
  },
  {
    key: 'enableVolumeDownExit',
    title: 'Keluar via Volume Bawah + PIN',
    apiRef: 'KEYCODE_VOLUME_DOWN · tampilkanDialogKeluar()',
    description: 'Menampilkan dialog PIN pengawas hanya ketika tombol fisik Volume Bawah ditekan.',
  },
  {
    key: 'usesCleartextTraffic',
    title: 'Izinkan Server Lokal HTTP',
    apiRef: 'android:usesCleartextTraffic',
    description: 'Aktifkan jika server CBT lokal sekolah menggunakan alamat IP LAN (http://192.168.x.x) tanpa HTTPS.',
  },
];

export function AndroidConfigView({
  config,
  onChange,
  onGoToWorkflow,
}: AndroidConfigViewProps) {
  const appIdValid = isValidApplicationId(config.applicationId);

  const activeProtectionCount = [
    config.enableFlagSecure,
    config.enableLockTask,
    config.enableAntiSplitScreen,
    config.enableOnStopAlarm,
    config.enableBackProtection,
    config.enableVolumeDownExit,
  ].filter(Boolean).length;

  const updateField = <K extends keyof ExamBrowserConfig>(
    key: K,
    value: ExamBrowserConfig[K],
  ) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Konfigurasi APK Android
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Setiap perubahan langsung memperbarui file <span className="font-mono text-slate-800">build.yml</span>, <span className="font-mono text-slate-800">MainActivity.kt</span>, dan generator QR secara otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_CONFIG)}
            className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>
          <button
            type="button"
            onClick={onGoToWorkflow}
            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            Lihat Kode & build.yml
          </button>
        </div>
      </div>

      {/* Summary metric row (flat hairline grid, no nested cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs text-slate-500">Application ID</p>
          <p className="mt-1 text-sm font-semibold font-mono text-slate-900 truncate">
            {config.applicationId}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Target / Min SDK</p>
          <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-900">
            API {config.targetSdk} / Min {config.minSdk}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Proteksi Aktif</p>
          <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-900">
            {activeProtectionCount} dari 6 modul
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">PIN & Header</p>
          <p className="mt-1 text-sm font-semibold font-mono tabular-nums text-slate-900 truncate">
            PIN {config.pinPengawas} · {config.secretHeaderName}
          </p>
        </div>
      </div>

      {/* Two-column settings layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Identity & Credentials */}
        <div className="lg:col-span-6 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Identitas Aplikasi & Build Gradle
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Digunakan pada <span className="font-mono">app/build.gradle</span> dan <span className="font-mono">AndroidManifest.xml</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="cfg-app-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama Aplikasi (android:label)
                </label>
                <input
                  id="cfg-app-name"
                  type="text"
                  value={config.appName}
                  onChange={(e) => updateField('appName', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="cfg-app-id" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Application ID / Package Name
                </label>
                <input
                  id="cfg-app-id"
                  type="text"
                  value={config.applicationId}
                  onChange={(e) => updateField('applicationId', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
                {!appIdValid && (
                  <p className="mt-1 text-xs text-red-600">
                    Format package harus huruf kecil dipisah titik, contoh: sch.id.exambrowser
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="cfg-version-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Version Name
                </label>
                <input
                  id="cfg-version-name"
                  type="text"
                  value={config.versionName}
                  onChange={(e) => updateField('versionName', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="cfg-version-code" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Version Code
                </label>
                <input
                  id="cfg-version-code"
                  type="number"
                  min={1}
                  value={config.versionCode}
                  onChange={(e) => updateField('versionCode', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="cfg-orientation" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Orientasi Layar
                </label>
                <select
                  id="cfg-orientation"
                  value={config.screenOrientation}
                  onChange={(e) => updateField('screenOrientation', e.target.value as ScreenOrientation)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="portrait">Portrait (Terkunci Tegak)</option>
                  <option value="landscape">Landscape (Terkunci Mendatar)</option>
                  <option value="unspecified">Fleksibel (Mengikuti Sensor)</option>
                </select>
              </div>

              <div>
                <label htmlFor="cfg-branches" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Branch Trigger GitHub
                </label>
                <input
                  id="cfg-branches"
                  type="text"
                  value={config.triggerBranches}
                  onChange={(e) => updateField('triggerBranches', e.target.value)}
                  placeholder="main, master, utama"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Kredensial Pengawas & Enkripsi QR
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ditanamkan ke <span className="font-mono">MainActivity.kt</span> untuk validasi QR dan autentikasi server CBT.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cfg-pin" className="block text-xs font-medium text-slate-700 mb-1.5">
                  PIN Pengawas (Keluar Ujian)
                </label>
                <input
                  id="cfg-pin"
                  type="text"
                  value={config.pinPengawas}
                  onChange={(e) => updateField('pinPengawas', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="cfg-prefix" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Prefix QR Terenkripsi
                </label>
                <input
                  id="cfg-prefix"
                  type="text"
                  value={config.qrPrefix}
                  onChange={(e) => updateField('qrPrefix', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="cfg-header-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nama HTTP Header Rahasia
                </label>
                <input
                  id="cfg-header-name"
                  type="text"
                  value={config.secretHeaderName}
                  onChange={(e) => updateField('secretHeaderName', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="cfg-header-value" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nilai Token Header
                </label>
                <input
                  id="cfg-header-value"
                  type="text"
                  value={config.secretHeaderValue}
                  onChange={(e) => updateField('secretHeaderValue', e.target.value)}
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right column: Security Protection Modules */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Modul Proteksi Anti-Kecurangan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aktifkan atau nonaktifkan lapisan pengamanan bawaan Android pada APK hasil build.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {SECURITY_TOGGLES.map((item) => {
              const checked = config[item.key];
              return (
                <div
                  key={item.key}
                  className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-slate-900">
                        {item.title}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {item.apiRef}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={item.title}
                    onClick={() => updateField(item.key, !checked)}
                    className={`relative inline-flex h-6 w-11 shrink-0 mt-0.5 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                      checked ? 'bg-blue-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
