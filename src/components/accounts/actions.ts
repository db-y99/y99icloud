"use server";

// This file is intentionally left almost empty.
// Data mutation logic has been moved from server actions to client components.
// This ensures that the client's Firebase authentication context is available
// when making calls to Firestore, which resolves all PERMISSION_DENIED errors
// caused by unauthenticated server-side requests.
// Audit logging is handled by a separate, dedicated server action.
