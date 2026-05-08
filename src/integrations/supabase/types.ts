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
      account_freezes: {
        Row: {
          created_at: string
          expires_at: string
          frozen_at: string
          id: string
          metadata: Json
          reason: string
          released_at: string | null
          released_by: string | null
          severity: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          frozen_at?: string
          id?: string
          metadata?: Json
          reason: string
          released_at?: string | null
          released_by?: string | null
          severity?: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          frozen_at?: string
          id?: string
          metadata?: Json
          reason?: string
          released_at?: string | null
          released_by?: string | null
          severity?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements_catalog: {
        Row: {
          ap: number
          badge_tier: string | null
          category: string
          created_at: string
          description: string
          hidden: boolean
          key: string
          name: string
          reward_credit: number
          sort_order: number
        }
        Insert: {
          ap?: number
          badge_tier?: string | null
          category: string
          created_at?: string
          description: string
          hidden?: boolean
          key: string
          name: string
          reward_credit?: number
          sort_order?: number
        }
        Update: {
          ap?: number
          badge_tier?: string | null
          category?: string
          created_at?: string
          description?: string
          hidden?: boolean
          key?: string
          name?: string
          reward_credit?: number
          sort_order?: number
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_bot_runs: {
        Row: {
          claimed_at: string | null
          created_at: string
          error: string | null
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["ai_bot_kind"]
          output_path: string | null
          output_text: string | null
          prompt: string | null
          ready_at: string | null
          reward: number
          started_at: string
          status: Database["public"]["Enums"]["ai_bot_status"]
          trading_pnl_pct: number | null
          trading_seed: number | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ai_bot_kind"]
          output_path?: string | null
          output_text?: string | null
          prompt?: string | null
          ready_at?: string | null
          reward?: number
          started_at?: string
          status?: Database["public"]["Enums"]["ai_bot_status"]
          trading_pnl_pct?: number | null
          trading_seed?: number | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ai_bot_kind"]
          output_path?: string | null
          output_text?: string | null
          prompt?: string | null
          ready_at?: string | null
          reward?: number
          started_at?: string
          status?: Database["public"]["Enums"]["ai_bot_status"]
          trading_pnl_pct?: number | null
          trading_seed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_generated_missions: {
        Row: {
          ai_reasoning: string | null
          approved_by_admin: string | null
          claimed_at: string | null
          created_at: string
          description: string
          expires_at: string
          id: string
          reward_credit: number
          reward_xp: number
          status: string
          template_key: string
          title: string
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          approved_by_admin?: string | null
          claimed_at?: string | null
          created_at?: string
          description: string
          expires_at?: string
          id?: string
          reward_credit?: number
          reward_xp?: number
          status?: string
          template_key: string
          title: string
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          approved_by_admin?: string | null
          claimed_at?: string | null
          created_at?: string
          description?: string
          expires_at?: string
          id?: string
          reward_credit?: number
          reward_xp?: number
          status?: string
          template_key?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      aml_risk_scores: {
        Row: {
          factors: Json
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          factors?: Json
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          factors?: Json
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aml_verifications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          doc_signed_at: string | null
          id: string
          level: number
          metadata: Json
          rejected_reason: string | null
          selfie_path: string | null
          status: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          doc_signed_at?: string | null
          id?: string
          level: number
          metadata?: Json
          rejected_reason?: string | null
          selfie_path?: string | null
          status?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          doc_signed_at?: string | null
          id?: string
          level?: number
          metadata?: Json
          rejected_reason?: string | null
          selfie_path?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      anomaly_events: {
        Row: {
          ack_note: string | null
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          dedupe_key: string | null
          evidence: Json
          id: string
          rule: string
          severity: string
          user_id: string | null
        }
        Insert: {
          ack_note?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          dedupe_key?: string | null
          evidence?: Json
          id?: string
          rule: string
          severity: string
          user_id?: string | null
        }
        Update: {
          ack_note?: string | null
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          dedupe_key?: string | null
          evidence?: Json
          id?: string
          rule?: string
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badges_catalog: {
        Row: {
          created_at: string
          icon: string | null
          key: string
          name: string
          season_id: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          key: string
          name: string
          season_id?: string | null
          tier: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          key?: string
          name?: string
          season_id?: string | null
          tier?: string
        }
        Relationships: []
      }
      boost_schedule: {
        Row: {
          label: string | null
          multiplier: number
          schedule_date: string
        }
        Insert: {
          label?: string | null
          multiplier?: number
          schedule_date: string
        }
        Update: {
          label?: string | null
          multiplier?: number
          schedule_date?: string
        }
        Relationships: []
      }
      chaos_runs: {
        Row: {
          duration_ms: number | null
          failed: number
          id: string
          passed: number
          ran_at: string
          results: Json
          source: string
          total_probes: number
        }
        Insert: {
          duration_ms?: number | null
          failed: number
          id?: string
          passed: number
          ran_at?: string
          results?: Json
          source?: string
          total_probes: number
        }
        Update: {
          duration_ms?: number | null
          failed?: number
          id?: string
          passed?: number
          ran_at?: string
          results?: Json
          source?: string
          total_probes?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          kind: string
          message: string | null
          metadata: Json
          nickname: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind?: string
          message?: string | null
          metadata?: Json
          nickname?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string
          message?: string | null
          metadata?: Json
          nickname?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversion_events: {
        Row: {
          anon_id: string
          created_at: string
          event_type: string
          id: string
          meta: Json
          surface: string
          user_id: string | null
          variant: string
        }
        Insert: {
          anon_id: string
          created_at?: string
          event_type: string
          id?: string
          meta?: Json
          surface: string
          user_id?: string | null
          variant?: string
        }
        Update: {
          anon_id?: string
          created_at?: string
          event_type?: string
          id?: string
          meta?: Json
          surface?: string
          user_id?: string | null
          variant?: string
        }
        Relationships: []
      }
      cron_settle_audit_log: {
        Row: {
          caller: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          metadata: Json
          ok: boolean
          settled_count: number
        }
        Insert: {
          caller?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json
          ok: boolean
          settled_count?: number
        }
        Update: {
          caller?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json
          ok?: boolean
          settled_count?: number
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
          bonus_amount: number
          bonus_pct: number
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
          voucher_brand: string | null
          voucher_pin_hash: string | null
        }
        Insert: {
          admin_id?: string | null
          amount: number
          approved_at?: string | null
          bonus_amount?: number
          bonus_pct?: number
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
          voucher_brand?: string | null
          voucher_pin_hash?: string | null
        }
        Update: {
          admin_id?: string | null
          amount?: number
          approved_at?: string | null
          bonus_amount?: number
          bonus_pct?: number
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
          voucher_brand?: string | null
          voucher_pin_hash?: string | null
        }
        Relationships: []
      }
      dm_composer_prefs: {
        Row: {
          channel: string
          count: number
          daily_safe_line: number
          keywords: string
          persona: string
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          count?: number
          daily_safe_line?: number
          keywords?: string
          persona?: string
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          count?: number
          daily_safe_line?: number
          keywords?: string
          persona?: string
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      empire_founding_seats: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          purchase_id: string | null
          seat_no: number
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          purchase_id?: string | null
          seat_no: number
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          purchase_id?: string | null
          seat_no?: number
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          level?: string
          message?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      function_permissions_baseline: {
        Row: {
          allowed_roles: string[]
          category: string
          function_args: string
          function_name: string
          id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          allowed_roles?: string[]
          category: string
          function_args?: string
          function_name: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          allowed_roles?: string[]
          category?: string
          function_args?: string
          function_name?: string
          id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      handbook_progress: {
        Row: {
          bonus_paid: boolean
          bonus_paid_at: string | null
          created_at: string
          steps_completed: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_paid?: boolean
          bonus_paid_at?: string | null
          created_at?: string
          steps_completed?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_paid?: boolean
          bonus_paid_at?: string | null
          created_at?: string
          steps_completed?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          id: string
          key: string
          response: Json
          scope: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          response?: Json
          scope: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          response?: Json
          scope?: string
          user_id?: string | null
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
      mission_templates: {
        Row: {
          active: boolean
          ai_prompt_seed: string | null
          auto_approve: boolean
          category: string
          created_at: string
          description: string | null
          difficulty: string
          duration_minutes: number
          id: string
          key: string
          reward_credit: number
          reward_xp: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          ai_prompt_seed?: string | null
          auto_approve?: boolean
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          key: string
          reward_credit?: number
          reward_xp?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          ai_prompt_seed?: string | null
          auto_approve?: boolean
          category?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_minutes?: number
          id?: string
          key?: string
          reward_credit?: number
          reward_xp?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: string
          enabled: boolean
          event: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          enabled?: boolean
          event: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          enabled?: boolean
          event?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      package_purchases: {
        Row: {
          admin_id: string | null
          amount: number
          approved_at: string | null
          boost_multiplier: number
          boost_until: string | null
          completed_at: string | null
          created_at: string
          daily_return: number
          duration_days: number
          founding_bonus_paid: boolean
          founding_seat_no: number | null
          harvest_streak: number
          id: string
          instant_300k_paid: boolean
          is_empire_founding_member: boolean
          last_harvest_date: string | null
          next_settle_at: string | null
          package_id: string
          package_name: string
          receipt_url: string | null
          rejected_reason: string | null
          settled_count: number
          seven_day_bonus_paid: boolean
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
          boost_multiplier?: number
          boost_until?: string | null
          completed_at?: string | null
          created_at?: string
          daily_return: number
          duration_days: number
          founding_bonus_paid?: boolean
          founding_seat_no?: number | null
          harvest_streak?: number
          id?: string
          instant_300k_paid?: boolean
          is_empire_founding_member?: boolean
          last_harvest_date?: string | null
          next_settle_at?: string | null
          package_id: string
          package_name: string
          receipt_url?: string | null
          rejected_reason?: string | null
          settled_count?: number
          seven_day_bonus_paid?: boolean
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
          boost_multiplier?: number
          boost_until?: string | null
          completed_at?: string | null
          created_at?: string
          daily_return?: number
          duration_days?: number
          founding_bonus_paid?: boolean
          founding_seat_no?: number | null
          harvest_streak?: number
          id?: string
          instant_300k_paid?: boolean
          is_empire_founding_member?: boolean
          last_harvest_date?: string | null
          next_settle_at?: string | null
          package_id?: string
          package_name?: string
          receipt_url?: string | null
          rejected_reason?: string | null
          settled_count?: number
          seven_day_bonus_paid?: boolean
          status?: Database["public"]["Enums"]["package_status"]
          total_return?: number
          total_settled?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permission_change_log: {
        Row: {
          change_type: string
          detected_at: string
          expected_roles: string[]
          function_args: string
          function_name: string
          id: string
          metadata: Json
          observed_roles: string[]
        }
        Insert: {
          change_type: string
          detected_at?: string
          expected_roles: string[]
          function_args: string
          function_name: string
          id?: string
          metadata?: Json
          observed_roles: string[]
        }
        Update: {
          change_type?: string
          detected_at?: string
          expected_roles?: string[]
          function_args?: string
          function_name?: string
          id?: string
          metadata?: Json
          observed_roles?: string[]
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
      policy_assertion_runs: {
        Row: {
          assertion_key: string
          created_at: string
          error: string | null
          id: string
          observed: string | null
          passed: boolean
        }
        Insert: {
          assertion_key: string
          created_at?: string
          error?: string | null
          id?: string
          observed?: string | null
          passed: boolean
        }
        Update: {
          assertion_key?: string
          created_at?: string
          error?: string | null
          id?: string
          observed?: string | null
          passed?: boolean
        }
        Relationships: []
      }
      policy_assertions: {
        Row: {
          active: boolean
          created_at: string
          description: string
          expected: string
          id: string
          key: string
          op: string
          role: string
          table_name: string
          test_sql: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          expected: string
          id?: string
          key: string
          op: string
          role: string
          table_name: string
          test_sql: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          expected?: string
          id?: string
          key?: string
          op?: string
          role?: string
          table_name?: string
          test_sql?: string
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
          coin_master_unlocked: boolean
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
          referral_code: string | null
          referred_by: string | null
          terms_agreed_at: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          total_coin_deposits: number
          total_withdrawn: number
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
          coin_master_unlocked?: boolean
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
          referral_code?: string | null
          referred_by?: string | null
          terms_agreed_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          total_coin_deposits?: number
          total_withdrawn?: number
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
          coin_master_unlocked?: boolean
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
          referral_code?: string | null
          referred_by?: string | null
          terms_agreed_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          total_coin_deposits?: number
          total_withdrawn?: number
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
      quests_catalog: {
        Row: {
          active: boolean
          credit_reward: number
          description: string
          key: string
          metric: string
          name: string
          period: string
          target: number
          xp_reward: number
        }
        Insert: {
          active?: boolean
          credit_reward?: number
          description: string
          key: string
          metric: string
          name: string
          period: string
          target: number
          xp_reward?: number
        }
        Update: {
          active?: boolean
          credit_reward?: number
          description?: string
          key?: string
          metric?: string
          name?: string
          period?: string
          target?: number
          xp_reward?: number
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          base_amount: number
          commission: number
          created_at: string
          id: string
          invitee_id: string
          inviter_id: string
          source: string
        }
        Insert: {
          base_amount: number
          commission: number
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          source: string
        }
        Update: {
          base_amount?: number
          commission?: number
          created_at?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          source?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code_used: string
          created_at: string
          first_deposit_bonus_paid: boolean
          id: string
          invitee_id: string
          inviter_id: string
          signup_bonus_paid: boolean
          total_commission: number
        }
        Insert: {
          code_used: string
          created_at?: string
          first_deposit_bonus_paid?: boolean
          id?: string
          invitee_id: string
          inviter_id: string
          signup_bonus_paid?: boolean
          total_commission?: number
        }
        Update: {
          code_used?: string
          created_at?: string
          first_deposit_bonus_paid?: boolean
          id?: string
          invitee_id?: string
          inviter_id?: string
          signup_bonus_paid?: boolean
          total_commission?: number
        }
        Relationships: []
      }
      roulette_spins: {
        Row: {
          amount: number
          cost: number
          created_at: string
          id: string
          kind: string
          prize_label: string
          user_id: string
        }
        Insert: {
          amount?: number
          cost?: number
          created_at?: string
          id?: string
          kind: string
          prize_label: string
          user_id: string
        }
        Update: {
          amount?: number
          cost?: number
          created_at?: string
          id?: string
          kind?: string
          prize_label?: string
          user_id?: string
        }
        Relationships: []
      }
      season_pass_progress: {
        Row: {
          free_claimed: Json
          id: string
          level: number
          premium: boolean
          premium_claimed: Json
          season_id: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          free_claimed?: Json
          id?: string
          level?: number
          premium?: boolean
          premium_claimed?: Json
          season_id: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          free_claimed?: Json
          id?: string
          level?: number
          premium?: boolean
          premium_claimed?: Json
          season_id?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_pass_progress_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_pass_rewards: {
        Row: {
          free_reward: Json
          id: string
          level: number
          premium_reward: Json
          season_id: string
        }
        Insert: {
          free_reward?: Json
          id?: string
          level: number
          premium_reward?: Json
          season_id: string
        }
        Update: {
          free_reward?: Json
          id?: string
          level?: number
          premium_reward?: Json
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_pass_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          max_level: number
          name: string
          premium_price: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id: string
          max_level?: number
          name: string
          premium_price?: number
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          max_level?: number
          name?: string
          premium_price?: number
          starts_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          id: string
          issue_count: number
          issues: Json
          ok: boolean
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_count?: number
          issues?: Json
          ok: boolean
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_count?: number
          issues?: Json
          ok?: boolean
          source?: string
        }
        Relationships: []
      }
      spans: {
        Row: {
          created_at: string
          duration_ms: number
          ended_at: string
          id: string
          metadata: Json
          op: string
          parent_span_id: string | null
          started_at: string
          status: string
          trace_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          ended_at: string
          id?: string
          metadata?: Json
          op: string
          parent_span_id?: string | null
          started_at: string
          status?: string
          trace_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          ended_at?: string
          id?: string
          metadata?: Json
          op?: string
          parent_span_id?: string | null
          started_at?: string
          status?: string
          trace_id?: string
          user_id?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      trust_snapshots: {
        Row: {
          active_members_30d: number
          audit_pass_30d: number
          cron_uptime_7d: number
          id: string
          paid_30d: number
          policy_pass_7d: number
          taken_at: string
          total_members: number
          total_paid: number
          unack_anomalies: number
          uptime_p95_ms_24h: number
          uptime_success_24h: number
          uptime_success_7d: number
        }
        Insert: {
          active_members_30d?: number
          audit_pass_30d?: number
          cron_uptime_7d?: number
          id?: string
          paid_30d?: number
          policy_pass_7d?: number
          taken_at?: string
          total_members?: number
          total_paid?: number
          unack_anomalies?: number
          uptime_p95_ms_24h?: number
          uptime_success_24h?: number
          uptime_success_7d?: number
        }
        Update: {
          active_members_30d?: number
          audit_pass_30d?: number
          cron_uptime_7d?: number
          id?: string
          paid_30d?: number
          policy_pass_7d?: number
          taken_at?: string
          total_members?: number
          total_paid?: number
          unack_anomalies?: number
          uptime_p95_ms_24h?: number
          uptime_success_24h?: number
          uptime_success_7d?: number
        }
        Relationships: []
      }
      ugc_campaigns: {
        Row: {
          active: boolean
          channel: string
          clicks_cached: number
          code: string | null
          conversions_cached: number
          created_at: string
          id: string
          label: string
          slug: string
          target_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          channel: string
          clicks_cached?: number
          code?: string | null
          conversions_cached?: number
          created_at?: string
          id?: string
          label: string
          slug: string
          target_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          channel?: string
          clicks_cached?: number
          code?: string | null
          conversions_cached?: number
          created_at?: string
          id?: string
          label?: string
          slug?: string
          target_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ugc_traffic_events: {
        Row: {
          campaign_slug: string | null
          channel: string
          clicks: number
          conversions: number
          created_at: string
          dm_responded: number
          dm_sent: number
          event_date: string
          id: string
          note: string | null
          signups: number
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_slug?: string | null
          channel: string
          clicks?: number
          conversions?: number
          created_at?: string
          dm_responded?: number
          dm_sent?: number
          event_date?: string
          id?: string
          note?: string | null
          signups?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_slug?: string | null
          channel?: string
          clicks?: number
          conversions?: number
          created_at?: string
          dm_responded?: number
          dm_sent?: number
          event_date?: string
          id?: string
          note?: string | null
          signups?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uptime_pings: {
        Row: {
          checked_at: string
          error: string | null
          http_status: number | null
          id: string
          indicator: string | null
          latency_ms: number | null
          ok: boolean
        }
        Insert: {
          checked_at?: string
          error?: string | null
          http_status?: number | null
          id?: string
          indicator?: string | null
          latency_ms?: number | null
          ok: boolean
        }
        Update: {
          checked_at?: string
          error?: string | null
          http_status?: number | null
          id?: string
          indicator?: string | null
          latency_ms?: number | null
          ok?: boolean
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_key: string
          claimed_at: string | null
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          claimed_at?: string | null
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          claimed_at?: string | null
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievements_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      user_badges: {
        Row: {
          acquired_at: string
          badge_key: string
          equipped_slot: number | null
          id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          badge_key: string
          equipped_slot?: number | null
          id?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          badge_key?: string
          equipped_slot?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      user_quests: {
        Row: {
          claimed: boolean
          id: string
          period_key: string
          progress: number
          quest_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          id?: string
          period_key: string
          progress?: number
          quest_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          id?: string
          period_key?: string
          progress?: number
          quest_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_key_fkey"
            columns: ["quest_key"]
            isOneToOne: false
            referencedRelation: "quests_catalog"
            referencedColumns: ["key"]
          },
        ]
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
      webhook_deliveries: {
        Row: {
          created_at: string
          error: string | null
          event: string
          http_status: number | null
          id: string
          payload: Json
          subscription_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          http_status?: number | null
          id?: string
          payload: Json
          subscription_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          http_status?: number | null
          id?: string
          payload?: Json
          subscription_id?: string
        }
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          last_delivered_at: string | null
          last_status: number | null
          secret: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          last_delivered_at?: string | null
          last_status?: number | null
          secret: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          last_delivered_at?: string | null
          last_status?: number | null
          secret?: string
          url?: string
        }
        Relationships: []
      }
      weekly_leaderboard_snapshots: {
        Row: {
          id: string
          iso_week: string
          rank: number
          score: number
          taken_at: string
          user_id: string
        }
        Insert: {
          id?: string
          iso_week: string
          rank: number
          score?: number
          taken_at?: string
          user_id: string
        }
        Update: {
          id?: string
          iso_week?: string
          rank?: number
          score?: number
          taken_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_pass_progress: {
        Row: {
          claimed_levels: Json
          id: string
          iso_week: string
          level: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          claimed_levels?: Json
          id?: string
          iso_week: string
          level?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          claimed_levels?: Json
          id?: string
          iso_week?: string
          level?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      weekly_pass_rewards: {
        Row: {
          description: string
          id: string
          level: number
          reward_badge: string | null
          reward_credit: number
          withdraw_priority: boolean
        }
        Insert: {
          description?: string
          id?: string
          level: number
          reward_badge?: string | null
          reward_credit?: number
          withdraw_priority?: boolean
        }
        Update: {
          description?: string
          id?: string
          level?: number
          reward_badge?: string | null
          reward_credit?: number
          withdraw_priority?: boolean
        }
        Relationships: []
      }
      weekly_payout_log: {
        Row: {
          amount: number
          id: string
          iso_week: string
          paid_at: string
          rank: number
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          iso_week: string
          paid_at?: string
          rank: number
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          iso_week?: string
          paid_at?: string
          rank?: number
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
          receipt_url: string | null
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
          receipt_url?: string | null
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
          receipt_url?: string | null
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
      chaos_runs_public: {
        Row: {
          duration_ms: number | null
          failed: number | null
          id: string | null
          passed: number | null
          ran_at: string | null
          source: string | null
          total_probes: number | null
        }
        Insert: {
          duration_ms?: number | null
          failed?: number | null
          id?: string | null
          passed?: number | null
          ran_at?: string | null
          source?: string | null
          total_probes?: number | null
        }
        Update: {
          duration_ms?: number | null
          failed?: number | null
          id?: string | null
          passed?: number | null
          ran_at?: string | null
          source?: string | null
          total_probes?: number | null
        }
        Relationships: []
      }
      chat_messages_public: {
        Row: {
          created_at: string | null
          id: string | null
          kind: string | null
          message: string | null
          nickname: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          kind?: string | null
          message?: string | null
          nickname?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          kind?: string | null
          message?: string | null
          nickname?: string | null
        }
        Relationships: []
      }
      empire_founding_seats_admin: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          purchase_id: string | null
          seat_no: number | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          purchase_id?: string | null
          seat_no?: number | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          purchase_id?: string | null
          seat_no?: number | null
        }
        Relationships: []
      }
      empire_founding_seats_public: {
        Row: {
          claimed_at: string | null
          is_claimed: boolean | null
          seat_no: number | null
        }
        Insert: {
          claimed_at?: string | null
          is_claimed?: never
          seat_no?: number | null
        }
        Update: {
          claimed_at?: string | null
          is_claimed?: never
          seat_no?: number | null
        }
        Relationships: []
      }
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
      uptime_pings_public: {
        Row: {
          checked_at: string | null
          http_status: number | null
          id: string | null
          indicator: string | null
          latency_ms: number | null
          ok: boolean | null
        }
        Insert: {
          checked_at?: string | null
          http_status?: number | null
          id?: string | null
          indicator?: string | null
          latency_ms?: number | null
          ok?: boolean | null
        }
        Update: {
          checked_at?: string | null
          http_status?: number | null
          id?: string | null
          indicator?: string | null
          latency_ms?: number | null
          ok?: boolean | null
        }
        Relationships: []
      }
      weekly_referral_leaderboard: {
        Row: {
          commission_7d: number | null
          invited_7d: number | null
          inviter_id: string | null
          nickname: string | null
          rank: number | null
          tier: Database["public"]["Enums"]["user_tier"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      _credit_referral_commission: {
        Args: { _base: number; _invitee: string; _source: string }
        Returns: undefined
      }
      _credit_referral_first_deposit: {
        Args: { _invitee: string }
        Returns: undefined
      }
      _cron_security_self_audit: { Args: never; Returns: undefined }
      _cron_settle_package_daily: { Args: never; Returns: Json }
      _period_key: { Args: { _period: string }; Returns: string }
      acknowledge_anomaly: {
        Args: { _id: string; _note?: string }
        Returns: Json
      }
      admin_adjust_balance: {
        Args: { _delta: number; _reason: string; _target: string }
        Returns: Json
      }
      admin_get_user_email: { Args: { _user_id: string }; Returns: string }
      admin_release_freeze: {
        Args: { _freeze_id: string; _note?: string }
        Returns: undefined
      }
      admin_resolve_ai_mission: {
        Args: { _action: string; _id: string }
        Returns: Json
      }
      admin_resolve_aml: {
        Args: { _action: string; _id: string; _reason?: string }
        Returns: Json
      }
      admin_resolve_deposit: {
        Args: { _action: string; _reason: string; _request_id: string }
        Returns: Json
      }
      admin_resolve_package: {
        Args: { _action: string; _purchase_id: string; _reason?: string }
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
      admin_upsert_mission_template: {
        Args: {
          _active: boolean
          _ai_prompt_seed?: string
          _auto_approve: boolean
          _category: string
          _description: string
          _difficulty: string
          _duration_minutes: number
          _key: string
          _reward_credit: number
          _reward_xp: number
          _title: string
        }
        Returns: Json
      }
      ai_bot_base_reward: {
        Args: { _kind: Database["public"]["Enums"]["ai_bot_kind"] }
        Returns: number
      }
      ai_bot_daily_limit: {
        Args: {
          _kind: Database["public"]["Enums"]["ai_bot_kind"]
          _tier: Database["public"]["Enums"]["user_tier"]
        }
        Returns: number
      }
      aml_required_level: {
        Args: { _amount: number; _user_id: string }
        Returns: Json
      }
      apply_referral_code: { Args: { _code: string }; Returns: Json }
      auto_freeze_critical_anomalies: { Args: never; Returns: Json }
      award_xp: { Args: { _amount: number; _source?: Json }; Returns: Json }
      bulk_acknowledge_anomalies: {
        Args: { _ids: string[]; _note?: string }
        Returns: number
      }
      bump_jackpot: { Args: { _amount: number }; Returns: Json }
      bump_quest_metric: {
        Args: { _delta?: number; _metric: string }
        Returns: undefined
      }
      check_achievements: { Args: { _user_id?: string }; Returns: Json }
      check_permission_drift: { Args: never; Returns: Json }
      check_rls_integrity: { Args: never; Returns: Json }
      claim_ai_bot_run: { Args: { _run_id: string }; Returns: Json }
      claim_ai_mission: { Args: { _mission_id: string }; Returns: Json }
      claim_daily_attendance: {
        Args: { user_id: string }
        Returns: {
          new_streak: number
          reward: number
        }[]
      }
      claim_handbook_bonus: { Args: never; Returns: Json }
      claim_quest: { Args: { _quest_key: string }; Returns: Json }
      claim_season_reward: {
        Args: { _level: number; _track: string }
        Returns: Json
      }
      claim_weekly_pass_reward: { Args: { _level: number }; Returns: Json }
      cron_run_finalize_weekly_pass: { Args: never; Returns: Json }
      cron_run_pay_weekly_leaderboard: { Args: never; Returns: Json }
      current_season_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      deposit_bonus_pct: {
        Args: { _method: Database["public"]["Enums"]["deposit_method"] }
        Returns: number
      }
      detect_anomalies: { Args: never; Returns: Json }
      distribute_profit_share: {
        Args: {
          _period_end: string
          _period_start: string
          _pool_total: number
        }
        Returns: Json
      }
      enqueue_ai_mission: {
        Args: {
          _ai_reasoning?: string
          _description: string
          _reward_credit: number
          _reward_xp: number
          _template_key: string
          _title: string
          _user_id: string
        }
        Returns: string
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      equip_badge: {
        Args: { _badge_key: string; _slot: number }
        Returns: Json
      }
      finalize_ai_bot_run: {
        Args: {
          _error: string
          _output_path: string
          _output_text: string
          _run_id: string
        }
        Returns: Json
      }
      finalize_weekly_pass: { Args: never; Returns: Json }
      gacha_pull: { Args: never; Returns: Json }
      gen_referral_code: { Args: never; Returns: string }
      get_active_boost_count: { Args: never; Returns: number }
      get_admin_audit_recent: {
        Args: { _limit?: number }
        Returns: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string
          target_type: string
        }[]
      }
      get_admin_metrics: {
        Args: { _days?: number }
        Returns: {
          day: string
          deposits_total: number
          missions_count: number
          missions_reward: number
          new_users: number
          withdrawals_total: number
        }[]
      }
      get_ai_bot_stats: {
        Args: { _days?: number }
        Returns: {
          avg_pnl_pct: number
          claimed: number
          day: string
          failed: number
          kind: Database["public"]["Enums"]["ai_bot_kind"]
          runs: number
          total_reward: number
        }[]
      }
      get_empire_seats_remaining: { Args: never; Returns: number }
      get_error_stats: {
        Args: { _hours?: number }
        Returns: {
          bucket: string
          cnt: number
          level: string
        }[]
      }
      get_function_permissions_overview: {
        Args: never
        Returns: {
          category: string
          expected_roles: string[]
          function_args: string
          function_name: string
          in_drift: boolean
          note: string
          observed_roles: string[]
        }[]
      }
      get_my_quests: { Args: never; Returns: Json }
      get_my_weekly_referral_rank: { Args: never; Returns: Json }
      get_next_empire_day: { Args: never; Returns: string }
      get_permission_change_log: {
        Args: { _limit?: number }
        Returns: {
          change_type: string
          detected_at: string
          expected_roles: string[]
          function_args: string
          function_name: string
          id: string
          metadata: Json
          observed_roles: string[]
        }[]
        SetofOptions: {
          from: "*"
          to: "permission_change_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recent_errors: {
        Args: { _limit?: number }
        Returns: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "error_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_referral_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          invited: number
          inviter_id: string
          nickname: string
          tier: Database["public"]["Enums"]["user_tier"]
          total_commission: number
        }[]
      }
      get_referral_stats: { Args: never; Returns: Json }
      get_roulette_stats: { Args: never; Returns: Json }
      get_season_overview: { Args: never; Returns: Json }
      get_starter_trust_stats: { Args: never; Returns: Json }
      get_tier_distribution: {
        Args: never
        Returns: {
          tier: Database["public"]["Enums"]["user_tier"]
          total_balance: number
          users: number
        }[]
      }
      get_top_users: {
        Args: { _limit?: number }
        Returns: {
          nickname: string
          tier: Database["public"]["Enums"]["user_tier"]
          today_earned: number
          total_balance: number
          total_earned: number
          user_id: string
        }[]
      }
      get_weekly_pass_overview: { Args: never; Returns: Json }
      get_weekly_referral_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          commission_7d: number
          invited_7d: number
          inviter_id: string
          nickname: string
          rank: number
          tier: Database["public"]["Enums"]["user_tier"]
        }[]
      }
      harvest_machine: { Args: { _purchase_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_span_quality_alert: {
        Args: { _metrics: Json; _reason: string }
        Returns: string
      }
      is_account_frozen: { Args: { _user_id: string }; Returns: boolean }
      latest_chaos_run: { Args: never; Returns: Json }
      log_client_error: {
        Args: {
          _context?: Json
          _level?: string
          _message: string
          _stack?: string
          _url?: string
          _user_agent?: string
        }
        Returns: string
      }
      log_cron_settle: {
        Args: {
          _caller: string
          _duration_ms: number
          _error: string
          _metadata?: Json
          _ok: boolean
          _settled_count: number
        }
        Returns: undefined
      }
      mark_handbook_step: { Args: { _step: string }; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_active_freeze: {
        Args: never
        Returns: {
          expires_at: string
          frozen_at: string
          id: string
          reason: string
          severity: string
          source: string
        }[]
      }
      notify_user: {
        Args: {
          _body?: string
          _kind: string
          _payload?: Json
          _title: string
          _user_id: string
        }
        Returns: string
      }
      pay_weekly_leaderboard: { Args: never; Returns: Json }
      pay_weekly_leaderboard_dry_run: { Args: never; Returns: Json }
      policy_assertions_status: { Args: never; Returns: Json }
      public_trust_history: {
        Args: { _days?: number }
        Returns: {
          active_members_30d: number
          audit_pass_30d: number
          cron_uptime_7d: number
          id: string
          paid_30d: number
          policy_pass_7d: number
          taken_at: string
          total_members: number
          total_paid: number
          unack_anomalies: number
          uptime_p95_ms_24h: number
          uptime_success_24h: number
          uptime_success_7d: number
        }[]
        SetofOptions: {
          from: "*"
          to: "trust_snapshots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      public_trust_metrics: { Args: never; Returns: Json }
      public_uptime_heatmap_90d: { Args: never; Returns: Json }
      public_uptime_summary: { Args: never; Returns: Json }
      purchase_season_pass: { Args: never; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_chaos_run:
        | {
            Args: {
              _duration_ms: number
              _failed: number
              _passed: number
              _results: Json
              _source: string
              _total: number
            }
            Returns: string
          }
        | {
            Args: {
              _duration_ms: number
              _failed: number
              _passed: number
              _results: Json
              _source?: string
              _total: number
            }
            Returns: string
          }
      record_span: {
        Args: {
          _ended_at: string
          _metadata?: Json
          _op: string
          _parent: string
          _started_at: string
          _status: string
          _trace_id: string
        }
        Returns: string
      }
      recover_stuck_settlements: { Args: never; Returns: Json }
      redetect_anomaly: { Args: { _id: string }; Returns: Json }
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
      roulette_daily_limit: {
        Args: { _tier: Database["public"]["Enums"]["user_tier"] }
        Returns: number
      }
      run_policy_assertions: { Args: never; Returns: Json }
      run_security_self_audit: { Args: { _source?: string }; Returns: Json }
      run_uptime_canary: { Args: never; Returns: undefined }
      settle_mission: {
        Args: { _base_reward: number; _is_win: boolean; _mission_id: string }
        Returns: Json
      }
      settle_package_daily: { Args: never; Returns: Json }
      settlement_slo: { Args: never; Returns: Json }
      slow_requests_top: {
        Args: { _limit?: number }
        Returns: {
          avg_ms: number
          count: number
          max_ms: number
          op: string
          p95_ms: number
        }[]
      }
      spin_roulette: { Args: { _kind: string }; Returns: Json }
      start_ai_bot_run: {
        Args: {
          _kind: Database["public"]["Enums"]["ai_bot_kind"]
          _prompt: string
        }
        Returns: Json
      }
      submit_aml_verification: {
        Args: {
          _doc_signed?: boolean
          _level: number
          _metadata?: Json
          _selfie_path?: string
        }
        Returns: Json
      }
      submit_deposit:
        | {
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
        | {
            Args: {
              _amount: number
              _memo: string
              _method: Database["public"]["Enums"]["deposit_method"]
              _package_id: string
              _package_name: string
              _receipt_url: string
              _voucher_brand?: string
              _voucher_pin?: string
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
      tick_weekly_leaderboard_ranks: { Args: never; Returns: Json }
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
      trust_record_snapshot: { Args: never; Returns: string }
      unfreeze_expired: { Args: never; Returns: Json }
      unlock_achievement: { Args: { _key: string }; Returns: Json }
      verify_weekly_pass_finalize: {
        Args: { _iso_week?: string }
        Returns: Json
      }
      xp_for_level: { Args: { _level: number }; Returns: number }
    }
    Enums: {
      ai_bot_kind: "content" | "trading" | "image"
      ai_bot_status: "running" | "ready" | "claimed" | "failed" | "expired"
      app_role: "admin" | "user"
      deposit_method: "bank" | "coin" | "voucher"
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
      ai_bot_kind: ["content", "trading", "image"],
      ai_bot_status: ["running", "ready", "claimed", "failed", "expired"],
      app_role: ["admin", "user"],
      deposit_method: ["bank", "coin", "voucher"],
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
