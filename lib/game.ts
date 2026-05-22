import Decimal from "decimal.js";

import { BuyInRule, GameState, Player, PlayerComputed, SettlementSummary, SettlementTransaction } from "@/lib/types";
import { createId } from "@/lib/id";

function getPlayerTotals(player: Player, rules: BuyInRule[]) {
  return player.buyIns.reduce(
    (acc, entry) => {
      const rule = rules.find((item) => item.id === entry.buyInRuleId);
      if (!rule || entry.quantity <= 0) {
        return acc;
      }

      const quantity = new Decimal(entry.quantity);
      return {
        cashIn: acc.cashIn.plus(new Decimal(rule.cashAmount).mul(quantity)),
        chipsIn: acc.chipsIn.plus(new Decimal(rule.chipsReceived).mul(quantity))
      };
    },
    { cashIn: new Decimal(0), chipsIn: new Decimal(0) }
  );
}

function toNumber(value: Decimal) {
  return Number(value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
}

export function validateGameState(state: GameState) {
  const issues: string[] = [];

  if (!state.game.currency) {
    issues.push("Choose a currency.");
  }

  if (state.buyInRules.length === 0) {
    issues.push("Add at least one buy-in rule.");
  }
  if (state.buyInRules.length > 20) {
    issues.push("Use at most 20 buy-in rules.");
  }

  if (state.players.length === 0) {
    issues.push("Add at least one player.");
  }
  if (state.players.length > 50) {
    issues.push("Use at most 50 players.");
  }

  for (const rule of state.buyInRules) {
    if (rule.cashAmount <= 0 || rule.chipsReceived <= 0) {
      issues.push(`Buy-in rule "${rule.label}" must have cash and chips above zero.`);
    }
  }

  const names = new Set<string>();
  for (const player of state.players) {
    const key = player.name.trim().toLowerCase();
    if (!key) {
      issues.push("Every player needs a name.");
    }
    if (player.name.length > 40) {
      issues.push(`${player.name} is longer than 40 characters.`);
    }
    if (names.has(key)) {
      issues.push(`Duplicate player name: ${player.name}`);
    }
    names.add(key);
  }

  if (state.game.inputMode === "chips") {
    const totalIssuedChips = state.players.reduce((sum, player) => {
      const totals = getPlayerTotals(player, state.buyInRules);
      return sum.plus(totals.chipsIn);
    }, new Decimal(0));

    if (totalIssuedChips.eq(0)) {
      issues.push("Issue chips before using chips remaining mode.");
    }
  }

  return issues;
}

export function computeSettlement(state: GameState): SettlementSummary {
  const playerBreakdown: PlayerComputed[] = [];
  const totalCashDecimal = new Decimal(0);
  const totalChipsDecimal = new Decimal(0);
  let totalCash = totalCashDecimal;
  let totalChips = totalChipsDecimal;

  for (const player of state.players) {
    const totals = getPlayerTotals(player, state.buyInRules);
    totalCash = totalCash.plus(totals.cashIn);
    totalChips = totalChips.plus(totals.chipsIn);
  }

  const chipValue =
    state.game.inputMode === "chips" && totalChips.gt(0)
      ? totalCash.div(totalChips)
      : null;

  for (const player of state.players) {
    const totals = getPlayerTotals(player, state.buyInRules);
    const finalValue =
      state.game.inputMode === "chips"
        ? chipValue
          ? chipValue.mul(player.exitChips ?? 0)
          : new Decimal(0)
        : new Decimal(player.exitCash ?? 0);

    const net = finalValue.minus(totals.cashIn);

    playerBreakdown.push({
      playerId: player.id,
      name: player.name,
      cashIn: toNumber(totals.cashIn),
      chipsIn: toNumber(totals.chipsIn),
      exitChips: state.game.inputMode === "chips" ? (player.exitChips ?? 0) : null,
      exitCash: state.game.inputMode === "cash" ? (player.exitCash ?? 0) : null,
      finalValue: toNumber(finalValue),
      net: toNumber(net)
    });
  }

  const settlements = optimizeSettlements(
    playerBreakdown,
    state.bankPlayerId,
    state.game.settlementMode,
    state.completedSettlementKeys
  );

  return {
    totalCash: toNumber(totalCash),
    totalChips: toNumber(totalChips),
    chipValue: chipValue ? toNumber(chipValue) : null,
    playerBreakdown,
    settlements
  };
}

function optimizeSettlements(
  players: PlayerComputed[],
  bankPlayerId: string | null,
  settlementMode: GameState["game"]["settlementMode"],
  completedSettlementKeys: string[]
) {
  const settlements: SettlementTransaction[] = [];
  const creditors = players
    .filter((player) => player.net > 0.004)
    .map((player) => ({ ...player, remaining: new Decimal(player.net) }))
    .sort((a, b) => b.net - a.net);
  const debtors = players
    .filter((player) => player.net < -0.004)
    .map((player) => ({ ...player, remaining: new Decimal(player.net).abs() }))
    .sort((a, b) => b.remaining.minus(a.remaining).toNumber());

  if (settlementMode === "bank" && bankPlayerId) {
    const bank = players.find((player) => player.playerId === bankPlayerId) ?? players[0];
    if (bank) {
      for (const debtor of debtors) {
        const amount = toNumber(debtor.remaining);
        const key = `${debtor.playerId}:${bank.playerId}:${amount.toFixed(2)}`;
        settlements.push({
          id: createId("settlement"),
          key,
          fromPlayerId: debtor.playerId,
          fromName: debtor.name,
          toPlayerId: bank.playerId,
          toName: `${bank.name} (Bank)`,
          amount,
          completed: completedSettlementKeys.includes(key)
        });
      }
      for (const creditor of creditors) {
        const amount = toNumber(creditor.remaining);
        const key = `${bank.playerId}:${creditor.playerId}:${amount.toFixed(2)}`;
        settlements.push({
          id: createId("settlement"),
          key,
          fromPlayerId: bank.playerId,
          fromName: `${bank.name} (Bank)`,
          toPlayerId: creditor.playerId,
          toName: creditor.name,
          amount,
          completed: completedSettlementKeys.includes(key)
        });
      }
      return settlements;
    }
  }

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = Decimal.min(creditor.remaining, debtor.remaining);

    const roundedAmount = toNumber(amount);
    const key = `${debtor.playerId}:${creditor.playerId}:${roundedAmount.toFixed(2)}`;
    settlements.push({
      id: createId("settlement"),
      key,
      fromPlayerId: debtor.playerId,
      fromName: debtor.name,
      toPlayerId: creditor.playerId,
      toName: creditor.name,
      amount: roundedAmount,
      completed: completedSettlementKeys.includes(key)
    });

    creditor.remaining = creditor.remaining.minus(amount);
    debtor.remaining = debtor.remaining.minus(amount);

    if (creditor.remaining.lte(0.004)) {
      creditorIndex += 1;
    }
    if (debtor.remaining.lte(0.004)) {
      debtorIndex += 1;
    }
  }

  return settlements;
}

export function buildSettlementShareText(state: GameState, summary: SettlementSummary, locale = "en-IN") {
  const lines = [
    state.game.name.trim() || "Poker Room Settlement",
    `${state.game.inputMode === "chips" ? "Chips Remaining" : "Cash Taken"} • ${
      state.game.settlementMode === "peer" ? "Peer-to-peer" : "Bank settlement"
    }`,
    `Total cash: ${new Intl.NumberFormat(locale, { style: "currency", currency: state.game.currency }).format(summary.totalCash)}`
  ];

  if (summary.chipValue !== null) {
    lines.push(
      `Chip value: ${new Intl.NumberFormat(locale, {
        style: "currency",
        currency: state.game.currency,
        maximumFractionDigits: 4
      }).format(summary.chipValue)}`
    );
  }

  lines.push("", "Settlements:");

  if (summary.settlements.length === 0) {
    lines.push("Everyone is settled.");
  } else {
    for (const transaction of summary.settlements) {
      lines.push(
        `${transaction.fromName} pays ${transaction.toName} ${new Intl.NumberFormat(locale, {
          style: "currency",
          currency: state.game.currency
        }).format(transaction.amount)}`
      );
    }
  }

  return lines.join("\n");
}
