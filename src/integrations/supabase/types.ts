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
      ab_events: {
        Row: {
          created_at: string
          event: string
          experiment_key: string
          id: string
          metadata: Json
          user_id: string | null
          value: number | null
          variant: string
        }
        Insert: {
          created_at?: string
          event: string
          experiment_key: string
          id?: string
          metadata?: Json
          user_id?: string | null
          value?: number | null
          variant: string
        }
        Update: {
          created_at?: string
          event?: string
          experiment_key?: string
          id?: string
          metadata?: Json
          user_id?: string | null
          value?: number | null
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
          payload: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json
          payload?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          payload?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_broadcasts: {
        Row: {
          audience: Json
          body: string
          channel: string
          created_at: string
          created_by: string
          id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          title: string
        }
        Insert: {
          audience?: Json
          body: string
          channel: string
          created_at?: string
          created_by: string
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          title: string
        }
        Update: {
          audience?: Json
          body?: string
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      admin_recovery_requests: {
        Row: {
          approvals: Json
          created_at: string
          id: string
          reason: string
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          approvals?: Json
          created_at?: string
          id?: string
          reason: string
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          approvals?: Json
          created_at?: string
          id?: string
          reason?: string
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
      api_keys: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          rate_limit_per_min: number
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          rate_limit_per_min?: number
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      api_usage_counters: {
        Row: {
          count: number
          id: number
          key_id: string
          minute_bucket: string
        }
        Insert: {
          count?: number
          id?: number
          key_id: string
          minute_bucket: string
        }
        Update: {
          count?: number
          id?: number
          key_id?: string
          minute_bucket?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_counters_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
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
      atelier_config: {
        Row: {
          cost_bronze_to_gold: number
          cost_gold_to_diamond: number
          daily_limit_per_user: number
          enabled: boolean
          fail_pct: number
          fail_phon_refund_pct: number
          id: number
          jackpot_boost_bonus: number
          jackpot_pct: number
          success_pct: number
          updated_at: string
        }
        Insert: {
          cost_bronze_to_gold?: number
          cost_gold_to_diamond?: number
          daily_limit_per_user?: number
          enabled?: boolean
          fail_pct?: number
          fail_phon_refund_pct?: number
          id?: number
          jackpot_boost_bonus?: number
          jackpot_pct?: number
          success_pct?: number
          updated_at?: string
        }
        Update: {
          cost_bronze_to_gold?: number
          cost_gold_to_diamond?: number
          daily_limit_per_user?: number
          enabled?: boolean
          fail_pct?: number
          fail_phon_refund_pct?: number
          id?: number
          jackpot_boost_bonus?: number
          jackpot_pct?: number
          success_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      atelier_runs: {
        Row: {
          boost_pct: number | null
          cost_phon: number
          created_at: string
          id: string
          outcome: string
          refund_nft_id: string | null
          refund_phon: number
          result_nft_id: string | null
          server_seed_hash: string
          source_ids: string[]
          src_level: string
          src_type: string
          user_id: string
        }
        Insert: {
          boost_pct?: number | null
          cost_phon: number
          created_at?: string
          id?: string
          outcome: string
          refund_nft_id?: string | null
          refund_phon?: number
          result_nft_id?: string | null
          server_seed_hash: string
          source_ids: string[]
          src_level: string
          src_type: string
          user_id: string
        }
        Update: {
          boost_pct?: number | null
          cost_phon?: number
          created_at?: string
          id?: string
          outcome?: string
          refund_nft_id?: string | null
          refund_phon?: number
          result_nft_id?: string | null
          server_seed_hash?: string
          source_ids?: string[]
          src_level?: string
          src_type?: string
          user_id?: string
        }
        Relationships: []
      }
      auto_rule_decisions: {
        Row: {
          actual_action: string | null
          created_at: string
          deposit_id: string | null
          id: string
          matched: boolean | null
          payload: Json | null
          resolved_at: string | null
          rule_id: string | null
          rule_name: string
          suggested_action: string
          user_id: string | null
        }
        Insert: {
          actual_action?: string | null
          created_at?: string
          deposit_id?: string | null
          id?: string
          matched?: boolean | null
          payload?: Json | null
          resolved_at?: string | null
          rule_id?: string | null
          rule_name: string
          suggested_action: string
          user_id?: string | null
        }
        Update: {
          actual_action?: string | null
          created_at?: string
          deposit_id?: string | null
          id?: string
          matched?: boolean | null
          payload?: Json | null
          resolved_at?: string | null
          rule_id?: string | null
          rule_name?: string
          suggested_action?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_rule_decisions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "deposit_auto_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_catalog: {
        Row: {
          active: boolean
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          limited_edition_cap: number | null
          name: string
          nft_source: string | null
          price_phon: number
          rarity: string
          slug: string
          sold_count: number
          vip_min_tier: string | null
          wearable_bonus: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          limited_edition_cap?: number | null
          name: string
          nft_source?: string | null
          price_phon?: number
          rarity: string
          slug: string
          sold_count?: number
          vip_min_tier?: string | null
          wearable_bonus?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          limited_edition_cap?: number | null
          name?: string
          nft_source?: string | null
          price_phon?: number
          rarity?: string
          slug?: string
          sold_count?: number
          vip_min_tier?: string | null
          wearable_bonus?: Json
        }
        Relationships: [
          {
            foreignKeyName: "avatar_catalog_vip_min_tier_fkey"
            columns: ["vip_min_tier"]
            isOneToOne: false
            referencedRelation: "vip_tier_config"
            referencedColumns: ["tier"]
          },
        ]
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
      bequest_requests: {
        Row: {
          asset_kind: string
          cancelled_at: string | null
          child_id: string
          cooldown_until: string
          created_at: string
          executed_at: string | null
          id: string
          link_id: string
          nft_id: string | null
          notes: string | null
          parent_id: string
          phon_amount: number | null
          status: string
        }
        Insert: {
          asset_kind: string
          cancelled_at?: string | null
          child_id: string
          cooldown_until: string
          created_at?: string
          executed_at?: string | null
          id?: string
          link_id: string
          nft_id?: string | null
          notes?: string | null
          parent_id: string
          phon_amount?: number | null
          status?: string
        }
        Update: {
          asset_kind?: string
          cancelled_at?: string | null
          child_id?: string
          cooldown_until?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          link_id?: string
          nft_id?: string | null
          notes?: string | null
          parent_id?: string
          phon_amount?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bequest_requests_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "dynasty_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bequest_requests_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nft_collection"
            referencedColumns: ["id"]
          },
        ]
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
      bot_feed_events: {
        Row: {
          bot_id: string | null
          id: string
          kind: string | null
          occurred_at: string
        }
        Insert: {
          bot_id?: string | null
          id?: string
          kind?: string | null
          occurred_at?: string
        }
        Update: {
          bot_id?: string | null
          id?: string
          kind?: string | null
          occurred_at?: string
        }
        Relationships: []
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
      cash_loop_sessions: {
        Row: {
          completed_at: string | null
          converted_at: string | null
          created_at: string
          id: string
          is_simulated: boolean
          phase: string
          session_token: string
          sim_balance: number
          sim_pnl: number
          started_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          phase?: string
          session_token: string
          sim_balance?: number
          sim_pnl?: number
          started_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          is_simulated?: boolean
          phase?: string
          session_token?: string
          sim_balance?: number
          sim_pnl?: number
          started_at?: string
          updated_at?: string
          user_id?: string | null
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
      competitor_benchmarks: {
        Row: {
          active: boolean
          competitor: string
          id: string
          metric_key: string
          metric_value: number
          source_label: string | null
          source_url: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          competitor: string
          id?: string
          metric_key: string
          metric_value: number
          source_label?: string | null
          source_url: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          competitor?: string
          id?: string
          metric_key?: string
          metric_value?: number
          source_label?: string | null
          source_url?: string
          unit?: string | null
          updated_at?: string
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
      crypto_deposit_intents: {
        Row: {
          asset: string
          created_at: string
          expires_at: string
          id: string
          matched_at: string | null
          matched_from_addr: string | null
          matched_tx_hash: string | null
          network: string
          receive_address: string
          requested_amount: number
          status: string
          unique_amount: number
          user_id: string
        }
        Insert: {
          asset?: string
          created_at?: string
          expires_at: string
          id?: string
          matched_at?: string | null
          matched_from_addr?: string | null
          matched_tx_hash?: string | null
          network?: string
          receive_address: string
          requested_amount: number
          status?: string
          unique_amount: number
          user_id: string
        }
        Update: {
          asset?: string
          created_at?: string
          expires_at?: string
          id?: string
          matched_at?: string | null
          matched_from_addr?: string | null
          matched_tx_hash?: string | null
          network?: string
          receive_address?: string
          requested_amount?: number
          status?: string
          unique_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_briefings: {
        Row: {
          briefing_date: string
          cards: Json
          context: Json
          generated_at: string
          id: number
          model: string | null
          refreshed_count: number
          user_id: string
        }
        Insert: {
          briefing_date: string
          cards?: Json
          context?: Json
          generated_at?: string
          id?: number
          model?: string | null
          refreshed_count?: number
          user_id: string
        }
        Update: {
          briefing_date?: string
          cards?: Json
          context?: Json
          generated_at?: string
          id?: number
          model?: string | null
          refreshed_count?: number
          user_id?: string
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
      daily_headlines: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          locale: string
          source_stats: Json | null
          text: string
          tone: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          locale?: string
          source_stats?: Json | null
          text: string
          tone?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          locale?: string
          source_stats?: Json | null
          text?: string
          tone?: string
        }
        Relationships: []
      }
      daily_quick_claims: {
        Row: {
          amount: number
          created_at: string
          day: string
          id: number
          kind: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          day?: string
          id?: number
          kind: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day?: string
          id?: number
          kind?: string
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
      deposit_auto_rules: {
        Row: {
          action: string
          amount_max: number | null
          amount_min: number | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          method: string | null
          min_prior_approved: number | null
          name: string
          priority: number
          risk_score_max: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action: string
          amount_max?: number | null
          amount_min?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          method?: string | null
          min_prior_approved?: number | null
          name: string
          priority?: number
          risk_score_max?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          amount_max?: number | null
          amount_min?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          method?: string | null
          min_prior_approved?: number | null
          name?: string
          priority?: number
          risk_score_max?: number | null
          updated_at?: string
          updated_by?: string | null
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
      dynasty_links: {
        Row: {
          accepted_at: string | null
          child_email: string
          child_id: string | null
          created_at: string
          id: string
          invite_token: string
          parent_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          child_email: string
          child_id?: string | null
          created_at?: string
          id?: string
          invite_token: string
          parent_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          child_email?: string
          child_id?: string | null
          created_at?: string
          id?: string
          invite_token?: string
          parent_id?: string
          revoked_at?: string | null
          status?: string
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
      emperor_dividend_log: {
        Row: {
          dedupe_key: string | null
          dividend_phon: number
          emperor_nickname: string | null
          emperor_user_id: string | null
          id: number
          paid_at: string
          pool_snapshot: number
        }
        Insert: {
          dedupe_key?: string | null
          dividend_phon: number
          emperor_nickname?: string | null
          emperor_user_id?: string | null
          id?: number
          paid_at?: string
          pool_snapshot: number
        }
        Update: {
          dedupe_key?: string | null
          dividend_phon?: number
          emperor_nickname?: string | null
          emperor_user_id?: string | null
          id?: number
          paid_at?: string
          pool_snapshot?: number
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
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
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
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
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
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
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
      first_deposit_godmode: {
        Row: {
          bonus_krw: number
          claimed_at: string
          created_at: string
          deposit_amount_krw: number
          founding_avatar_tier: number
          id: string
          loss_protection_until: string
          meta: Json
          phon_credited: number
          user_id: string
        }
        Insert: {
          bonus_krw: number
          claimed_at?: string
          created_at?: string
          deposit_amount_krw: number
          founding_avatar_tier?: number
          id?: string
          loss_protection_until: string
          meta?: Json
          phon_credited?: number
          user_id: string
        }
        Update: {
          bonus_krw?: number
          claimed_at?: string
          created_at?: string
          deposit_amount_krw?: number
          founding_avatar_tier?: number
          id?: string
          loss_protection_until?: string
          meta?: Json
          phon_credited?: number
          user_id?: string
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
      founding_season_seats: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          display_label: string | null
          id: string
          season_id: string
          seat_no: number
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          display_label?: string | null
          id?: string
          season_id: string
          seat_no: number
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          display_label?: string | null
          id?: string
          season_id?: string
          seat_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "founding_season_seats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "founding_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_seasons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          ends_at: string | null
          id: string
          perks: Json
          settled_at: string | null
          starts_at: string
          subtitle: string | null
          title: string
          total_seats: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          perks?: Json
          settled_at?: string | null
          starts_at?: string
          subtitle?: string | null
          title: string
          total_seats: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          perks?: Json
          settled_at?: string | null
          starts_at?: string
          subtitle?: string | null
          title?: string
          total_seats?: number
        }
        Relationships: []
      }
      founding_seat_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          note: string | null
          payload: Json
          season_id: string
          seat_no: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          payload?: Json
          season_id: string
          seat_no?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          payload?: Json
          season_id?: string
          seat_no?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founding_seat_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "founding_seasons"
            referencedColumns: ["id"]
          },
        ]
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
      galaxy_bid_history: {
        Row: {
          bid_phon: number
          bidder_user_id: string
          created_at: string
          id: number
          prev_holder: string | null
          refund_phon: number
          seat_no: number
        }
        Insert: {
          bid_phon: number
          bidder_user_id: string
          created_at?: string
          id?: number
          prev_holder?: string | null
          refund_phon?: number
          seat_no: number
        }
        Update: {
          bid_phon?: number
          bidder_user_id?: string
          created_at?: string
          id?: number
          prev_holder?: string | null
          refund_phon?: number
          seat_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "galaxy_bid_history_seat_no_fkey"
            columns: ["seat_no"]
            isOneToOne: false
            referencedRelation: "galaxy_seats"
            referencedColumns: ["seat_no"]
          },
        ]
      }
      galaxy_seats: {
        Row: {
          bid_count: number
          booster_expires_at: string | null
          current_bid: number
          holder_nickname: string | null
          holder_user_id: string | null
          last_bid_at: string | null
          seat_no: number
          updated_at: string
        }
        Insert: {
          bid_count?: number
          booster_expires_at?: string | null
          current_bid?: number
          holder_nickname?: string | null
          holder_user_id?: string | null
          last_bid_at?: string | null
          seat_no: number
          updated_at?: string
        }
        Update: {
          bid_count?: number
          booster_expires_at?: string | null
          current_bid?: number
          holder_nickname?: string | null
          holder_user_id?: string | null
          last_bid_at?: string | null
          seat_no?: number
          updated_at?: string
        }
        Relationships: []
      }
      game_config: {
        Row: {
          crown_particle_intensity: number
          demo_bias: Json
          id: number
          nearmiss_prob: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          crown_particle_intensity?: number
          demo_bias?: Json
          id?: number
          nearmiss_prob?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          crown_particle_intensity?: number
          demo_bias?: Json
          id?: number
          nearmiss_prob?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ghost_moments: {
        Row: {
          amount: number | null
          created_at: string
          expires_at: string
          id: string
          is_simulated: boolean
          kind: string
          message: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          is_simulated?: boolean
          kind?: string
          message: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          is_simulated?: boolean
          kind?: string
          message?: string
        }
        Relationships: []
      }
      ghost_pulse_state: {
        Row: {
          active_now: number
          id: number
          last_moment_at: string | null
          last_whale_at: string | null
          live_users: number
          region_pulses: Json
          today_withdrawals: number
          updated_at: string
        }
        Insert: {
          active_now?: number
          id?: number
          last_moment_at?: string | null
          last_whale_at?: string | null
          live_users?: number
          region_pulses?: Json
          today_withdrawals?: number
          updated_at?: string
        }
        Update: {
          active_now?: number
          id?: number
          last_moment_at?: string | null
          last_whale_at?: string | null
          live_users?: number
          region_pulses?: Json
          today_withdrawals?: number
          updated_at?: string
        }
        Relationships: []
      }
      ghost_strikes: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          is_simulated: boolean
          kind: string
          label: string
          nick: string
          region: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_simulated?: boolean
          kind: string
          label?: string
          nick?: string
          region?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_simulated?: boolean
          kind?: string
          label?: string
          nick?: string
          region?: string | null
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
      imperial_journey_claims: {
        Row: {
          claimed_at: string
          id: number
          reward_crown: number
          reward_phon: number
          stage_no: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: number
          reward_crown: number
          reward_phon: number
          stage_no: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: number
          reward_crown?: number
          reward_phon?: number
          stage_no?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imperial_journey_claims_stage_no_fkey"
            columns: ["stage_no"]
            isOneToOne: false
            referencedRelation: "imperial_journey_stages"
            referencedColumns: ["stage_no"]
          },
        ]
      }
      imperial_journey_stages: {
        Row: {
          act_id: number
          description: string | null
          requirement_kind: string
          requirement_value: number
          reward_crown: number
          reward_phon: number
          stage_no: number
          title: string
        }
        Insert: {
          act_id: number
          description?: string | null
          requirement_kind: string
          requirement_value: number
          reward_crown?: number
          reward_phon?: number
          stage_no: number
          title: string
        }
        Update: {
          act_id?: number
          description?: string | null
          requirement_kind?: string
          requirement_value?: number
          reward_crown?: number
          reward_phon?: number
          stage_no?: number
          title?: string
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
      imperial_stories: {
        Row: {
          created_at: string
          dedupe_key: string | null
          expires_at: string
          headline: string
          hero_nickname: string | null
          hero_user_id: string | null
          id: number
          kind: string
          payload: Json
          pin_until: string | null
          subline: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          expires_at?: string
          headline: string
          hero_nickname?: string | null
          hero_user_id?: string | null
          id?: number
          kind: string
          payload?: Json
          pin_until?: string | null
          subline?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          expires_at?: string
          headline?: string
          hero_nickname?: string | null
          hero_user_id?: string | null
          id?: number
          kind?: string
          payload?: Json
          pin_until?: string | null
          subline?: string | null
        }
        Relationships: []
      }
      inbound_press_hits: {
        Row: {
          domain: string
          first_seen_at: string
          hit_count: number
          id: string
          last_seen_at: string
          reviewed: boolean
          sample_referrer: string | null
        }
        Insert: {
          domain: string
          first_seen_at?: string
          hit_count?: number
          id?: string
          last_seen_at?: string
          reviewed?: boolean
          sample_referrer?: string | null
        }
        Update: {
          domain?: string
          first_seen_at?: string
          hit_count?: number
          id?: string
          last_seen_at?: string
          reviewed?: boolean
          sample_referrer?: string | null
        }
        Relationships: []
      }
      influencer_clicks: {
        Row: {
          code: string
          created_at: string
          fingerprint: string | null
          id: number
          referrer: string | null
          ua: string | null
        }
        Insert: {
          code: string
          created_at?: string
          fingerprint?: string | null
          id?: number
          referrer?: string | null
          ua?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          fingerprint?: string | null
          id?: number
          referrer?: string | null
          ua?: string | null
        }
        Relationships: []
      }
      influencer_codes: {
        Row: {
          active: boolean
          bonus_crown: number
          bonus_phon: number
          channel: string | null
          clicks_count: number
          code: string
          created_at: string
          deposits_count: number
          deposits_total_phon: number
          display_name: string
          owner_user_id: string | null
          signups_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bonus_crown?: number
          bonus_phon?: number
          channel?: string | null
          clicks_count?: number
          code: string
          created_at?: string
          deposits_count?: number
          deposits_total_phon?: number
          display_name: string
          owner_user_id?: string | null
          signups_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bonus_crown?: number
          bonus_phon?: number
          channel?: string | null
          clicks_count?: number
          code?: string
          created_at?: string
          deposits_count?: number
          deposits_total_phon?: number
          display_name?: string
          owner_user_id?: string | null
          signups_count?: number
          updated_at?: string
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
      live_position_idempotency: {
        Row: {
          client_request_id: string
          completed_at: string | null
          created_at: string
          error_code: string | null
          lease_owner: string
          lease_until: string
          params_hash: string
          result: Json | null
          status: Database["public"]["Enums"]["live_idem_status"]
          user_id: string
        }
        Insert: {
          client_request_id: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          lease_owner: string
          lease_until: string
          params_hash: string
          result?: Json | null
          status?: Database["public"]["Enums"]["live_idem_status"]
          user_id: string
        }
        Update: {
          client_request_id?: string
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          lease_owner?: string
          lease_until?: string
          params_hash?: string
          result?: Json | null
          status?: Database["public"]["Enums"]["live_idem_status"]
          user_id?: string
        }
        Relationships: []
      }
      live_position_open_audit: {
        Row: {
          client_request_id: string | null
          created_at: string
          entry_price: number | null
          error_code: string | null
          id: string
          lease_owner: string | null
          oracle_snapshot: Json | null
          outcome: string
          position_id: string | null
          request_meta: Json | null
          user_id: string
        }
        Insert: {
          client_request_id?: string | null
          created_at?: string
          entry_price?: number | null
          error_code?: string | null
          id?: string
          lease_owner?: string | null
          oracle_snapshot?: Json | null
          outcome: string
          position_id?: string | null
          request_meta?: Json | null
          user_id: string
        }
        Update: {
          client_request_id?: string | null
          created_at?: string
          entry_price?: number | null
          error_code?: string | null
          id?: string
          lease_owner?: string | null
          oracle_snapshot?: Json | null
          outcome?: string
          position_id?: string | null
          request_meta?: Json | null
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
      loss_protection_claims: {
        Row: {
          created_at: string
          deposit_amount_krw: number
          godmode_id: string
          id: string
          meta: Json
          net_loss_krw: number
          refunded_phon: number
          remaining_phon_at_claim: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deposit_amount_krw: number
          godmode_id: string
          id?: string
          meta?: Json
          net_loss_krw: number
          refunded_phon: number
          remaining_phon_at_claim: number
          user_id: string
        }
        Update: {
          created_at?: string
          deposit_amount_krw?: number
          godmode_id?: string
          id?: string
          meta?: Json
          net_loss_krw?: number
          refunded_phon?: number
          remaining_phon_at_claim?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loss_protection_claims_godmode_id_fkey"
            columns: ["godmode_id"]
            isOneToOne: false
            referencedRelation: "first_deposit_godmode"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget_krw: number
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
          payload: Json
          status: string
          updated_at: string
        }
        Insert: {
          budget_krw?: number
          created_at?: string
          created_by: string
          id?: string
          kind: string
          name: string
          payload?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          budget_krw?: number
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string
          payload?: Json
          status?: string
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
      nft_collection: {
        Row: {
          bequeathed_from: string | null
          boost_pct: number
          created_at: string
          external_chain: string | null
          external_image_url: string | null
          external_metadata_url: string | null
          external_token_id: string | null
          id: string
          level: string
          locked_for_migration: boolean
          source: string
          source_ref: string
          type: string
          user_id: string
        }
        Insert: {
          bequeathed_from?: string | null
          boost_pct?: number
          created_at?: string
          external_chain?: string | null
          external_image_url?: string | null
          external_metadata_url?: string | null
          external_token_id?: string | null
          id?: string
          level: string
          locked_for_migration?: boolean
          source: string
          source_ref?: string
          type: string
          user_id: string
        }
        Update: {
          bequeathed_from?: string | null
          boost_pct?: number
          created_at?: string
          external_chain?: string | null
          external_image_url?: string | null
          external_metadata_url?: string | null
          external_token_id?: string | null
          id?: string
          level?: string
          locked_for_migration?: boolean
          source?: string
          source_ref?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nft_listings: {
        Row: {
          closed_at: string | null
          ends_at: string | null
          id: string
          kind: string
          listed_at: string
          nft_id: string
          price_phon: number
          seller_id: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          listed_at?: string
          nft_id: string
          price_phon: number
          seller_id: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          listed_at?: string
          nft_id?: string
          price_phon?: number
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_listings_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nft_collection"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_trades: {
        Row: {
          burn_phon: number
          buyer_id: string
          created_at: string
          fee_phon: number
          id: string
          listing_id: string
          net_to_seller: number
          nft_id: string
          pool_phon: number
          price_phon: number
          seller_id: string
        }
        Insert: {
          burn_phon: number
          buyer_id: string
          created_at?: string
          fee_phon: number
          id?: string
          listing_id: string
          net_to_seller: number
          nft_id: string
          pool_phon: number
          price_phon: number
          seller_id: string
        }
        Update: {
          burn_phon?: number
          buyer_id?: string
          created_at?: string
          fee_phon?: number
          id?: string
          listing_id?: string
          net_to_seller?: number
          nft_id?: string
          pool_phon?: number
          price_phon?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_trades_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "nft_listings"
            referencedColumns: ["id"]
          },
        ]
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
          divergence_bps: number | null
          last_price: number
          participating_sources: string[] | null
          quorum_count: number
          shadow_clamp_active: boolean
          shadow_consensus: number | null
          shadow_quorum: number | null
          shadow_updated_at: string | null
          source: string
          symbol: string
          updated_at: string
        }
        Insert: {
          divergence_bps?: number | null
          last_price: number
          participating_sources?: string[] | null
          quorum_count?: number
          shadow_clamp_active?: boolean
          shadow_consensus?: number | null
          shadow_quorum?: number | null
          shadow_updated_at?: string | null
          source?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          divergence_bps?: number | null
          last_price?: number
          participating_sources?: string[] | null
          quorum_count?: number
          shadow_clamp_active?: boolean
          shadow_consensus?: number | null
          shadow_quorum?: number | null
          shadow_updated_at?: string | null
          source?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      oracle_prices_raw: {
        Row: {
          last_price: number
          source: string
          symbol: string
          updated_at: string
        }
        Insert: {
          last_price: number
          source: string
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
      oracle_shadow_drift: {
        Row: {
          clamp_active: boolean
          drift_bps: number
          id: number
          live_price: number
          quorum: number
          shadow_price: number
          symbol: string
          ts: string
        }
        Insert: {
          clamp_active?: boolean
          drift_bps: number
          id?: number
          live_price: number
          quorum: number
          shadow_price: number
          symbol: string
          ts?: string
        }
        Update: {
          clamp_active?: boolean
          drift_bps?: number
          id?: number
          live_price?: number
          quorum?: number
          shadow_price?: number
          symbol?: string
          ts?: string
        }
        Relationships: []
      }
      oracle_source_health: {
        Row: {
          consec_high: number
          consec_low: number
          degraded: boolean
          degraded_since: string | null
          last_check: string
          last_eff_weight: number | null
          source: string
        }
        Insert: {
          consec_high?: number
          consec_low?: number
          degraded?: boolean
          degraded_since?: string | null
          last_check?: string
          last_eff_weight?: number | null
          source: string
        }
        Update: {
          consec_high?: number
          consec_low?: number
          degraded?: boolean
          degraded_since?: string | null
          last_check?: string
          last_eff_weight?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "oracle_source_health_source_fkey"
            columns: ["source"]
            isOneToOne: true
            referencedRelation: "oracle_source_weights"
            referencedColumns: ["source"]
          },
        ]
      }
      oracle_source_weights: {
        Row: {
          max_lag_ms: number
          notes: string | null
          source: string
          updated_at: string
          weight: number
        }
        Insert: {
          max_lag_ms: number
          notes?: string | null
          source: string
          updated_at?: string
          weight: number
        }
        Update: {
          max_lag_ms?: number
          notes?: string | null
          source?: string
          updated_at?: string
          weight?: number
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
      pay_config: {
        Row: {
          id: number
          tron_receive_address: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: number
          tron_receive_address?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: number
          tron_receive_address?: string | null
          updated_at?: string
          updated_by?: string | null
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
      phon_balances: {
        Row: {
          balance: number
          snapshot_at: string | null
          snapshot_balance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          snapshot_at?: string | null
          snapshot_balance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          snapshot_at?: string | null
          snapshot_balance?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phon_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          meta: Json
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          ref?: string | null
          user_id?: string
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
      platform_kill_switches: {
        Row: {
          enabled: boolean
          key: string
          reason: string | null
          set_at: string
          set_by: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          reason?: string | null
          set_at?: string
          set_by?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          reason?: string | null
          set_at?: string
          set_by?: string | null
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
      press_sources: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          domain: string
          id: string
          logo_url: string | null
          rank: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          domain: string
          id?: string
          logo_url?: string | null
          rank?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          domain?: string
          id?: string
          logo_url?: string | null
          rank?: number
          updated_at?: string
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
          has_seen_guide: boolean
          id: string
          is_adult: boolean
          last_attendance: string | null
          last_nft_change_at: string | null
          last_reset_date: string | null
          main_nft_id: string | null
          nft_change_count: number
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
          has_seen_guide?: boolean
          id: string
          is_adult?: boolean
          last_attendance?: string | null
          last_nft_change_at?: string | null
          last_reset_date?: string | null
          main_nft_id?: string | null
          nft_change_count?: number
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
          has_seen_guide?: boolean
          id?: string
          is_adult?: boolean
          last_attendance?: string | null
          last_nft_change_at?: string | null
          last_reset_date?: string | null
          main_nft_id?: string | null
          nft_change_count?: number
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
        Relationships: [
          {
            foreignKeyName: "profiles_main_nft_id_fkey"
            columns: ["main_nft_id"]
            isOneToOne: false
            referencedRelation: "nft_collection"
            referencedColumns: ["id"]
          },
        ]
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
      reactivation_campaigns: {
        Row: {
          active: boolean
          body: string
          channels: string[]
          created_at: string
          cta_label: string
          dormant_days: number
          expires_after_hours: number
          id: string
          key: string
          phon_bonus: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          channels?: string[]
          created_at?: string
          cta_label?: string
          dormant_days: number
          expires_after_hours?: number
          id?: string
          key: string
          phon_bonus?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          channels?: string[]
          created_at?: string
          cta_label?: string
          dormant_days?: number
          expires_after_hours?: number
          id?: string
          key?: string
          phon_bonus?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reactivation_claims: {
        Row: {
          campaign_id: string
          claimed_at: string
          id: string
          phon_credited: number
          send_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          claimed_at?: string
          id?: string
          phon_credited?: number
          send_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          claimed_at?: string
          id?: string
          phon_credited?: number
          send_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactivation_claims_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "reactivation_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactivation_claims_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "reactivation_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      reactivation_sends: {
        Row: {
          campaign_id: string
          channel: string
          claimed_at: string | null
          clicked_at: string | null
          expires_at: string
          id: string
          meta: Json
          opened_at: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          channel: string
          claimed_at?: string | null
          clicked_at?: string | null
          expires_at: string
          id?: string
          meta?: Json
          opened_at?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          claimed_at?: string | null
          clicked_at?: string | null
          expires_at?: string
          id?: string
          meta?: Json
          opened_at?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactivation_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "reactivation_campaigns"
            referencedColumns: ["id"]
          },
        ]
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
      refund_requests: {
        Row: {
          admin_id: string | null
          admin_memo: string | null
          amount_krw: number
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          admin_memo?: string | null
          amount_krw: number
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          admin_memo?: string | null
          amount_krw?: number
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
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
      risk_engine_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          leverage: number
          reason: string | null
          rpi: number
          safety_distance: number
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          leverage: number
          reason?: string | null
          rpi: number
          safety_distance: number
          status: string
          symbol: string
          user_id?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          leverage?: number
          reason?: string | null
          rpi?: number
          safety_distance?: number
          status?: string
          symbol?: string
          user_id?: string
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
      self_heal_run_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          ok: boolean
          payload: Json
          result: Json
          target: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ok?: boolean
          payload?: Json
          result?: Json
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ok?: boolean
          payload?: Json
          result?: Json
          target?: string | null
        }
        Relationships: []
      }
      service_key_rotations: {
        Row: {
          id: string
          key_kind: string
          notes: string | null
          reason: string | null
          rotated_at: string
          rotated_by: string | null
        }
        Insert: {
          id?: string
          key_kind: string
          notes?: string | null
          reason?: string | null
          rotated_at?: string
          rotated_by?: string | null
        }
        Update: {
          id?: string
          key_kind?: string
          notes?: string | null
          reason?: string | null
          rotated_at?: string
          rotated_by?: string | null
        }
        Relationships: []
      }
      share_events: {
        Row: {
          action: string
          channel: string | null
          created_at: string
          id: number
          payload: Json
          trigger: string
          user_id: string | null
        }
        Insert: {
          action: string
          channel?: string | null
          created_at?: string
          id?: number
          payload?: Json
          trigger: string
          user_id?: string | null
        }
        Update: {
          action?: string
          channel?: string | null
          created_at?: string
          id?: number
          payload?: Json
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      slot_anomaly_log: {
        Row: {
          actual: number | null
          created_at: string
          expected: number | null
          game_code: string | null
          id: string
          kind: string
          meta: Json
          user_id: string | null
        }
        Insert: {
          actual?: number | null
          created_at?: string
          expected?: number | null
          game_code?: string | null
          id?: string
          kind: string
          meta?: Json
          user_id?: string | null
        }
        Update: {
          actual?: number | null
          created_at?: string
          expected?: number | null
          game_code?: string | null
          id?: string
          kind?: string
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      slot_demo_balances: {
        Row: {
          balance_chips: number
          last_class: string
          last_refill_at: string
          loss_streak: number
          spins_count: number
          total_bet: number
          total_paid: number
          updated_at: string
          user_id: string
          win_streak: number
        }
        Insert: {
          balance_chips?: number
          last_class?: string
          last_refill_at?: string
          loss_streak?: number
          spins_count?: number
          total_bet?: number
          total_paid?: number
          updated_at?: string
          user_id: string
          win_streak?: number
        }
        Update: {
          balance_chips?: number
          last_class?: string
          last_refill_at?: string
          loss_streak?: number
          spins_count?: number
          total_bet?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
          win_streak?: number
        }
        Relationships: []
      }
      slot_games: {
        Row: {
          active: boolean
          bonus_frequency: number
          bonus_kind: string
          bonus_table: Json | null
          buy_bonus_multiplier: number
          created_at: string
          game_code: string
          id: string
          max_bet_phon: number
          max_multiplier: number
          min_bet_phon: number
          name: string
          paylines: number
          paytable: Json | null
          reels: number
          rows: number
          rtp: number
          studio: string
          symbol_weights: Json | null
          volatility_class: string
        }
        Insert: {
          active?: boolean
          bonus_frequency?: number
          bonus_kind?: string
          bonus_table?: Json | null
          buy_bonus_multiplier?: number
          created_at?: string
          game_code: string
          id?: string
          max_bet_phon?: number
          max_multiplier?: number
          min_bet_phon?: number
          name: string
          paylines?: number
          paytable?: Json | null
          reels?: number
          rows?: number
          rtp?: number
          studio?: string
          symbol_weights?: Json | null
          volatility_class?: string
        }
        Update: {
          active?: boolean
          bonus_frequency?: number
          bonus_kind?: string
          bonus_table?: Json | null
          buy_bonus_multiplier?: number
          created_at?: string
          game_code?: string
          id?: string
          max_bet_phon?: number
          max_multiplier?: number
          min_bet_phon?: number
          name?: string
          paylines?: number
          paytable?: Json | null
          reels?: number
          rows?: number
          rtp?: number
          studio?: string
          symbol_weights?: Json | null
          volatility_class?: string
        }
        Relationships: []
      }
      slot_jackpot_pools: {
        Row: {
          contribution_bps: number
          game_code: string
          last_amount: number | null
          last_winner_user_id: string | null
          last_won_at: string | null
          pool_phon: number
          seed_phon: number
          updated_at: string
        }
        Insert: {
          contribution_bps?: number
          game_code: string
          last_amount?: number | null
          last_winner_user_id?: string | null
          last_won_at?: string | null
          pool_phon?: number
          seed_phon?: number
          updated_at?: string
        }
        Update: {
          contribution_bps?: number
          game_code?: string
          last_amount?: number | null
          last_winner_user_id?: string | null
          last_won_at?: string | null
          pool_phon?: number
          seed_phon?: number
          updated_at?: string
        }
        Relationships: []
      }
      slot_jackpot_wins: {
        Row: {
          amount_phon: number
          game_code: string
          id: string
          spin_id: string | null
          winner_user_id: string
          won_at: string
        }
        Insert: {
          amount_phon: number
          game_code: string
          id?: string
          spin_id?: string | null
          winner_user_id: string
          won_at?: string
        }
        Update: {
          amount_phon?: number
          game_code?: string
          id?: string
          spin_id?: string | null
          winner_user_id?: string
          won_at?: string
        }
        Relationships: []
      }
      slot_sound_assets: {
        Row: {
          bytes: number | null
          created_at: string
          cue: string
          duration_ms: number | null
          id: string
          prompt: string | null
          theme: string
          updated_at: string
          url: string
          version: number
        }
        Insert: {
          bytes?: number | null
          created_at?: string
          cue: string
          duration_ms?: number | null
          id?: string
          prompt?: string | null
          theme: string
          updated_at?: string
          url: string
          version?: number
        }
        Update: {
          bytes?: number | null
          created_at?: string
          cue?: string
          duration_ms?: number | null
          id?: string
          prompt?: string | null
          theme?: string
          updated_at?: string
          url?: string
          version?: number
        }
        Relationships: []
      }
      slot_sound_gen_log: {
        Row: {
          created_at: string
          cue: string
          error: string | null
          id: string
          meta: Json | null
          status: string
          theme: string
        }
        Insert: {
          created_at?: string
          cue: string
          error?: string | null
          id?: string
          meta?: Json | null
          status: string
          theme: string
        }
        Update: {
          created_at?: string
          cue?: string
          error?: string | null
          id?: string
          meta?: Json | null
          status?: string
          theme?: string
        }
        Relationships: []
      }
      slot_spins: {
        Row: {
          bet_phon: number
          bonus_multiplier: number | null
          bonus_triggered: boolean
          client_seed: string
          created_at: string
          game_code: string
          id: string
          is_buy_bonus: boolean
          nonce: number
          payout_phon: number
          server_seed_hash: string
          server_seed_revealed: string
          symbols: Json
          user_id: string
          win_lines: Json
        }
        Insert: {
          bet_phon: number
          bonus_multiplier?: number | null
          bonus_triggered?: boolean
          client_seed: string
          created_at?: string
          game_code: string
          id?: string
          is_buy_bonus?: boolean
          nonce: number
          payout_phon?: number
          server_seed_hash: string
          server_seed_revealed: string
          symbols: Json
          user_id: string
          win_lines?: Json
        }
        Update: {
          bet_phon?: number
          bonus_multiplier?: number | null
          bonus_triggered?: boolean
          client_seed?: string
          created_at?: string
          game_code?: string
          id?: string
          is_buy_bonus?: boolean
          nonce?: number
          payout_phon?: number
          server_seed_hash?: string
          server_seed_revealed?: string
          symbols?: Json
          user_id?: string
          win_lines?: Json
        }
        Relationships: []
      }
      slot_tournament_payouts: {
        Row: {
          id: string
          paid_at: string
          prize_phon: number
          rank: number
          total_payout: number
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          paid_at?: string
          prize_phon: number
          rank: number
          total_payout: number
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          paid_at?: string
          prize_phon?: number
          rank?: number
          total_payout?: number
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_tournament_payouts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "slot_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_tournaments: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          prize_pool_phon: number
          prize_split: Json
          settled_at: string | null
          starts_at: string
          status: string
          week_start_kst: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          prize_pool_phon?: number
          prize_split?: Json
          settled_at?: string | null
          starts_at: string
          status?: string
          week_start_kst: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          prize_pool_phon?: number
          prize_split?: Json
          settled_at?: string | null
          starts_at?: string
          status?: string
          week_start_kst?: string
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
      tournament_schedule: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          metadata: Json
          overlay_token: string
          prize_crown: number
          prize_phon: number
          slug: string
          starts_at: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          metadata?: Json
          overlay_token?: string
          prize_crown?: number
          prize_phon?: number
          slug: string
          starts_at: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          metadata?: Json
          overlay_token?: string
          prize_crown?: number
          prize_phon?: number
          slug?: string
          starts_at?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
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
      user_avatars: {
        Row: {
          acquired_at: string
          acquired_via: string
          avatar_id: string
          equipped: boolean
          id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquired_via?: string
          avatar_id: string
          equipped?: boolean
          id?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquired_via?: string
          avatar_id?: string
          equipped?: boolean
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_avatars_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "avatar_catalog"
            referencedColumns: ["id"]
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
      vip_arrivals: {
        Row: {
          arrived_at: string
          id: string
          source: string | null
          user_id: string
        }
        Insert: {
          arrived_at?: string
          id?: string
          source?: string | null
          user_id: string
        }
        Update: {
          arrived_at?: string
          id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vip_passes: {
        Row: {
          active: boolean
          created_at: string
          expires_at: string
          last_paid_at: string | null
          last_paid_phon: number | null
          renewals: number
          source: string
          started_at: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_at: string
          last_paid_at?: string | null
          last_paid_phon?: number | null
          renewals?: number
          source?: string
          started_at?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_at?: string
          last_paid_at?: string | null
          last_paid_phon?: number | null
          renewals?: number
          source?: string
          started_at?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_passes_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "vip_tier_config"
            referencedColumns: ["tier"]
          },
        ]
      }
      vip_tier_config: {
        Row: {
          concierge: boolean
          created_at: string
          crown_mult: number
          event_lead_hours: number
          fee_waiver_pct: number
          free_spins: number
          gradient_from: string
          gradient_to: string
          lounge: boolean
          min_phon: number
          rank: number
          skin_pack: string
          tier: string
          whale_lead_seconds: number
          withdraw_priority: number
        }
        Insert: {
          concierge?: boolean
          created_at?: string
          crown_mult?: number
          event_lead_hours?: number
          fee_waiver_pct?: number
          free_spins?: number
          gradient_from: string
          gradient_to: string
          lounge?: boolean
          min_phon: number
          rank: number
          skin_pack: string
          tier: string
          whale_lead_seconds?: number
          withdraw_priority?: number
        }
        Update: {
          concierge?: boolean
          created_at?: string
          crown_mult?: number
          event_lead_hours?: number
          fee_waiver_pct?: number
          free_spins?: number
          gradient_from?: string
          gradient_to?: string
          lounge?: boolean
          min_phon?: number
          rank?: number
          skin_pack?: string
          tier?: string
          whale_lead_seconds?: number
          withdraw_priority?: number
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
      war_entries: {
        Row: {
          combo_max: number
          display_name: string | null
          id: string
          is_simulated: boolean
          joined_at: string
          near_miss_count: number
          prize_phon: number
          session_id: string
          settled_at: string | null
          sim_pnl_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          combo_max?: number
          display_name?: string | null
          id?: string
          is_simulated?: boolean
          joined_at?: string
          near_miss_count?: number
          prize_phon?: number
          session_id: string
          settled_at?: string | null
          sim_pnl_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          combo_max?: number
          display_name?: string | null
          id?: string
          is_simulated?: boolean
          joined_at?: string
          near_miss_count?: number
          prize_phon?: number
          session_id?: string
          settled_at?: string | null
          sim_pnl_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "war_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "war_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      war_sessions: {
        Row: {
          created_at: string
          id: string
          is_simulated: boolean
          participants: number
          prize_phon: number
          settled_at: string | null
          slot_ends_at: string
          slot_starts_at: string
          status: string
          winner_pnl_pct: number | null
          winner_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          participants?: number
          prize_phon?: number
          settled_at?: string | null
          slot_ends_at: string
          slot_starts_at: string
          status?: string
          winner_pnl_pct?: number | null
          winner_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_simulated?: boolean
          participants?: number
          prize_phon?: number
          settled_at?: string | null
          slot_ends_at?: string
          slot_starts_at?: string
          status?: string
          winner_pnl_pct?: number | null
          winner_user_id?: string | null
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
      _evaluate_deposit_rules_internal: {
        Args: { _deposit_id: string }
        Returns: number
      }
      _get_max_leverage_for: { Args: { _user: string }; Returns: number }
      _get_total_boost_pct_for: { Args: { _user: string }; Returns: number }
      _grant_guild_crown: {
        Args: {
          _amount: number
          _dedupe_key: string
          _meta: Json
          _user_id: string
        }
        Returns: undefined
      }
      _mask_nick: { Args: { _n: string }; Returns: string }
      _period_key: { Args: { _period: string }; Returns: string }
      _slot_compute_spin:
        | {
            Args: {
              _client_seed: string
              _is_buy_bonus: boolean
              _nonce: number
              _rtp_boost_pct?: number
              _server_seed: string
            }
            Returns: Json
          }
        | {
            Args: {
              _bonus_table?: Json
              _client_seed: string
              _is_buy_bonus: boolean
              _max_mult?: number
              _nonce: number
              _paytable?: Json
              _rtp_boost_pct?: number
              _server_seed: string
              _symbol_weights?: Json
            }
            Returns: Json
          }
      _slot_demo_classify: {
        Args: { _bet: number; _result: Json }
        Returns: string
      }
      _slot_mulberry32: {
        Args: { _index: number; _seed: number }
        Returns: number
      }
      accept_dynasty_link: { Args: { _token: string }; Returns: Json }
      accrue_jackpot: { Args: { p_deposit_amount: number }; Returns: Json }
      acknowledge_anomaly: {
        Args: { _id: string; _note?: string }
        Returns: Json
      }
      admin_ack_anomaly: {
        Args: { _ids: string[]; _note?: string }
        Returns: number
      }
      admin_adjust_balance: {
        Args: { _delta: number; _reason: string; _target: string }
        Returns: Json
      }
      admin_approve_press_source: {
        Args: {
          _display_name: string
          _domain: string
          _logo_url?: string
          _rank?: number
        }
        Returns: string
      }
      admin_ban_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: boolean
      }
      admin_broadcast_send: {
        Args: {
          _audience?: Json
          _body: string
          _channel: string
          _title: string
        }
        Returns: string
      }
      admin_bulk_approve_withdrawals: {
        Args: { _ids: string[] }
        Returns: number
      }
      admin_bulk_freeze_users: {
        Args: { _hours?: number; _reason?: string; _user_ids: string[] }
        Returns: Json
      }
      admin_bulk_reject_withdrawals: {
        Args: { _ids: string[]; _reason: string }
        Returns: number
      }
      admin_bulk_set_tier: {
        Args: {
          _tier: Database["public"]["Enums"]["user_tier"]
          _user_ids: string[]
        }
        Returns: Json
      }
      admin_bulk_unfreeze_users: {
        Args: { _user_ids: string[] }
        Returns: Json
      }
      admin_cockpit_metrics: { Args: never; Returns: Json }
      admin_create_campaign: {
        Args: {
          _budget_krw?: number
          _kind: string
          _name: string
          _payload?: Json
        }
        Returns: string
      }
      admin_create_experiment: {
        Args: {
          _activate?: boolean
          _description: string
          _key: string
          _label: string
          _variants: Json
        }
        Returns: string
      }
      admin_create_founding_season: {
        Args: {
          _code: string
          _ends_at: string
          _perks: Json
          _subtitle: string
          _title: string
          _total: number
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          ends_at: string | null
          id: string
          perks: Json
          settled_at: string | null
          starts_at: string
          subtitle: string | null
          title: string
          total_seats: number
        }
        SetofOptions: {
          from: "*"
          to: "founding_seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_create_influencer_code: {
        Args: {
          _bonus_crown?: number
          _bonus_phon?: number
          _channel?: string
          _code: string
          _display_name: string
          _owner_user_id?: string
        }
        Returns: string
      }
      admin_create_tournament: {
        Args: {
          _ends_at: string
          _prize_crown?: number
          _prize_phon?: number
          _slug: string
          _starts_at: string
          _subtitle: string
          _title: string
        }
        Returns: string
      }
      admin_cron_status: {
        Args: never
        Returns: {
          active: boolean
          jobid: number
          jobname: string
          last_duration_ms: number
          last_run_at: string
          last_status: string
          schedule: string
        }[]
      }
      admin_dismiss_inbound_hit: { Args: { _id: string }; Returns: undefined }
      admin_end_founding_season: { Args: { _id: string }; Returns: Json }
      admin_exec_readonly_sql: { Args: { _sql: string }; Returns: Json }
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
      admin_freeze_user: {
        Args: { _hours?: number; _reason?: string; _user_id: string }
        Returns: string
      }
      admin_get_ab_stats: {
        Args: { _key: string }
        Returns: {
          assignments: number
          variant: string
        }[]
      }
      admin_get_ab_summary: { Args: { _key: string }; Returns: Json }
      admin_get_audit_log: {
        Args: { _action?: string; _admin?: string; _limit?: number }
        Returns: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          payload: Json
          target_id: string | null
          target_type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_audit_log"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_demo_bias_perf: { Args: never; Returns: Json }
      admin_get_economy_stats: { Args: never; Returns: Json }
      admin_get_empire_realtime: { Args: never; Returns: Json }
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
      admin_get_hot_users_1h: {
        Args: never
        Returns: {
          deposit_count: number
          total_amount: number
          user_id: string
        }[]
      }
      admin_get_kernel_drift_24h: {
        Args: never
        Returns: {
          bucket_hour: string
          cnt: number
          error_code: string
        }[]
      }
      admin_get_kernel_inflight: {
        Args: { _limit?: number }
        Returns: {
          client_request_id: string
          created_at: string
          is_expired: boolean
          lease_owner: string
          lease_until: string
          params_hash: string
          seconds_to_expire: number
          user_id: string
        }[]
      }
      admin_get_kernel_summary: { Args: never; Returns: Json }
      admin_get_kill_switches: {
        Args: never
        Returns: {
          enabled: boolean
          key: string
          reason: string | null
          set_at: string
          set_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_kill_switches"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_monthly_revenue_progress: { Args: never; Returns: Json }
      admin_get_oracle_health: { Args: never; Returns: Json }
      admin_get_oracle_swap_readiness: { Args: never; Returns: Json }
      admin_get_phase_c_metrics: { Args: never; Returns: Json }
      admin_get_reactivation_funnel: {
        Args: never
        Returns: {
          campaign_key: string
          claim_rate: number
          claimed_30d: number
          click_rate: number
          clicked_30d: number
          dormant_days: number
          open_rate: number
          opened_30d: number
          phon_bonus: number
          phon_credited_30d: number
          sent_30d: number
          title: string
        }[]
      }
      admin_get_recent_errors: {
        Args: { _limit?: number; _only_unresolved?: boolean }
        Returns: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          resolved_at: string
          resolved_by: string
          stack: string
          url: string
          user_agent: string
          user_id: string
        }[]
      }
      admin_get_risk_engine_stats: { Args: never; Returns: Json }
      admin_get_risk_feed: {
        Args: { _limit?: number; _only_unack?: boolean }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "anomaly_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_share_funnel: {
        Args: { _hours?: number }
        Returns: {
          ctr: number
          dismissed: number
          shared: number
          shown: number
          trigger: string
        }[]
      }
      admin_get_sim_real_conversion: { Args: { _days?: number }; Returns: Json }
      admin_get_slot_anomaly_summary_24h: {
        Args: never
        Returns: {
          game_code: string
          kind: string
          last_at: string
          n: number
        }[]
      }
      admin_get_stress_test_stats: { Args: never; Returns: Json }
      admin_get_table_counts: { Args: never; Returns: Json }
      admin_get_telegram_bot_status: { Args: never; Returns: Json }
      admin_get_today_crown_total: { Args: never; Returns: Json }
      admin_get_trust_v2_stats: { Args: never; Returns: Json }
      admin_get_user_360: { Args: { _uid: string }; Returns: Json }
      admin_get_user_email: { Args: { _user_id: string }; Returns: string }
      admin_grant_self_nft: {
        Args: { _level: string; _type: string }
        Returns: Json
      }
      admin_grant_vip_pass: {
        Args: { _days?: number; _uid: string }
        Returns: Json
      }
      admin_list_active_vip: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          expires_at: string
          renewals: number
          source: string
          started_at: string
          user_id: string
        }[]
      }
      admin_list_bequests: {
        Args: { _limit?: number }
        Returns: {
          asset_kind: string
          cancelled_at: string
          child_id: string
          cooldown_until: string
          created_at: string
          executed_at: string
          id: string
          nft_id: string
          parent_id: string
          phon_amount: number
          status: string
        }[]
      }
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
      admin_list_briefing_targets: {
        Args: { _limit?: number }
        Returns: {
          crown_24h: number
          level: number
          nickname: string
          phon: number
          user_id: string
        }[]
      }
      admin_list_broadcasts: {
        Args: { _limit?: number }
        Returns: {
          audience: Json
          body: string
          channel: string
          created_at: string
          created_by: string
          id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_broadcasts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_campaigns: {
        Args: { _limit?: number }
        Returns: {
          budget_krw: number
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
          payload: Json
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "marketing_campaigns"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_founding_seasons: {
        Args: never
        Returns: {
          active: boolean
          claimed: number
          code: string
          ends_at: string
          id: string
          perks: Json
          settled_at: string
          starts_at: string
          subtitle: string
          title: string
          total_seats: number
        }[]
      }
      admin_list_inbound_hits: {
        Args: { _limit?: number; _only_unreviewed?: boolean }
        Returns: {
          already_curated: boolean
          domain: string
          first_seen_at: string
          hit_count: number
          id: string
          last_seen_at: string
          reviewed: boolean
          sample_referrer: string
        }[]
      }
      admin_list_influencer_codes: {
        Args: { _limit?: number }
        Returns: {
          active: boolean
          bonus_crown: number
          bonus_phon: number
          channel: string | null
          clicks_count: number
          code: string
          created_at: string
          deposits_count: number
          deposits_total_phon: number
          display_name: string
          owner_user_id: string | null
          signups_count: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "influencer_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_refund_requests: {
        Args: { _limit?: number; _offset?: number; _status?: string }
        Returns: {
          admin_memo: string
          amount_krw: number
          created_at: string
          id: string
          nickname: string
          reason: string
          resolved_at: string
          status: string
          user_id: string
        }[]
      }
      admin_list_slot_anomalies: {
        Args: { _kind?: string; _limit?: number }
        Returns: {
          actual: number
          created_at: string
          expected: number
          game_code: string
          id: string
          kind: string
          meta: Json
          user_id: string
        }[]
      }
      admin_list_users_full: {
        Args: { _limit?: number; _offset?: number; _q?: string }
        Returns: {
          auth_provider: string
          available_balance: number
          banned_until: string
          birth_date: string
          created_at: string
          email: string
          freeze_reason: string
          frozen_until: string
          id: string
          is_banned: boolean
          is_deleted: boolean
          is_frozen: boolean
          nickname: string
          phone: string
          profile_completed: boolean
          real_name: string
          tier: string
          total_balance: number
        }[]
      }
      admin_log_key_rotation: {
        Args: { _kind: string; _notes?: string; _reason: string }
        Returns: string
      }
      admin_operator_pnl: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_oracle_chaos_clear: { Args: never; Returns: number }
      admin_oracle_chaos_stale_source: {
        Args: { _minutes?: number; _source: string }
        Returns: number
      }
      admin_phon_adjust: {
        Args: { _delta: number; _reason: string; _uid: string }
        Returns: Json
      }
      admin_release_founding_seat: {
        Args: { _reason: string; _season_id: string; _seat_no: number }
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
      admin_resolve_all_anomalies: { Args: never; Returns: Json }
      admin_resolve_aml: {
        Args: { _action: string; _id: string; _reason?: string }
        Returns: Json
      }
      admin_resolve_anomaly: {
        Args: { _id: string; _note?: string }
        Returns: undefined
      }
      admin_resolve_anomaly_rule: { Args: { _rule: string }; Returns: Json }
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
      admin_resolve_errors: {
        Args: { _ids: string[]; _note?: string }
        Returns: number
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
      admin_resolve_refund: {
        Args: { _approve: boolean; _id: string; _memo: string }
        Returns: {
          admin_id: string | null
          admin_memo: string | null
          amount_krw: number
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "refund_requests"
          isOneToOne: true
          isSetofReturn: false
        }
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
      admin_run_all_healthchecks: { Args: never; Returns: Json }
      admin_run_ev_health_now: { Args: never; Returns: Json }
      admin_run_rls_smoke: { Args: never; Returns: Json }
      admin_search_kernel_audit: {
        Args: {
          _crid?: string
          _error_code?: string
          _limit?: number
          _offset?: number
          _outcome?: string
          _since?: string
          _user_id?: string
        }
        Returns: {
          client_request_id: string
          created_at: string
          entry_price: number
          error_code: string
          id: string
          oracle_snapshot: Json
          outcome: string
          position_id: string
          request_meta: Json
          user_id: string
        }[]
      }
      admin_search_users: {
        Args: { _limit?: number; _q: string }
        Returns: {
          created_at: string
          email: string
          tier: string
          user_id: string
          username: string
        }[]
      }
      admin_set_ab_active: {
        Args: { _active: boolean; _key: string }
        Returns: {
          experiment_key: string
          is_active: boolean
          updated_at: string
        }[]
      }
      admin_set_auto_rule_enabled: {
        Args: { _enabled: boolean; _id: string }
        Returns: undefined
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
      admin_set_kill_switch: {
        Args: { _enabled: boolean; _key: string; _reason?: string }
        Returns: {
          enabled: boolean
          key: string
          reason: string | null
          set_at: string
          set_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "platform_kill_switches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_source_weight: {
        Args: { _max_lag_ms?: number; _source: string; _weight: number }
        Returns: undefined
      }
      admin_set_tier: {
        Args: {
          _target: string
          _tier: Database["public"]["Enums"]["user_tier"]
        }
        Returns: Json
      }
      admin_settings_get: { Args: { _key: string }; Returns: Json }
      admin_settings_set: {
        Args: { _key: string; _value: Json }
        Returns: Json
      }
      admin_soft_delete_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: boolean
      }
      admin_stop_experiment: { Args: { _key: string }; Returns: undefined }
      admin_toggle_press_source: {
        Args: { _active: boolean; _id: string }
        Returns: undefined
      }
      admin_trigger_cron: { Args: { _job: string }; Returns: Json }
      admin_trigger_crown: {
        Args: {
          _base?: number
          _multiplier?: number
          _reason?: string
          _uid: string
        }
        Returns: Json
      }
      admin_unban_user: { Args: { _user_id: string }; Returns: boolean }
      admin_unfreeze_user: { Args: { _user_id: string }; Returns: number }
      admin_update_campaign_status: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      admin_update_founding_season: {
        Args: {
          _ends_at: string
          _id: string
          _perks: Json
          _subtitle: string
          _title: string
        }
        Returns: {
          active: boolean
          code: string
          created_at: string
          ends_at: string | null
          id: string
          perks: Json
          settled_at: string | null
          starts_at: string
          subtitle: string | null
          title: string
          total_seats: number
        }
        SetofOptions: {
          from: "*"
          to: "founding_seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_game_config: {
        Args: { _patch: Json }
        Returns: {
          crown_particle_intensity: number
          demo_bias: Json
          id: number
          nearmiss_prob: Json
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "game_config"
          isOneToOne: true
          isSetofReturn: false
        }
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
      advance_cash_loop_phase: {
        Args: { _phase: string; _sim_pnl?: number; _token: string }
        Returns: {
          completed_at: string | null
          converted_at: string | null
          created_at: string
          id: string
          is_simulated: boolean
          phase: string
          session_token: string
          sim_balance: number
          sim_pnl: number
          started_at: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cash_loop_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
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
      approve_admin_recovery: { Args: { _request_id: string }; Returns: Json }
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
      award_avatar_for_bigwin: {
        Args: { _amount: number; _user: string }
        Returns: Json
      }
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
      bid_galaxy_seat: {
        Args: { _bid_phon: number; _seat_no: number }
        Returns: Json
      }
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
      buy_nft: { Args: { _listing_id: string }; Returns: Json }
      cancel_bequest: { Args: { _req_id: string }; Returns: Json }
      cancel_dynasty_link: { Args: { _link_id: string }; Returns: Json }
      cancel_listing: { Args: { _listing_id: string }; Returns: Json }
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
      claim_daily_quick_reward: { Args: { _kind: string }; Returns: Json }
      claim_demo_refill: { Args: never; Returns: Json }
      claim_first_deposit_godmode: {
        Args: { _deposit_krw: number }
        Returns: {
          bonus_krw: number
          claimed_at: string
          created_at: string
          deposit_amount_krw: number
          founding_avatar_tier: number
          id: string
          loss_protection_until: string
          meta: Json
          phon_credited: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "first_deposit_godmode"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_founding_season_seat: { Args: never; Returns: Json }
      claim_founding_seat: { Args: { _purchase_id: string }; Returns: Json }
      claim_handbook_bonus: { Args: never; Returns: Json }
      claim_idle_growth: { Args: never; Returns: Json }
      claim_journey_stage: { Args: { _stage_no: number }; Returns: Json }
      claim_loss_protection: {
        Args: never
        Returns: {
          created_at: string
          deposit_amount_krw: number
          godmode_id: string
          id: string
          meta: Json
          net_loss_krw: number
          refunded_phon: number
          remaining_phon_at_claim: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "loss_protection_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_quest: { Args: { _quest_key: string }; Returns: Json }
      claim_reactivation_offer: { Args: { _send_id: string }; Returns: Json }
      claim_season_reward: {
        Args: { _level: number; _track: string }
        Returns: Json
      }
      claim_share_reward: { Args: { _channel: string }; Returns: Json }
      claim_weekly_pass_reward: { Args: { _level: number }; Returns: Json }
      cleanup_bot_activity: { Args: never; Returns: undefined }
      complete_guide_bonus: { Args: never; Returns: Json }
      compute_oracle_consensus: { Args: { _symbol: string }; Returns: Json }
      compute_oracle_consensus_weighted: {
        Args: { _symbol: string }
        Returns: Json
      }
      consume_admin_backup_code: { Args: { _code: string }; Returns: Json }
      contribute_guild_war: {
        Args: { _score: number; _war_id: string }
        Returns: boolean
      }
      count_admin_backup_codes: { Args: never; Returns: number }
      create_api_key: {
        Args: {
          _name: string
          _rate_limit_per_min?: number
          _scopes?: string[]
        }
        Returns: {
          id: string
          prefix: string
          secret: string
        }[]
      }
      create_crown_replay: { Args: { _event_id: string }; Returns: Json }
      create_crypto_deposit_intent: {
        Args: { _amount: number; _receive_address: string }
        Returns: {
          asset: string
          created_at: string
          expires_at: string
          id: string
          matched_at: string | null
          matched_from_addr: string | null
          matched_tx_hash: string | null
          network: string
          receive_address: string
          requested_amount: number
          status: string
          unique_amount: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "crypto_deposit_intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_guild: {
        Args: { _description?: string; _emblem?: string; _name: string }
        Returns: string
      }
      credit_crypto_deposit: {
        Args: {
          _amount: number
          _from_addr: string
          _to_addr: string
          _tx_hash: string
        }
        Returns: Json
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
      enqueue_imperial_story: {
        Args: {
          _dedupe?: string
          _headline: string
          _hero_nick: string
          _hero_user: string
          _kind: string
          _payload?: Json
          _subline: string
          _ttl_hours?: number
        }
        Returns: number
      }
      enqueue_reactivation_for_campaign: {
        Args: { _campaign_id: string; _max_users?: number }
        Returns: {
          enqueued_count: number
        }[]
      }
      ensure_current_slot_tournament: { Args: never; Returns: string }
      ensure_settlement_audit_partition: {
        Args: { _when?: string }
        Returns: undefined
      }
      equip_avatar: { Args: { _avatar_id: string }; Returns: Json }
      equip_badge: {
        Args: { _badge_key: string; _slot: number }
        Returns: Json
      }
      evaluate_deposit_rules_shadow: {
        Args: { _deposit_id: string }
        Returns: number
      }
      evolve_empire_unit: { Args: { _unit_id: string }; Returns: Json }
      execute_bequest: { Args: { _req_id: string }; Returns: Json }
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
      fuse_nft: { Args: { _nft_ids: string[] }; Returns: Json }
      gacha_pull: { Args: never; Returns: Json }
      gc_live_position_idempotency: { Args: never; Returns: number }
      gc_rate_limit_buckets: { Args: never; Returns: number }
      gen_referral_code: { Args: never; Returns: string }
      gen_seed_activity: { Args: never; Returns: undefined }
      generate_admin_backup_codes: { Args: never; Returns: string[] }
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
      get_active_press_sources: {
        Args: never
        Returns: {
          display_name: string
          domain: string
          logo_url: string
          rank: number
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
      get_avatar_catalog: { Args: never; Returns: Json }
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
      get_competitor_compare: {
        Args: never
        Returns: {
          competitor: string
          metric_key: string
          metric_value: number
          source_label: string
          source_url: string
          unit: string
        }[]
      }
      get_crown_war_snapshot: { Args: never; Returns: Json }
      get_current_slot_tournament: {
        Args: never
        Returns: {
          ends_at: string
          id: string
          prize_pool_phon: number
          prize_split: Json
          seconds_remaining: number
          starts_at: string
          status: string
          week_start_kst: string
        }[]
      }
      get_daily_headlines: {
        Args: { _limit?: number; _locale?: string }
        Returns: {
          created_at: string
          text: string
          tone: string
        }[]
      }
      get_earn_hub_state: { Args: never; Returns: Json }
      get_empire_seats_remaining: { Args: never; Returns: number }
      get_error_stats: {
        Args: { _hours?: number }
        Returns: {
          bucket: string
          cnt: number
          level: string
        }[]
      }
      get_founding_season_grid: {
        Args: { _season_id?: string }
        Returns: {
          claimed_at: string
          is_mine: boolean
          masked_nick: string
          seat_no: number
        }[]
      }
      get_founding_season_state: { Args: never; Returns: Json }
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
      get_game_config_public: { Args: never; Returns: Json }
      get_ghost_empire_stats: { Args: never; Returns: Json }
      get_ghost_pulse: { Args: never; Returns: Json }
      get_ghost_strikes: { Args: { _limit?: number }; Returns: Json }
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
      get_imperial_stories: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          headline: string
          hero_nickname: string
          id: number
          kind: string
          payload: Json
          subline: string
        }[]
      }
      get_influencer_public: {
        Args: { _code: string }
        Returns: {
          bonus_crown: number
          bonus_phon: number
          channel: string
          code: string
          display_name: string
        }[]
      }
      get_jackpot_pools: {
        Args: never
        Returns: {
          game_code: string
          last_amount: number
          last_winner_masked: string
          last_won_at: string
          pool_phon: number
          seed_phon: number
        }[]
      }
      get_live_activity_60s: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          created_at: string
          flag: string
          kind: string
          title: string
          user_mask: string
        }[]
      }
      get_main_nft: {
        Args: { _user_id: string }
        Returns: {
          boost_pct: number
          external_image_url: string
          level: string
          nft_id: string
          source: string
          type: string
          user_id: string
        }[]
      }
      get_main_nft_batch: {
        Args: { _user_ids: string[] }
        Returns: {
          boost_pct: number
          external_image_url: string
          level: string
          nft_id: string
          type: string
          user_id: string
        }[]
      }
      get_my_api_usage_24h: {
        Args: { _key_id: string }
        Returns: {
          count: number
          minute_bucket: string
        }[]
      }
      get_my_bequests: {
        Args: never
        Returns: {
          asset_kind: string
          child_id: string
          cooldown_until: string
          created_at: string
          executed_at: string
          id: string
          nft_id: string
          parent_id: string
          phon_amount: number
          role: string
          status: string
        }[]
      }
      get_my_daily_briefing: {
        Args: never
        Returns: {
          briefing_date: string
          cards: Json
          generated_at: string
          model: string
          refreshed_count: number
        }[]
      }
      get_my_dashboard_state: { Args: never; Returns: Json }
      get_my_dynasty_links: {
        Args: never
        Returns: {
          accepted_at: string
          child_email: string
          child_id: string
          created_at: string
          id: string
          parent_id: string
          role: string
          status: string
        }[]
      }
      get_my_empire_map: { Args: never; Returns: Json }
      get_my_equipped_avatar: { Args: never; Returns: Json }
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
      get_my_founding_seat: { Args: { _season_id?: string }; Returns: Json }
      get_my_founding_seat_history: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          event_type: string
          id: string
          note: string
          payload: Json
          season_code: string
          season_id: string
          season_title: string
          seat_no: number
        }[]
      }
      get_my_godmode_status: {
        Args: never
        Returns: {
          bonus_krw: number
          claimed_at: string
          created_at: string
          deposit_amount_krw: number
          founding_avatar_tier: number
          id: string
          loss_protection_until: string
          meta: Json
          phon_credited: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "first_deposit_godmode"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_hybrid_net: {
        Args: never
        Returns: {
          long_count: number
          long_size: number
          net_side: string
          net_size: number
          short_count: number
          short_size: number
          symbol: string
          total_margin: number
          weighted_entry: number
        }[]
      }
      get_my_journey_claims: { Args: never; Returns: Json }
      get_my_journey_progress: { Args: never; Returns: Json }
      get_my_legal_consent_status: { Args: never; Returns: Json }
      get_my_main_nft_status: { Args: never; Returns: Json }
      get_my_max_leverage: { Args: never; Returns: number }
      get_my_nft_collection: {
        Args: never
        Returns: {
          boost_pct: number
          created_at: string
          id: string
          level: string
          source: string
          type: string
        }[]
      }
      get_my_pending_deposits: {
        Args: never
        Returns: {
          asset: string
          created_at: string
          expires_at: string
          id: string
          matched_at: string | null
          matched_from_addr: string | null
          matched_tx_hash: string | null
          network: string
          receive_address: string
          requested_amount: number
          status: string
          unique_amount: number
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "crypto_deposit_intents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_quests: { Args: never; Returns: Json }
      get_my_reactivation_offer: {
        Args: never
        Returns: {
          body: string
          campaign_id: string
          campaign_key: string
          channel: string
          cta_label: string
          expires_at: string
          phon_bonus: number
          send_id: string
          title: string
        }[]
      }
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
      get_my_total_boost_pct: { Args: never; Returns: number }
      get_my_vip_pass: { Args: never; Returns: Json }
      get_my_vip_tier: { Args: never; Returns: Json }
      get_my_weekly_referral_rank: { Args: never; Returns: Json }
      get_next_empire_day: { Args: never; Returns: string }
      get_next_nft_threshold: { Args: never; Returns: Json }
      get_next_tournament: {
        Args: never
        Returns: {
          ends_at: string
          id: string
          overlay_token: string
          prize_crown: number
          prize_phon: number
          seconds_until_end: number
          seconds_until_start: number
          slug: string
          starts_at: string
          status: string
          subtitle: string
          title: string
        }[]
      }
      get_pay_receive_address: { Args: never; Returns: string }
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
      get_phon_balance: { Args: never; Returns: number }
      get_public_crown_replay: { Args: { _token: string }; Returns: Json }
      get_public_stats_json: { Args: never; Returns: Json }
      get_queue_sla_stats: { Args: never; Returns: Json }
      get_recent_errors: {
        Args: { _limit?: number }
        Returns: {
          context: Json
          created_at: string
          id: string
          level: string
          message: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
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
      get_recent_payouts_100: {
        Args: never
        Returns: {
          amount_krw: number
          completed_at: string
          masked_nick: string
          minutes_to_complete: number
          tier: Database["public"]["Enums"]["user_tier"]
        }[]
      }
      get_recent_roulette_spins: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          created_at: string
          id: string
          kind: string
          masked_name: string
          prize_label: string
        }[]
      }
      get_recent_vip_arrivals: { Args: { _limit?: number }; Returns: Json }
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
      get_slot_buy_bonus_quote: {
        Args: { _bet_phon: number; _game_code: string }
        Returns: Json
      }
      get_slot_leaderboard: {
        Args: {
          _game_code?: string
          _limit?: number
          _metric?: string
          _window?: string
        }
        Returns: {
          game_code: string
          masked_name: string
          max_multiplier: number
          max_payout: number
          net: number
          rank: number
          spin_count: number
          total_bet: number
          total_payout: number
        }[]
      }
      get_slot_sound_pack: {
        Args: { _theme: string }
        Returns: {
          cue: string
          url: string
          version: number
        }[]
      }
      get_slot_tournament_leaderboard: {
        Args: { _limit?: number; _tournament_id?: string }
        Returns: {
          is_me: boolean
          nickname_masked: string
          prize_estimate: number
          rank: number
          spins: number
          total_payout: number
          user_id: string
        }[]
      }
      get_starter_trust_stats: { Args: never; Returns: Json }
      get_tier_distribution: {
        Args: never
        Returns: {
          tier: Database["public"]["Enums"]["user_tier"]
          total_balance: number
          users: number
        }[]
      }
      get_top_emperor_24h: {
        Args: never
        Returns: {
          empire_level: number
          flag: string
          total_crown: number
          user_mask: string
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
      get_tournament_leaderboard: {
        Args: { _limit?: number; _overlay_token: string }
        Returns: {
          crown_count: number
          masked_name: string
          rank: number
          score: number
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
      get_whale_strikes_vip_preview: {
        Args: { _limit?: number }
        Returns: Json
      }
      get_world_domination_stats: { Args: never; Returns: Json }
      ghost_cleanup_expired: { Args: never; Returns: undefined }
      ghost_pulse_run: { Args: never; Returns: undefined }
      ghost_reset_daily: { Args: never; Returns: undefined }
      ghost_tick: {
        Args: {
          _active_now: number
          _live_delta: number
          _region_inc: Json
          _wd_delta: number
        }
        Returns: undefined
      }
      grant_nft_for_deposit: {
        Args: { _is_first: boolean; _phon: number; _ref: string; _user: string }
        Returns: Json
      }
      grant_phon_for_deposit: {
        Args: { _phon: number; _ref: string; _user: string }
        Returns: number
      }
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
      is_vip_active: { Args: { _uid: string }; Returns: boolean }
      issue_line_link_token: { Args: never; Returns: string }
      join_guild: { Args: { _guild_id: string }; Returns: boolean }
      jsonb_object_keys_count: { Args: { _obj: Json }; Returns: number }
      latest_chaos_run: { Args: never; Returns: Json }
      leave_guild: { Args: never; Returns: boolean }
      list_admin_recovery_requests: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          approvals: Json
          created_at: string
          id: string
          reason: string
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_recovery_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_my_api_keys: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          id: string
          last_used_at: string
          name: string
          prefix: string
          rate_limit_per_min: number
          revoked_at: string
          scopes: string[]
        }[]
      }
      list_nft: {
        Args: { _nft_id: string; _price_phon: number }
        Returns: Json
      }
      list_public_function_names: {
        Args: never
        Returns: {
          proname: string
        }[]
      }
      live_account_equity: { Args: { p_user_id: string }; Returns: Json }
      live_adjust_isolated_margin: {
        Args: { p_delta_margin: number; p_position_id: string }
        Returns: Json
      }
      live_close_position: {
        Args: { p_mark_price: number; p_position_id: string }
        Returns: Json
      }
      live_get_cross_summary: { Args: never; Returns: Json }
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
      live_open_position:
        | {
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
        | {
            Args: {
              p_allocated_margin?: number
              p_client_request_id?: string
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
      live_pre_trade_validate: { Args: { p_symbol: string }; Returns: Json }
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
      log_admin_action: {
        Args: {
          _action: string
          _payload?: Json
          _target_id?: string
          _target_type?: string
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
      log_inbound_press: { Args: { _referrer: string }; Returns: undefined }
      log_lpi_audit_failure: {
        Args: {
          p_client_request_id: string
          p_error_code: string
          p_meta?: Json
        }
        Returns: string
      }
      log_share_event: {
        Args: {
          _action: string
          _channel?: string
          _payload?: Json
          _trigger: string
        }
        Returns: number
      }
      log_vip_arrival: { Args: never; Returns: Json }
      mark_fomo_notification_read: { Args: { _id: string }; Returns: boolean }
      mark_handbook_step: { Args: { _step: string }; Returns: Json }
      mark_reactivation_event: {
        Args: { _event: string; _send_id: string }
        Returns: undefined
      }
      mask_nickname: { Args: { _nick: string }; Returns: string }
      monitor_lpi_stuck_reserved: { Args: never; Returns: number }
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
      pay_emperor_daily_dividend: { Args: never; Returns: Json }
      pay_weekly_leaderboard: { Args: never; Returns: Json }
      pay_weekly_leaderboard_dry_run: { Args: never; Returns: Json }
      pin_lockout_status: { Args: { _user?: string }; Returns: Json }
      pin_record_attempt: { Args: { _success: boolean }; Returns: Json }
      policy_assertions_status: { Args: never; Returns: Json }
      progress_daily_combo: { Args: { _step: string }; Returns: Json }
      prune_api_usage_counters: { Args: never; Returns: number }
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
      purchase_avatar: { Args: { _avatar_id: string }; Returns: Json }
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
      reclaim_stale_intents: { Args: never; Returns: number }
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
      reject_admin_recovery: {
        Args: { _reason: string; _request_id: string }
        Returns: undefined
      }
      request_admin_recovery: {
        Args: { _reason: string; _target: string }
        Returns: string
      }
      request_bequest: {
        Args: {
          _asset_kind: string
          _link_id: string
          _nft_id?: string
          _phon_amount?: number
        }
        Returns: Json
      }
      request_dynasty_link: { Args: { _child_email: string }; Returns: Json }
      request_my_briefing_context: { Args: never; Returns: Json }
      request_refund: {
        Args: { _reason: string }
        Returns: {
          admin_id: string | null
          admin_memo: string | null
          amount_krw: number
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "refund_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      require_admin: { Args: never; Returns: undefined }
      reset_daily_mission_count: { Args: never; Returns: undefined }
      reset_withdraw_pin: {
        Args: { _method: string; _new_pin: string }
        Returns: Json
      }
      resolve_support_thread: {
        Args: { _note?: string; _thread_id: string }
        Returns: undefined
      }
      revoke_api_key: { Args: { _id: string }; Returns: undefined }
      risk_engine_log: {
        Args: {
          p_leverage: number
          p_reason?: string
          p_rpi: number
          p_safety_distance: number
          p_status: string
          p_symbol: string
        }
        Returns: undefined
      }
      risk_engine_log_sim: {
        Args: {
          p_event_type: string
          p_leverage: number
          p_reason?: string
          p_rpi: number
          p_safety_distance: number
          p_status: string
          p_symbol: string
        }
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
      run_reactivation_campaigns: { Args: never; Returns: Json }
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
      set_main_nft: { Args: { _nft_id: string }; Returns: Json }
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
      settle_due_slot_tournaments: { Args: never; Returns: number }
      settle_ended_founding_seasons: { Args: never; Returns: number }
      settle_founding_season: { Args: { _season_id: string }; Returns: Json }
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
      spend_phon_for_booster: { Args: never; Returns: Json }
      spend_phon_for_crown_boost: { Args: never; Returns: Json }
      spend_phon_for_fee_discount: { Args: { _amount: number }; Returns: Json }
      spin_roulette: { Args: { _kind: string }; Returns: Json }
      spin_slot_demo: {
        Args: {
          _bet_chips: number
          _client_seed: string
          _game_code: string
          _is_buy_bonus?: boolean
        }
        Returns: Json
      }
      spin_slot_real: {
        Args: {
          _bet_phon: number
          _client_seed: string
          _game_code: string
          _is_buy_bonus?: boolean
        }
        Returns: Json
      }
      start_ai_bot_run: {
        Args: {
          _kind: Database["public"]["Enums"]["ai_bot_kind"]
          _prompt: string
        }
        Returns: Json
      }
      start_cash_loop_session: {
        Args: { _token: string }
        Returns: {
          completed_at: string | null
          converted_at: string | null
          created_at: string
          id: string
          is_simulated: boolean
          phase: string
          session_token: string
          sim_balance: number
          sim_pnl: number
          started_at: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cash_loop_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
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
      subscribe_vip_pass_phon:
        | { Args: never; Returns: Json }
        | { Args: { _tier?: string }; Returns: Json }
      take_phon_snapshot: { Args: never; Returns: Json }
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
      tournament_tick: { Args: never; Returns: number }
      track_campaign_click: {
        Args: { _anon_id?: string; _slug: string }
        Returns: string
      }
      track_influencer_click: {
        Args: { _code: string; _fingerprint?: string; _referrer?: string }
        Returns: boolean
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
      try_jackpot_hit: {
        Args: { _bet_phon: number; _game_code: string; _spin_id: string }
        Returns: {
          amount_phon: number
          hit: boolean
          pool_after: number
        }[]
      }
      unfreeze_expired: { Args: never; Returns: Json }
      unlock_achievement: { Args: { _key: string }; Returns: Json }
      update_bot_ratio_phase: { Args: never; Returns: undefined }
      upsert_daily_briefing: {
        Args: { _cards: Json; _context: Json; _model: string; _user_id: string }
        Returns: number
      }
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
      verify_and_meter_api_key: {
        Args: { _full_secret: string; _prefix: string }
        Returns: {
          allowed: boolean
          current_count: number
          key_id: string
          rate_limit_per_min: number
          reason: string
          remaining: number
          scopes: string[]
          user_id: string
        }[]
      }
      verify_weekly_pass_finalize: {
        Args: { _iso_week?: string }
        Returns: Json
      }
      verify_withdraw_otp: { Args: { _code: string }; Returns: Json }
      war_get_current_session: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_simulated: boolean
          participants: number
          prize_phon: number
          settled_at: string | null
          slot_ends_at: string
          slot_starts_at: string
          status: string
          winner_pnl_pct: number | null
          winner_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "war_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      war_get_leaderboard: {
        Args: { _limit?: number; _session_id?: string }
        Returns: {
          combo_max: number
          display_name: string
          is_self: boolean
          rank: number
          sim_pnl_pct: number
        }[]
      }
      war_join_session: {
        Args: never
        Returns: {
          combo_max: number
          display_name: string | null
          id: string
          is_simulated: boolean
          joined_at: string
          near_miss_count: number
          prize_phon: number
          session_id: string
          settled_at: string | null
          sim_pnl_pct: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "war_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      war_record_pnl: {
        Args: { _combo?: number; _near_miss?: number; _pnl_pct: number }
        Returns: {
          combo_max: number
          display_name: string | null
          id: string
          is_simulated: boolean
          joined_at: string
          near_miss_count: number
          prize_phon: number
          session_id: string
          settled_at: string | null
          sim_pnl_pct: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "war_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      war_settle_session: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          id: string
          is_simulated: boolean
          participants: number
          prize_phon: number
          settled_at: string | null
          slot_ends_at: string
          slot_starts_at: string
          status: string
          winner_pnl_pct: number | null
          winner_user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "war_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      xp_for_level: { Args: { _level: number }; Returns: number }
    }
    Enums: {
      ai_bot_kind: "content" | "trading" | "image"
      ai_bot_status: "running" | "ready" | "claimed" | "failed" | "expired"
      app_role: "admin" | "user"
      deposit_method: "bank" | "coin" | "voucher"
      deposit_status: "pending" | "approved" | "rejected" | "cancelled"
      live_idem_status: "reserved" | "completed" | "failed"
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
      live_idem_status: ["reserved", "completed", "failed"],
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
