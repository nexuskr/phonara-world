# Trading ↔ Wallet Contract (Balance Interaction Rules)

**Status**: Draft / Proposed  
**Date**: 2026-05-22  
**Goal**: Define clear rules for how Trading system interacts with Wallet/Balance

## Overview

This document defines the expected behavior between the **Trading Engine** and the **Wallet System** (`wallet_balances`).

Goal: Ensure consistency, prevent race conditions, and make balance updates predictable and auditable.

## Core Principles

1. `wallet_balances` is the Single Source of Truth for general wallet state.
2. All balance mutations related to Trading must go through secure, atomic backend operations (RPC or Database Functions).
3. Frontend should **never** directly update balance during trading.
4. `available_balance` and `locked_balance` must always satisfy: `available_balance + locked_balance ≤ total_balance`

## Position Lifecycle & Balance Rules

### 1. Opening a Position (Long / Short)

**Required Actions:**
- Check if user has enough `available_balance`
- Move the required margin from `available_balance` → `locked_balance`
- Create position record (`live_positions`)

**Recommended Implementation:**
- Use a single atomic RPC (e.g. `open_trading_position`)
- The RPC should perform:
  1. Balance check + lock
  2. Position creation
  3. Transaction logging

**Failure Handling:**
- If position creation fails after locking → automatically release locked balance (or use DB transaction)

### 2. Closing a Position (Manual / Liquidation)

**Required Actions:**
- Calculate realized PnL
- Release locked margin back to `available_balance`
- Apply PnL to `available_balance` (or `total_balance`)
- Update position status

**Recommended Implementation:**
- Use atomic RPC (e.g. `close_trading_position` or `settle_trading_position`)
- Should handle both profit and loss cases cleanly

**Important:**
- PnL application and locked balance release should happen **atomically** in one operation.

### 3. Liquidation

**Rules:**
- When `available_balance + locked_balance` becomes insufficient to maintain position
- System should automatically close the position
- Remaining locked balance should be used to cover losses
- Any remaining balance after loss should be returned to `available_balance`

## Balance Fields Behavior

| Field                | Opening Position          | Closing Position (Profit)     | Closing Position (Loss)      | Notes |
|----------------------|---------------------------|-------------------------------|------------------------------|-------|
| `available_balance`  | Decrease (margin lock)    | Increase (release + PnL)      | Increase (remaining after loss) | - |
| `locked_balance`     | Increase                  | Decrease (full release)       | Decrease                     | Should become 0 after close |
| `total_balance`      | No change                 | Increase (by PnL)             | Decrease (by loss)           | Reflects realized PnL |

## Recommended RPCs (Future)

- `open_trading_position(user_id, symbol, side, size, leverage)`
- `close_trading_position(position_id)`
- `get_position_risk(user_id)` — for liquidation checks
- `liquidate_position(position_id)`

## Current State & Gaps

- Currently, trading settlement logic appears to live mostly in Backend.
- Frontend has a "safety net" subscription to `live_trade_history` in `use-wallet.ts`.
- There is no clear, documented contract between Trading and Wallet yet.

**Goal of this document**: Establish this contract so future development (especially Backend) can follow clear rules.

## Next Steps

1. Review and agree on this contract
2. Implement atomic RPCs for position open/close
3. Remove or minimize frontend safety net logic once backend guarantees consistency
4. Add proper audit logging for all trading-related balance changes

## Notes

This contract prioritizes **correctness and safety** over short-term development speed.
It aligns with how professional trading platforms (Bybit, Binance, etc.) handle margin and balance.