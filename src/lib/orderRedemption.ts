// Shared by member history, admin history and fulfilment responses. Aggregate
// before joining so duplicate redemption rows cannot duplicate an order.
export const ORDER_REDEMPTION_JOIN_SQL = `
  LEFT JOIN (
    SELECT order_id, COUNT(*) AS redeem_count,
           MIN(user_id) AS user_id, MIN(amount) AS amount
    FROM miles_transactions
    WHERE type = 'redeem'
    GROUP BY order_id
  ) original_redemption ON original_redemption.order_id = o.id
`;

// The ledger already stores the whole order's debit. Never multiply it by
// quantity again, net it against refunds or fall back to today's product price.
export const ORDER_MILEAGE_COST_SQL = `
  CASE WHEN original_redemption.redeem_count = 1
         AND original_redemption.user_id = o.user_id
         AND typeof(original_redemption.amount) = 'integer'
         AND original_redemption.amount BETWEEN -9007199254740991 AND -1
       THEN -original_redemption.amount
       ELSE NULL
  END
`;
