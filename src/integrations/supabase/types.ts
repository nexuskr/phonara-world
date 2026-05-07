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
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          nickname: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          nickname?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          nickname?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          best_streak: number
          current_streak: number
          earned: number
          losses: number
          stat_date: string
          user_id: string
          wins: number
          withdrawals_count: number
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          earned?: number
          losses?: number
          stat_date?: string
          user_id: string
          wins?: number
          withdrawals_count?: number
        }
        Update: {
          best_streak?: number
          current_streak?: number
          earned?: number
          losses?: number
          stat_date?: string
          user_id?: string
          wins?: number
          withdrawals_count?: number
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_id: string | null
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          memo: string | null
          method: Database["public"]["Enums"]["deposit_method"]
          package_id: string | null
          package_name: string | null
          receipt_url: string | null
          rejected_reason: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          approved_at?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          method?: Database["public"]["Enums"]["deposit_method"]
          package_id?: string | null
          package_name?: string | null
          receipt_url?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          memo?: string | null
          method?: Database["public"]["Enums"]["deposit_method"]
          package_id?: string | null
          package_name?: string | null
          receipt_url?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jackpot_pool: {
        Row: {
          amount: number
          id: number
          last_winner: string | null
          last_winner_nickname: string | null
          last_won_amount: number | null
          last_won_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          id?: number
          last_winner?: string | null
          last_winner_nickname?: string | null
          last_won_amount?: number | null
          last_won_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          id?: number
          last_winner?: string | null
          last_winner_nickname?: string | null
          last_won_amount?: number | null
          last_won_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mission_history: {
        Row: {
          base_reward: number
          cap_remaining: number
          created_at: string
          final_reward: number
          id: string
          is_win: boolean
          mission_id: string
          multiplier: number
          streak: number
          tier: Database["public"]["Enums"]["user_tier"]
          user_id: string
        }
        Insert: {
          base_reward: number
          cap_remaining: number
          created_at?: string
          final_reward: number
          id?: string
          is_win: boolean
          mission_id: string
          multiplier?: number
          streak?: number
          tier: Database["public"]["Enums"]["user_tier"]
          user_id: string
        }
        Update: {
          base_reward?: number
          cap_remaining?: number
          created_at?: string
          final_reward?: number
          id?: string
          is_win?: boolean
          mission_id?: string
          multiplier?: number
          streak?: number
          tier?: Database["public"]["Enums"]["user_tier"]
          user_id?: string
        }
        Relationships: []
      }
      package_purchases: {
        Row: {
          admin_id: string | null
          amount: number
          approved_at: string | null
          completed_at: string | null
          created_at: string
          daily_return: number
          duration_days: number
          id: string
          next_settle_at: string | null
          package_id: string
          package_name: string
          receipt_url: string | null
          rejected_reason: string | null
          settled_count: number
          status: Database["public"]["Enums"]["package_status"]
          total_return: number
          total_settled: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          daily_return: number
          duration_days: number
          id?: string
          next_settle_at?: string | null
          package_id: string
          package_name: string
          receipt_url?: string | null
          rejected_reason?: string | null
          settled_count?: number
          status?: Database["public"]["Enums"]["package_status"]
          total_return: number
          total_settled?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string
          daily_return?: number
          duration_days?: number
          id?: string
          next_settle_at?: string | null
          package_id?: string
          package_name?: string
          receipt_url?: string | null
          rejected_reason?: string | null
          settled_count?: number
          status?: Database["public"]["Enums"]["package_status"]
          total_return?: number
          total_settled?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pin_reset_audit: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          method: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          method: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          method?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed: boolean
          attendance_streak: number | null
          auth_provider: string | null
          bank_account: string | null
          bank_name: string | null
          birth_date: string | null
          coin_address: string | null
          coin_network: string | null
          created_at: string
          daily_mission_count: number | null
          id: string
          last_attendance: string | null
          last_reset_date: string | null
          nickname: string
          phone: string | null
          profile_completed: boolean
          real_name: string | null
          terms_agreed_at: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
          withdraw_pin_hash: string | null
        }
        Insert: {
          age_confirmed?: boolean
          attendance_streak?: number | null
          auth_provider?: string | null
          bank_account?: string | null
          bank_name?: string | null
          birth_date?: string | null
          coin_address?: string | null
          coin_network?: string | null
          created_at?: string
          daily_mission_count?: number | null
          id: string
          last_attendance?: string | null
          last_reset_date?: string | null
          nickname: string
          phone?: string | null
          profile_completed?: boolean
          real_name?: string | null
          terms_agreed_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
          withdraw_pin_hash?: string | null
        }
        Update: {
          age_confirmed?: boolean
          attendance_streak?: number | null
          auth_provider?: string | null
          bank_account?: string | null
          bank_name?: string | null
          birth_date?: string | null
          coin_address?: string | null
          coin_network?: string | null
          created_at?: string
          daily_mission_count?: number | null
          id?: string
          last_attendance?: string | null
          last_reset_date?: string | null
          nickname?: string
          phone?: string | null
          profile_completed?: boolean
          real_name?: string | null
          terms_agreed_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
          withdraw_pin_hash?: string | null
        }
        Relationships: []
      }
      profit_share_distributions: {
        Row: {
          amount: number
          created_at: string
          id: string
          period_end: string
          period_start: string
          pool_total: number
          share_pct: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          pool_total: number
          share_pct: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          pool_total?: number
          share_pct?: number
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string
          nickname: string
          unread_admin: number
          unread_user: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          nickname: string
          unread_admin?: number
          unread_user?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          nickname?: string
          unread_admin?: number
          unread_user?: number
          user_id?: string
        }
        Relationships: []
      }
      tier_limits: {
        Row: {
          daily_max_missions: number
          daily_max_reward: number
          tier: string
        }
        Insert: {
          daily_max_missions: number
          daily_max_reward: number
          tier: string
        }
        Update: {
          daily_max_missions?: number
          daily_max_reward?: number
          tier?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          available_after: number
          balance_after: number
          created_at: string
          direction: Database["public"]["Enums"]["tx_direction"]
          id: string
          kind: Database["public"]["Enums"]["tx_kind"]
          metadata: Json
          mission_id: string | null
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          available_after: number
          balance_after: number
          created_at?: string
          direction: Database["public"]["Enums"]["tx_direction"]
          id?: string
          kind: Database["public"]["Enums"]["tx_kind"]
          metadata?: Json
          mission_id?: string | null
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          available_after?: number
          balance_after?: number
          created_at?: string
          direction?: Database["public"]["Enums"]["tx_direction"]
          id?: string
          kind?: Database["public"]["Enums"]["tx_kind"]
          metadata?: Json
          mission_id?: string | null
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          available_balance: number
          last_reset_date: string
          last_reset_month: string
          locked_balance: number
          monthly_earned: number
          pending_balance: number
          profit_share_balance: number
          today_earned: number
          total_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          last_reset_date?: string
          last_reset_month?: string
          locked_balance?: number
          monthly_earned?: number
          pending_balance?: number
          profit_share_balance?: number
          today_earned?: number
          total_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          last_reset_date?: string
          last_reset_month?: string
          locked_balance?: number
          monthly_earned?: number
          pending_balance?: number
          profit_share_balance?: number
          today_earned?: number
          total_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_id: string | null
          amount: number
          approved_at: string | null
          bank_account: string | null
          bank_name: string | null
          coin_address: string | null
          coin_network: string | null
          completed_at: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          process_by: string
          rejected_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tier_at_request: Database["public"]["Enums"]["user_tier"]
          tx_code: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          approved_at?: string | null
          bank_account?: string | null
          bank_name?: string | null
          coin_address?: string | null
          coin_network?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          process_by: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tier_at_request: Database["public"]["Enums"]["user_tier"]
          tx_code: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          approved_at?: string | null
          bank_account?: string | null
          bank_name?: string | null
          coin_address?: string | null
          coin_network?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          process_by?: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tier_at_request?: Database["public"]["Enums"]["user_tier"]
          tx_code?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_today: {
        Row: {
          best_streak: number | null
          earned: number | null
          nickname: string | null
          rank: number | null
          tier: Database["public"]["Enums"]["user_tier"] | null
          user_id: string | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cron_settle_package_daily: { Args: never; Returns: Json }
      admin_adjust_balance: {
        Args: { _delta: number; _reason: string; _target: string }
        Returns: Json
      }
      admin_resolve_deposit: {
        Args: { _action: string; _reason: string; _request_id: string }
        Returns: Json
      }
      admin_resolve_package: {
        Args: { _action: string; _purchase_id: string; _reason: string }
        Returns: Json
      }
      admin_resolve_withdrawal: {
        Args: { _action: string; _reason: string; _request_id: string }
        Returns: Json
      }
      admin_set_tier: {
        Args: {
          _target: string
          _tier: Database["public"]["Enums"]["user_tier"]
        }
        Returns: Json
      }
      bump_jackpot: { Args: { _amount: number }; Returns: Json }
      claim_daily_attendance: {
        Args: { user_id: string }
        Returns: {
          new_streak: number
          reward: number
        }[]
      }
      distribute_profit_share: {
        Args: {
          _period_end: string
          _period_start: string
          _pool_total: number
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_withdrawal: {
        Args: {
          _amount: number
          _bank_account: string
          _bank_name: string
          _coin_address: string
          _coin_network: string
          _method: Database["public"]["Enums"]["withdrawal_method"]
          _pin: string
        }
        Returns: Json
      }
      reset_daily_mission_count: { Args: never; Returns: undefined }
      reset_withdraw_pin: {
        Args: { _method: string; _new_pin: string }
        Returns: Json
      }
      settle_mission: {
        Args: { _base_reward: number; _is_win: boolean; _mission_id: string }
        Returns: Json
      }
      settle_package_daily: { Args: never; Returns: Json }
      submit_deposit: {
        Args: {
          _amount: number
          _memo: string
          _method: Database["public"]["Enums"]["deposit_method"]
          _package_id: string
          _package_name: string
          _receipt_url: string
        }
        Returns: Json
      }
      submit_package_purchase: {
        Args: {
          _amount: number
          _daily_return: number
          _duration_days: number
          _package_id: string
          _package_name: string
          _receipt_url: string
          _total_return: number
        }
        Returns: Json
      }
      tier_boost: {
        Args: { t: Database["public"]["Enums"]["user_tier"] }
        Returns: number
      }
      tier_daily_cap: {
        Args: { t: Database["public"]["Enums"]["user_tier"] }
        Returns: number
      }
      tier_process_minutes: {
        Args: { t: Database["public"]["Enums"]["user_tier"] }
        Returns: number
      }
      tier_withdraw_min: {
        Args: { t: Database["public"]["Enums"]["user_tier"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
      deposit_method: "bank" | "coin"
      deposit_status: "pending" | "approved" | "rejected" | "cancelled"
      package_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "completed"
        | "cancelled"
      tx_direction: "credit" | "debit"
      tx_kind:
        | "mission_win"
        | "mission_loss_recovery"
        | "profit_share"
        | "withdrawal_lock"
        | "withdrawal_release"
        | "withdrawal_complete"
        | "deposit"
        | "admin_adjust"
        | "jackpot_win"
        | "deposit_credit"
        | "package_settle"
      user_tier: "normal" | "vip" | "god" | "empire"
      withdrawal_method: "bank" | "coin"
      withdrawal_status:
        | "pending"
        | "approved"
        | "processing"
        | "completed"
        | "rejected"
        | "cancelled"
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
      app_role: ["admin", "user"],
      deposit_method: ["bank", "coin"],
      deposit_status: ["pending", "approved", "rejected", "cancelled"],
      package_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "completed",
        "cancelled",
      ],
      tx_direction: ["credit", "debit"],
      tx_kind: [
        "mission_win",
        "mission_loss_recovery",
        "profit_share",
        "withdrawal_lock",
        "withdrawal_release",
        "withdrawal_complete",
        "deposit",
        "admin_adjust",
        "jackpot_win",
        "deposit_credit",
        "package_settle",
      ],
      user_tier: ["normal", "vip", "god", "empire"],
      withdrawal_method: ["bank", "coin"],
      withdrawal_status: [
        "pending",
        "approved",
        "processing",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
