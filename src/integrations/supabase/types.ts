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
      benchmark_runs: {
        Row: {
          casos_rodados: number | null
          cleanup: boolean
          completed_at: string | null
          detalhes: Json | null
          duration_ms: number | null
          error_message: string | null
          errors: Json | null
          id: string
          metrics: Json | null
          personas_filter: string[] | null
          pills_filter: string[] | null
          por_pill: Json | null
          started_at: string
          status: string
        }
        Insert: {
          casos_rodados?: number | null
          cleanup?: boolean
          completed_at?: string | null
          detalhes?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          errors?: Json | null
          id?: string
          metrics?: Json | null
          personas_filter?: string[] | null
          pills_filter?: string[] | null
          por_pill?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          casos_rodados?: number | null
          cleanup?: boolean
          completed_at?: string | null
          detalhes?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          errors?: Json | null
          id?: string
          metrics?: Json | null
          personas_filter?: string[] | null
          pills_filter?: string[] | null
          por_pill?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      block_responses: {
        Row: {
          answered_at: string
          block_id: string
          id: string
          ipe_cycle_id: string
          position: number
          principal_resposta: string | null
          protecao_etica: boolean
          tempo_resposta_segundos: number | null
          variante_resposta: string | null
          variante_servida: string | null
        }
        Insert: {
          answered_at?: string
          block_id: string
          id?: string
          ipe_cycle_id: string
          position: number
          principal_resposta?: string | null
          protecao_etica?: boolean
          tempo_resposta_segundos?: number | null
          variante_resposta?: string | null
          variante_servida?: string | null
        }
        Update: {
          answered_at?: string
          block_id?: string
          id?: string
          ipe_cycle_id?: string
          position?: number
          principal_resposta?: string | null
          protecao_etica?: boolean
          tempo_resposta_segundos?: number | null
          variante_resposta?: string | null
          variante_servida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_responses_ipe_cycle_id_fkey"
            columns: ["ipe_cycle_id"]
            isOneToOne: false
            referencedRelation: "ipe_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_ils: {
        Row: {
          confianca_global: string | null
          confianca_por_linha: Json
          d1: number | null
          d2: number | null
          d3: number | null
          d4: number | null
          flags: Json
          id: string
          il_status: Json
          ipe_cycle_id: string
          l1_1: number | null
          l1_2: number | null
          l1_3: number | null
          l1_4: number | null
          l2_1: number | null
          l2_2: number | null
          l2_3: number | null
          l2_4: number | null
          l3_1: number | null
          l3_2: number | null
          l3_3: number | null
          l3_4: number | null
          l4_1: number | null
          l4_2: number | null
          l4_3: number | null
          l4_4: number | null
          produced_at: string
          revisado_at: string | null
          revisado_por: string | null
          revisao_motivo: string | null
          revisao_necessaria: boolean
        }
        Insert: {
          confianca_global?: string | null
          confianca_por_linha?: Json
          d1?: number | null
          d2?: number | null
          d3?: number | null
          d4?: number | null
          flags?: Json
          id?: string
          il_status?: Json
          ipe_cycle_id: string
          l1_1?: number | null
          l1_2?: number | null
          l1_3?: number | null
          l1_4?: number | null
          l2_1?: number | null
          l2_2?: number | null
          l2_3?: number | null
          l2_4?: number | null
          l3_1?: number | null
          l3_2?: number | null
          l3_3?: number | null
          l3_4?: number | null
          l4_1?: number | null
          l4_2?: number | null
          l4_3?: number | null
          l4_4?: number | null
          produced_at?: string
          revisado_at?: string | null
          revisado_por?: string | null
          revisao_motivo?: string | null
          revisao_necessaria?: boolean
        }
        Update: {
          confianca_global?: string | null
          confianca_por_linha?: Json
          d1?: number | null
          d2?: number | null
          d3?: number | null
          d4?: number | null
          flags?: Json
          id?: string
          il_status?: Json
          ipe_cycle_id?: string
          l1_1?: number | null
          l1_2?: number | null
          l1_3?: number | null
          l1_4?: number | null
          l2_1?: number | null
          l2_2?: number | null
          l2_3?: number | null
          l2_4?: number | null
          l3_1?: number | null
          l3_2?: number | null
          l3_3?: number | null
          l3_4?: number | null
          l4_1?: number | null
          l4_2?: number | null
          l4_3?: number | null
          l4_4?: number | null
          produced_at?: string
          revisado_at?: string | null
          revisado_por?: string | null
          revisao_motivo?: string | null
          revisao_necessaria?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "canonical_ils_ipe_cycle_id_fkey"
            columns: ["ipe_cycle_id"]
            isOneToOne: true
            referencedRelation: "ipe_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          created_at: string
          cycle_integrity_hash: string
          cycle_state: string
          hago_state: string
          id: string
          input_classification: string
          input_hash: string
          ipe_cycle_id: string | null
          ipe_cycle_number: number | null
          llm_config_hash: string
          llm_model_id: string
          llm_prompt_hash: string | null
          llm_provider: string
          llm_response: string | null
          llm_temperature: number
          movement_primary: string
          movement_secondary: string | null
          previous_cycle_hash: string | null
          raw_input_json: Json
          response_type: string
          structural_hash: string
          structural_model_version: string
          user_id: string
          user_text: string | null
          version: number
        }
        Insert: {
          created_at?: string
          cycle_integrity_hash: string
          cycle_state?: string
          hago_state?: string
          id: string
          input_classification: string
          input_hash: string
          ipe_cycle_id?: string | null
          ipe_cycle_number?: number | null
          llm_config_hash: string
          llm_model_id: string
          llm_prompt_hash?: string | null
          llm_provider: string
          llm_response?: string | null
          llm_temperature: number
          movement_primary: string
          movement_secondary?: string | null
          previous_cycle_hash?: string | null
          raw_input_json: Json
          response_type: string
          structural_hash: string
          structural_model_version: string
          user_id: string
          user_text?: string | null
          version: number
        }
        Update: {
          created_at?: string
          cycle_integrity_hash?: string
          cycle_state?: string
          hago_state?: string
          id?: string
          input_classification?: string
          input_hash?: string
          ipe_cycle_id?: string | null
          ipe_cycle_number?: number | null
          llm_config_hash?: string
          llm_model_id?: string
          llm_prompt_hash?: string | null
          llm_provider?: string
          llm_response?: string | null
          llm_temperature?: number
          movement_primary?: string
          movement_secondary?: string | null
          previous_cycle_hash?: string | null
          raw_input_json?: Json
          response_type?: string
          structural_hash?: string
          structural_model_version?: string
          user_id?: string
          user_text?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cycles_ipe_cycle_id_fkey"
            columns: ["ipe_cycle_id"]
            isOneToOne: false
            referencedRelation: "ipe_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ipe_cycles: {
        Row: {
          completed_at: string | null
          cycle_number: number
          id: string
          pills_completed: string[]
          prompt_version: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          cycle_number?: number
          id?: string
          pills_completed?: string[]
          prompt_version?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          cycle_number?: number
          id?: string
          pills_completed?: string[]
          prompt_version?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
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
      pill_responses: {
        Row: {
          completed_at: string | null
          eco_text: string | null
          id: string
          ipe_cycle_id: string
          m1_tempo_segundos: number | null
          m2_cal_signals: Json | null
          m2_resposta: string | null
          m3_respostas: Json | null
          m4_resposta: Json | null
          pill_id: string
        }
        Insert: {
          completed_at?: string | null
          eco_text?: string | null
          id?: string
          ipe_cycle_id: string
          m1_tempo_segundos?: number | null
          m2_cal_signals?: Json | null
          m2_resposta?: string | null
          m3_respostas?: Json | null
          m4_resposta?: Json | null
          pill_id: string
        }
        Update: {
          completed_at?: string | null
          eco_text?: string | null
          id?: string
          ipe_cycle_id?: string
          m1_tempo_segundos?: number | null
          m2_cal_signals?: Json | null
          m2_resposta?: string | null
          m3_respostas?: Json | null
          m4_resposta?: Json | null
          pill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pill_responses_ipe_cycle_id_fkey"
            columns: ["ipe_cycle_id"]
            isOneToOne: false
            referencedRelation: "ipe_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      pill_scoring: {
        Row: {
          corpus_linhas: Json | null
          corpus_transversal: Json | null
          id: string
          ipe_cycle_id: string
          pill_id: string
          scored_at: string | null
          scoring_model: string | null
          scoring_version: string | null
          sinais_l24: Json | null
        }
        Insert: {
          corpus_linhas?: Json | null
          corpus_transversal?: Json | null
          id?: string
          ipe_cycle_id: string
          pill_id: string
          scored_at?: string | null
          scoring_model?: string | null
          scoring_version?: string | null
          sinais_l24?: Json | null
        }
        Update: {
          corpus_linhas?: Json | null
          corpus_transversal?: Json | null
          id?: string
          ipe_cycle_id?: string
          pill_id?: string
          scored_at?: string | null
          scoring_model?: string | null
          scoring_version?: string | null
          sinais_l24?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pill_scoring_ipe_cycle_id_fkey"
            columns: ["ipe_cycle_id"]
            isOneToOne: false
            referencedRelation: "ipe_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          active: boolean
          component: string
          created_at: string
          deprecated_at: string | null
          id: string
          prompt_text: string
          version: string
        }
        Insert: {
          active?: boolean
          component: string
          created_at?: string
          deprecated_at?: string | null
          id?: string
          prompt_text: string
          version: string
        }
        Update: {
          active?: boolean
          component?: string
          created_at?: string
          deprecated_at?: string | null
          id?: string
          prompt_text?: string
          version?: string
        }
        Relationships: []
      }
      questionnaire_state: {
        Row: {
          contador_d3_blocos: number | null
          current_position: number | null
          execution_plan: Json | null
          flags: Json
          id: string
          ipe_cycle_id: string
          last_block_completed: string | null
          orcamento_d3_restante: number | null
          orcamento_global_restante: number | null
          resultados_por_bloco: Json
          status: string
          updated_at: string
        }
        Insert: {
          contador_d3_blocos?: number | null
          current_position?: number | null
          execution_plan?: Json | null
          flags?: Json
          id?: string
          ipe_cycle_id: string
          last_block_completed?: string | null
          orcamento_d3_restante?: number | null
          orcamento_global_restante?: number | null
          resultados_por_bloco?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          contador_d3_blocos?: number | null
          current_position?: number | null
          execution_plan?: Json | null
          flags?: Json
          id?: string
          ipe_cycle_id?: string
          last_block_completed?: string | null
          orcamento_d3_restante?: number | null
          orcamento_global_restante?: number | null
          resultados_por_bloco?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_state_ipe_cycle_id_fkey"
            columns: ["ipe_cycle_id"]
            isOneToOne: true
            referencedRelation: "ipe_cycles"
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
          source_author: string
          source_work: string
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
          source_author?: string
          source_work?: string
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
          source_author?: string
          source_work?: string
          stage_max?: number
          stage_min?: number
          teleology_score?: number
        }
        Relationships: []
      }
      scoring_audit: {
        Row: {
          component: string
          duration_ms: number | null
          id: string
          input_tokens: number | null
          ipe_cycle_id: string | null
          model: string | null
          output_tokens: number | null
          parse_success: boolean
          parsed_output: Json | null
          prompt_version: string | null
          raw_input: string | null
          raw_output: string | null
          retry_count: number
          scored_at: string
        }
        Insert: {
          component: string
          duration_ms?: number | null
          id?: string
          input_tokens?: number | null
          ipe_cycle_id?: string | null
          model?: string | null
          output_tokens?: number | null
          parse_success?: boolean
          parsed_output?: Json | null
          prompt_version?: string | null
          raw_input?: string | null
          raw_output?: string | null
          retry_count?: number
          scored_at?: string
        }
        Update: {
          component?: string
          duration_ms?: number | null
          id?: string
          input_tokens?: number | null
          ipe_cycle_id?: string | null
          model?: string | null
          output_tokens?: number | null
          parse_success?: boolean
          parsed_output?: Json | null
          prompt_version?: string | null
          raw_input?: string | null
          raw_output?: string | null
          retry_count?: number
          scored_at?: string
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
      lucid_persist_cycle: {
        Args: {
          p_base_version: number
          p_cycle_integrity_hash: string
          p_cycle_state?: string
          p_hago_state: string
          p_input_classification: string
          p_input_hash: string
          p_ipe_cycle_id?: string
          p_ipe_cycle_number?: number
          p_llm_config_hash: string
          p_llm_model_id: string
          p_llm_provider: string
          p_llm_response?: string
          p_llm_temperature: number
          p_movement_primary: string
          p_movement_secondary: string
          p_node_history_rows: Json
          p_previous_cycle_hash: string
          p_raw_input_json: Json
          p_response_type: string
          p_snapshot_json: Json
          p_structural_hash: string
          p_structural_model_version: string
          p_structural_trace: Json
          p_user_id: string
          p_user_text?: string
        }
        Returns: Json
      }
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
