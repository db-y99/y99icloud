'use server';

/**
 * @fileOverview A password generation utility.
 *
 * - generatePassword - A function that handles the password generation process.
 * - GeneratePasswordOutput - The return type for the generatePassword function.
 */

import { randomBytes } from 'crypto';

export interface GeneratePasswordOutput {
  password: string;
}

function shuffle(array: string[]): string[] {
    // Fisher-Yates (aka Knuth) Shuffle using cryptographically secure random numbers
    for (let i = array.length - 1; i > 0; i--) {
        const j = randomBytes(1)[0] % (i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export async function generatePassword(): Promise<GeneratePasswordOutput> {
    const length = 10;
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    const charSets = [lower, upper, numbers, symbols];
    
    // Ensure at least one character from each set
    let passwordChars = charSets.map(set => set[randomBytes(1)[0] % set.length]);
    
    const allChars = lower + upper + numbers + symbols;

    // Fill the rest of the password length
    for (let i = passwordChars.length; i < length; i++) {
        passwordChars.push(allChars[randomBytes(1)[0] % allChars.length]);
    }
    
    // Shuffle the characters to avoid a predictable pattern (e.g., LNS...random)
    const shuffledPassword = shuffle(passwordChars).join('');

    return { password: shuffledPassword };
}
