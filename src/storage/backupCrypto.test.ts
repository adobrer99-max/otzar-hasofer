import { describe, expect, it } from "vitest";
import { decryptBackup, encryptBackup, isEncryptedBackup, PBKDF2_ITERATIONS } from "./backupCrypto";

// Few iterations keep the tests fast; the shipped default is 600 000.
const FAST = 1000;
const json = JSON.stringify({ format: "otzar-hasofer-treasury", stores: { participants: [{ id: "p1", displayName: "Dvora Secret" }] } });

describe("passphrase-protected backups", () => {
  it("round-trips with the right passphrase", async () => {
    const sealed = await encryptBackup(json, "correct horse", FAST);
    expect(await decryptBackup(sealed, "correct horse")).toEqual({ ok: true, json });
  });

  it("hides the contents", async () => {
    const sealed = await encryptBackup(json, "correct horse", FAST);
    expect(sealed).not.toContain("Dvora");
    expect(sealed).not.toContain("participants");
    expect(isEncryptedBackup(sealed)).toBe(true);
    expect(isEncryptedBackup(json)).toBe(false);
    expect(isEncryptedBackup("not json")).toBe(false);
  });

  it("refuses a wrong passphrase", async () => {
    const sealed = await encryptBackup(json, "correct horse", FAST);
    const r = await decryptBackup(sealed, "battery staple");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/passphrase doesn't open/);
  });

  it("refuses a file altered after sealing", async () => {
    const file = JSON.parse(await encryptBackup(json, "correct horse", FAST));
    const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
    bytes[0] ^= 1;
    file.data = btoa(String.fromCharCode(...bytes));
    expect((await decryptBackup(JSON.stringify(file), "correct horse")).ok).toBe(false);
  });

  it("never seals the same input the same way twice", async () => {
    const a = JSON.parse(await encryptBackup(json, "correct horse", FAST));
    const b = JSON.parse(await encryptBackup(json, "correct horse", FAST));
    expect(a.kdf.salt).not.toBe(b.kdf.salt);
    expect(a.cipher.iv).not.toBe(b.cipher.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("records the key-derivation settings it used, and defaults to 600 000 rounds", async () => {
    const custom = JSON.parse(await encryptBackup(json, "correct horse", FAST));
    expect(custom.kdf).toMatchObject({ name: "PBKDF2", hash: "SHA-256", iterations: FAST });
    expect(custom.cipher.name).toBe("AES-GCM");
    expect(PBKDF2_ITERATIONS).toBe(600_000);
  });

  it("refuses a newer format and garbage", async () => {
    const file = JSON.parse(await encryptBackup(json, "pw-long-enough", FAST));
    file.version = 99;
    expect(await decryptBackup(JSON.stringify(file), "pw-long-enough")).toMatchObject({ ok: false });
    expect(await decryptBackup("{}", "x")).toMatchObject({ ok: false });
  });
});
