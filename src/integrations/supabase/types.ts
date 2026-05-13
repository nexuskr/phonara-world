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
      ab_assignments: {
        Row: {
          assigned_at: string
          experiment_key: string
          id: string
          user_id: string
          variant: string
        }
        Insert: {
          assigned_at?: string
          experiment_key: string
          id?: string
          user_id: string
          variant: string
        }
        Update: {
          assigned_at?: string
          experiment_key?: string
          id?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      ab_experiments: {
        Row: {
          created_at: string
          description: string | null
          experiment_key: string
          id: string
          is_active: boolean
          label: string
          updated_at: string
          variants: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          experiment_key: string
          id?: string
          is_active?: boolean
          label: string
          updated_at?: string
          variants?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          experiment_key?: string
          id?: string
          is_active?: boolean
          label?: string
          updated_at?: string
          variants?: Json
        }
        Relationships: []
      }
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
      ai_daily_ops_reports: {
        Row: {
          actions: Json
          created_at: string
          highlights: Json
          id: string
          model: string
          raw_input: Json
          report_date: string
          risks: Json
          summary: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          highlights?: Json
          id?: string
          model?: string
          raw_input?: Json
          report_date: string
          risks?: Json
          summary: string
        }
        Update: {
          actions?: Json
          created_at?: string
          highlights?: Json
          id?: string
          model?: string
          raw_input?: Json
          report_date?: string
          risks?: Json
          summary?: string
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
      arena_pool: {
        Row: {
          balance: number
          id: number
          operator_margin: number
          total_collected: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: number
          operator_margin?: number
          total_collected?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: number
          operator_margin?: number
          total_collected?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      arena_rounds: {
        Row: {
          amp_factor: number
          exit_pnl_pct: number | null
          id: string
          leverage: number
          margin: number
          mode: string
          opened_at: string
          operator_rake: number | null
          opponent_id: string | null
          reward: number | null
          settled_at: string | null
          side: string
          sl_pct: number
          status: string
          symbol: string
          tp_pct: number
          user_id: string
          winner_id: string | null
        }
        Insert: {
          amp_factor?: number
          exit_pnl_pct?: number | null
          id?: string
          leverage: number
          margin: number
          mode: string
          opened_at?: string
          operator_rake?: number | null
          opponent_id?: string | null
          reward?: number | null
          settled_at?: string | null
          side: string
          sl_pct: number
          status?: string
          symbol: string
          tp_pct: number
          user_id: string
          winner_id?: string | null
        }
        Update: {
          amp_factor?: number
          exit_pnl_pct?: number | null
          id?: string
          leverage?: number
          margin?: number
          mode?: string
          opened_at?: string
          operator_rake?: number | null
          opponent_id?: string | null
          reward?: number | null
          settled_at?: string | null
          side?: string
          sl_pct?: number
          status?: string
          symbol?: string
          tp_pct?: number
          user_id?: string
          winner_id?: string | null
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
      beta_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number
          note: string | null
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          uses?: number
        }
        Relationships: []
      }
      beta_redemptions: {
        Row: {
          id: string
          invite_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          invite_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          invite_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_redemptions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "beta_invites"
            referencedColumns: ["id"]
          },
        ]
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
      bot_activity_events: {
        Row: {
          event_text: string
          event_type: string
          expires_at: string
          id: number
          occurred_at: string
          persona_id: string
          reward_amount: number | null
        }
        Insert: {
          event_text: string
          event_type: string
          expires_at?: string
          id?: never
          occurred_at?: string
          persona_id: string
          reward_amount?: number | null
        }
        Update: {
          event_text?: string
          event_type?: string
          expires_at?: string
          id?: never
          occurred_at?: string
          persona_id?: string
          reward_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_activity_events_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "bot_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_mix_log: {
        Row: {
          changed_by: string | null
          id: number
          metrics: Json
          new_strength_pct: number
          occurred_at: string
          prev_strength_pct: number
          reason: string
          source: string
        }
        Insert: {
          changed_by?: string | null
          id?: number
          metrics?: Json
          new_strength_pct: number
          occurred_at?: string
          prev_strength_pct: number
          reason: string
          source?: string
        }
        Update: {
          changed_by?: string | null
          id?: number
          metrics?: Json
          new_strength_pct?: number
          occurred_at?: string
          prev_strength_pct?: number
          reason?: string
          source?: string
        }
        Relationships: []
      }
      bot_personas: {
        Row: {
          avatar_emoji: string
          created_at: string
          generation: string
          id: string
          is_synthetic: boolean
          language: string
          last_active_at: string
          nickname: string
          region: string
          tier_weight: string
        }
        Insert: {
          avatar_emoji?: string
          created_at?: string
          generation: string
          id?: string
          is_synthetic?: boolean
          language?: string
          last_active_at?: string
          nickname: string
          region?: string
          tier_weight?: string
        }
        Update: {
          avatar_emoji?: string
          created_at?: string
          generation?: string
          id?: string
          is_synthetic?: boolean
          language?: string
          last_active_at?: string
          nickname?: string
          region?: string
          tier_weight?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          auto_phase_enabled: boolean
          bot_ratio_phase: number
          daily_growth_max: number
          daily_growth_min: number
          dau_threshold_high: number
          dau_threshold_low: number
          enabled: boolean
          id: number
          online_base: number
          online_jitter: number
          strength_pct: number
          target_total_users: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_phase_enabled?: boolean
          bot_ratio_phase?: number
          daily_growth_max?: number
          daily_growth_min?: number
          dau_threshold_high?: number
          dau_threshold_low?: number
          enabled?: boolean
          id?: number
          online_base?: number
          online_jitter?: number
          strength_pct?: number
          target_total_users?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_phase_enabled?: boolean
          bot_ratio_phase?: number
          daily_growth_max?: number
          daily_growth_min?: number
          dau_threshold_high?: number
          dau_threshold_low?: number
          enabled?: boolean
          id?: number
          online_base?: number
          online_jitter?: number
          strength_pct?: number
          target_total_users?: number
          updated_at?: string
          updated_by?: string | null
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
      coin_deposit_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          memo: string | null
          network: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          memo?: string | null
          network: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          memo?: string | null
          network?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_trade_coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      concierge_events: {
        Row: {
          booster_active: boolean | null
          created_at: string
          crown_score: number | null
          cta: string | null
          empire_level: number | null
          id: number
          kind: string
          message: string | null
          payload: Json | null
          route: string | null
          user_id: string
        }
        Insert: {
          booster_active?: boolean | null
          created_at?: string
          crown_score?: number | null
          cta?: string | null
          empire_level?: number | null
          id?: number
          kind: string
          message?: string | null
          payload?: Json | null
          route?: string | null
          user_id: string
        }
        Update: {
          booster_active?: boolean | null
          created_at?: string
          crown_score?: number | null
          cta?: string | null
          empire_level?: number | null
          id?: number
          kind?: string
          message?: string | null
          payload?: Json | null
          route?: string | null
          user_id?: string
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
      crown_events: {
        Row: {
          awarded_amount: number
          base_amount: number
          created_at: string
          dedupe_key: string
          event_type: string
          expected_amount: number
          id: number
          level_mult: number
          meta: Json
          rpe: number
          streak_mult: number
          type_mult: number
          user_id: string
          variance: number
        }
        Insert: {
          awarded_amount: number
          base_amount: number
          created_at?: string
          dedupe_key: string
          event_type: string
          expected_amount: number
          id?: number
          level_mult: number
          meta?: Json
          rpe: number
          streak_mult: number
          type_mult: number
          user_id: string
          variance: number
        }
        Update: {
          awarded_amount?: number
          base_amount?: number
          created_at?: string
          dedupe_key?: string
          event_type?: string
          expected_amount?: number
          id?: number
          level_mult?: number
          meta?: Json
          rpe?: number
          streak_mult?: number
          type_mult?: number
          user_id?: string
          variance?: number
        }
        Relationships: []
      }
      crown_replays: {
        Row: {
          awarded_amount: number
          created_at: string
          empire_level: number
          event_id: string | null
          expires_at: string
          id: string
          nickname_masked: string | null
          public_token: string
          share_count: number
          user_id: string
          variance: number
          view_count: number
        }
        Insert: {
          awarded_amount: number
          created_at?: string
          empire_level?: number
          event_id?: string | null
          expires_at?: string
          id?: string
          nickname_masked?: string | null
          public_token: string
          share_count?: number
          user_id: string
          variance: number
          view_count?: number
        }
        Update: {
          awarded_amount?: number
          created_at?: string
          empire_level?: number
          event_id?: string | null
          expires_at?: string
          id?: string
          nickname_masked?: string | null
          public_token?: string
          share_count?: number
          user_id?: string
          variance?: number
          view_count?: number
        }
        Relationships: []
      }
      crown_war_participants: {
        Row: {
          last_event_at: string
          score: number
          user_id: string
          war_id: number
        }
        Insert: {
          last_event_at?: string
          score?: number
          user_id: string
          war_id: number
        }
        Update: {
          last_event_at?: string
          score?: number
          user_id?: string
          war_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "crown_war_participants_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "crown_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      crown_wars: {
        Row: {
          created_at: string
          ends_at: string
          id: number
          settled_at: string | null
          started_at: string
          status: string
          top1_score: number | null
          top1_user_id: string | null
          top2_score: number | null
          top2_user_id: string | null
          top3_score: number | null
          top3_user_id: string | null
          total_participants: number
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: number
          settled_at?: string | null
          started_at: string
          status?: string
          top1_score?: number | null
          top1_user_id?: string | null
          top2_score?: number | null
          top2_user_id?: string | null
          top3_score?: number | null
          top3_user_id?: string | null
          total_participants?: number
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: number
          settled_at?: string | null
          started_at?: string
          status?: string
          top1_score?: number | null
          top1_user_id?: string | null
          top2_score?: number | null
          top2_user_id?: string | null
          top3_score?: number | null
          top3_user_id?: string | null
          total_participants?: number
        }
        Relationships: []
      }
      daily_combo_progress: {
        Row: {
          date: string
          rewarded_at: string | null
          steps: Json
          user_id: string
        }
        Insert: {
          date?: string
          rewarded_at?: string | null
          steps?: Json
          user_id: string
        }
        Update: {
          date?: string
          rewarded_at?: string | null
          steps?: Json
          user_id?: string
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
      daily_whale_leaderboard: {
        Row: {
          date: string
          deposit_total_krw: number
          is_total: number
          nickname_masked: string
          rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          date?: string
          deposit_total_krw?: number
          is_total?: number
          nickname_masked?: string
          rank?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          date?: string
          deposit_total_krw?: number
          is_total?: number
          nickname_masked?: string
          rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_booster_windows: {
        Row: {
          created_at: string
          expires_at: string
          hours_accumulated: number
          id: string
          source_purchase_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          hours_accumulated?: number
          id?: string
          source_purchase_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hours_accumulated?: number
          id?: string
          source_purchase_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_evidence_checklist: Json
          admin_id: string | null
          admin_review_memo: string | null
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
          admin_evidence_checklist?: Json
          admin_id?: string | null
          admin_review_memo?: string | null
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
          admin_evidence_checklist?: Json
          admin_id?: string | null
          admin_review_memo?: string | null
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
      empire_battles: {
        Row: {
          created_at: string
          id: string
          mode: string
          pnl: number
          result: string
          side: string
          territory: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          pnl?: number
          result: string
          side: string
          territory?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          pnl?: number
          result?: string
          side?: string
          territory?: string | null
          user_id?: string
        }
        Relationships: []
      }
      empire_boosters: {
        Row: {
          crown_multiplier: number
          expires_at: string
          fee_discount: number
          granted_at: string
          id: number
          kind: string
          leverage: number
          source: string
          user_id: string
        }
        Insert: {
          crown_multiplier?: number
          expires_at: string
          fee_discount?: number
          granted_at?: string
          id?: number
          kind?: string
          leverage?: number
          source?: string
          user_id: string
        }
        Update: {
          crown_multiplier?: number
          expires_at?: string
          fee_discount?: number
          granted_at?: string
          id?: number
          kind?: string
          leverage?: number
          source?: string
          user_id?: string
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
      empire_levels: {
        Row: {
          crown_required: number
          fee_discount: number
          growth_speed_bonus: number
          level: number
          leverage_cap: number
          name: string
          perks: Json
        }
        Insert: {
          crown_required: number
          fee_discount?: number
          growth_speed_bonus?: number
          level: number
          leverage_cap?: number
          name: string
          perks?: Json
        }
        Update: {
          crown_required?: number
          fee_discount?: number
          growth_speed_bonus?: number
          level?: number
          leverage_cap?: number
          name?: string
          perks?: Json
        }
        Relationships: []
      }
      empire_map_progress: {
        Row: {
          conquest_count: number
          last_battle_at: string | null
          raid_count: number
          territories: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          conquest_count?: number
          last_battle_at?: string | null
          raid_count?: number
          territories?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          conquest_count?: number
          last_battle_at?: string | null
          raid_count?: number
          territories?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      empire_units: {
        Row: {
          acquired_at: string
          id: string
          level: number
          stats: Json
          tier: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          acquired_at?: string
          id?: string
          level?: number
          stats?: Json
          tier: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          acquired_at?: string
          id?: string
          level?: number
          stats?: Json
          tier?: string
          updated_at?: string
          user_id?: string
          xp?: number
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
      escalation_milestones_catalog: {
        Row: {
          badge_key: string | null
          created_at: string
          key: string
          label: string
          reward_json: Json
          sort_order: number
          threshold_krw: number
          threshold_window: string
        }
        Insert: {
          badge_key?: string | null
          created_at?: string
          key: string
          label: string
          reward_json?: Json
          sort_order?: number
          threshold_krw: number
          threshold_window: string
        }
        Update: {
          badge_key?: string | null
          created_at?: string
          key?: string
          label?: string
          reward_json?: Json
          sort_order?: number
          threshold_krw?: number
          threshold_window?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_milestones_catalog_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      feed_events: {
        Row: {
          created_at: string
          dwell_ms: number
          event: string
          id: number
          region: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          dwell_ms?: number
          event: string
          id?: number
          region?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          dwell_ms?: number
          event?: string
          id?: number
          region?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      feed_recommendations: {
        Row: {
          clicked_at: string | null
          id: number
          mode: string
          score: number
          served_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          clicked_at?: string | null
          id?: number
          mode?: string
          score?: number
          served_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          clicked_at?: string | null
          id?: number
          mode?: string
          score?: number
          served_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      fomo_notifications: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          dedupe_key: string | null
          expires_at: string
          id: string
          kind: string
          message: string
          payload: Json
          priority: number
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          dedupe_key?: string | null
          expires_at?: string
          id?: string
          kind: string
          message: string
          payload?: Json
          priority?: number
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          dedupe_key?: string | null
          expires_at?: string
          id?: string
          kind?: string
          message?: string
          payload?: Json
          priority?: number
          read_at?: string | null
          title?: string
          user_id?: string
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
      guild_activity_feed: {
        Row: {
          action: string
          actor_name: string
          actor_seed: number
          amount: number | null
          created_at: string
          guild_id: string
          id: string
          is_bot: boolean
          metadata: Json
        }
        Insert: {
          action: string
          actor_name: string
          actor_seed?: number
          amount?: number | null
          created_at?: string
          guild_id: string
          id?: string
          is_bot?: boolean
          metadata?: Json
        }
        Update: {
          action?: string
          actor_name?: string
          actor_seed?: number
          amount?: number | null
          created_at?: string
          guild_id?: string
          id?: string
          is_bot?: boolean
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "guild_activity_feed_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_chat_messages: {
        Row: {
          bot_emoji: string | null
          bot_nickname: string | null
          created_at: string
          guild_id: string
          id: string
          is_bot: boolean
          message: string
          user_id: string | null
        }
        Insert: {
          bot_emoji?: string | null
          bot_nickname?: string | null
          created_at?: string
          guild_id: string
          id?: string
          is_bot?: boolean
          message: string
          user_id?: string | null
        }
        Update: {
          bot_emoji?: string | null
          bot_nickname?: string | null
          created_at?: string
          guild_id?: string
          id?: string
          is_bot?: boolean
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_chat_messages_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_members: {
        Row: {
          contribution: number
          guild_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          contribution?: number
          guild_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          contribution?: number
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_war_contributions: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          score: number
          user_id: string
          war_id: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          score?: number
          user_id: string
          war_id: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          score?: number
          user_id?: string
          war_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_war_contributions_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_war_contributions_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "guild_wars"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_wars: {
        Row: {
          attacker_guild_id: string
          attacker_score: number
          defender_guild_id: string
          defender_score: number
          ends_at: string
          id: string
          started_at: string
          status: string
          winner_guild_id: string | null
        }
        Insert: {
          attacker_guild_id: string
          attacker_score?: number
          defender_guild_id: string
          defender_score?: number
          ends_at?: string
          id?: string
          started_at?: string
          status?: string
          winner_guild_id?: string | null
        }
        Update: {
          attacker_guild_id?: string
          attacker_score?: number
          defender_guild_id?: string
          defender_score?: number
          ends_at?: string
          id?: string
          started_at?: string
          status?: string
          winner_guild_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guild_wars_attacker_guild_id_fkey"
            columns: ["attacker_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guild_wars_defender_guild_id_fkey"
            columns: ["defender_guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guild_weekly_payouts: {
        Row: {
          contribution: number
          guild_id: string
          id: number
          paid_at: string
          payout_crown: number
          rank: number
          user_id: string
          week_start: string
        }
        Insert: {
          contribution: number
          guild_id: string
          id?: number
          paid_at?: string
          payout_crown: number
          rank: number
          user_id: string
          week_start: string
        }
        Update: {
          contribution?: number
          guild_id?: string
          id?: number
          paid_at?: string
          payout_crown?: number
          rank?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      guild_weekly_rankings: {
        Row: {
          badge: string | null
          guild_id: string
          id: number
          member_count: number
          rank: number
          reward_pool: number
          settled_at: string
          total_contribution: number
          week_start: string
        }
        Insert: {
          badge?: string | null
          guild_id: string
          id?: number
          member_count: number
          rank: number
          reward_pool: number
          settled_at?: string
          total_contribution: number
          week_start: string
        }
        Update: {
          badge?: string | null
          guild_id?: string
          id?: number
          member_count?: number
          rank?: number
          reward_pool?: number
          settled_at?: string
          total_contribution?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_weekly_rankings_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          created_at: string
          description: string | null
          emblem: string
          id: string
          is_seed: boolean
          leader_id: string | null
          max_members: number
          member_count: number
          name: string
          total_power: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emblem?: string
          id?: string
          is_seed?: boolean
          leader_id?: string | null
          max_members?: number
          member_count?: number
          name: string
          total_power?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emblem?: string
          id?: string
          is_seed?: boolean
          leader_id?: string | null
          max_members?: number
          member_count?: number
          name?: string
          total_power?: number
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
      idle_growth_state: {
        Row: {
          accrued_amount: number
          daily_claimed: number
          last_claim_at: string | null
          last_tick_at: string
          user_id: string
        }
        Insert: {
          accrued_amount?: number
          daily_claimed?: number
          last_claim_at?: string | null
          last_tick_at?: string
          user_id: string
        }
        Update: {
          accrued_amount?: number
          daily_claimed?: number
          last_claim_at?: string | null
          last_tick_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imperial_score_events: {
        Row: {
          base: number
          created_at: string
          delta: number
          id: string
          meta: Json
          multiplier: number
          source: string
          user_id: string
        }
        Insert: {
          base: number
          created_at?: string
          delta: number
          id?: string
          meta?: Json
          multiplier?: number
          source: string
          user_id: string
        }
        Update: {
          base?: number
          created_at?: string
          delta?: number
          id?: string
          meta?: Json
          multiplier?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      imperial_scores: {
        Row: {
          daily_date: string
          daily_is: number
          season_is: number
          total_is: number
          updated_at: string
          user_id: string
          weekly_is: number
          weekly_key: string
        }
        Insert: {
          daily_date?: string
          daily_is?: number
          season_is?: number
          total_is?: number
          updated_at?: string
          user_id: string
          weekly_is?: number
          weekly_key?: string
        }
        Update: {
          daily_date?: string
          daily_is?: number
          season_is?: number
          total_is?: number
          updated_at?: string
          user_id?: string
          weekly_is?: number
          weekly_key?: string
        }
        Relationships: []
      }
      insurance_fund: {
        Row: {
          accumulated: number
          id: number
          updated_at: string
        }
        Insert: {
          accumulated?: number
          id?: number
          updated_at?: string
        }
        Update: {
          accumulated?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      insurance_fund_log: {
        Row: {
          balance_after: number
          delta: number
          id: string
          metadata: Json
          ts: string
        }
        Insert: {
          balance_after: number
          delta: number
          id?: string
          metadata?: Json
          ts?: string
        }
        Update: {
          balance_after?: number
          delta?: number
          id?: string
          metadata?: Json
          ts?: string
        }
        Relationships: []
      }
      jackpot_contributions: {
        Row: {
          contribution_amount: number
          contribution_pct: number
          created_at: string
          deposit_amount: number
          id: string
          user_id: string
        }
        Insert: {
          contribution_amount: number
          contribution_pct?: number
          created_at?: string
          deposit_amount: number
          id?: string
          user_id: string
        }
        Update: {
          contribution_amount?: number
          contribution_pct?: number
          created_at?: string
          deposit_amount?: number
          id?: string
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
      jackpot_settlements: {
        Row: {
          created_at: string
          id: string
          operator_retain: number
          total_pool: number
          winner_id: string
          winner_nickname: string | null
          winner_payout: number
          winner_pct: number
        }
        Insert: {
          created_at?: string
          id?: string
          operator_retain: number
          total_pool: number
          winner_id: string
          winner_nickname?: string | null
          winner_payout: number
          winner_pct?: number
        }
        Update: {
          created_at?: string
          id?: string
          operator_retain?: number
          total_pool?: number
          winner_id?: string
          winner_nickname?: string | null
          winner_payout?: number
          winner_pct?: number
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          body_md: string
          created_at: string
          doc_key: string
          effective_at: string
          id: string
          is_current: boolean
          locale: string
          title: string
          version: string
        }
        Insert: {
          body_md: string
          created_at?: string
          doc_key: string
          effective_at?: string
          id?: string
          is_current?: boolean
          locale?: string
          title: string
          version: string
        }
        Update: {
          body_md?: string
          created_at?: string
          doc_key?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          locale?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      line_link_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          token: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          token: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      line_subscriptions: {
        Row: {
          display_name: string | null
          line_user_id: string
          link_token: string | null
          linked_at: string
          unlinked_at: string | null
          user_id: string
        }
        Insert: {
          display_name?: string | null
          line_user_id: string
          link_token?: string | null
          linked_at?: string
          unlinked_at?: string | null
          user_id: string
        }
        Update: {
          display_name?: string | null
          line_user_id?: string
          link_token?: string | null
          linked_at?: string
          unlinked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      live_positions: {
        Row: {
          allocated_margin: number | null
          entry: number
          fee_open: number
          id: string
          leverage: number
          liq_price: number
          margin: number
          margin_mode: string
          opened_at: string
          side: string
          size: number
          sl_pct: number | null
          sl_price: number | null
          status: string
          symbol: string
          tp_pct: number | null
          tp_price: number | null
          trailing_active: boolean
          trailing_offset: number | null
          trailing_pct: number | null
          trailing_peak: number | null
          trailing_peak_roi_pct: number | null
          user_id: string
        }
        Insert: {
          allocated_margin?: number | null
          entry: number
          fee_open?: number
          id?: string
          leverage: number
          liq_price: number
          margin: number
          margin_mode?: string
          opened_at?: string
          side: string
          size: number
          sl_pct?: number | null
          sl_price?: number | null
          status?: string
          symbol: string
          tp_pct?: number | null
          tp_price?: number | null
          trailing_active?: boolean
          trailing_offset?: number | null
          trailing_pct?: number | null
          trailing_peak?: number | null
          trailing_peak_roi_pct?: number | null
          user_id: string
        }
        Update: {
          allocated_margin?: number | null
          entry?: number
          fee_open?: number
          id?: string
          leverage?: number
          liq_price?: number
          margin?: number
          margin_mode?: string
          opened_at?: string
          side?: string
          size?: number
          sl_pct?: number | null
          sl_price?: number | null
          status?: string
          symbol?: string
          tp_pct?: number | null
          tp_price?: number | null
          trailing_active?: boolean
          trailing_offset?: number | null
          trailing_pct?: number | null
          trailing_peak?: number | null
          trailing_peak_roi_pct?: number | null
          user_id?: string
        }
        Relationships: []
      }
      live_trade_history: {
        Row: {
          close_price: number
          closed_at: string
          entry: number
          fee_close: number
          fee_open: number
          id: string
          leverage: number
          margin: number
          opened_at: string
          pnl: number
          reason: string
          roi: number
          side: string
          size: number
          symbol: string
          user_id: string
        }
        Insert: {
          close_price: number
          closed_at?: string
          entry: number
          fee_close?: number
          fee_open?: number
          id?: string
          leverage: number
          margin: number
          opened_at: string
          pnl: number
          reason: string
          roi: number
          side: string
          size: number
          symbol: string
          user_id: string
        }
        Update: {
          close_price?: number
          closed_at?: string
          entry?: number
          fee_close?: number
          fee_open?: number
          id?: string
          leverage?: number
          margin?: number
          opened_at?: string
          pnl?: number
          reason?: string
          roi?: number
          side?: string
          size?: number
          symbol?: string
          user_id?: string
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
      mission_personas: {
        Row: {
          created_at: string
          mission_id: string
          persona: string
          priority: number
        }
        Insert: {
          created_at?: string
          mission_id: string
          persona: string
          priority?: number
        }
        Update: {
          created_at?: string
          mission_id?: string
          persona?: string
          priority?: number
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
      oracle_prices: {
        Row: {
          last_price: number
          source: string
          symbol: string
          updated_at: string
        }
        Insert: {
          last_price: number
          source?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          last_price?: number
          source?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_purchases: {
        Row: {
          admin_evidence_checklist: Json
          admin_id: string | null
          admin_review_memo: string | null
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
          admin_evidence_checklist?: Json
          admin_id?: string | null
          admin_review_memo?: string | null
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
          admin_evidence_checklist?: Json
          admin_id?: string | null
          admin_review_memo?: string | null
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
      passkey_verifications: {
        Row: {
          created_at: string
          credential_id: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id: string
          expires_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          fill_error: string | null
          filled_at: string | null
          filled_position_id: string | null
          id: string
          kind: string
          leverage: number
          margin: number
          side: string
          status: string
          symbol: string
          trigger_price: number
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          fill_error?: string | null
          filled_at?: string | null
          filled_position_id?: string | null
          id?: string
          kind: string
          leverage: number
          margin: number
          side: string
          status?: string
          symbol: string
          trigger_price: number
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          fill_error?: string | null
          filled_at?: string | null
          filled_position_id?: string | null
          id?: string
          kind?: string
          leverage?: number
          margin?: number
          side?: string
          status?: string
          symbol?: string
          trigger_price?: number
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
      pin_lockouts: {
        Row: {
          fail_count: number
          last_failed_at: string | null
          locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          fail_count?: number
          last_failed_at?: string | null
          locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          fail_count?: number
          last_failed_at?: string | null
          locked_until?: string | null
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
      position_trigger_audit: {
        Row: {
          allocated_margin: number | null
          created_at: string
          cross_equity_at_close: number | null
          entry: number
          exit_price: number
          id: string
          leverage: number
          margin: number
          margin_mode: string | null
          mark_price: number
          metadata: Json
          pnl: number
          position_id: string
          reason: string
          roi: number
          side: string
          sl_pct: number | null
          source: string
          symbol: string
          tp_pct: number | null
          trailing_active: boolean
          trailing_pct: number | null
          trailing_peak_roi_pct: number | null
          trigger_kind: string | null
          user_id: string
        }
        Insert: {
          allocated_margin?: number | null
          created_at?: string
          cross_equity_at_close?: number | null
          entry: number
          exit_price: number
          id?: string
          leverage: number
          margin: number
          margin_mode?: string | null
          mark_price: number
          metadata?: Json
          pnl: number
          position_id: string
          reason: string
          roi: number
          side: string
          sl_pct?: number | null
          source?: string
          symbol: string
          tp_pct?: number | null
          trailing_active?: boolean
          trailing_pct?: number | null
          trailing_peak_roi_pct?: number | null
          trigger_kind?: string | null
          user_id: string
        }
        Update: {
          allocated_margin?: number | null
          created_at?: string
          cross_equity_at_close?: number | null
          entry?: number
          exit_price?: number
          id?: string
          leverage?: number
          margin?: number
          margin_mode?: string | null
          mark_price?: number
          metadata?: Json
          pnl?: number
          position_id?: string
          reason?: string
          roi?: number
          side?: string
          sl_pct?: number | null
          source?: string
          symbol?: string
          tp_pct?: number | null
          trailing_active?: boolean
          trailing_pct?: number | null
          trailing_peak_roi_pct?: number | null
          trigger_kind?: string | null
          user_id?: string
        }
        Relationships: []
      }
      posting_schedule_queue: {
        Row: {
          created_at: string
          id: number
          region: string
          scheduled_at: string
          status: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          region: string
          scheduled_at: string
          status?: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: number
          region?: string
          scheduled_at?: string
          status?: string
          video_id?: string
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
          crown_score: number
          daily_mission_count: number | null
          email_notifications_enabled: boolean | null
          empire_level: number
          id: string
          is_adult: boolean
          last_attendance: string | null
          last_reset_date: string | null
          nickname: string
          persona: string
          phone: string | null
          profile_completed: boolean
          real_name: string | null
          referral_code: string | null
          referred_by: string | null
          sms_notifications_enabled: boolean | null
          terms_agreed_at: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          tos_version: string | null
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
          crown_score?: number
          daily_mission_count?: number | null
          email_notifications_enabled?: boolean | null
          empire_level?: number
          id: string
          is_adult?: boolean
          last_attendance?: string | null
          last_reset_date?: string | null
          nickname: string
          persona?: string
          phone?: string | null
          profile_completed?: boolean
          real_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sms_notifications_enabled?: boolean | null
          terms_agreed_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          tos_version?: string | null
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
          crown_score?: number
          daily_mission_count?: number | null
          email_notifications_enabled?: boolean | null
          empire_level?: number
          id?: string
          is_adult?: boolean
          last_attendance?: string | null
          last_reset_date?: string | null
          nickname?: string
          persona?: string
          phone?: string | null
          profile_completed?: boolean
          real_name?: string | null
          referral_code?: string | null
          referred_by?: string | null
          sms_notifications_enabled?: boolean | null
          terms_agreed_at?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          tos_version?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
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
      rate_limit_buckets: {
        Row: {
          bucket_minute: string
          count: number
          scope: string
          user_id: string
        }
        Insert: {
          bucket_minute: string
          count?: number
          scope: string
          user_id: string
        }
        Update: {
          bucket_minute?: string
          count?: number
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_bonus_eligibility: {
        Row: {
          consumed_at: string | null
          consumed_event_id: string | null
          created_at: string
          eligible_until: string
          id: string
          liquidation_amount: number
          source: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          consumed_event_id?: string | null
          created_at?: string
          eligible_until: string
          id?: string
          liquidation_amount: number
          source?: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          consumed_event_id?: string | null
          created_at?: string
          eligible_until?: string
          id?: string
          liquidation_amount?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_bonus_events: {
        Row: {
          bonus_amount: number
          bonus_pct: number
          created_at: string
          deposit_amount: number
          funding_source: string
          id: string
          note: string | null
          user_id: string
          user_tier: string
        }
        Insert: {
          bonus_amount: number
          bonus_pct: number
          created_at?: string
          deposit_amount: number
          funding_source: string
          id?: string
          note?: string | null
          user_id: string
          user_tier: string
        }
        Update: {
          bonus_amount?: number
          bonus_pct?: number
          created_at?: string
          deposit_amount?: number
          funding_source?: string
          id?: string
          note?: string | null
          user_id?: string
          user_tier?: string
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
          policy_version: number
          signup_bonus_paid: boolean
          total_commission: number
          window_expires_at: string | null
        }
        Insert: {
          code_used: string
          created_at?: string
          first_deposit_bonus_paid?: boolean
          id?: string
          invitee_id: string
          inviter_id: string
          policy_version?: number
          signup_bonus_paid?: boolean
          total_commission?: number
          window_expires_at?: string | null
        }
        Update: {
          code_used?: string
          created_at?: string
          first_deposit_bonus_paid?: boolean
          id?: string
          invitee_id?: string
          inviter_id?: string
          policy_version?: number
          signup_bonus_paid?: boolean
          total_commission?: number
          window_expires_at?: string | null
        }
        Relationships: []
      }
      request_status_history: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          evidence: Json
          from_status: string | null
          id: string
          memo: string | null
          request_id: string
          request_kind: string
          to_status: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          evidence?: Json
          from_status?: string | null
          id?: string
          memo?: string | null
          request_id: string
          request_kind: string
          to_status: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          evidence?: Json
          from_status?: string | null
          id?: string
          memo?: string | null
          request_id?: string
          request_kind?: string
          to_status?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_events: {
        Row: {
          amount_krw: number
          attribution_referrer: string | null
          attribution_video_id: string | null
          created_at: string
          currency: string
          id: number
          meta: Json
          source: string
          user_id: string | null
        }
        Insert: {
          amount_krw: number
          attribution_referrer?: string | null
          attribution_video_id?: string | null
          created_at?: string
          currency?: string
          id?: number
          meta?: Json
          source: string
          user_id?: string | null
        }
        Update: {
          amount_krw?: number
          attribution_referrer?: string | null
          attribution_video_id?: string | null
          created_at?: string
          currency?: string
          id?: number
          meta?: Json
          source?: string
          user_id?: string | null
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
      support_kb_articles: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          source_file_path: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          source_file_path?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          source_file_path?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          pii_masked: boolean
          sender: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pii_masked?: boolean
          sender: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pii_masked?: boolean
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
      support_routing_rules: {
        Row: {
          active: boolean
          assigned_to: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          priority: string
        }
        Insert: {
          active?: boolean
          assigned_to?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
        }
        Update: {
          active?: boolean
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
        }
        Relationships: []
      }
      support_threads: {
        Row: {
          ai_escalated: boolean
          ai_last_category: string | null
          assigned_to: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string
          last_pii_at: string | null
          nickname: string
          priority: string
          resolved_at: string | null
          status: string
          unread_admin: number
          unread_user: number
          user_id: string
        }
        Insert: {
          ai_escalated?: boolean
          ai_last_category?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          last_pii_at?: string | null
          nickname: string
          priority?: string
          resolved_at?: string | null
          status?: string
          unread_admin?: number
          unread_user?: number
          user_id: string
        }
        Update: {
          ai_escalated?: boolean
          ai_last_category?: string | null
          assigned_to?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          last_pii_at?: string | null
          nickname?: string
          priority?: string
          resolved_at?: string | null
          status?: string
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
      tap_counters: {
        Row: {
          date: string
          last_tap_at: string
          rewarded_taps: number
          tap_count: number
          user_id: string
        }
        Insert: {
          date?: string
          last_tap_at?: string
          rewarded_taps?: number
          tap_count?: number
          user_id: string
        }
        Update: {
          date?: string
          last_tap_at?: string
          rewarded_taps?: number
          tap_count?: number
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
      trading_safeguards_config: {
        Row: {
          enabled: boolean
          id: number
          max_daily_loss: number
          max_margin_per_position: number
          oracle_max_age_seconds: number
          price_deviation_pct: number
          rl_close_per_min: number
          rl_liquidate_per_min: number
          rl_open_per_min: number
          rl_triggers_per_min: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: number
          max_daily_loss?: number
          max_margin_per_position?: number
          oracle_max_age_seconds?: number
          price_deviation_pct?: number
          rl_close_per_min?: number
          rl_liquidate_per_min?: number
          rl_open_per_min?: number
          rl_triggers_per_min?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: number
          max_daily_loss?: number
          max_margin_per_position?: number
          oracle_max_age_seconds?: number
          price_deviation_pct?: number
          rl_close_per_min?: number
          rl_liquidate_per_min?: number
          rl_open_per_min?: number
          rl_triggers_per_min?: number
          updated_at?: string
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
      ugc_redirect_clicks: {
        Row: {
          anon_id: string
          hit_count: number
          last_at: string
          slug: string
        }
        Insert: {
          anon_id: string
          hit_count?: number
          last_at?: string
          slug: string
        }
        Update: {
          anon_id?: string
          hit_count?: number
          last_at?: string
          slug?: string
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
      user_devices: {
        Row: {
          first_seen: string
          fp_hash: string
          id: string
          last_seen: string
          trusted: boolean
          ua: string | null
          user_id: string
        }
        Insert: {
          first_seen?: string
          fp_hash: string
          id?: string
          last_seen?: string
          trusted?: boolean
          ua?: string | null
          user_id: string
        }
        Update: {
          first_seen?: string
          fp_hash?: string
          id?: string
          last_seen?: string
          trusted?: boolean
          ua?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_escalation_progress: {
        Row: {
          id: string
          milestone_key: string
          reached_at: string
          user_id: string
          window_date: string | null
        }
        Insert: {
          id?: string
          milestone_key: string
          reached_at?: string
          user_id: string
          window_date?: string | null
        }
        Update: {
          id?: string
          milestone_key?: string
          reached_at?: string
          user_id?: string
          window_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_escalation_progress_milestone_key_fkey"
            columns: ["milestone_key"]
            isOneToOne: false
            referencedRelation: "escalation_milestones_catalog"
            referencedColumns: ["key"]
          },
        ]
      }
      user_feed_profile: {
        Row: {
          mode: string
          persona: string
          region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          mode?: string
          persona?: string
          region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          mode?: string
          persona?: string
          region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_legal_consents: {
        Row: {
          consented_at: string
          doc_key: string
          id: string
          ip_hash: string | null
          locale: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consented_at?: string
          doc_key: string
          id?: string
          ip_hash?: string | null
          locale?: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          consented_at?: string
          doc_key?: string
          id?: string
          ip_hash?: string | null
          locale?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          data: Json
          flow: string
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          data?: Json
          flow: string
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          data?: Json
          flow?: string
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
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
      user_risk_limits: {
        Row: {
          daily_loss_cap: number
          enabled: boolean
          max_leverage: number
          max_margin_per_trade: number
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_loss_cap?: number
          enabled?: boolean
          max_leverage?: number
          max_margin_per_trade?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_loss_cap?: number
          enabled?: boolean
          max_leverage?: number
          max_margin_per_trade?: number
          updated_at?: string
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
      viral_ai_circuit_state: {
        Row: {
          id: number
          last_evaluated_at: string
          opened_at: string | null
          reason: string | null
          state: string
        }
        Insert: {
          id?: number
          last_evaluated_at?: string
          opened_at?: string | null
          reason?: string | null
          state?: string
        }
        Update: {
          id?: number
          last_evaluated_at?: string
          opened_at?: string | null
          reason?: string | null
          state?: string
        }
        Relationships: []
      }
      viral_attribution_chain: {
        Row: {
          anon_id: string
          blocked_reason: string | null
          created_at: string
          depth: number
          id: string
          invitee_id: string | null
          inviter_id: string
          milestones_reached: Json
          status: string
          updated_at: string
          window_expires_at: string
        }
        Insert: {
          anon_id: string
          blocked_reason?: string | null
          created_at?: string
          depth?: number
          id?: string
          invitee_id?: string | null
          inviter_id: string
          milestones_reached?: Json
          status?: string
          updated_at?: string
          window_expires_at?: string
        }
        Update: {
          anon_id?: string
          blocked_reason?: string | null
          created_at?: string
          depth?: number
          id?: string
          invitee_id?: string | null
          inviter_id?: string
          milestones_reached?: Json
          status?: string
          updated_at?: string
          window_expires_at?: string
        }
        Relationships: []
      }
      viral_metrics: {
        Row: {
          completion_rate: number
          posted_at: string | null
          region: string | null
          share_rate: number
          updated_at: string
          video_id: string
          viral_score: number
          watch_3s_rate: number
        }
        Insert: {
          completion_rate?: number
          posted_at?: string | null
          region?: string | null
          share_rate?: number
          updated_at?: string
          video_id: string
          viral_score?: number
          watch_3s_rate?: number
        }
        Update: {
          completion_rate?: number
          posted_at?: string | null
          region?: string | null
          share_rate?: number
          updated_at?: string
          video_id?: string
          viral_score?: number
          watch_3s_rate?: number
        }
        Relationships: []
      }
      viral_mission_catalog: {
        Row: {
          active: boolean
          ai_seed: string | null
          asset_url: string | null
          cooldown_hours: number
          copy_template: string
          created_at: string
          daily_cap_per_user: number
          key: string
          lifetime_cap_per_invitee: number
          milestone_bonuses: Json
          platform: string
          proof_type: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          ai_seed?: string | null
          asset_url?: string | null
          cooldown_hours?: number
          copy_template: string
          created_at?: string
          daily_cap_per_user?: number
          key: string
          lifetime_cap_per_invitee?: number
          milestone_bonuses?: Json
          platform: string
          proof_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          ai_seed?: string | null
          asset_url?: string | null
          cooldown_hours?: number
          copy_template?: string
          created_at?: string
          daily_cap_per_user?: number
          key?: string
          lifetime_cap_per_invitee?: number
          milestone_bonuses?: Json
          platform?: string
          proof_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      viral_mission_submissions: {
        Row: {
          catalog_key: string
          chain_id: string | null
          clicks_attributed: number
          conversions_attributed: number
          created_at: string
          entitlement_status: string
          id: string
          metadata: Json
          milestones_paid: Json
          proof_hash: string | null
          proof_url: string | null
          settled_at: string | null
          status: string
          total_bonus_paid: number
          user_id: string
        }
        Insert: {
          catalog_key: string
          chain_id?: string | null
          clicks_attributed?: number
          conversions_attributed?: number
          created_at?: string
          entitlement_status?: string
          id?: string
          metadata?: Json
          milestones_paid?: Json
          proof_hash?: string | null
          proof_url?: string | null
          settled_at?: string | null
          status?: string
          total_bonus_paid?: number
          user_id: string
        }
        Update: {
          catalog_key?: string
          chain_id?: string | null
          clicks_attributed?: number
          conversions_attributed?: number
          created_at?: string
          entitlement_status?: string
          id?: string
          metadata?: Json
          milestones_paid?: Json
          proof_hash?: string | null
          proof_url?: string | null
          settled_at?: string | null
          status?: string
          total_bonus_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viral_mission_submissions_catalog_key_fkey"
            columns: ["catalog_key"]
            isOneToOne: false
            referencedRelation: "viral_mission_catalog"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "viral_mission_submissions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "viral_attribution_chain"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_proof_dedupe: {
        Row: {
          created_at: string
          platform: string
          proof_hash: string
          proof_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform: string
          proof_hash: string
          proof_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string
          proof_hash?: string
          proof_url?: string
          user_id?: string
        }
        Relationships: []
      }
      viral_settings: {
        Row: {
          id: number
          revenue_recognition_enabled: boolean
          rrm_disabled_reason: string | null
          rrm_last_toggled_at: string | null
          rrm_last_toggled_by: string | null
          rrm_no_retroactive_payout: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          revenue_recognition_enabled?: boolean
          rrm_disabled_reason?: string | null
          rrm_last_toggled_at?: string | null
          rrm_last_toggled_by?: string | null
          rrm_no_retroactive_payout?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          revenue_recognition_enabled?: boolean
          rrm_disabled_reason?: string | null
          rrm_last_toggled_at?: string | null
          rrm_last_toggled_by?: string | null
          rrm_no_retroactive_payout?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      viral_settlement_audit: {
        Row: {
          actor: string
          created_at: string
          details: Json
          event_type: string
          id: string
          submission_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          submission_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          submission_id?: string
        }
        Relationships: []
      }
      viral_settlement_audit_v2: {
        Row: {
          actor: string
          created_at: string
          details: Json
          event_type: string
          id: string
          submission_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          submission_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          submission_id?: string
        }
        Relationships: []
      }
      viral_settlement_audit_v2_2026_05: {
        Row: {
          actor: string
          created_at: string
          details: Json
          event_type: string
          id: string
          submission_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          submission_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          submission_id?: string
        }
        Relationships: []
      }
      viral_settlement_audit_v2_2026_06: {
        Row: {
          actor: string
          created_at: string
          details: Json
          event_type: string
          id: string
          submission_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          submission_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          submission_id?: string
        }
        Relationships: []
      }
      viral_settlement_log: {
        Row: {
          final_bonus_credit: number
          final_eligible: boolean
          first_settled_at: string
          submission_id: string
        }
        Insert: {
          final_bonus_credit: number
          final_eligible: boolean
          first_settled_at?: string
          submission_id: string
        }
        Update: {
          final_bonus_credit?: number
          final_eligible?: boolean
          first_settled_at?: string
          submission_id?: string
        }
        Relationships: []
      }
      viral_verification_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          signals_raw: Json
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          signals_raw: Json
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          signals_raw?: Json
          submission_id?: string | null
        }
        Relationships: []
      }
      viral_verification_log: {
        Row: {
          catalog_key_redacted: string | null
          created_at: string
          decided_by: string
          milestone: string | null
          risk_score: number
          signals_initial: Json
          submission_id: string
          user_id: string
          verification_status: string
        }
        Insert: {
          catalog_key_redacted?: string | null
          created_at?: string
          decided_by?: string
          milestone?: string | null
          risk_score: number
          signals_initial: Json
          submission_id: string
          user_id: string
          verification_status: string
        }
        Update: {
          catalog_key_redacted?: string | null
          created_at?: string
          decided_by?: string
          milestone?: string | null
          risk_score?: number
          signals_initial?: Json
          submission_id?: string
          user_id?: string
          verification_status?: string
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
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string | null
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
      withdraw_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          spent_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          spent_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          spent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_evidence_checklist: Json
          admin_id: string | null
          admin_review_memo: string | null
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
          priority: number
          process_by: string
          receipt_url: string | null
          rejected_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          tier_at_request: Database["public"]["Enums"]["user_tier"]
          tx_code: string
          user_id: string
        }
        Insert: {
          admin_evidence_checklist?: Json
          admin_id?: string | null
          admin_review_memo?: string | null
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
          priority?: number
          process_by: string
          receipt_url?: string | null
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          tier_at_request: Database["public"]["Enums"]["user_tier"]
          tx_code: string
          user_id: string
        }
        Update: {
          admin_evidence_checklist?: Json
          admin_id?: string | null
          admin_review_memo?: string | null
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
          priority?: number
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
      insurance_fund_24h: {
        Row: {
          contributed_24h: number | null
          events_24h: number | null
          paid_24h: number | null
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
      _accrue_jackpot_internal: {
        Args: { _deposit_amount: number; _user_id: string }
        Returns: number
      }
      _check_daily_operator_pnl: { Args: never; Returns: Json }
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
      _edge_internal_auth_header: { Args: never; Returns: Json }
      _grant_guild_crown: {
        Args: {
          _amount: number
          _dedupe_key: string
          _meta: Json
          _user_id: string
        }
        Returns: undefined
      }
      _period_key: { Args: { _period: string }; Returns: string }
      accrue_jackpot: { Args: { p_deposit_amount: number }; Returns: Json }
      acknowledge_anomaly: {
        Args: { _id: string; _note?: string }
        Returns: Json
      }
      admin_adjust_balance: {
        Args: { _delta: number; _reason: string; _target: string }
        Returns: Json
      }
      admin_cockpit_metrics: { Args: never; Returns: Json }
      admin_force_close_position:
        | {
            Args: {
              p_mark_price: number
              p_position_id: string
              p_reason?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cross_equity?: number
              p_mark_price: number
              p_position_id: string
              p_reason?: string
            }
            Returns: Json
          }
      admin_get_ab_stats: {
        Args: { _key: string }
        Returns: {
          assignments: number
          variant: string
        }[]
      }
      admin_get_ev_history: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          dedupe_key: string
          evidence: Json
          id: string
          severity: string
        }[]
      }
      admin_get_user_email: { Args: { _user_id: string }; Returns: string }
      admin_list_beta_invites: {
        Args: never
        Returns: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number
          note: string
          uses: number
        }[]
      }
      admin_operator_pnl: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
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
      admin_resolve_deposit:
        | {
            Args: { _action: string; _reason: string; _request_id: string }
            Returns: Json
          }
        | {
            Args: {
              _action: string
              _checklist?: Json
              _memo?: string
              _reason?: string
              _request_id: string
            }
            Returns: Json
          }
      admin_resolve_package:
        | {
            Args: { _action: string; _purchase_id: string; _reason?: string }
            Returns: Json
          }
        | {
            Args: {
              _action: string
              _checklist?: Json
              _memo?: string
              _purchase_id: string
              _reason?: string
            }
            Returns: Json
          }
      admin_resolve_withdrawal:
        | {
            Args: { _action: string; _reason: string; _request_id: string }
            Returns: Json
          }
        | {
            Args: {
              _action: string
              _checklist?: Json
              _memo?: string
              _reason?: string
              _request_id: string
            }
            Returns: Json
          }
      admin_run_ev_health_now: { Args: never; Returns: Json }
      admin_set_ab_active: {
        Args: { _active: boolean; _key: string }
        Returns: {
          experiment_key: string
          is_active: boolean
          updated_at: string
        }[]
      }
      admin_set_bot_strength: {
        Args: {
          _enabled: boolean
          _online_base?: number
          _online_jitter?: number
          _strength_pct: number
        }
        Returns: {
          auto_phase_enabled: boolean
          bot_ratio_phase: number
          daily_growth_max: number
          daily_growth_min: number
          dau_threshold_high: number
          dau_threshold_low: number
          enabled: boolean
          id: number
          online_base: number
          online_jitter: number
          strength_pct: number
          target_total_users: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bot_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_tier: {
        Args: {
          _target: string
          _tier: Database["public"]["Enums"]["user_tier"]
        }
        Returns: Json
      }
      admin_update_trailing_peak: {
        Args: { p_peak_roi_pct: number; p_position_id: string }
        Returns: undefined
      }
      admin_update_trailing_price_peak: {
        Args: { p_peak_price: number; p_position_id: string }
        Returns: undefined
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
      apply_booster_multipliers: {
        Args: { _base: number; _source: string; _user_id: string }
        Returns: number
      }
      apply_referral_code: { Args: { _code: string }; Returns: Json }
      arena_join_duel: { Args: { p_round_id: string }; Returns: Json }
      arena_open_round: {
        Args: {
          p_leverage: number
          p_margin: number
          p_mode: string
          p_side: string
          p_sl_pct: number
          p_symbol: string
          p_tp_pct: number
        }
        Returns: Json
      }
      arena_settle_round: {
        Args: { p_exit_pnl_pct: number; p_round_id: string }
        Returns: Json
      }
      assert_audit_sync: { Args: never; Returns: undefined }
      assert_trading_limits: { Args: { p_margin: number }; Returns: undefined }
      assert_trading_price: {
        Args: { p_price: number; p_symbol: string }
        Returns: undefined
      }
      assign_persona: { Args: never; Returns: string }
      auto_adjust_bot_strength: { Args: never; Returns: Json }
      auto_freeze_critical_anomalies: { Args: never; Returns: Json }
      award_crown: {
        Args: {
          _base: number
          _dedupe_key?: string
          _meta?: Json
          _type: string
        }
        Returns: Json
      }
      award_imperial_score: {
        Args: { _base: number; _meta?: Json; _source: string; _user_id: string }
        Returns: number
      }
      award_xp: { Args: { _amount: number; _source?: Json }; Returns: Json }
      bulk_acknowledge_anomalies: {
        Args: { _ids: string[]; _note?: string }
        Returns: number
      }
      bump_crown_replay_view: { Args: { _token: string }; Returns: undefined }
      bump_jackpot: { Args: { _amount: number }; Returns: Json }
      bump_quest_metric: {
        Args: { _delta?: number; _metric: string }
        Returns: undefined
      }
      cancel_pending_order: { Args: { p_order_id: string }; Returns: boolean }
      check_achievements: { Args: { _user_id?: string }; Returns: Json }
      check_daily_ev_health: { Args: never; Returns: Json }
      check_escalation: { Args: { _user_id: string }; Returns: number }
      check_permission_drift: { Args: never; Returns: Json }
      check_rls_integrity: { Args: never; Returns: Json }
      claim_ai_bot_run: { Args: { _run_id: string }; Returns: Json }
      claim_ai_mission: { Args: { _mission_id: string }; Returns: Json }
      claim_coin_first_win: { Args: never; Returns: Json }
      claim_daily_attendance: {
        Args: { user_id: string }
        Returns: {
          new_streak: number
          reward: number
        }[]
      }
      claim_founding_seat: { Args: { _purchase_id: string }; Returns: Json }
      claim_handbook_bonus: { Args: never; Returns: Json }
      claim_idle_growth: { Args: never; Returns: Json }
      claim_quest: { Args: { _quest_key: string }; Returns: Json }
      claim_season_reward: {
        Args: { _level: number; _track: string }
        Returns: Json
      }
      claim_weekly_pass_reward: { Args: { _level: number }; Returns: Json }
      cleanup_bot_activity: { Args: never; Returns: undefined }
      complete_guide_bonus: { Args: never; Returns: Json }
      contribute_guild_war: {
        Args: { _score: number; _war_id: string }
        Returns: boolean
      }
      create_crown_replay: { Args: { _event_id: string }; Returns: Json }
      create_guild: {
        Args: { _description?: string; _emblem?: string; _name: string }
        Returns: string
      }
      cron_run_finalize_weekly_pass: { Args: never; Returns: Json }
      cron_run_pay_weekly_leaderboard: { Args: never; Returns: Json }
      crown_war_award_direct: {
        Args: {
          _rank: number
          _score: number
          _user_id: string
          _war_id: number
        }
        Returns: Json
      }
      crown_war_ensure_active: {
        Args: never
        Returns: {
          created_at: string
          ends_at: string
          id: number
          settled_at: string | null
          started_at: string
          status: string
          top1_score: number | null
          top1_user_id: string | null
          top2_score: number | null
          top2_user_id: string | null
          top3_score: number | null
          top3_user_id: string | null
          total_participants: number
        }
        SetofOptions: {
          from: "*"
          to: "crown_wars"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_season_id: { Args: never; Returns: string }
      current_tos_version: { Args: never; Returns: string }
      declare_guild_war: {
        Args: { _defender_guild_id: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_guild: { Args: never; Returns: boolean }
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
      enforce_rate_limit: {
        Args: { _max_per_min: number; _scope: string }
        Returns: undefined
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
      enqueue_fomo_notification: {
        Args: {
          _cta_label?: string
          _cta_url?: string
          _dedupe_key?: string
          _kind: string
          _message: string
          _payload?: Json
          _priority?: number
          _title: string
          _ttl_hours?: number
          _user_id: string
        }
        Returns: string
      }
      ensure_settlement_audit_partition: {
        Args: { _when?: string }
        Returns: undefined
      }
      equip_badge: {
        Args: { _badge_key: string; _slot: number }
        Returns: Json
      }
      evolve_empire_unit: { Args: { _unit_id: string }; Returns: Json }
      fill_pending_order: {
        Args: { p_mark_price: number; p_order_id: string }
        Returns: string
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
      gc_rate_limit_buckets: { Args: never; Returns: number }
      gen_referral_code: { Args: never; Returns: string }
      gen_seed_activity: { Args: never; Returns: undefined }
      generate_beta_invite: {
        Args: {
          _expires_in_days?: number
          _max_uses?: number
          _note?: string
          _prefix?: string
        }
        Returns: Json
      }
      get_ab_variant: { Args: { p_experiment_key: string }; Returns: string }
      get_active_boost_count: { Args: never; Returns: number }
      get_active_empire_booster: {
        Args: never
        Returns: {
          crown_multiplier: number
          expires_at: string
          fee_discount: number
          granted_at: string
          id: number
          kind: string
          leverage: number
        }[]
      }
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
      get_beta_funnel_stats: { Args: never; Returns: Json }
      get_bot_feed: {
        Args: { _limit?: number }
        Returns: {
          avatar_emoji: string
          event_text: string
          event_type: string
          id: number
          nickname: string
          occurred_at: string
          reward_amount: number
        }[]
      }
      get_bot_live_ranking: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          nickname: string
          rank: number
          tier: string
        }[]
      }
      get_bot_mix_metrics: { Args: never; Returns: Json }
      get_bot_online_count: { Args: never; Returns: number }
      get_bot_total_users: { Args: never; Returns: number }
      get_cockpit_snapshot: { Args: never; Returns: Json }
      get_crown_war_snapshot: { Args: never; Returns: Json }
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
      get_guild_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          emblem: string
          guild_id: string
          member_count: number
          name: string
          rank: number
          total_power: number
        }[]
      }
      get_guild_rankings: {
        Args: { _week_start?: string }
        Returns: {
          badge: string
          emblem: string
          guild_id: string
          member_count: number
          name: string
          rank: number
          reward_pool: number
          total_contribution: number
        }[]
      }
      get_my_dashboard_state: { Args: never; Returns: Json }
      get_my_empire_map: { Args: never; Returns: Json }
      get_my_fomo_notifications: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          dedupe_key: string | null
          expires_at: string
          id: string
          kind: string
          message: string
          payload: Json
          priority: number
          read_at: string | null
          title: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "fomo_notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_legal_consent_status: { Args: never; Returns: Json }
      get_my_quests: { Args: never; Returns: Json }
      get_my_security_events: {
        Args: { _limit?: number }
        Returns: {
          acknowledged: boolean
          created_at: string
          evidence: Json
          id: string
          rule: string
          severity: string
        }[]
      }
      get_my_weekly_referral_rank: { Args: never; Returns: Json }
      get_next_empire_day: { Args: never; Returns: string }
      get_payout_ops_stats_24h: { Args: never; Returns: Json }
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
      get_public_crown_replay: { Args: { _token: string }; Returns: Json }
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
      get_recommended_missions: {
        Args: never
        Returns: {
          mission_id: string
          priority: number
        }[]
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
      get_whale_leaderboard: {
        Args: { _date?: string }
        Returns: {
          deposit_total_krw: number
          is_total: number
          nickname_masked: string
          rank: number
        }[]
      }
      get_whale_strike_funnel: { Args: never; Returns: Json }
      get_whale_strikes_24h: { Args: { _limit?: number }; Returns: Json }
      grant_recovery_bonus: {
        Args: { p_amount: number; p_source?: string }
        Returns: Json
      }
      harvest_machine: { Args: { _purchase_id: string }; Returns: Json }
      has_beta_access: { Args: never; Returns: boolean }
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
      is_guild_member: {
        Args: { _guild_id: string; _user_id: string }
        Returns: boolean
      }
      is_passkey_verified: { Args: never; Returns: boolean }
      issue_line_link_token: { Args: never; Returns: string }
      join_guild: { Args: { _guild_id: string }; Returns: boolean }
      jsonb_object_keys_count: { Args: { _obj: Json }; Returns: number }
      latest_chaos_run: { Args: never; Returns: Json }
      leave_guild: { Args: never; Returns: boolean }
      live_account_equity: { Args: { p_user_id: string }; Returns: Json }
      live_close_position: {
        Args: { p_mark_price: number; p_position_id: string }
        Returns: Json
      }
      live_get_history: {
        Args: { p_limit?: number }
        Returns: {
          close_price: number
          closed_at: string
          entry: number
          fee_close: number
          fee_open: number
          id: string
          leverage: number
          margin: number
          opened_at: string
          pnl: number
          reason: string
          roi: number
          side: string
          size: number
          symbol: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_trade_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      live_get_open_positions: {
        Args: never
        Returns: {
          allocated_margin: number | null
          entry: number
          fee_open: number
          id: string
          leverage: number
          liq_price: number
          margin: number
          margin_mode: string
          opened_at: string
          side: string
          size: number
          sl_pct: number | null
          sl_price: number | null
          status: string
          symbol: string
          tp_pct: number | null
          tp_price: number | null
          trailing_active: boolean
          trailing_offset: number | null
          trailing_pct: number | null
          trailing_peak: number | null
          trailing_peak_roi_pct: number | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_positions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      live_liquidate_position: {
        Args: { p_mark_price: number; p_position_id: string }
        Returns: Json
      }
      live_open_position: {
        Args: {
          p_allocated_margin?: number
          p_leverage: number
          p_margin: number
          p_margin_mode?: string
          p_mark_price: number
          p_side: string
          p_sl_pct?: number
          p_sl_price?: number
          p_symbol: string
          p_tp_pct?: number
          p_tp_price?: number
          p_trailing_offset?: number
          p_trailing_pct?: number
        }
        Returns: string
      }
      live_set_position_triggers: {
        Args: {
          p_position_id: string
          p_sl_pct: number
          p_sl_price?: number
          p_tp_pct: number
          p_tp_price?: number
          p_trailing_offset?: number
          p_trailing_pct: number
        }
        Returns: undefined
      }
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
      mark_fomo_notification_read: { Args: { _id: string }; Returns: boolean }
      mark_handbook_step: { Args: { _step: string }; Returns: Json }
      mask_nickname: { Args: { _nick: string }; Returns: string }
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
      pin_lockout_status: { Args: { _user?: string }; Returns: Json }
      pin_record_attempt: { Args: { _success: boolean }; Returns: Json }
      policy_assertions_status: { Args: never; Returns: Json }
      progress_daily_combo: { Args: { _step: string }; Returns: Json }
      public_live_pulse: { Args: never; Returns: Json }
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
      public_withdrawal_sla: { Args: never; Returns: Json }
      purchase_season_pass: { Args: never; Returns: Json }
      rank_feed_for_user: {
        Args: { _limit?: number }
        Returns: {
          mode: string
          score: number
          served_at: string
          video_id: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_daily_whale_leaderboard: { Args: never; Returns: undefined }
      recompute_empire_level: { Args: { _user_id: string }; Returns: number }
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
      record_crown_replay_share: {
        Args: { _channel: string; _token: string }
        Returns: undefined
      }
      record_empire_battle: {
        Args: { _mode?: string; _pnl: number; _result: string; _side: string }
        Returns: Json
      }
      record_feed_event: {
        Args: {
          _dwell_ms?: number
          _event: string
          _region?: string
          _video_id: string
        }
        Returns: number
      }
      record_legal_consent: {
        Args: { _doc_keys: string[]; _user_agent?: string }
        Returns: Json
      }
      record_paper_trade_outcome: {
        Args: {
          p_is_win: boolean
          p_pnl: number
          p_side: string
          p_symbol: string
        }
        Returns: Json
      }
      record_recovery_eligibility: {
        Args: {
          p_liquidation_amount: number
          p_source?: string
          p_user_id: string
          p_window_hours?: number
        }
        Returns: string
      }
      record_request_status: {
        Args: {
          _actor: string
          _actor_role: string
          _evidence: Json
          _from: string
          _kind: string
          _memo: string
          _request_id: string
          _to: string
          _user_id: string
        }
        Returns: undefined
      }
      record_revenue_event: {
        Args: {
          _amount_krw: number
          _attribution_referrer?: string
          _attribution_video_id?: string
          _meta?: Json
          _source: string
          _user_id: string
        }
        Returns: number
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
      redeem_beta_invite: { Args: { _code: string }; Returns: Json }
      redeem_real_coupon: { Args: { _code: string }; Returns: Json }
      redetect_anomaly: { Args: { _id: string }; Returns: Json }
      register_device: { Args: { _fp: string; _ua?: string }; Returns: Json }
      request_withdraw_otp: { Args: never; Returns: Json }
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
      resolve_support_thread: {
        Args: { _note?: string; _thread_id: string }
        Returns: undefined
      }
      roulette_daily_limit: {
        Args: { _tier: Database["public"]["Enums"]["user_tier"] }
        Returns: number
      }
      rule_verify_submission: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      run_policy_assertions: { Args: never; Returns: Json }
      run_security_self_audit: { Args: { _source?: string }; Returns: Json }
      run_uptime_canary: { Args: never; Returns: undefined }
      search_support_kb: {
        Args: { _limit?: number; _query: string }
        Returns: {
          category: string
          content: string
          id: string
          score: number
          title: string
        }[]
      }
      send_guild_message: { Args: { _message: string }; Returns: string }
      set_user_risk_limits: {
        Args: {
          p_daily_loss_cap: number
          p_enabled?: boolean
          p_max_leverage: number
          p_max_margin_per_trade: number
        }
        Returns: {
          daily_loss_cap: number
          enabled: boolean
          max_leverage: number
          max_margin_per_trade: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_risk_limits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_crown_war: { Args: never; Returns: Json }
      settle_guild_weekly: { Args: { _target_week?: string }; Returns: Json }
      settle_jackpot: {
        Args: { p_nickname?: string; p_winner_id: string }
        Returns: Json
      }
      settle_mission: {
        Args: { _base_reward: number; _is_win: boolean; _mission_id: string }
        Returns: Json
      }
      settle_package_daily: { Args: never; Returns: Json }
      settle_viral_milestone: {
        Args: {
          _catalog_key: string
          _chain_id: string
          _milestone_key: string
        }
        Returns: Json
      }
      settlement_slo: { Args: never; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
      start_or_extend_booster: {
        Args: { _hours?: number; _purchase_id: string; _user_id: string }
        Returns: string
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
      tap_reinforce: { Args: { _nonce: string }; Returns: Json }
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
      toggle_rrm: {
        Args: { _enabled: boolean; _reason: string }
        Returns: Json
      }
      track_campaign_click: {
        Args: { _anon_id?: string; _slug: string }
        Returns: string
      }
      transition_ai_circuit: {
        Args: { _meta?: Json; _new_state: string; _reason: string }
        Returns: {
          id: number
          last_evaluated_at: string
          opened_at: string | null
          reason: string | null
          state: string
        }
        SetofOptions: {
          from: "*"
          to: "viral_ai_circuit_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trust_record_snapshot: { Args: never; Returns: string }
      unfreeze_expired: { Args: never; Returns: Json }
      unlock_achievement: { Args: { _key: string }; Returns: Json }
      update_bot_ratio_phase: { Args: never; Returns: undefined }
      validate_deposit_input: {
        Args: {
          _bank_account?: string
          _coin_address?: string
          _coin_network?: string
          _method: string
          _voucher_brand?: string
          _voucher_pin?: string
        }
        Returns: Json
      }
      validate_profile_input: {
        Args: { _birth_date: string; _phone: string; _real_name: string }
        Returns: Json
      }
      verify_weekly_pass_finalize: {
        Args: { _iso_week?: string }
        Returns: Json
      }
      verify_withdraw_otp: { Args: { _code: string }; Returns: Json }
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
        | "trade_open"
        | "trade_fee"
        | "trade_close_win"
        | "trade_close_loss"
        | "trade_liquidation"
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
        "trade_open",
        "trade_fee",
        "trade_close_win",
        "trade_close_loss",
        "trade_liquidation",
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
