import React, { useEffect, useMemo, useState } from 'react';
import {
  Code2,
  Download,
  Menu,
  QrCode,
  SlidersHorizontal,
  Smartphone,
  X,
} from 'lucide-react';
import {
  ActiveView,
  DEFAULT_CONFIG,
  DEFAULT_SESSIONS,
  ExamBrowserConfig,
  ExamSession,
} from './types/exam';
import {
  downloadTextFile,
  generateGitHubWorkflowYaml,
} from './utils/androidGenerator';
import { QrGeneratorView } from './components/QrGeneratorView';
import { AndroidConfigView } from './components/AndroidConfigView';
import { WorkflowCodeView } from './components/WorkflowCodeView';
import { DeviceSimulatorView } from './components/DeviceSimulatorView';

const STORAGE_CONFIG_KEY = 'exambrowser_studio_config_v1';
const STORAGE_SESSIONS_KEY = 'exambrowser_studio_sessions_v1';

interface NavItem {
  id: ActiveView;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'qr',
    label: 'Generator QR Ujian',
    breadcrumb: 'QR Ujian Terenkripsi',
    icon: QrCode,
  },
  {
    id: 'config',
    label: 'Konfigurasi APK',
    breadcrumb: 'Konfigurasi APK',
    icon: SlidersHorizontal,
  },
  {
    id: 'workflow',
    label: 'Workflow & Kode',
    breadcrumb: 'Workflow & Sumber Kode',
    icon: Code2,
  },
  {
    id: 'simulator',
    label: 'Simulator Android',
    breadcrumb: 'Simulator Perangkat',
    icon: Smartphone,
  },
];

function loadInitialConfig(): ExamBrowserConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ExamBrowserConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function loadInitialSessions(): ExamSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_SESSIONS_KEY);
    if (!raw) return DEFAULT_SESSIONS;
    const parsed = JSON.parse(raw) as ExamSession[];
    if (!Array.isArray(parsed)) return DEFAULT_SESSIONS;
    return parsed;
  } catch {
    return DEFAULT_SESSIONS;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('qr');
  const [config, setConfig] = useState<ExamBrowserConfig>(loadInitialConfig);
  const [sessions, setSessions] = useState<ExamSession[]>(loadInitialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    () => loadInitialSessions()[0]?.id ?? '',
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota errors
    }
  }, [sessions]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId],
  );

  const currentNav = NAV_ITEMS.find((n) => n.id === activeView) ?? NAV_ITEMS[0];

  const handleDownloadWorkflow = () => {
    const yaml = generateGitHubWorkflowYaml(config);
    downloadTextFile('build.yml', yaml, 'text/yaml;charset=utf-8');
  };

  const handleAddSession = (session: ExamSession) => {
    setSessions((prev) => [session, ...prev]);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(next[0]?.id ?? '');
      }
      return next;
    });
  };

  const handleOpenInSimulator = (session: ExamSession) => {
    setActiveSessionId(session.id);
    setActiveView('simulator');
  };

  const handleSelectNav = (id: ActiveView) => {
    setActiveView(id);
    setMobileMenuOpen(false);
  };

  const activeProtectionCount = [
    config.enableFlagSecure,
    config.enableLockTask,
    config.enableAntiSplitScreen,
    config.enableOnStopAlarm,
    config.enableBackProtection,
    config.enableVolumeDownExit,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar Navigation (260px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 border-r border-slate-200 bg-white sticky top-0 h-screen">
        <div className="h-14 px-6 flex items-center border-b border-slate-200">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ExamBrowser Studio
          </span>
        </div>

        <nav aria-label="Navigasi Utama" className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeView;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-5 border-t border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span>Paket Android</span>
            <span className="font-mono text-slate-800 truncate max-w-[130px]" title={config.applicationId}>
              {config.applicationId}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>PIN Pengawas</span>
            <span className="font-mono tabular-nums text-slate-800">{config.pinPengawas}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Proteksi Aktif</span>
            <span className="font-mono tabular-nums text-slate-800">{activeProtectionCount}/6</span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white h-full border-r border-slate-200 flex flex-col">
            <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                ExamBrowser Studio
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeView;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Top Bar (56px, strict breadcrumb + 1 primary CTA) */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden h-9 w-9 -ml-1.5 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                {config.appName}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {currentNav.breadcrumb}
              </span>
            </nav>
          </div>

          <button
            type="button"
            onClick={handleDownloadWorkflow}
            className="h-9 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh build.yml</span>
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-[1220px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeView === 'qr' && (
            <QrGeneratorView
              config={config}
              sessions={sessions}
              activeSessionId={activeSession?.id ?? ''}
              onSelectSession={setActiveSessionId}
              onAddSession={handleAddSession}
              onDeleteSession={handleDeleteSession}
              onOpenInSimulator={handleOpenInSimulator}
            />
          )}

          {activeView === 'config' && (
            <AndroidConfigView
              config={config}
              onChange={setConfig}
              onGoToWorkflow={() => setActiveView('workflow')}
            />
          )}

          {activeView === 'workflow' && <WorkflowCodeView config={config} />}

          {activeView === 'simulator' && (
            <DeviceSimulatorView config={config} activeSession={activeSession} />
          )}
        </main>
      </div>
    </div>
  );
}
