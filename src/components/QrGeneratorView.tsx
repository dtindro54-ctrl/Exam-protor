import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Plus,
  QrCode,
  Search,
  Trash2,
  X,
  ShieldCheck,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { ExamBrowserConfig, ExamSession } from '../types/exam';
import { decodeExamQrPayload, encodeExamQrPayload, isValidUrl } from '../utils/examCrypto';
import { downloadTextFile } from '../utils/androidGenerator';

interface QrGeneratorViewProps {
  config: ExamBrowserConfig;
  sessions: ExamSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onAddSession: (session: ExamSession) => void;
  onDeleteSession: (id: string) => void;
  onOpenInSimulator: (session: ExamSession) => void;
}

export function QrGeneratorView({
  config,
  sessions,
  activeSessionId,
  onSelectSession,
  onAddSession,
  onDeleteSession,
  onOpenInSimulator,
}: QrGeneratorViewProps) {
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId],
  );

  // Form state for adding a new exam session
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [room, setRoom] = useState('');
  const [url, setUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Quick URL override or active session URL
  const [customUrl, setCustomUrl] = useState(activeSession?.url ?? 'https://cbt.sekolah.sch.id/ujian/uts-matematika-xi');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);

  // QR Decoder verifier state
  const [verifyInput, setVerifyInput] = useState('');
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeSession) {
      setCustomUrl(activeSession.url);
    }
  }, [activeSession]);

  const effectiveUrl = customUrl.trim();
  const urlValid = isValidUrl(effectiveUrl);

  const encryptedPayload = useMemo(() => {
    if (!urlValid) return '';
    return encodeExamQrPayload(effectiveUrl, config.qrPrefix);
  }, [effectiveUrl, urlValid, config.qrPrefix]);

  useEffect(() => {
    let cancelled = false;
    if (!encryptedPayload) {
      setQrDataUrl('');
      setQrSvgString('');
      return;
    }

    QRCode.toDataURL(encryptedPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    QRCode.toString(encryptedPayload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 480,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (!cancelled) setQrSvgString(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvgString('');
      });

    return () => {
      cancelled = true;
    };
  }, [encryptedPayload]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && projectorMode) {
        setProjectorMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectorMode]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.room.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q),
    );
  }, [sessions, searchQuery]);

  const decodedVerification = useMemo(() => {
    if (!verifyInput.trim()) return null;
    return decodeExamQrPayload(verifyInput, config.qrPrefix);
  }, [verifyInput, config.qrPrefix]);

  const handleCopyPayload = async () => {
    if (!encryptedPayload) return;
    try {
      await navigator.clipboard.writeText(encryptedPayload);
      setCopiedPayload(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedPayload(false), 1800);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleDownloadPrintablePng = async () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    const width = 900;
    const height = 1120;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, width - 64, height - 64);

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const heading = activeSession ? activeSession.title : config.appName;
    ctx.fillText(heading.slice(0, 46), width / 2, 112);

    ctx.fillStyle = '#475569';
    ctx.font = '500 20px "DM Sans", sans-serif';
    const metaLine = activeSession
      ? `${activeSession.subject}  ·  ${activeSession.room}  ·  ${activeSession.durationMinutes} menit`
      : `${config.appName}  ·  Prefix ${config.qrPrefix}`;
    ctx.fillText(metaLine, width / 2, 152);

    const img = new Image();
    img.onload = () => {
      const qrSize = 560;
      const qrX = (width - qrSize) / 2;
      const qrY = 200;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(96, 820);
      ctx.lineTo(width - 96, 820);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Petunjuk Peserta Ujian', width / 2, 875);

      ctx.fillStyle = '#475569';
      ctx.font = '400 19px "DM Sans", sans-serif';
      ctx.fillText(`1. Buka aplikasi ${config.appName} di perangkat Android.`, width / 2, 920);
      ctx.fillText('2. Tekan "Scan QR Ujian" dan arahkan kamera ke QR di atas.', width / 2, 956);
      ctx.fillText('3. Jangan keluar aplikasi atau membuka split-screen saat ujian berlangsung.', width / 2, 992);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 15px "JetBrains Mono", monospace';
      ctx.fillText(`Header: ${config.secretHeaderName}  ·  Prefix: ${config.qrPrefix}`, width / 2, 1054);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      const slug = (activeSession?.title || 'qr-ujian').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      link.download = `qr-${slug}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = qrDataUrl;
  };

  const handleDownloadSvg = () => {
    if (!qrSvgString) return;
    const slug = (activeSession?.title || 'qr-ujian').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(`qr-${slug}.svg`, qrSvgString, 'image/svg+xml;charset=utf-8');
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    const parsedDuration = Math.max(5, parseInt(durationMinutes, 10) || 60);

    if (!trimmedTitle) {
      setFormError('Judul sesi ujian wajib diisi.');
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      setFormError('URL ujian harus diawali http:// atau https:// yang valid.');
      return;
    }

    const newSession: ExamSession = {
      id: `sesi-${Date.now()}`,
      title: trimmedTitle,
      subject: subject.trim() || 'Umum',
      room: room.trim() || 'Ruang Ujian',
      url: trimmedUrl,
      durationMinutes: parsedDuration,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onAddSession(newSession);
    onSelectSession(newSession.id);
    setTitle('');
    setSubject('');
    setRoom('');
    setUrl('');
    setDurationMinutes('90');
    setFormError(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Header summary strip */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Generator QR Ujian Terenkripsi
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Buat QR Code format <span className="font-mono text-slate-800">{config.qrPrefix}Base64(URL)</span> yang hanya dapat dibuka oleh aplikasi <span className="font-medium text-slate-800">{config.appName}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
          <span>{sessions.length} sesi tersimpan</span>
          <span aria-hidden="true">·</span>
          <span>Prefix {config.qrPrefix}</span>
        </div>
      </div>

      {/* Main 2-column split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 columns: URL input + Session list + Verifier */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick URL generator surface */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                URL Target Ujian Aktif
              </h2>
              {activeSession && (
                <span className="text-xs text-slate-500 truncate max-w-[240px]">
                  {activeSession.room} · {activeSession.durationMinutes} mnt
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="exam-url-input" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Alamat Portal Ujian (CBT / Moodle / Google Forms Proxy)
                </label>
                <input
                  id="exam-url-input"
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://cbt.sekolah.sch.id/ujian/matematika"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
                {!urlValid && customUrl.trim().length > 0 && (
                  <p className="mt-1.5 text-xs text-red-600">
                    Masukkan URL lengkap yang diawali http:// atau https://
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="payload-preview" className="block text-xs font-medium text-slate-700">
                    Payload Terenkripsi (siap dipindai ZXing Scanner)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    disabled={!encryptedPayload}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Payload</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  id="payload-preview"
                  readOnly
                  rows={2}
                  value={encryptedPayload || 'Menunggu URL ujian yang valid...'}
                  className="w-full p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono text-slate-700 break-all resize-none focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Saved Exam Sessions Table */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-6 pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Daftar Sesi Ujian
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih sesi untuk menampilkan QR atau uji langsung di simulator perangkat.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari sesi..."
                    aria-label="Cari sesi ujian"
                    className="h-9 pl-8 pr-3 w-40 sm:w-44 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm((prev) => !prev);
                    setFormError(null);
                  }}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{showAddForm ? 'Tutup Form' : 'Tambah Sesi'}</span>
                </button>
              </div>
            </div>

            {showAddForm && (
              <form onSubmit={handleCreateSession} className="p-6 bg-slate-50/70 border-b border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-title" className="block text-xs font-medium text-slate-700 mb-1">
                      Judul Ujian
                    </label>
                    <input
                      id="new-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: UAS Fisika Kelas XII"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-subject" className="block text-xs font-medium text-slate-700 mb-1">
                      Mata Pelajaran
                    </label>
                    <input
                      id="new-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Fisika"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-room" className="block text-xs font-medium text-slate-700 mb-1">
                      Ruangan / Kelas
                    </label>
                    <input
                      id="new-room"
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="Ruang Lab 03"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-duration" className="block text-xs font-medium text-slate-700 mb-1">
                      Durasi (Menit)
                    </label>
                    <input
                      id="new-duration"
                      type="number"
                      min={5}
                      max={300}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="new-url" className="block text-xs font-medium text-slate-700 mb-1">
                    URL Portal Ujian
                  </label>
                  <input
                    id="new-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://cbt.sekolah.sch.id/ujian/uas-fisika"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                {formError && <p className="text-xs text-red-600">{formError}</p>}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="h-9 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 cursor-pointer"
                  >
                    Simpan Sesi
                  </button>
                </div>
              </form>
            )}

            {filteredSessions.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-medium text-slate-800">
                  {sessions.length === 0 ? 'Belum ada sesi ujian tersimpan' : 'Sesi tidak ditemukan'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {sessions.length === 0
                    ? 'Tambahkan sesi ujian pertama untuk membuat QR Code terenkripsi secara cepat.'
                    : 'Coba kata kunci pencarian lain atau tambahkan sesi baru.'}
                </p>
                {sessions.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sesi Pertama</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-medium text-slate-500">
                      <th className="py-2.5 pl-6 pr-3">Sesi Ujian</th>
                      <th className="py-2.5 px-3">Ruang</th>
                      <th className="py-2.5 px-3 text-right">Durasi</th>
                      <th className="py-2.5 pl-3 pr-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSessions.map((session) => {
                      const isSelected = activeSession?.id === session.id;
                      return (
                        <tr
                          key={session.id}
                          onClick={() => onSelectSession(session.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 pl-6 pr-3">
                            <div className="font-medium text-slate-900 leading-snug">
                              {session.title}
                            </div>
                            <div className="text-xs text-slate-500 font-mono truncate max-w-[260px] mt-0.5">
                              {session.url}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                            {session.room}
                          </td>
                          <td className="py-3 px-3 text-xs font-mono tabular-nums text-slate-600 text-right whitespace-nowrap">
                            {session.durationMinutes} mnt
                          </td>
                          <td className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => onOpenInSimulator(session)}
                                title="Uji di Simulator"
                                className="h-8 px-2.5 rounded-md text-xs font-medium text-blue-700 hover:bg-blue-100/70 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Play className="w-3 h-3" />
                                <span>Simulasi</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteSession(session.id)}
                                title="Hapus sesi"
                                aria-label={`Hapus ${session.title}`}
                                className="h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors inline-flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* QR Payload Verifier & Decoder */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Verifikasi & Dekoder Payload QR
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tempel string hasil scan QR untuk menguji logika <span className="font-mono">prosesQrTerenkripsi()</span>.
                </p>
              </div>
              {encryptedPayload && (
                <button
                  type="button"
                  onClick={() => setVerifyInput(encryptedPayload)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Isi Payload Aktif
                </button>
              )}
            </div>

            <input
              type="text"
              value={verifyInput}
              onChange={(e) => setVerifyInput(e.target.value)}
              placeholder={`Contoh: ${config.qrPrefix}aHR0cHM6Ly9jYnQuc2Vrb2xhaC5zY2guaWQ=`}
              aria-label="Input payload QR untuk diverifikasi"
              className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />

            {decodedVerification && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2.5 text-xs">
                {decodedVerification.valid ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-emerald-700">
                        Valid — diterima oleh {config.appName}
                      </p>
                      <p className="mt-1 text-slate-600 font-mono break-all">
                        URL Terdekode: {decodedVerification.url}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-red-700">
                        Ditolak oleh MainActivity.kt
                      </p>
                      <p className="mt-1 text-slate-600">{decodedVerification.error}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 columns: Sticky Live QR Code Preview Card */}
        <aside className="lg:col-span-5 lg:sticky lg:top-20 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 truncate">
                {activeSession ? activeSession.title : 'Pratinjau QR Ujian'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeSession
                  ? `${activeSession.subject} · ${activeSession.room}`
                  : `Format ${config.qrPrefix}Base64`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProjectorMode(true)}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Proyektor</span>
            </button>
          </div>

          <div className="mt-5 flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50/70 p-6 min-h-[300px]">
            {qrDataUrl ? (
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt={`QR Code terenkripsi untuk ${activeSession?.title || effectiveUrl}`}
                  className="w-56 h-56 sm:w-64 sm:h-64 block"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">QR belum tersedia</p>
                <p className="text-xs text-slate-400 mt-1">
                  Masukkan URL ujian yang valid di sebelah kiri.
                </p>
              </div>
            )}
          </div>

          <dl className="mt-5 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500">Header Verifikasi</dt>
              <dd className="font-mono text-slate-800 truncate">
                {config.secretHeaderName}: {config.secretHeaderValue}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500">PIN Pengawas</dt>
              <dd className="font-mono tabular-nums text-slate-800">
                {config.pinPengawas}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-4">
              <dt className="text-slate-500">Panjang Payload</dt>
              <dd className="font-mono tabular-nums text-slate-800">
                {encryptedPayload.length} karakter
              </dd>
            </div>
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPrintablePng}
              disabled={!qrDataUrl}
              className="h-10 px-4 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Kartu PNG</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              disabled={!qrSvgString}
              className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh SVG</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Classroom Projector Fullscreen Modal */}
      {projectorMode && qrDataUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mode Proyektor QR Ujian"
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-between p-6 sm:p-10 overflow-y-auto"
        >
          <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {config.appName} · QR Ujian Resmi
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                {activeSession ? activeSession.title : 'Sesi Ujian Aktif'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setProjectorMode(false)}
              className="h-10 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup (Esc)</span>
            </button>
          </div>

          <div className="my-6 flex flex-col items-center text-center">
            <div className="p-6 bg-white border-2 border-slate-900 rounded-2xl">
              <img
                src={qrDataUrl}
                alt="QR Code Ujian Layar Proyektor"
                className="w-72 h-72 sm:w-96 sm:h-96 block"
              />
            </div>
            {activeSession && (
              <p className="mt-5 text-base font-medium text-slate-700">
                {activeSession.subject} · {activeSession.room} · Durasi {activeSession.durationMinutes} menit
              </p>
            )}
            <p className="mt-2 text-sm text-slate-500 max-w-lg">
              Buka aplikasi <strong className="text-slate-800">{config.appName}</strong>, tekan <strong className="text-slate-800">Scan QR Ujian</strong>, dan arahkan kamera ke layar ini.
            </p>
          </div>

          <div className="w-full max-w-4xl border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 font-mono">
            <span>Prefix: {config.qrPrefix}</span>
            <span>Keluar Ujian: Tombol Volume Bawah + PIN Pengawas</span>
          </div>
        </div>
      )}
    </div>
  );
}
