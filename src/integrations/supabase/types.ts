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
          referral_code: string | null
          referred_by: string | null
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
          referral_code?: string | null
          referred_by?: string | null
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
          referral_code?: string | null
          referred_by?: string | null
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
          id: string
          invitee_id: string
          inviter_id: string
          signup_bonus_paid: boolean
          total_commission: number
        }
        Insert: {
          code_used: string
          created_at?: string
          id?: string
          invitee_id: string
          inviter_id: string
          signup_bonus_paid?: boolean
          total_commission?: number
        }
        Update: {
          code_used?: string
          created_at?: string
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
      _credit_referral_commission: {
        Args: { _base: number; _invitee: string; _source: string }
        Returns: undefined
      }
      _cron_settle_package_daily: { Args: never; Returns: Json }
      _period_key: { Args: { _period: string }; Returns: string }
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
      apply_referral_code: { Args: { _code: string }; Returns: Json }
      award_xp: { Args: { _amount: number; _source?: Json }; Returns: Json }
      bump_jackpot: { Args: { _amount: number }; Returns: Json }
      bump_quest_metric: {
        Args: { _delta?: number; _metric: string }
        Returns: undefined
      }
      claim_ai_bot_run: { Args: { _run_id: string }; Returns: Json }
      claim_daily_attendance: {
        Args: { user_id: string }
        Returns: {
          new_streak: number
          reward: number
        }[]
      }
      claim_quest: { Args: { _quest_key: string }; Returns: Json }
      claim_season_reward: {
        Args: { _level: number; _track: string }
        Returns: Json
      }
      current_season_id: { Args: never; Returns: string }
      distribute_profit_share: {
        Args: {
          _period_end: string
          _period_start: string
          _pool_total: number
        }
        Returns: Json
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
      gacha_pull: { Args: never; Returns: Json }
      gen_referral_code: { Args: never; Returns: string }
      get_active_boost_count: { Args: never; Returns: number }
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
      get_my_quests: { Args: never; Returns: Json }
      get_next_empire_day: { Args: never; Returns: string }
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
      harvest_machine: { Args: { _purchase_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_season_pass: { Args: never; Returns: Json }
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
      settle_mission: {
        Args: { _base_reward: number; _is_win: boolean; _mission_id: string }
        Returns: Json
      }
      settle_package_daily: { Args: never; Returns: Json }
      spin_roulette: { Args: { _kind: string }; Returns: Json }
      start_ai_bot_run: {
        Args: {
          _kind: Database["public"]["Enums"]["ai_bot_kind"]
          _prompt: string
        }
        Returns: Json
      }
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
      unlock_achievement: { Args: { _key: string }; Returns: Json }
      xp_for_level: { Args: { _level: number }; Returns: number }
    }
    Enums: {
      ai_bot_kind: "content" | "trading" | "image"
      ai_bot_status: "running" | "ready" | "claimed" | "failed" | "expired"
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
      ai_bot_kind: ["content", "trading", "image"],
      ai_bot_status: ["running", "ready", "claimed", "failed", "expired"],
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
