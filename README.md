# Y99 iCloud Management System

Dự án quản lý tài khoản iCloud sử dụng **Supabase** làm database backend.

## 🚀 Quick Start

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Supabase
```bash
# Tạo project tại https://supabase.com
# Copy env.example thành .env.local
# Thêm Supabase URL và API keys
```

### 3. Chạy Database Schema
```sql
-- Trong Supabase SQL Editor, chạy file:
-- setup-database.sql (khuyên dùng - đã tối ưu)
-- HOẶC supabase-schema.sql (file gốc)
```

### 4. Cấu hình Google OAuth
- Authentication > Providers > Google
- Thêm OAuth credentials
- Set redirect URL

### 5. Chạy ứng dụng
```bash
npm run dev
```

## 📚 Documentation

- [Migration Guide](./SUPABASE_MIGRATION_README.md)
- [Schema Design](./README_SCHEMA_REDESIGN.md)
- [Database Setup](./setup-database.sql)
- [Update Security](./update-security-policies.sql)
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)

## 🎯 Features

- ✅ Quản lý tài khoản iCloud
- ✅ Quản lý khách hàng
- ✅ **Quản lý Email được phép truy cập**
- ✅ Nhật ký hoạt động (Audit logs)
- ✅ Authentication với Google OAuth
- ✅ Real-time updates
- ✅ Import/Export CSV
- ✅ Password history tracking

## 🔒 Security

**Dynamic Access Control:**
- **Email management system**: Thêm/bớt email được phép qua UI
- Row Level Security (RLS) policies trong PostgreSQL
- **Initial owners**: `khaitq.it@y99.vn`, `khoatb.cs@y99.vn`, `sy@y99.vn`
- **Roles**: Owner (toàn quyền), Admin, User
- **Audit logging** cho tất cả thay đổi
