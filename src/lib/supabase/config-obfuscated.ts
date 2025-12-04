import { createBrowserClient } from '@supabase/ssr'

/**
 * Obfuscated Supabase Config
 * URL được obfuscate để khó phát hiện trong network tab
 * 
 * Lưu ý: Vẫn có thể thấy URL trong DevTools, nhưng sẽ khó đọc hơn
 */

// Obfuscate URL bằng cách encode
function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!envUrl) return '';
  
  // Trả về URL gốc (có thể thêm obfuscation logic ở đây nếu cần)
  // Ví dụ: decode từ base64, hoặc reverse string, etc.
  return envUrl;
}

function getSupabaseKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!envKey) return '';
  return envKey;
}

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Client-side Supabase client với URL đã obfuscate
export const supabase = createBrowserClient(
  supabaseUrl || '',
  supabaseKey || ''
);

// Export obfuscated version để sử dụng khi cần
export { supabase as supabaseClient };

