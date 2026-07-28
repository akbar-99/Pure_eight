export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean
          published_at: string | null
          target_roles: string[]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          target_roles?: string[]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          published_at?: string | null
          target_roles?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_items: {
        Row: {
          appointment_id: string
          duration_mins: number
          id: string
          price: number
          service_id: string
          staff_id: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          duration_mins: number
          id?: string
          price: number
          service_id: string
          staff_id?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          duration_mins?: number
          id?: string
          price?: number
          service_id?: string
          staff_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancel_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deleted_at: string | null
          ends_at: string
          id: string
          notes: string | null
          outlet_id: string
          source: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          outlet_id: string
          source?: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deleted_at?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          outlet_id?: string
          source?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          outlet_id: string
          staff_id: string
          status: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          outlet_id: string
          staff_id: string
          status?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          outlet_id?: string
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          outlet_id: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          outlet_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          outlet_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_submissions: {
        Row: {
          action_items: Json
          answers: Json
          auditor_name: string | null
          brand_id: string
          created_at: string
          id: string
          max_score: number
          notes: string | null
          outlet_id: string
          pct_score: number | null
          template_id: string
          total_score: number
        }
        Insert: {
          action_items?: Json
          answers?: Json
          auditor_name?: string | null
          brand_id: string
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          outlet_id: string
          pct_score?: number | null
          template_id: string
          total_score?: number
        }
        Update: {
          action_items?: Json
          answers?: Json
          auditor_name?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          max_score?: number
          notes?: string | null
          outlet_id?: string
          pct_score?: number | null
          template_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_submissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_submissions_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "audit_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_templates: {
        Row: {
          brand_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          sections: Json
        }
        Insert: {
          brand_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sections?: Json
        }
        Update: {
          brand_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_lines: {
        Row: {
          bill_id: string
          discount_pct: number
          discount_value: number
          id: string
          item_id: string | null
          item_name: string
          item_type: string
          line_total: number
          qty: number
          staff_id: string | null
          tax_pct: number
          tax_value: number
          unit_price: number
        }
        Insert: {
          bill_id: string
          discount_pct?: number
          discount_value?: number
          id?: string
          item_id?: string | null
          item_name: string
          item_type: string
          line_total: number
          qty?: number
          staff_id?: string | null
          tax_pct?: number
          tax_value?: number
          unit_price: number
        }
        Update: {
          bill_id?: string
          discount_pct?: number
          discount_value?: number
          id?: string
          item_id?: string | null
          item_name?: string
          item_type?: string
          line_total?: number
          qty?: number
          staff_id?: string | null
          tax_pct?: number
          tax_value?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          bill_id: string
          captured_at: string
          id: string
          mode: string
          reference: string | null
        }
        Insert: {
          amount: number
          bill_id: string
          captured_at?: string
          id?: string
          mode: string
          reference?: string | null
        }
        Update: {
          amount?: number
          bill_id?: string
          captured_at?: string
          id?: string
          mode?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          appointment_id: string | null
          bill_number: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string | null
          deleted_at: string | null
          discount_value: number
          id: string
          notes: string | null
          outlet_id: string
          status: string
          subtotal: number
          tax_value: number
          tip_value: number
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          bill_number: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_value?: number
          id?: string
          notes?: string | null
          outlet_id: string
          status?: string
          subtotal?: number
          tax_value?: number
          tip_value?: number
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          bill_number?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string | null
          deleted_at?: string | null
          discount_value?: number
          id?: string
          notes?: string | null
          outlet_id?: string
          status?: string
          subtotal?: number
          tax_value?: number
          tip_value?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          brand_id: string
          channel: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          message_body: string | null
          name: string
          outlet_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          stats: Json | null
          status: string
          subject: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          brand_id: string
          channel: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          message_body?: string | null
          name: string
          outlet_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          stats?: Json | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          brand_id?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          message_body?: string | null
          name?: string
          outlet_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          stats?: Json | null
          status?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          anniversary: string | null
          brand_id: string
          consent_marketing: boolean
          created_at: string
          deleted_at: string | null
          dob: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          last_visited_outlet_id: string | null
          loyalty_points: number
          loyalty_tier: string
          mobile: string
          notes: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          anniversary?: string | null
          brand_id: string
          consent_marketing?: boolean
          created_at?: string
          deleted_at?: string | null
          dob?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          last_visited_outlet_id?: string | null
          loyalty_points?: number
          loyalty_tier?: string
          mobile: string
          notes?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          anniversary?: string | null
          brand_id?: string
          consent_marketing?: boolean
          created_at?: string
          deleted_at?: string | null
          dob?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_visited_outlet_id?: string | null
          loyalty_points?: number
          loyalty_tier?: string
          mobile?: string
          notes?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_last_visited_outlet_id_fkey"
            columns: ["last_visited_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          allowed_roles: string[]
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          allowed_roles?: string[]
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          allowed_roles?: string[]
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          file_size: number | null
          file_url: string | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          outlet_id: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          outlet_id?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          file_size?: number | null
          file_url?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          outlet_id?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          brand_id: string
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          expense_date: string
          id: string
          outlet_id: string
          receipt_url: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          brand_id: string
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          expense_date: string
          id?: string
          outlet_id: string
          receipt_url?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          brand_id?: string
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          expense_date?: string
          id?: string
          outlet_id?: string
          receipt_url?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_forms: {
        Row: {
          brand_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          questions: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_forms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_responses: {
        Row: {
          answers: Json
          bill_id: string | null
          brand_id: string
          created_at: string
          customer_id: string | null
          form_id: string
          id: string
          is_public: boolean
          nps_score: number | null
          outlet_id: string | null
          rating: number | null
          sentiment: string | null
        }
        Insert: {
          answers?: Json
          bill_id?: string | null
          brand_id: string
          created_at?: string
          customer_id?: string | null
          form_id: string
          id?: string
          is_public?: boolean
          nps_score?: number | null
          outlet_id?: string | null
          rating?: number | null
          sentiment?: string | null
        }
        Update: {
          answers?: Json
          bill_id?: string | null
          brand_id?: string
          created_at?: string
          customer_id?: string | null
          form_id?: string
          id?: string
          is_public?: boolean
          nps_score?: number | null
          outlet_id?: string | null
          rating?: number | null
          sentiment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "feedback_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responses_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          brand_id: string
          category: string
          cost_price: number
          created_at: string
          deleted_at: string | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          reorder_level: number
          reorder_qty: number
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_id: string
          category?: string
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          reorder_level?: number
          reorder_qty?: number
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_id?: string
          category?: string
          cost_price?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          reorder_level?: number
          reorder_qty?: number
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_staff_id: string | null
          converted_at: string | null
          converted_customer_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          expected_service: string | null
          follow_up_at: string | null
          full_name: string
          id: string
          mobile: string
          outlet_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          converted_at?: string | null
          converted_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_service?: string | null
          follow_up_at?: string | null
          full_name: string
          id?: string
          mobile: string
          outlet_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          converted_at?: string | null
          converted_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_service?: string | null
          follow_up_at?: string | null
          full_name?: string
          id?: string
          mobile?: string
          outlet_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          days: number
          from_date: string
          id: string
          outlet_id: string
          reason: string | null
          staff_id: string
          status: string
          to_date: string
          type: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          days?: number
          from_date: string
          id?: string
          outlet_id: string
          reason?: string | null
          staff_id: string
          status?: string
          to_date: string
          type?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          days?: number
          from_date?: string
          id?: string
          outlet_id?: string
          reason?: string | null
          staff_id?: string
          status?: string
          to_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_txns: {
        Row: {
          balance_after: number
          bill_id: string | null
          brand_id: string
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          points: number
          type: string
        }
        Insert: {
          balance_after: number
          bill_id?: string | null
          brand_id: string
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          points: number
          type: string
        }
        Update: {
          balance_after?: number
          bill_id?: string | null
          brand_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_txns_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_txns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_txns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          is_primary: boolean
          outlet_id: string | null
          role_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          is_primary?: boolean
          outlet_id?: string | null
          role_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          is_primary?: boolean
          outlet_id?: string | null
          role_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channels: Json
          created_at: string
          event_type: string
          id: string
          is_enabled: boolean
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          event_type: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          event_type?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          merge_tags: Json
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          merge_tags?: Json
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          merge_tags?: Json
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          applies_to: Json
          conditions: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          min_margin_pct: number | null
          name: string
          outlet_id: string | null
          tenant_id: string
          type: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_margin_pct?: number | null
          name: string
          outlet_id?: string | null
          tenant_id: string
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to?: Json
          conditions?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_margin_pct?: number | null
          name?: string
          outlet_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          city: string | null
          country: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: Json
          phone: string | null
          pincode: string | null
          state: string | null
          status: string
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: Json
          phone?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: Json
          phone?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      po_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          po_id: string
          qty_ordered: number
          qty_received: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          po_id: string
          qty_ordered: number
          qty_received?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          po_id?: string
          qty_ordered?: number
          qty_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expected_date: string | null
          id: string
          notes: string | null
          outlet_id: string
          po_number: string
          status: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          outlet_id: string
          po_number: string
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          outlet_id?: string
          po_number?: string
          status?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          response_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          response_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "feedback_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_shifts: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          outlet_id: string
          staff_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          outlet_id: string
          staff_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          outlet_id?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_shifts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          brand_id: string
          category: string
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          display_order: number
          duration_mins: number
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          tax_rate: number
          updated_at: string
        }
        Insert: {
          brand_id: string
          category: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          duration_mins?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          brand_id?: string
          category?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          duration_mins?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          commission_scheme: Json
          created_at: string
          deleted_at: string | null
          employment_type: string
          full_name: string
          id: string
          joining_date: string | null
          mobile: string | null
          outlet_id: string
          role_title: string | null
          skills: string[]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          commission_scheme?: Json
          created_at?: string
          deleted_at?: string | null
          employment_type?: string
          full_name: string
          id?: string
          joining_date?: string | null
          mobile?: string | null
          outlet_id: string
          role_title?: string | null
          skills?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          commission_scheme?: Json
          created_at?: string
          deleted_at?: string | null
          employment_type?: string
          full_name?: string
          id?: string
          joining_date?: string | null
          mobile?: string | null
          outlet_id?: string
          role_title?: string | null
          skills?: string[]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          id: string
          item_id: string
          outlet_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          outlet_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          outlet_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          notes: string | null
          outlet_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
          outlet_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          outlet_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          name: string
          parent_id: string | null
          settings: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          parent_id?: string | null
          settings?: Json
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          settings?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          id: string
          outlet_id: string | null
          priority: string
          resolved_at: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          outlet_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          outlet_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          progress_pct: number
          staff_id: string
          status: string
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          progress_pct?: number
          staff_id: string
          status?: string
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          progress_pct?: number
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          brand_id: string
          category: string
          content: Json
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_mins: number
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          brand_id: string
          category?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_mins?: number
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          brand_id?: string
          category?: string
          content?: Json
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_mins?: number
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          mfa_enabled: boolean
          mobile: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          mfa_enabled?: boolean
          mobile?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          mfa_enabled?: boolean
          mobile?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          brand_id: string
          category: string
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand_id: string
          category?: string
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand_id?: string
          category?: string
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
