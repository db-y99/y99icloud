# Hướng Dẫn Ẩn Request URLs

Tài liệu này mô tả các cách để ẩn hoặc obfuscate request URLs trong dự án.

## Tổng Quan

Có 3 cách chính để ẩn request URLs:

1. **API Proxy Routes** - Chuyển tất cả requests qua Next.js API routes
2. **Obfuscate Environment Variables** - Mã hóa URLs trong code
3. **Security Headers** - Ẩn headers trong responses

## 1. Sử Dụng API Proxy Routes

### Cách Hoạt Động

Thay vì gọi Supabase trực tiếp từ client:
```typescript
// ❌ CŨ - URL Supabase hiển thị trong network tab
const { data } = await supabase.from('accounts').select('*');
```

Sử dụng API client:
```typescript
// ✅ MỚI - Chỉ thấy /api/data trong network tab
import { apiSelect } from '@/lib/api-client';
const { data } = await apiSelect('accounts');
```

### Ví Dụ Sử Dụng

#### Select Data
```typescript
import { apiSelect } from '@/lib/api-client';

// Select đơn giản
const { data, error } = await apiSelect('accounts');

// Select với filters
const { data, error } = await apiSelect('customers', {
  filters: [
    { column: 'account_id', operator: 'eq', value: 123 }
  ],
  orderBy: { column: 'created_at', ascending: false }
});
```

#### Insert Data
```typescript
import { apiInsert } from '@/lib/api-client';

const { data, error } = await apiInsert('accounts', {
  data: {
    username: 'example',
    password: 'password',
    status: 'active'
  }
});
```

#### Update Data
```typescript
import { apiUpdate } from '@/lib/api-client';

const { data, error } = await apiUpdate('accounts', {
  data: { status: 'inactive' },
  filters: [
    { column: 'id', operator: 'eq', value: 123 }
  ]
});
```

#### Delete Data
```typescript
import { apiDelete } from '@/lib/api-client';

const { error } = await apiDelete('accounts', [
  { column: 'id', operator: 'eq', value: 123 }
]);
```

## 2. Obfuscate Environment Variables

### Cấu Hình

File `src/lib/supabase/config-obfuscated.ts` đã được tạo để obfuscate URLs.

Để sử dụng:
```typescript
// Thay vì
import { supabase } from '@/lib/supabase/config';

// Sử dụng
import { supabase } from '@/lib/supabase/config-obfuscated';
```

### Lưu Ý

- Real-time subscriptions vẫn cần Supabase client trực tiếp
- URL vẫn có thể thấy trong DevTools, nhưng khó đọc hơn
- Không thể hoàn toàn ẩn URL trong browser

## 3. Security Headers

Các headers đã được cấu hình trong `next.config.ts`:

- `X-Request-ID: hidden` - Ẩn request ID
- `Server: ''` - Ẩn server information
- `Referrer-Policy: origin-when-cross-origin` - Giới hạn referrer info

## Migration Guide

### Bước 1: Thay thế Supabase calls trong CRUD operations

Tìm và thay thế:
```typescript
// Tìm
const { data, error } = await supabase.from('table').select('*');

// Thay bằng
import { apiSelect } from '@/lib/api-client';
const { data, error } = await apiSelect('table');
```

### Bước 2: Giữ Real-time Subscriptions

Real-time subscriptions vẫn cần Supabase client:
```typescript
// Giữ nguyên cho real-time
const channel = supabase
  .channel('table_changes')
  .on('postgres_changes', { ... })
  .subscribe();
```

### Bước 3: Test và Verify

1. Mở DevTools → Network tab
2. Kiểm tra rằng chỉ thấy `/api/data` thay vì Supabase URLs
3. Verify rằng ứng dụng vẫn hoạt động bình thường

## Limitations

1. **Real-time Subscriptions**: Vẫn cần Supabase client trực tiếp, URL sẽ hiển thị
2. **OAuth/Auth**: Supabase auth URLs vẫn hiển thị trong network tab
3. **Browser DevTools**: Không thể hoàn toàn ẩn URLs khỏi browser

## Best Practices

1. ✅ Sử dụng API routes cho tất cả CRUD operations
2. ✅ Giữ real-time subscriptions cho Supabase (cần thiết)
3. ✅ Sử dụng environment variables cho sensitive data
4. ✅ Thêm rate limiting cho API routes
5. ✅ Log và monitor API requests

## Security Notes

- API routes vẫn cần authentication
- Validate tất cả inputs trong API routes
- Sử dụng Row Level Security (RLS) trong Supabase
- Không expose sensitive data trong responses

