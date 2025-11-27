"use client";

import { useState, useCallback } from "react";
import { decryptPassword } from "@/lib/actions/encrypt";
import { isEncrypted } from "@/lib/encryption";

/**
 * Hook to decrypt password on demand
 * Only decrypts when needed (e.g., when user hovers to view)
 */
export function useDecryptPassword() {
  const [decryptedPasswords, setDecryptedPasswords] = useState<Map<string, string>>(new Map());
  const [decrypting, setDecrypting] = useState<Set<string>>(new Set());

  const getDecryptedPassword = useCallback(async (encryptedPassword: string, key?: string): Promise<string> => {
    if (!encryptedPassword) {
      return "";
    }

    // If not encrypted, return as-is (backward compatibility)
    if (!isEncrypted(encryptedPassword)) {
      return encryptedPassword;
    }

    // Use key for caching if provided
    const cacheKey = key || encryptedPassword;

    // Check cache first
    if (decryptedPasswords.has(cacheKey)) {
      return decryptedPasswords.get(cacheKey) || "";
    }

    // Check if already decrypting
    if (decrypting.has(cacheKey)) {
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 100));
      return getDecryptedPassword(encryptedPassword, key);
    }

    try {
      setDecrypting(prev => new Set(prev).add(cacheKey));
      const decrypted = await decryptPassword(encryptedPassword);
      setDecryptedPasswords(prev => new Map(prev).set(cacheKey, decrypted));
      return decrypted;
    } catch (error) {
      console.error("Failed to decrypt password:", error);
      // Return encrypted value if decryption fails
      return encryptedPassword;
    } finally {
      setDecrypting(prev => {
        const next = new Set(prev);
        next.delete(cacheKey);
        return next;
      });
    }
  }, [decryptedPasswords, decrypting]);

  return { getDecryptedPassword };
}

