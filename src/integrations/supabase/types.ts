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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          structural_trace: Json
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id: string
          structural_trace: Json
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          structural_trace?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          created_at: string
          cycle_integrity_hash: string
          id: string
          input_classification: string
          input_hash: string
          llm_config_hash: string
          llm_model_id: string
          llm_provider: string
          llm_temperature: number
          movement_primary: string
          movement_secondary: string | null
          previous_cycle_hash: string | null
          raw_input_json: Json
          response_type: string
          structural_hash: string
          structural_model_version: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          cycle_integrity_hash: string
          id: string
          input_classification: string
          input_hash: string
          llm_config_hash: string
          llm_model_id: string
          llm_provider: string
          llm_temperature: number
          movement_primary: string
          movement_secondary?: string | null
          previous_cycle_hash?: string | null
          raw_input_json: Json
          response_type: string
          structural_hash: string
          structural_model_version: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string
          cycle_integrity_hash?: string
          id?: string
          input_classification?: string
          input_hash?: string
          llm_config_hash?: string
          llm_model_id?: string
          llm_provider?: string
          llm_temperature?: number
          movement_primary?: string
          movement_secondary?: string | null
          previous_cycle_hash?: string | null
          raw_input_json?: Json
          response_type?: string
          structural_hash?: string
          structural_model_version?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      node_history: {
        Row: {
          cycle_id: string
          density_class: number
          distance: number
          id: string
          macro_band: string
          node_id: string
          node_type: string
        }
        Insert: {
          cycle_id: string
          density_class: number
          distance: number
          id: string
          macro_band: string
          node_id: string
          node_type: string
        }
        Update: {
          cycle_id?: string
          density_class?: number
          distance?: number
          id?: string
          macro_band?: string
          node_id?: string
          node_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_history_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_corpus: {
        Row: {
          amplitude_max: number
          amplitude_min: number
          content_text: string
          created_at: string
          density_class: number
          family: string
          id: string
          macro_band: string
          node_id: string
          node_type: string
          normative_score: number
          prescriptive_score: number
          stage_max: number
          stage_min: number
          teleology_score: number
        }
        Insert: {
          amplitude_max: number
          amplitude_min: number
          content_text: string
          created_at?: string
          density_class: number
          family: string
          id: string
          macro_band: string
          node_id: string
          node_type: string
          normative_score?: number
          prescriptive_score?: number
          stage_max: number
          stage_min: number
          teleology_score?: number
        }
        Update: {
          amplitude_max?: number
          amplitude_min?: number
          content_text?: string
          created_at?: string
          density_class?: number
          family?: string
          id?: string
          macro_band?: string
          node_id?: string
          node_type?: string
          normative_score?: number
          prescriptive_score?: number
          stage_max?: number
          stage_min?: number
          teleology_score?: number
        }
        Relationships: []
      }
      structural_model_disclosures: {
        Row: {
          disclosed_at: string
          disclosure_notes: string | null
          id: string
          structural_model_version: string
        }
        Insert: {
          disclosed_at?: string
          disclosure_notes?: string | null
          id: string
          structural_model_version: string
        }
        Update: {
          disclosed_at?: string
          disclosure_notes?: string | null
          id?: string
          structural_model_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "structural_model_disclosures_structural_model_version_fkey"
            columns: ["structural_model_version"]
            isOneToOne: false
            referencedRelation: "structural_model_registry"
            referencedColumns: ["structural_model_version"]
          },
        ]
      }
      structural_model_registry: {
        Row: {
          active: boolean
          created_at: string
          structural_model_version: string
        }
        Insert: {
          active: boolean
          created_at?: string
          structural_model_version: string
        }
        Update: {
          active?: boolean
          created_at?: string
          structural_model_version?: string
        }
        Relationships: []
      }
      structural_snapshots: {
        Row: {
          cycle_id: string
          snapshot_json: Json
        }
        Insert: {
          cycle_id: string
          snapshot_json: Json
        }
        Update: {
          cycle_id?: string
          snapshot_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "structural_snapshots_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: true
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          version: number
        }
        Insert: {
          created_at?: string
          id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
