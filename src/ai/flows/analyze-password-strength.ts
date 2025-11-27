'use server';

/**
 * @fileOverview A password strength analysis AI agent.
 *
 * - analyzePasswordStrength - A function that handles the password strength analysis process.
 * - AnalyzePasswordStrengthInput - The input type for the analyzePasswordStrength function.
 * - AnalyzePasswordStrengthOutput - The return type for the analyzePasswordStrength function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePasswordStrengthInputSchema = z.object({
  password: z.string().describe('The password to analyze.'),
});
export type AnalyzePasswordStrengthInput = z.infer<typeof AnalyzePasswordStrengthInputSchema>;

const AnalyzePasswordStrengthOutputSchema = z.object({
  strength: z
    .enum(['Yếu', 'Trung bình', 'Mạnh'])
    .describe("The strength of the password, either 'Yếu', 'Trung bình', or 'Mạnh'."),
});
export type AnalyzePasswordStrengthOutput = z.infer<typeof AnalyzePasswordStrengthOutputSchema>;

export async function analyzePasswordStrength(
  input: AnalyzePasswordStrengthInput
): Promise<AnalyzePasswordStrengthOutput> {
  return analyzePasswordStrengthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePasswordStrengthPrompt',
  input: {schema: AnalyzePasswordStrengthInputSchema},
  output: {schema: AnalyzePasswordStrengthOutputSchema},
  prompt: `Bạn là một chuyên gia bảo mật phân tích độ mạnh của mật khẩu.
Phân tích mật khẩu được cung cấp và chỉ trả về độ mạnh của nó.
Độ mạnh có thể là 'Yếu', 'Trung bình' hoặc 'Mạnh'.
Chỉ trả về một trong ba giá trị đó trong trường \`strength\`.

Mật khẩu: {{{password}}}`,
});

const analyzePasswordStrengthFlow = ai.defineFlow(
  {
    name: 'analyzePasswordStrengthFlow',
    inputSchema: AnalyzePasswordStrengthInputSchema,
    outputSchema: AnalyzePasswordStrengthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
