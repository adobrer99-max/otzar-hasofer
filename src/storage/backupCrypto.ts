/**
 * Passphrase protection for a Treasury backup, done in the browser with Web
 * Crypto: a key derived from the passphrase (PBKDF2-SHA-256, 600 000
 * iterations, random salt) seals the backup with AES-GCM-256 (random IV).
 * AES-GCM authenticates as it decrypts, so a wrong passphrase — or a file
 * that was altered — is refused rather than restored as garbage. Nothing
 * about the passphrase is stored; if it is forgotten, the file stays sealed.
 */

export const ENCRYPTED_FORMAT = "otzar-hasofer-treasury-encrypted";
export const ENCRYPTED_VERSION = 1;
export const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSPHRASE_LENGTH = 8;

interface EncryptedFile {
  format: typeof ENCRYPTED_FORMAT;
  version: number;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  data: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Whether a file's text is a passphrase-protected backup (vs a plain one). */
export function isEncryptedBackup(text: string): boolean {
  try {
    const raw = JSON.parse(text) as { format?: unknown };
    return raw?.format === ENCRYPTED_FORMAT;
  } catch {
    return false;
  }
}

/** Seal a backup's JSON text with a passphrase; returns the file's text. */
export async function encryptBackup(json: string, passphrase: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(json)));
  const file: EncryptedFile = {
    format: ENCRYPTED_FORMAT,
    version: ENCRYPTED_VERSION,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt: toBase64(salt) },
    cipher: { name: "AES-GCM", iv: toBase64(iv) },
    data: toBase64(sealed),
  };
  return JSON.stringify(file, null, 2);
}

export type DecryptResult = { ok: true; json: string } | { ok: false; error: string };

/** Open a protected backup; refuses a wrong passphrase or an altered file. */
export async function decryptBackup(text: string, passphrase: string): Promise<DecryptResult> {
  let file: EncryptedFile;
  try {
    file = JSON.parse(text) as EncryptedFile;
  } catch {
    return { ok: false, error: "This file isn't a protected Treasury backup." };
  }
  if (file?.format !== ENCRYPTED_FORMAT) return { ok: false, error: "This file isn't a protected Treasury backup." };
  if (typeof file.version !== "number" || file.version > ENCRYPTED_VERSION) {
    return { ok: false, error: "This backup was protected by a newer version of the app — update the app, then restore." };
  }
  let salt: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64(file.kdf.salt);
    iv = fromBase64(file.cipher.iv);
    data = fromBase64(file.data);
  } catch {
    return { ok: false, error: "This protected backup is damaged." };
  }
  if (!Number.isInteger(file.kdf.iterations) || file.kdf.iterations < 1) {
    return { ok: false, error: "This protected backup is damaged." };
  }
  try {
    const key = await deriveKey(passphrase, salt, file.kdf.iterations);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return { ok: true, json: new TextDecoder().decode(plain) };
  } catch {
    // AES-GCM's authentication fails identically for a wrong passphrase and
    // for a file altered after it was sealed.
    return { ok: false, error: "That passphrase doesn't open this backup (or the file was altered)." };
  }
}
