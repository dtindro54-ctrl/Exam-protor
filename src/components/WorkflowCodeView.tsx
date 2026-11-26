import React, { useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, FileCode2, FolderArchive, Shield } from 'lucide-react';
import { ExamBrowserConfig } from '../types/exam';
import {
  downloadAndroidProjectZip,
  downloadTextFile,
  generateAllProjectFiles,
  generateServerGuardSnippets,
} from '../utils/androidGenerator';

interface WorkflowCodeViewProps {
  config: ExamBrowserConfig;
}

type ServerTab = 'php' | 'express' | 'nginx' | 'cloudflare';

export function WorkflowCodeView({ config }: WorkflowCodeViewProps) {
  const projectFiles = useMemo(() => generateAllProjectFiles(config), [config]);
  const serverSnippets = useMemo(() => generateServerGuardSnippets(config), [config]);

  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'android' | 'server'>('android');
  const [serverTab, setServerTab] = useState<ServerTab>('php');
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  const currentFile = projectFiles[selectedFileIndex] ?? projectFiles[0];
  const displayedCode =
    viewMode === 'android' ? currentFile.content : serverSnippets[serverTab];
  const displayedTitle =
    viewMode === 'android'
      ? currentFile.path
      : `Validasi Header Server (${serverTab.toUpperCase()})`;

  const codeLines = useMemo(() => displayedCode.split('\n'), [displayedCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(displayedCode);
      setCopied(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore if clipboard unavailable
    }
  };

  const handleDownloadCurrentFile = () => {
    if (viewMode === 'android') {
      const filename = currentFile.path.split('/').pop() || 'build.yml';
      downloadTextFile(filename, currentFile.content);
    } else {
      const extMap: Record<ServerTab, string> = {
        php: 'exam-guard.php',
        express: 'exam-guard.ts',
        nginx: 'exam-guard.conf',
        cloudflare: 'exam-guard-worker.js',
      };
      downloadTextFile(extMap[serverTab], serverSnippets[serverTab]);
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      await downloadAndroidProjectZip(config);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workflow GitHub Actions & Kode Sumber
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Unduh <span className="font-mono text-slate-800">build.yml</span> untuk build APK otomatis di GitHub Actions atau unduh seluruh proyek Android Studio dalam satu paket ZIP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="h-9 px-4 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>{downloadingZip ? 'Menyiapkan ZIP...' : 'Unduh Paket ZIP Proyek'}</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('android')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === 'android'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Proyek Android & build.yml</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('server')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewMode === 'server'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Validasi Header Server</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 font-mono tabular-nums">
          {codeLines.length} baris · Java 17 · Gradle 8.2.2 · Kotlin 1.9.22
        </p>
      </div>

      {/* File explorer + Code viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-200 rounded-xl overflow-hidden bg-white">
        {/* Left file tree */}
        <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 p-3">
          {viewMode === 'android' ? (
            <div className="space-y-1">
              <p className="px-2.5 py-1.5 text-xs font-semibold text-slate-500">
                Berkas Proyek ({projectFiles.length})
              </p>
              {projectFiles.map((file, idx) => {
                const active = idx === selectedFileIndex;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-colors truncate cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                    title={file.path}
                  >
                    {file.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-2.5 py-1.5 text-xs font-semibold text-slate-500">
                Platform Server Ujian
              </p>
              {(
                [
                  { id: 'php', label: 'PHP / Moodle / CBT' },
                  { id: 'express', label: 'Node.js / Express' },
                  { id: 'nginx', label: 'Nginx Reverse Proxy' },
                  { id: 'cloudflare', label: 'Cloudflare Worker' },
                ] as const
              ).map((item) => {
                const active = serverTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setServerTab(item.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <p className="px-2.5 pt-3 text-xs text-slate-500 leading-relaxed">
                Pasang skrip ini di server ujian agar browser biasa (Chrome/Safari) otomatis diblokir dengan HTTP 403.
              </p>
            </div>
          )}
        </div>

        {/* Right dark code viewer */}
        <div className="lg:col-span-9 bg-slate-950 text-slate-100 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-slate-300 truncate">
              {displayedTitle}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCode}
                className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCurrentFile}
                className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File</span>
              </button>
            </div>
          </div>

          <div className="overflow-auto max-h-[540px] p-4 font-mono text-xs leading-relaxed">
            <table className="w-full border-collapse">
              <tbody>
                {codeLines.map((line, i) => (
                  <tr key={i} className="hover:bg-slate-900/70">
                    <td className="select-none pr-4 text-right text-slate-600 tabular-nums align-top w-10">
                      {i + 1}
                    </td>
                    <td className="whitespace-pre text-slate-200 tracking-[0.01em]">
                      {line || ' '}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Concise 4-step deployment guide */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Langkah Build APK Otomatis di GitHub Actions
        </h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-mono font-semibold text-blue-700">01. Buat Repositori</p>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Buat repositori baru di GitHub (publik maupun privat) dengan branch default <span className="font-mono text-slate-800">main</span>.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-blue-700">02. Simpan build.yml</p>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Letakkan file hasil unduhan pada path <span className="font-mono text-slate-800">.github/workflows/build.yml</span> lalu commit ke repositori.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-blue-700">03. Jalankan Workflow</p>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Buka tab Actions di GitHub. Workflow otomatis menyiapkan Java 17, Android SDK 34, dan menjalankan <span className="font-mono text-slate-800">gradle assembleDebug</span>.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-blue-700">04. Unduh ExamBrowser-APK</p>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Setelah build selesai, klik artifak <span className="font-mono text-slate-800">ExamBrowser-APK</span> untuk mengunduh <span className="font-mono text-slate-800">app-debug.apk</span> siap instal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
