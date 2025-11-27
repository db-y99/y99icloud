import { supabase } from './config'
import type { Account, AuditLog, Customer } from '../types.tsx'

// Get all non-deleted accounts
export const getAccounts = async (): Promise<Account[]> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting accounts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting accounts:', error)
    return []
  }
}

// Get all soft-deleted accounts
export const getDeletedAccounts = async (): Promise<Account[]> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (error) {
      console.error('Error getting deleted accounts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting deleted accounts:', error)
    return []
  }
}

// Get all audit logs
export const getAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error getting audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return []
  }
}

// Get all customers
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting customers:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting customers:', error)
    return []
  }
}
