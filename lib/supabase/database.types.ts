Initialising login role...
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      bip_partner_universities: {
        Row: {
          bip_id: string
          created_at: string
          id: string
          partner_country_raw: string | null
          partner_erasmus_code_raw: string | null
          partner_name_raw: string | null
          university_id: string | null
        }
        Insert: {
          bip_id: string
          created_at?: string
          id?: string
          partner_country_raw?: string | null
          partner_erasmus_code_raw?: string | null
          partner_name_raw?: string | null
          university_id?: string | null
        }
        Update: {
          bip_id?: string
          created_at?: string
          id?: string
          partner_country_raw?: string | null
          partner_erasmus_code_raw?: string | null
          partner_name_raw?: string | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bip_partner_universities_bip_id_fkey"
            columns: ["bip_id"]
            isOneToOne: false
            referencedRelation: "bips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bip_partner_universities_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      bip_status_history: {
        Row: {
          action_kind: string
          actor_id: string | null
          bip_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string
        }
        Insert: {
          action_kind: string
          actor_id?: string | null
          bip_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status: string
        }
        Update: {
          action_kind?: string
          actor_id?: string | null
          bip_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bip_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bip_status_history_bip_id_fkey"
            columns: ["bip_id"]
            isOneToOne: false
            referencedRelation: "bips"
            referencedColumns: ["id"]
          },
        ]
      }
      bips: {
        Row: {
          accommodation_notes: string | null
          application_deadline: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ects_credits: number | null
          eligibility_notes: string | null
          green_travel: boolean
          host_city: string | null
          host_university_id: string | null
          how_to_apply_type: string | null
          how_to_apply_value: string | null
          id: string
          inclusion_support: boolean
          is_seed: boolean
          isced_f_code: string | null
          language_level_min: string | null
          language_of_instruction: string | null
          learning_outcomes: string | null
          max_participants: number | null
          partner_institutions_only: boolean
          physical_end_date: string | null
          physical_start_date: string | null
          published_at: string | null
          search_vector: unknown
          slug: string
          status: string
          study_levels: string[]
          subject_area: string | null
          title: string
          updated_at: string
          virtual_component_description: string | null
          virtual_duration_notes: string | null
          virtual_sessions_count: number | null
          virtual_timing: string | null
        }
        Insert: {
          accommodation_notes?: string | null
          application_deadline?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ects_credits?: number | null
          eligibility_notes?: string | null
          green_travel?: boolean
          host_city?: string | null
          host_university_id?: string | null
          how_to_apply_type?: string | null
          how_to_apply_value?: string | null
          id?: string
          inclusion_support?: boolean
          is_seed?: boolean
          isced_f_code?: string | null
          language_level_min?: string | null
          language_of_instruction?: string | null
          learning_outcomes?: string | null
          max_participants?: number | null
          partner_institutions_only?: boolean
          physical_end_date?: string | null
          physical_start_date?: string | null
          published_at?: string | null
          search_vector?: unknown
          slug: string
          status?: string
          study_levels?: string[]
          subject_area?: string | null
          title: string
          updated_at?: string
          virtual_component_description?: string | null
          virtual_duration_notes?: string | null
          virtual_sessions_count?: number | null
          virtual_timing?: string | null
        }
        Update: {
          accommodation_notes?: string | null
          application_deadline?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ects_credits?: number | null
          eligibility_notes?: string | null
          green_travel?: boolean
          host_city?: string | null
          host_university_id?: string | null
          how_to_apply_type?: string | null
          how_to_apply_value?: string | null
          id?: string
          inclusion_support?: boolean
          is_seed?: boolean
          isced_f_code?: string | null
          language_level_min?: string | null
          language_of_instruction?: string | null
          learning_outcomes?: string | null
          max_participants?: number | null
          partner_institutions_only?: boolean
          physical_end_date?: string | null
          physical_start_date?: string | null
          published_at?: string | null
          search_vector?: unknown
          slug?: string
          status?: string
          study_levels?: string[]
          subject_area?: string | null
          title?: string
          updated_at?: string
          virtual_component_description?: string | null
          virtual_duration_notes?: string | null
          virtual_sessions_count?: number | null
          virtual_timing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bips_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bips_host_university_id_fkey"
            columns: ["host_university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_email: string | null
          created_at: string
          erasmus_code: string | null
          full_name: string | null
          id: string
          role: string
          university_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          erasmus_code?: string | null
          full_name?: string | null
          id: string
          role?: string
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          erasmus_code?: string | null
          full_name?: string | null
          id?: string
          role?: string
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_bips: {
        Row: {
          bip_id: string
          id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          bip_id: string
          id?: string
          saved_at?: string
          user_id: string
        }
        Update: {
          bip_id?: string
          id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_bips_bip_id_fkey"
            columns: ["bip_id"]
            isOneToOne: false
            referencedRelation: "bips"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          city: string | null
          country: string
          created_at: string
          erasmus_code: string | null
          id: string
          name: string
          website_url: string | null
        }
        Insert: {
          city?: string | null
          country: string
          created_at?: string
          erasmus_code?: string | null
          id?: string
          name: string
          website_url?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          erasmus_code?: string | null
          id?: string
          name?: string
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_my_account: { Args: never; Returns: undefined }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      insert_university_if_not_exists: {
        Args: { p_country: string; p_erasmus_code?: string; p_name: string }
        Returns: string
      }
      unaccent: { Args: { "": string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />
A new version of Supabase CLI is available: v2.106.0 (currently installed v2.98.2)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
