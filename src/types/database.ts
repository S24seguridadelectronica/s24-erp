export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; phone: string | null; avatar_url: string | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id: string; email: string; full_name?: string | null; phone?: string | null; avatar_url?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string; full_name?: string | null; phone?: string | null; avatar_url?: string | null; is_active?: boolean; created_at?: string; updated_at?: string }
      }
      customers: {
        Row: { id: number; customer_type: 'individual' | 'company'; document_number: string | null; full_name: string; company_name: string | null; email: string | null; phone: string; address: string | null; city: string | null; contact_person: string | null; source: string | null; notes: string | null; assigned_to: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; customer_type: 'individual' | 'company'; document_number?: string | null; full_name: string; company_name?: string | null; email?: string | null; phone: string; address?: string | null; city?: string | null; contact_person?: string | null; source?: string | null; notes?: string | null; assigned_to?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; customer_type?: 'individual' | 'company'; document_number?: string | null; full_name?: string; company_name?: string | null; email?: string | null; phone?: string; address?: string | null; city?: string | null; contact_person?: string | null; source?: string | null; notes?: string | null; assigned_to?: string | null; created_at?: string; updated_at?: string }
      }
      opportunities: {
        Row: { id: number; customer_id: number; title: string; stage: string; value: number | null; probability: number | null; expected_close_date: string | null; assigned_to: string | null; lost_reason: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; customer_id: number; title: string; stage: string; value?: number | null; probability?: number | null; expected_close_date?: string | null; assigned_to?: string | null; lost_reason?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; customer_id?: number; title?: string; stage?: string; value?: number | null; probability?: number | null; expected_close_date?: string | null; assigned_to?: string | null; lost_reason?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
      }
      calls: {
        Row: { id: number; call_direction: 'inbound' | 'outbound'; phone_number: string; customer_id: number | null; assigned_to: string | null; started_at: string | null; ended_at: string | null; duration_seconds: number | null; status: string; disposition: string | null; recording_url: string | null; transcript_url: string | null; ai_summary: Json | null; provider_call_id: string | null; notes: string | null; created_at: string }
        Insert: { id?: number; call_direction: 'inbound' | 'outbound'; phone_number: string; customer_id?: number | null; assigned_to?: string | null; started_at?: string | null; ended_at?: string | null; duration_seconds?: number | null; status?: string; disposition?: string | null; recording_url?: string | null; transcript_url?: string | null; ai_summary?: Json | null; provider_call_id?: string | null; notes?: string | null; created_at?: string }
        Update: { id?: number; call_direction?: 'inbound' | 'outbound'; phone_number?: string; customer_id?: number | null; assigned_to?: string | null; started_at?: string | null; ended_at?: string | null; duration_seconds?: number | null; status?: string; disposition?: string | null; recording_url?: string | null; transcript_url?: string | null; ai_summary?: Json | null; provider_call_id?: string | null; notes?: string | null; created_at?: string }
      }
      quotes: {
        Row: { id: number; quote_number: string; customer_id: number; salesperson_id: string | null; opportunity_id: number | null; status: string; subtotal: number; tax_amount: number; discount_amount: number; total: number; valid_until: string | null; terms: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; quote_number: string; customer_id: number; salesperson_id?: string | null; opportunity_id?: number | null; status?: string; subtotal?: number; tax_amount?: number; discount_amount?: number; total?: number; valid_until?: string | null; terms?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; quote_number?: string; customer_id?: number; salesperson_id?: string | null; opportunity_id?: number | null; status?: string; subtotal?: number; tax_amount?: number; discount_amount?: number; total?: number; valid_until?: string | null; terms?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
      }
      work_orders: {
        Row: { id: number; order_number: string; customer_id: number; sale_id: number | null; service_type: string; description: string | null; address: string | null; contact_name: string | null; contact_phone: string | null; assigned_to: string | null; scheduled_at: string | null; status: string; priority: string | null; materials_cost: number; labor_cost: number; total_cost: number; completed_at: string | null; notes: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; order_number: string; customer_id: number; sale_id?: number | null; service_type: string; description?: string | null; address?: string | null; contact_name?: string | null; contact_phone?: string | null; assigned_to?: string | null; scheduled_at?: string | null; status?: string; priority?: string | null; materials_cost?: number; labor_cost?: number; total_cost?: number; completed_at?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; order_number?: string; customer_id?: number; sale_id?: number | null; service_type?: string; description?: string | null; address?: string | null; contact_name?: string | null; contact_phone?: string | null; assigned_to?: string | null; scheduled_at?: string | null; status?: string; priority?: string | null; materials_cost?: number; labor_cost?: number; total_cost?: number; completed_at?: string | null; notes?: string | null; created_at?: string; updated_at?: string }
      }
      products: {
        Row: { id: number; sku: string; name: string; category: string | null; brand: string | null; description: string | null; cost: number; price: number; stock_quantity: number; min_stock: number; location: string | null; supplier_id: number | null; warranty_months: number | null; is_active: boolean; created_at: string; updated_at: string }
        Insert: { id?: number; sku: string; name: string; category?: string | null; brand?: string | null; description?: string | null; cost?: number; price?: number; stock_quantity?: number; min_stock?: number; location?: string | null; supplier_id?: number | null; warranty_months?: number | null; is_active?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: number; sku?: string; name?: string; category?: string | null; brand?: string | null; description?: string | null; cost?: number; price?: number; stock_quantity?: number; min_stock?: number; location?: string | null; supplier_id?: number | null; warranty_months?: number | null; is_active?: boolean; created_at?: string; updated_at?: string }
      }
      web_pages: {
        Row: { id: number; slug: string; title: string; meta_description: string | null; meta_keywords: string | null; is_published: boolean; published_at: string | null; created_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: number; slug: string; title: string; meta_description?: string | null; meta_keywords?: string | null; is_published?: boolean; published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: number; slug?: string; title?: string; meta_description?: string | null; meta_keywords?: string | null; is_published?: boolean; published_at?: string | null; created_by?: string | null; created_at?: string; updated_at?: string }
      }
      web_sections: {
        Row: { id: number; page_id: number; section_type: string; title: string | null; content: Json | null; sort_order: number; is_visible: boolean; created_at: string; updated_at: string }
        Insert: { id?: number; page_id: number; section_type: string; title?: string | null; content?: Json | null; sort_order?: number; is_visible?: boolean; created_at?: string; updated_at?: string }
        Update: { id?: number; page_id?: number; section_type?: string; title?: string | null; content?: Json | null; sort_order?: number; is_visible?: boolean; created_at?: string; updated_at?: string }
      }
      site_settings: {
        Row: { id: number; setting_key: string; setting_value: Json; updated_by: string | null; updated_at: string }
        Insert: { id?: number; setting_key: string; setting_value: Json; updated_by?: string | null; updated_at?: string }
        Update: { id?: number; setting_key?: string; setting_value?: Json; updated_by?: string | null; updated_at?: string }
      }
      audit_logs: {
        Row: { id: number; user_id: string | null; action: string; table_name: string | null; record_id: string | null; old_data: Json | null; new_data: Json | null; ip_address: string | null; user_agent: string | null; created_at: string }
        Insert: { id?: number; user_id?: string | null; action: string; table_name?: string | null; record_id?: string | null; old_data?: Json | null; new_data?: Json | null; ip_address?: string | null; user_agent?: string | null; created_at?: string }
      }
    }
  }
}