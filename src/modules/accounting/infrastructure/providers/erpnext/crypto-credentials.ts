/**
 * Secure AES-256-GCM Encryption for tenant-specific ERPNext API credentials (ADR-119 / Phase 13).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getMasterKey(customKey?: string): Buffer {
  const rawKey = customKey || process.env.MOS_ENCRYPTION_MASTER_KEY || "merchantos_default_secure_key_32b_len!!";
  const safeStr = (rawKey || "").padEnd(32, "0").slice(0, 32);
  return Buffer.from(safeStr, "utf8");
}

export function encryptSecret(secretText: string, masterKeyString?: string): string {
  if (!secretText) return "";
  const key = getMasterKey(masterKeyString);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(secretText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptSecret(cipherText: string, masterKeyString?: string): string {
  if (!cipherText || !cipherText.includes(":")) return cipherText;
  try {
    const key = getMasterKey(masterKeyString);
    const parts = cipherText.split(":");
    if (parts.length !== 3) return cipherText;
    
    const ivHex = parts[0] || "";
    const authTagHex = parts[1] || "";
    const encryptedHex = parts[2] || "";

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return cipherText;
  }
}
