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
      circle_memberships: {
        Row: {
          circle_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          id?: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          circle_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_memberships_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string
          household_id: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      command_idempotency: {
        Row: {
          actor_user_id: string
          command_hash: string
          command_kind: string
          committed_at: string
          event_id: string | null
          idempotency_key: string
          receipt: Json
          scope: string
        }
        Insert: {
          actor_user_id: string
          command_hash: string
          command_kind: string
          committed_at?: string
          event_id?: string | null
          idempotency_key: string
          receipt: Json
          scope: string
        }
        Update: {
          actor_user_id?: string
          command_hash?: string
          command_kind?: string
          committed_at?: string
          event_id?: string | null
          idempotency_key?: string
          receipt?: Json
          scope?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      ledger_heads: {
        Row: {
          circle_id: string
          head_hash: string
          sequence: number
          updated_at: string
        }
        Insert: {
          circle_id: string
          head_hash: string
          sequence: number
          updated_at?: string
        }
        Update: {
          circle_id?: string
          head_hash?: string
          sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_heads_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: true
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          user_id?: string
        }
        Relationships: []
      }
      witness_events: {
        Row: {
          actor_label: string
          actor_role: string
          actor_user_id: string
          aggregate_id: string
          circle_id: string
          event_hash: string
          event_id: string
          kind: string
          occurred_at: string
          occurred_at_text: string
          payload: Json
          previous_hash: string
          sequence: number
        }
        Insert: {
          actor_label: string
          actor_role: string
          actor_user_id: string
          aggregate_id: string
          circle_id: string
          event_hash: string
          event_id: string
          kind: string
          occurred_at: string
          occurred_at_text: string
          payload: Json
          previous_hash: string
          sequence: number
        }
        Update: {
          actor_label?: string
          actor_role?: string
          actor_user_id?: string
          aggregate_id?: string
          circle_id?: string
          event_hash?: string
          event_id?: string
          kind?: string
          occurred_at?: string
          occurred_at_text?: string
          payload?: Json
          previous_hash?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "witness_events_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debug_canonical_hash: {
        Args: { v: Json }
        Returns: {
          canonical: string
          hash: string
        }[]
      }
      rpc_accept_offer: {
        Args: {
          _circle_id: string
          _expected_head: string
          _idempotency_key: string
          _offer_id: string
        }
        Returns: Json
      }
      rpc_close_need: {
        Args: {
          _circle_id: string
          _expected_head: string
          _idempotency_key: string
          _need_id: string
          _reason: string
        }
        Returns: Json
      }
      rpc_confirm_fulfillment: {
        Args: {
          _circle_id: string
          _confirmed_units: number
          _expected_head: string
          _idempotency_key: string
          _offer_id: string
        }
        Returns: Json
      }
      rpc_create_household_and_circle: {
        Args: {
          _circle_label: string
          _household_label: string
          _idempotency_key: string
        }
        Returns: Json
      }
      rpc_create_invitation: {
        Args: { _circle_id: string; _idempotency_key: string }
        Returns: Json
      }
      rpc_decline_offer: {
        Args: {
          _circle_id: string
          _expected_head: string
          _idempotency_key: string
          _offer_id: string
          _reason: string
        }
        Returns: Json
      }
      rpc_open_need: {
        Args: {
          _circle_id: string
          _expected_head: string
          _idempotency_key: string
          _requested_items: string[]
          _summary: string
          _target_units: number
          _title: string
          _unit_label: string
          _visibility: string
        }
        Returns: Json
      }
      rpc_pledge_offer: {
        Args: {
          _circle_id: string
          _expected_head: string
          _idempotency_key: string
          _kind: string
          _label: string
          _need_id: string
          _note: string
          _promised_units: number
        }
        Returns: Json
      }
      rpc_redeem_invitation: { Args: { _raw_token: string }; Returns: Json }
      rpc_report_fulfillment: {
        Args: {
          _circle_id: string
          _expected_head: string
          _idempotency_key: string
          _note: string
          _offer_id: string
        }
        Returns: Json
      }
      rpc_upsert_profile: { Args: { _display_name: string }; Returns: Json }
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
