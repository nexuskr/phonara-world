# Sprint 1 Week 4 — VIP Tiers + Avatar Shop + Guild Foundation

Build the Monetization + Identity + Community layer on top of the existing VIP Pass, Earn Hub, and NFT Collection so users have lasting reasons to stay and spend.

## 1. VIP System — 4 Tiers (Silver / Gold / Platinum / Diamond)

Upgrade the existing single-tier VIP Pass to a tiered ladder driven by cumulative PHON spent on Pass + lifetime deposits.

Tier thresholds (PHON):
- Silver: 30,000 (current Pass entry)
- Gold: 100,000
- Platinum: 300,000
- Diamond: 1,000,000

Benefits matrix:

| Benefit | Silver | Gold | Platinum | Diamond |
|---|---|---|---|---|
| Crown ×N bonus | ×2 | ×3 | ×4 | ×5 |
| Slot fee waiver | 0% | 10% | 25% | 50% |
| Daily free spins | 1 | 3 | 7 | 15 |
| Whale signal pre-reveal | 15s | 30s | 60s | 120s |
| Exclusive lounge | — | yes | yes | yes |
| Personal manager (concierge tag) | — | — | yes | yes |
| Exclusive avatar skin pack | Silver pack | Gold pack | Platinum pack | Diamond pack |
| Priority withdrawal queue | — | yes | yes | yes (top) |
| Event early entry | — | 6h | 24h | 48h |

Backend:
- New table `vip_tier_config(tier, min_phon, crown_mult, fee_waiver_pct, free_spins, whale_lead_seconds, lounge, concierge, withdraw_priority, event_lead_hours, skin_pack)`.
- Extend `vip_passes` with `tier text` (defaults Silver).
- RPC `get_my_vip_tier()` → `{ tier, benefits, next_tier, progress_pct }`.
- Update `subscribe_vip_pass_phon(_amount)` to accept tier amount and compute tier.
- Update `award_crown` / `request_withdrawal` / slot fee RPC to read `crown_mult`, `fee_waiver_pct`, `withdraw_priority`.

Frontend:
- `/vip` rewritten: 4-tier comparison table + current tier badge + upgrade CTA per tier.
- `VipPassBadge` shows tier color (silver/gold/platinum/diamond gradient).
- Lounge entry gate on `/lounge` for Gold+.

## 2. Avatar Shop + NFT Integration (`/avatar`)

Backend:
- `avatar_catalog(id, name, rarity, vip_min_tier, price_phon, nullable nft_source, wearable_bonus jsonb, image_url, limited_edition_cap, sold_count)`.
- `user_avatars(user_id, avatar_id, equipped, acquired_at, acquired_via)` — unique (user_id, avatar_id).
- RPCs (SECURITY DEFINER, search_path=public):
  - `get_avatar_catalog()` → catalog + ownership + eligibility.
  - `purchase_avatar(_id)` → checks PHON, VIP tier, edition cap; debits PHON; inserts row; emits FOMO notification on limited-edition sellout.
  - `equip_avatar(_id)` → sets equipped flag (single equipped per user).
  - `award_avatar_for_bigwin(_user, _amount)` → drops avatar when amount ≥ thresholds.

NFT integration:
- Avatars with `nft_source IS NOT NULL` mirror onto existing `nft_collection` via internal helper so wearable bonus stacks with `get_my_total_boost_pct` (cap 100).
- Big win avatar drop fires `phonara:bigwin` event already wired to share dialog.

Wearable bonuses (`wearable_bonus` jsonb):
- `slot_win_boost_bps`, `free_spins_daily`, `crown_mult_bonus`, `xp_mult`.
- Applied server-side in slot/crown RPCs; client uses `get_my_equipped_avatar()` for display.

Frontend:
- `/avatar` page: grid of cards (rarity ring, VIP gate badge, price chip, limited stock counter, equip button).
- `<EquippedAvatarChip />` in `PhonaraTopBar` next to `VipPassBadge`.

## 3. Guild System Foundation

Backend:
- `guilds(id, name UNIQUE, tag, owner_id, level, xp, total_phon, member_cap, created_at)`.
- `guild_members(guild_id, user_id, role enum[owner|officer|member], joined_at)` unique (user_id) — one guild per user.
- `guild_messages(id, guild_id, user_id, body, created_at)` with RLS member-only.
- `guild_rewards(id, guild_id, kind, amount_phon, distributed_at)`.
- `guild_leaderboard_weekly` materialized via cron.
- RPCs: `create_guild(name,tag)`, `join_guild(id)`, `leave_guild()`, `post_guild_message(body)`, `get_my_guild()`, `get_guild_leaderboard()`, `distribute_guild_rewards()` (cron weekly, splits 5% of guild member fees back).

Frontend:
- `/guild` page: 3 tabs — Home (my guild + chat), Browse (search/join), Leaderboard.
- Realtime chat via `useRealtimeChannel` on `guild_messages`.
- Guild tag rendered next to nickname via `NickWithBadge`.

## 4. Integration & Quality

- Routes added to `App.tsx`: `/avatar`, `/guild` (lazy).
- Nav: extend `BottomNav` / sidebar with Avatar + Guild entries.
- Earn Hub: new mission `join_guild` (one-time +500 PHON) in `claim_daily_quick_reward` whitelist.
- BigWinShareDialog overlays equipped avatar on share image canvas.
- Design tokens only (`--gold`, `--pink`, `--card`, `--text`, `--muted`); 44px+ touch targets; mobile-first grids (1 col → 2 col → 3 col).
- All new RPCs `SECURITY DEFINER SET search_path = public`, idempotent via unique constraints.
- Permission baseline updated; CI drift test will pass.

## Technical notes

- Migrations: one migration file per slice (vip-tiers, avatar-shop, guild-foundation) to keep review small.
- Realtime: add `guild_messages` to `supabase_realtime` publication.
- Memory updates after build: new `mem://features/vip-tiers`, `mem://features/avatar-shop`, `mem://features/guild-foundation`; index Core line updated for VIP tier multipliers.
- Types: regenerated automatically post-migration; never edit `types.ts` manually.
- No new external libs; reuse framer-motion, lucide-react, existing UI primitives.

## File map (new / edited)

New:
- `supabase/migrations/<ts>_vip_tiers.sql`
- `supabase/migrations/<ts>_avatar_shop.sql`
- `supabase/migrations/<ts>_guild_foundation.sql`
- `src/hooks/use-vip-tier.ts`, `use-avatar-shop.ts`, `use-my-guild.ts`
- `src/pages/AvatarShop.tsx`, `src/pages/Guild.tsx`
- `src/components/vip/VipTierTable.tsx`, `VipTierBadge.tsx`
- `src/components/avatar/AvatarCard.tsx`, `EquippedAvatarChip.tsx`
- `src/components/guild/GuildHome.tsx`, `GuildBrowse.tsx`, `GuildLeaderboard.tsx`, `GuildChat.tsx`

Edited:
- `src/pages/Vip.tsx` (4-tier rewrite)
- `src/components/empire/VipPassBadge.tsx` (tier-aware)
- `src/components/nav/PhonaraTopBar.tsx` (equipped avatar chip)
- `src/App.tsx` (routes)
- `src/hooks/use-earn-hub.ts` + Earn page (join_guild mission)
- `src/components/share/BigWinShareDialog.tsx` (avatar overlay)
