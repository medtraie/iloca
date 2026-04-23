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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address_foreign: string | null
          address_morocco: string | null
          avatar_url: string | null
          birth_date: string | null
          cin: string | null
          cin_delivered: string | null
          created_at: string | null
          documents_urls: Json | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string
          license_delivered: string | null
          license_number: string | null
          passport_delivered: string | null
          passport_number: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_foreign?: string | null
          address_morocco?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cin?: string | null
          cin_delivered?: string | null
          created_at?: string | null
          documents_urls?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name: string
          license_delivered?: string | null
          license_number?: string | null
          passport_delivered?: string | null
          passport_number?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_foreign?: string | null
          address_morocco?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cin?: string | null
          cin_delivered?: string | null
          created_at?: string | null
          documents_urls?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string
          license_delivered?: string | null
          license_number?: string | null
          passport_delivered?: string | null
          passport_number?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contract_series: {
        Row: {
          created_at: string | null
          current_number: number | null
          id: string
          padding: number | null
          prefix: string | null
          series_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_number?: number | null
          id?: string
          padding?: number | null
          prefix?: string | null
          series_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_number?: number | null
          id?: string
          padding?: number | null
          prefix?: string | null
          series_name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_series_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          advance_payment: number | null
          client_id: string | null
          contract_data: Json | null
          contract_number: string
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_national_id: string | null
          customer_phone: string | null
          daily_rate: number | null
          delivery_damages: Json | null
          delivery_fuel_level: number | null
          delivery_mileage: number | null
          end_date: string
          extension_amount: number | null
          extension_days: number | null
          extension_end_date: string | null
          id: string
          notes: string | null
          overdue_amount: number | null
          overdue_days: number | null
          remaining_amount: number | null
          return_damages: Json | null
          return_fuel_level: number | null
          return_mileage: number | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"] | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
          vehicle_info: Json | null
        }
        Insert: {
          advance_payment?: number | null
          client_id?: string | null
          contract_data?: Json | null
          contract_number: string
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_national_id?: string | null
          customer_phone?: string | null
          daily_rate?: number | null
          delivery_damages?: Json | null
          delivery_fuel_level?: number | null
          delivery_mileage?: number | null
          end_date: string
          extension_amount?: number | null
          extension_days?: number | null
          extension_end_date?: string | null
          id?: string
          notes?: string | null
          overdue_amount?: number | null
          overdue_days?: number | null
          remaining_amount?: number | null
          return_damages?: Json | null
          return_fuel_level?: number | null
          return_mileage?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          advance_payment?: number | null
          client_id?: string | null
          contract_data?: Json | null
          contract_number?: string
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_national_id?: string | null
          customer_phone?: string | null
          daily_rate?: number | null
          delivery_damages?: Json | null
          delivery_fuel_level?: number | null
          delivery_mileage?: number | null
          end_date?: string
          extension_amount?: number | null
          extension_days?: number | null
          extension_end_date?: string | null
          id?: string
          notes?: string | null
          overdue_amount?: number | null
          overdue_days?: number | null
          remaining_amount?: number | null
          return_damages?: Json | null
          return_fuel_level?: number | null
          return_mileage?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      damages: {
        Row: {
          contract_id: string | null
          created_at: string | null
          damage_type: string
          description: string | null
          id: string
          photos_urls: Json | null
          position_x: number | null
          position_y: number | null
          repair_cost: number | null
          severity: Database["public"]["Enums"]["damage_severity"] | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          damage_type: string
          description?: string | null
          id?: string
          photos_urls?: Json | null
          position_x?: number | null
          position_y?: number | null
          repair_cost?: number | null
          severity?: Database["public"]["Enums"]["damage_severity"] | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          damage_type?: string
          description?: string | null
          id?: string
          photos_urls?: Json | null
          position_x?: number | null
          position_y?: number | null
          repair_cost?: number | null
          severity?: Database["public"]["Enums"]["damage_severity"] | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "damages_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          created_at: string
          document_url: string | null
          end_date: string
          id: string
          monthly_cost: number
          notes: string | null
          period_months: number
          start_date: string
          total_cost: number
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          end_date: string
          id?: string
          monthly_cost: number
          notes?: string | null
          period_months?: number
          start_date: string
          total_cost: number
          type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          end_date?: string
          id?: string
          monthly_cost?: number
          notes?: string | null
          period_months?: number
          start_date?: string
          total_cost?: number
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          contract_id: string | null
          created_at: string | null
          customer_address: string | null
          customer_ice: string | null
          customer_name: string
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          items: Json | null
          notes: string | null
          payment_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal_ht: number
          tax_amount: number | null
          tax_rate: number | null
          total_ttc: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_ice?: string | null
          customer_name: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          items?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal_ht: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_ttc?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_ice?: string | null
          customer_name?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          items?: Json | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal_ht?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_ttc?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      miscellaneous_expenses: {
        Row: {
          amount: number
          created_at: string
          custom_expense_type: string | null
          expense_date: string
          expense_type: string
          id: string
          notes: string | null
          payment_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          custom_expense_type?: string | null
          expense_date: string
          expense_type: string
          id?: string
          notes?: string | null
          payment_method: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          custom_expense_type?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          notes?: string | null
          payment_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_expenses: {
        Row: {
          allocated_amount: number
          created_at: string
          expense_id: string | null
          expense_type: string
          id: string
          month_year: string
          vehicle_id: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string
          expense_id?: string | null
          expense_type: string
          id?: string
          month_year: string
          vehicle_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string
          expense_id?: string | null
          expense_type?: string
          id?: string
          month_year?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_expenses_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repairs: {
        Row: {
          attachments_urls: Json | null
          completion_date: string | null
          cost: number
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          repair_date: string
          repair_type: Database["public"]["Enums"]["repair_type"]
          status: Database["public"]["Enums"]["repair_status"] | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
          vehicle_info: Json | null
        }
        Insert: {
          attachments_urls?: Json | null
          completion_date?: string | null
          cost: number
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          repair_date: string
          repair_type: Database["public"]["Enums"]["repair_type"]
          status?: Database["public"]["Enums"]["repair_status"] | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
        }
        Update: {
          attachments_urls?: Json | null
          completion_date?: string | null
          cost?: number
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          repair_date?: string
          repair_type?: Database["public"]["Enums"]["repair_type"]
          status?: Database["public"]["Enums"]["repair_status"] | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "repairs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          contract_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          signature_data: string | null
          signature_date: string | null
          signature_type: Database["public"]["Enums"]["signature_type"]
          signature_url: string | null
          signer_email: string | null
          signer_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          signature_data?: string | null
          signature_date?: string | null
          signature_type: Database["public"]["Enums"]["signature_type"]
          signature_url?: string | null
          signer_email?: string | null
          signer_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          signature_data?: string | null
          signature_date?: string | null
          signature_type?: Database["public"]["Enums"]["signature_type"]
          signature_url?: string | null
          signer_email?: string | null
          signer_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          daily_rate: number | null
          departure_mileage: number | null
          documents_urls: Json | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          gearbox: Database["public"]["Enums"]["gearbox_type"] | null
          id: string
          mileage: number | null
          model: string | null
          photos_urls: Json | null
          registration: string | null
          status: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string | null
          daily_rate?: number | null
          departure_mileage?: number | null
          documents_urls?: Json | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          gearbox?: Database["public"]["Enums"]["gearbox_type"] | null
          id?: string
          mileage?: number | null
          model?: string | null
          photos_urls?: Json | null
          registration?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          daily_rate?: number | null
          departure_mileage?: number | null
          documents_urls?: Json | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          gearbox?: Database["public"]["Enums"]["gearbox_type"] | null
          id?: string
          mileage?: number | null
          model?: string | null
          photos_urls?: Json | null
          registration?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_contract_number: {
        Args: { p_series_name?: string; p_user_id?: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      contract_status:
        | "draft"
        | "ouvert"
        | "ferme"
        | "sent"
        | "signed"
        | "completed"
        | "cancelled"
      damage_severity: "leger" | "moyen" | "grave"
      fuel_type: "essence" | "diesel" | "hybride" | "electrique"
      gearbox_type: "manuelle" | "automatique"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      payment_method: "cash" | "check" | "transfer" | "card" | "other"
      repair_status: "en_cours" | "terminee" | "annulee"
      repair_type:
        | "Mécanique"
        | "Électrique"
        | "Carrosserie"
        | "Pneus"
        | "Autre"
      signature_type:
        | "delivery_agent"
        | "delivery_tenant"
        | "return_agent"
        | "return_tenant"
      user_role: "admin" | "agent" | "comptable" | "technicien"
      vehicle_status: "disponible" | "loue" | "maintenance" | "hors_service"
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
    Enums: {
      contract_status: [
        "draft",
        "ouvert",
        "ferme",
        "sent",
        "signed",
        "completed",
        "cancelled",
      ],
      damage_severity: ["leger", "moyen", "grave"],
      fuel_type: ["essence", "diesel", "hybride", "electrique"],
      gearbox_type: ["manuelle", "automatique"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      payment_method: ["cash", "check", "transfer", "card", "other"],
      repair_status: ["en_cours", "terminee", "annulee"],
      repair_type: ["Mécanique", "Électrique", "Carrosserie", "Pneus", "Autre"],
      signature_type: [
        "delivery_agent",
        "delivery_tenant",
        "return_agent",
        "return_tenant",
      ],
      user_role: ["admin", "agent", "comptable", "technicien"],
      vehicle_status: ["disponible", "loue", "maintenance", "hors_service"],
    },
  },
} as const
