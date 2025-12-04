# Ví Dụ Migration: Chuyển từ Supabase Client sang API Client

## Ví Dụ 1: Customer Form Dialog

### Trước (Supabase trực tiếp)

```typescript
// src/components/customers/customer-form-dialog.tsx
import { supabase } from '@/lib/supabase/config';

const onSubmit = async (values: CustomerFormValues) => {
  if (customer) {
    // Update
    const { error } = await supabase
      .from('customers')
      .update(dataToUpdate)
      .eq('id', customer.id);
  } else {
    // Insert
    const { error } = await supabase
      .from('customers')
      .insert({
        account_id: parseInt(accountId),
        name: values.name,
        phone: values.phone || null,
        notes: values.notes || null,
      });
  }
};
```

### Sau (API Client)

```typescript
// src/components/customers/customer-form-dialog.tsx
import { apiInsert, apiUpdate } from '@/lib/api-client';

const onSubmit = async (values: CustomerFormValues) => {
  if (customer) {
    // Update
    const { error } = await apiUpdate('customers', {
      data: dataToUpdate,
      filters: [
        { column: 'id', operator: 'eq', value: customer.id }
      ]
    });
  } else {
    // Insert
    const { error } = await apiInsert('customers', {
      data: {
        account_id: parseInt(accountId),
        name: values.name,
        phone: values.phone || null,
        notes: values.notes || null,
      }
    });
  }
};
```

## Ví Dụ 2: Account Detail Page

### Trước

```typescript
// src/app/accounts/[id]/page.tsx
import { supabase } from '@/lib/supabase/config';

const { data, error } = await supabase
  .from('accounts')
  .select('*')
  .eq('id', parseInt(accountId))
  .single();
```

### Sau

```typescript
// src/app/accounts/[id]/page.tsx
import { apiSelect } from '@/lib/api-client';

const { data: accounts, error } = await apiSelect('accounts', {
  filters: [
    { column: 'id', operator: 'eq', value: parseInt(accountId) }
  ]
});

const account = accounts?.[0] || null;
```

## Ví Dụ 3: All Customers Table

### Trước

```typescript
// src/components/customers/all-customers-table-client.tsx
import { supabase } from '@/lib/supabase/config';

const { data, error } = await supabase
  .from('customers')
  .select(`
    *,
    accounts:account_id (
      id,
      username
    )
  `)
  .order('created_at', { ascending: false })
  .limit(100);
```

### Sau

```typescript
// src/components/customers/all-customers-table-client.tsx
import { apiSelect } from '@/lib/api-client';

const { data, error } = await apiSelect('customers', {
  select: `
    *,
    accounts:account_id (
      id,
      username
    )
  `,
  orderBy: { column: 'created_at', ascending: false }
  // Note: limit cần được thêm vào API route nếu cần
});
```

## Lưu Ý Quan Trọng

### Real-time Subscriptions

**KHÔNG** thay đổi real-time subscriptions, vẫn cần Supabase client:

```typescript
// ✅ GIỮ NGUYÊN - Real-time subscriptions
const { data, loading } = useSupabaseSubscription<Account>('accounts', {
  select: '*',
  filter: (query) => query.is('deleted_at', null),
  orderBy: { column: 'created_at', ascending: false }
});
```

### Auth Operations

**KHÔNG** thay đổi auth operations:

```typescript
// ✅ GIỮ NGUYÊN - Auth
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

## Checklist Migration

- [ ] Tìm tất cả `supabase.from()` calls trong codebase
- [ ] Thay thế bằng `apiSelect`, `apiInsert`, `apiUpdate`, `apiDelete`
- [ ] Giữ nguyên real-time subscriptions
- [ ] Giữ nguyên auth operations
- [ ] Test tất cả CRUD operations
- [ ] Verify trong Network tab chỉ thấy `/api/data`

