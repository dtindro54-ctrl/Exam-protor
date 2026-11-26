import { DecodedQrResult } from '../types/exam';

/**
 * Encodes a UTF-8 string to Base64 matching Android's android.util.Base64.DEFAULT
 * (UTF-8 bytes -> standard Base64).
 */
export function encodeUtf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes standard Base64 back to a UTF-8 string.
 */
export function decodeBase64ToUtf8(base64: string): string {
  const sanitized = base64.replace(/\s+/g, '');
  const binary = atob(sanitized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Generates the exact encrypted QR string expected by MainActivity.kt:
 * `${qrPrefix}${Base64(url)}`
 */
export function encodeExamQrPayload(url: string, qrPrefix: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';
  return `${qrPrefix}${encodeUtf8ToBase64(trimmedUrl)}`;
}

/**
 * Mirrors `prosesQrTerenkripsi(qrData: String)` in MainActivity.kt.
 */
export function decodeExamQrPayload(qrData: string, qrPrefix: string): DecodedQrResult {
  const trimmed = qrData.trim();
  if (!trimmed) {
    return { valid: false, error: 'Payload QR kosong.' };
  }
  if (!trimmed.startsWith(qrPrefix)) {
    return {
      valid: false,
      error: `QR Code tidak valid atau bukan QR Ujian resmi (wajib diawali "${qrPrefix}").`,
    };
  }
  const encodedPart = trimmed.slice(qrPrefix.length);
  if (!encodedPart) {
    return {
      valid: false,
      error: 'Bagian Base64 setelah prefix kosong.',
    };
  }
  try {
    const url = decodeBase64ToUtf8(encodedPart);
    if (!/^https?:\/\/.+/i.test(url)) {
      return {
        valid: false,
        url,
        encodedPart,
        error: 'Hasil dekode bukan URL HTTP/HTTPS yang valid.',
      };
    }
    return { valid: true, url, encodedPart };
  } catch {
    return {
      valid: false,
      encodedPart,
      error: 'Gagal membaca enkripsi Base64 QR Code.',
    };
  }
}

export function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidApplicationId(appId: string): boolean {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(appId.trim());
}
