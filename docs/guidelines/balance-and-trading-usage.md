# Balance & Trading Usage Guidelines

**Version**: 1.0  
**Last Updated**: 2026-05-22  
**Purpose**: Define clear rules for how developers should interact with Balance and Trading systems.

## Core Principles

1. `wallet_balances` is the **primary source of truth** for general user wallet state (available, locked, pending).
2. `phon_balances` is dedicated to **PHON token economy** (staking, specific betting, rewards).
3. All financial mutations related to Trading must be **atomic** and performed through secure backend operations.
4. Frontend should minimize direct balance manipulation and rely on backend events + proper hooks.

## When to Use Which Table

| Use Case                        | Recommended Table     | Reason |
|--------------------------------|-----------------------|--------|
| General wallet display         | `wallet_balances`     | Primary wallet |
| Withdrawal / Deposit           | `wallet_balances`     | General funds |
| Trading position margin lock   | `wallet_balances`     | Uses `locked_balance` |
| PHON Staking / Unstaking       | `phon_balances`       | PHON-specific economy |
| Duel betting & settlement      | `phon_balances`       | Existing PHON economy |
| Mission / Reward (PHON)        | `phon_balances`       | PHON token rewards |
| Trading PnL settlement         | `wallet_balances`     | General wallet impact |

## Trading Position Rules

### Opening a Position
- Always use the `open_trading_position` RPC (when implemented)
- Never manually subtract from `available_balance` on the frontend
- The RPC must atomically move margin to `locked_balance`

### Closing a Position
- Always use the `close_trading_position` RPC
- PnL and margin release must happen atomically
- After close, `locked_balance` should return to 0 for that position

### Frontend Responsibilities
- Use `useWallet()` hook as the main source of truth for general balance
- Show loading states during position open/close
- Refresh wallet state after successful RPC calls (via `wallet:refresh` event or hook reload)
- Do **not** optimistically update balance during trading operations

### Backend Responsibilities
- All Trading-related balance changes must be atomic
- Proper validation before locking/unlocking balance
- Clear error handling and logging
- Maintain `available_balance` + `locked_balance` consistency

## Current Temporary Patterns

- `use-wallet.ts` currently has a safety net subscription to `live_trade_history`
- This is a temporary workaround and should be reduced/removed once atomic RPCs are reliable

## Do's and Don'ts

**Do:**
- Use `useWallet()` for general balance
- Call dedicated RPCs for position open/close
- Keep `locked_balance` and `available_balance` logic on the backend
- Log important balance changes

**Don't:**
- Directly update `wallet_balances` or `phon_balances` from frontend
- Mix `wallet_balances` and `phon_balances` logic without clear reason
- Optimistically change balance during trading without confirmation
- Assume balance updates are immediate after trade actions

## Related Documents

- `architecture/balance-system-decision.md`
- `architecture/trading-wallet-contract.md`
- `architecture/trading-wallet-implementation-plan.md`
- `architecture/rpc-open-trading-position.md`
- `architecture/rpc-close-trading-position.md`

## Notes

This guideline will be updated as we implement the atomic RPCs and improve the system.