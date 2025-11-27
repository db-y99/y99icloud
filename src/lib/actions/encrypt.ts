"use server";

import { encryptPassword as encryptPasswordUtil, decryptPassword as decryptPasswordUtil } from "@/lib/encryption";

/**
 * Server action to encrypt password
 * This runs on the server where ENCRYPTION_KEY is available
 */
export async function encryptPassword(password: string): Promise<string> {
  try {
    return await encryptPasswordUtil(password);
  } catch (error) {
    console.error("Server encryption error:", error);
    throw new Error("Failed to encrypt password on server");
  }
}

/**
 * Server action to decrypt password
 * This runs on the server where ENCRYPTION_KEY is available
 */
export async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    return await decryptPasswordUtil(encryptedPassword);
  } catch (error) {
    console.error("Server decryption error:", error);
    throw new Error("Failed to decrypt password on server");
  }
}

