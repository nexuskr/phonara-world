# RPC: close_trading_position

**Status**: Draft  
**Priority**: Critical  
**Related**: trading-wallet-contract.md, rpc-open-trading-position.md

## Purpose

Close an existing trading position (manually or via liquidation) and correctly apply the realized PnL while releasing the locked margin.

This is equally critical as opening a position because it directly affects the user's final balance.

## Input Parameters

| Parameter      | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `position_id`  | uuid     | Yes      | ID of the position to close |
| `close_price`  | numeric  | No       | Price at which to close (if not provided, use current market price) |

## Preconditions

- Position must exist and belong to the authenticated user
- Position status must be `open`
- Position must not be already in the process of closing

## Balance Logic (on Success)

1. Calculate `realized_pnl` based on entry price, close price, size, and side
2. Release the full `locked_balance` back to `available_balance`
3. Apply `realized_pnl` to `available_balance` (add if profit, subtract if loss)
4. `total_balance` should reflect the net change from PnL

**This entire process must be atomic.**

## Success Response

```json
{
  "success": true,
  "position_id": "uuid",
  "realized_pnl": 123.45,
  "released_margin": 500.00,
  "new_available_balance": 9876.54,
  "new_locked_balance": 0
}
```

## Error Responses

| Error Code                  | Meaning                           |
|-----------------------------|-----------------------------------|
| `position_not_found`        | Position does not exist or closed |
| `position_already_closed`   | Position is already closed        |
| `calculation_error`         | Failed to calculate PnL           |
| `internal_error`            | Unexpected error                  |

## Key Requirements

- Must be fully atomic (use DB transaction)
- Must handle both profit and loss scenarios correctly
- Must release 100% of the locked margin
- Should log the PnL and balance changes for audit

## Frontend Responsibilities

- Call this RPC to close positions
- Do not manually adjust balance on the client
- After successful close, refresh wallet state
- Show clear feedback (PnL amount, new balance)

## Implementation Notes

- This RPC should update the position record (status, close_price, realized_pnl, closed_at)
- Consider separating PnL application and margin release into clear steps inside a transaction
- For liquidation, this RPC (or a variant) should be callable by the system

## Future Enhancements

- Partial close support
- Close with specific take-profit / stop-loss price
- Detailed PnL breakdown in response

## Success Criteria

- After closing, `locked_balance` for that position becomes 0
- `available_balance` correctly reflects released margin + PnL
- No balance inconsistency even if the operation is retried
- Clear audit trail exists