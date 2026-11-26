let activeAudioCtx: AudioContext | null = null;
let stopTimer: number | null = null;

/**
 * Synthesizes a dual-tone emergency alert approximating Android's
 * ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK (2200ms burst) via Web Audio API.
 */
export function playEmergencyAlarm(durationMs = 2400): void {
  stopEmergencyAlarm();

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    activeAudioCtx = ctx;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(960, ctx.currentTime);

    // Pulsing emergency cadence
    const now = ctx.currentTime;
    const pulseCount = Math.max(1, Math.floor(durationMs / 400));
    for (let i = 0; i < pulseCount; i++) {
      const start = now + i * 0.4;
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.setValueAtTime(0.14, start + 0.24);
      gain.gain.setValueAtTime(0.001, start + 0.26);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + durationMs / 1000);
    osc2.stop(now + durationMs / 1000);

    stopTimer = window.setTimeout(() => {
      stopEmergencyAlarm();
    }, durationMs + 100);
  } catch {
    // AudioContext may be blocked if not triggered by user gesture
  }
}

export function stopEmergencyAlarm(): void {
  if (stopTimer !== null) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (activeAudioCtx) {
    activeAudioCtx.close().catch(() => {});
    activeAudioCtx = null;
  }
}
