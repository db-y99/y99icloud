/**
 * Password Encryption Utility
 * Uses Web Crypto API with AES-256-GCM for secure encryption
 * 
 * Security: All passwords are encrypted before storing in database
 * and decrypted when needed for display/use.
 */

// Get encryption key from environment variable
// This should be a 32-byte (256-bit) key encoded in base64
function getEncryptionKey(): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    // In development, show helpful error message
    if (process.env.NODE_ENV === 'development') {
      console.error(
        '\n❌ ENCRYPTION_KEY is missing!\n' +
        '📝 Create .env.local file and add:\n' +
        '   ENCRYPTION_KEY=your-key-here\n\n' +
        '🔑 Generate key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"\n' +
        '📖 See SETUP_ENCRYPTION_KEY.md for details\n'
      );
    }
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. ' +
      'Generate one using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))" ' +
      'See SETUP_ENCRYPTION_KEY.md for setup instructions.'
    );
  }
  return key;
}

/**
 * Convert base64 string to ArrayBuffer
 * Works in both browser and Node.js
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof window !== 'undefined') {
    // Browser environment
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } else {
    // Node.js environment
    const Buffer = require('buffer').Buffer;
    return Buffer.from(base64, 'base64').buffer;
  }
}

/**
 * Convert ArrayBuffer to base64 string
 * Works in both browser and Node.js
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof window !== 'undefined') {
    // Browser environment
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } else {
    // Node.js environment
    const Buffer = require('buffer').Buffer;
    return Buffer.from(buffer).toString('base64');
  }
}

/**
 * Derive a key from the master key using PBKDF2
 */
async function deriveKey(masterKey: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a password using AES-256-GCM
 * Returns: base64(IV + salt + encryptedData + authTag)
 */
export async function encryptPassword(password: string): Promise<string> {
  if (!password) {
    return '';
  }

  try {
    const masterKey = getEncryptionKey();
    
    // Generate random IV (12 bytes for GCM) and salt (16 bytes)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive key from master key
    const key = await deriveKey(masterKey, salt);

    // Convert password to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128, // 128-bit authentication tag
      },
      key,
      data
    );

    // Combine: IV (12 bytes) + Salt (16 bytes) + Encrypted data + Auth tag (16 bytes)
    const combined = new Uint8Array(12 + 16 + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(salt, 12);
    combined.set(new Uint8Array(encrypted), 28);

    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * Decrypt a password using AES-256-GCM
 * Input: base64(IV + salt + encryptedData + authTag)
 */
export async function decryptPassword(encryptedPassword: string): Promise<string> {
  if (!encryptedPassword) {
    return '';
  }

  try {
    const masterKey = getEncryptionKey();

    // Decode base64
    const combined = new Uint8Array(base64ToArrayBuffer(encryptedPassword));

    // Extract IV (12 bytes), salt (16 bytes), and encrypted data
    const iv = combined.slice(0, 12);
    const salt = combined.slice(12, 28);
    const encrypted = combined.slice(28);

    // Derive key from master key
    const key = await deriveKey(masterKey, salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, it might be an old plaintext password
    // Return as-is for backward compatibility during migration
    return encryptedPassword;
  }
}

/**
 * Check if a string is encrypted (starts with base64 pattern and has minimum length)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  // Encrypted values are base64 and typically longer than 60 characters
  // Plaintext passwords are usually shorter
  return value.length > 60 && /^[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Encrypt password history entries
 */
export async function encryptPasswordHistory(
  history: Array<{ password: string; changed_at: string }>
): Promise<Array<{ password: string; changed_at: string }>> {
  if (!history || history.length === 0) {
    return [];
  }

  const encryptedHistory = await Promise.all(
    history.map(async (entry) => {
      // Only encrypt if not already encrypted
      const encryptedPassword = isEncrypted(entry.password)
        ? entry.password
        : await encryptPassword(entry.password);
      
      return {
        password: encryptedPassword,
        changed_at: entry.changed_at,
      };
    })
  );

  return encryptedHistory;
}

