import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const COST = 12;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "1234567890",
  "qwertyuiop",
  "globifytech",
  "globify123",
  "letmein123",
  "welcome123",
  "admin12345",
]);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/** Returns a human-readable problem or null when the password is acceptable. */
export function passwordProblem(plain: string): string | null {
  if (plain.length < 10) return "Use at least 10 characters.";
  if (plain.length > 128) return "Use at most 128 characters.";
  if (!/[a-zA-Z]/.test(plain) || !/[0-9]/.test(plain)) return "Mix letters and numbers.";
  if (COMMON_PASSWORDS.has(plain.toLowerCase())) return "That password is too common.";
  return null;
}

/** Generates a single-use token; only the hash is stored. */
export function generateToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
