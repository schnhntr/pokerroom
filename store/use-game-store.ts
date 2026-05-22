"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createId } from "@/lib/id";
import { ArchivedGame, BuyInRule, GameState, SettlementInputMode, SettlementMode } from "@/lib/types";

type GameStore = GameState & {
  gameHistory: ArchivedGame[];
  setGameMeta: (payload: Partial<GameState["game"]>) => void;
  addRule: (rule: Omit<BuyInRule, "id">) => void;
  updateRule: (id: string, rule: Omit<BuyInRule, "id">) => void;
  deleteRule: (id: string) => void;
  moveRule: (id: string, direction: "up" | "down") => void;
  addPlayer: (name: string) => void;
  updatePlayer: (id: string, name: string) => void;
  deletePlayer: (id: string) => void;
  movePlayer: (id: string, direction: "up" | "down") => void;
  setPlayerBuyInQuantity: (playerId: string, ruleId: string, quantity: number) => void;
  setExitValue: (playerId: string, value: number | undefined) => void;
  setBankPlayerId: (playerId: string | null) => void;
  toggleSettlementComplete: (key: string) => void;
  saveCurrentGameToHistory: () => void;
  deleteHistoryGame: (id: string) => void;
  loadHistoryGame: (id: string) => void;
  resetGame: () => void;
};

const initialGame = (): GameState => ({
  game: {
    name: "",
    currency: "INR",
    settlementMode: "peer" satisfies SettlementMode,
    inputMode: "chips" satisfies SettlementInputMode
  },
  buyInRules: [
    { id: createId("rule"), label: "Standard", cashAmount: 500, chipsReceived: 1000 },
    { id: createId("rule"), label: "Deep Stack", cashAmount: 1000, chipsReceived: 1500 }
  ],
  players: [],
  bankPlayerId: null,
  completedSettlementKeys: []
});

function cloneGameState(state: GameState): GameState {
  return {
    game: { ...state.game },
    buyInRules: state.buyInRules.map((rule) => ({ ...rule })),
    players: state.players.map((player) => ({
      ...player,
      buyIns: player.buyIns.map((entry) => ({ ...entry }))
    })),
    bankPlayerId: state.bankPlayerId,
    completedSettlementKeys: [...state.completedSettlementKeys]
  };
}

function updateArrayOrder<T extends { id: string }>(items: T[], id: string, direction: "up" | "down") {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    return items;
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialGame(),
      gameHistory: [],
      setGameMeta: (payload) =>
        set((state) => ({
          game: {
            ...state.game,
            ...payload
          }
        })),
      addRule: (rule) =>
        set((state) => {
          if (state.buyInRules.length >= 20 || rule.cashAmount <= 0 || rule.chipsReceived <= 0) {
            return state;
          }
          return {
            buyInRules: [...state.buyInRules, { ...rule, id: createId("rule"), label: rule.label.trim() || "Buy-In" }]
          };
        }),
      updateRule: (id, rule) =>
        set((state) => {
          if (rule.cashAmount <= 0 || rule.chipsReceived <= 0) {
            return state;
          }
          return {
            buyInRules: state.buyInRules.map((item) =>
              item.id === id ? { ...rule, id, label: rule.label.trim() || "Buy-In" } : item
            )
          };
        }),
      deleteRule: (id) =>
        set((state) => ({
          buyInRules: state.buyInRules.filter((item) => item.id !== id),
          players: state.players.map((player) => ({
            ...player,
            buyIns: player.buyIns.filter((entry) => entry.buyInRuleId !== id)
          }))
        })),
      moveRule: (id, direction) =>
        set((state) => ({
          buyInRules: updateArrayOrder(state.buyInRules, id, direction)
        })),
      addPlayer: (name) =>
        set((state) => {
          const normalizedName = name.trim().slice(0, 40);
          if (!normalizedName || state.players.length >= 50) {
            return state;
          }
          return {
            players: [...state.players, { id: createId("player"), name: normalizedName, buyIns: [] }],
            bankPlayerId: state.bankPlayerId ?? null
          };
        }),
      updatePlayer: (id, name) =>
        set((state) => {
          const normalizedName = name.trim().slice(0, 40);
          if (!normalizedName) {
            return state;
          }
          return {
            players: state.players.map((player) => (player.id === id ? { ...player, name: normalizedName } : player))
          };
        }),
      deletePlayer: (id) =>
        set((state) => ({
          players: state.players.filter((player) => player.id !== id),
          bankPlayerId: state.bankPlayerId === id ? null : state.bankPlayerId
        })),
      movePlayer: (id, direction) =>
        set((state) => ({
          players: updateArrayOrder(state.players, id, direction)
        })),
      setPlayerBuyInQuantity: (playerId, ruleId, quantity) =>
        set((state) => ({
          players: state.players.map((player) => {
            if (player.id !== playerId) {
              return player;
            }

            const existing = player.buyIns.find((entry) => entry.buyInRuleId === ruleId);
            let nextEntries = player.buyIns;

            if (existing) {
              nextEntries = player.buyIns
                .map((entry) =>
                  entry.buyInRuleId === ruleId ? { ...entry, quantity: Math.max(0, quantity) } : entry
                )
                .filter((entry) => entry.quantity > 0);
            } else if (quantity > 0) {
              nextEntries = [...player.buyIns, { buyInRuleId: ruleId, quantity }];
            }

            return {
              ...player,
              buyIns: nextEntries
            };
          })
        })),
      setExitValue: (playerId, value) =>
        set((state) => ({
          players: state.players.map((player) =>
            player.id === playerId
              ? state.game.inputMode === "chips"
                ? { ...player, exitChips: value, exitCash: undefined }
                : { ...player, exitCash: value, exitChips: undefined }
              : player
          )
        })),
      setBankPlayerId: (playerId) =>
        set(() => ({
          bankPlayerId: playerId
        })),
      toggleSettlementComplete: (key) =>
        set((state) => {
          const hasKey = state.completedSettlementKeys.includes(key);
          return {
            completedSettlementKeys: hasKey
              ? state.completedSettlementKeys.filter((item) => item !== key)
              : [...state.completedSettlementKeys, key]
          };
        }),
      saveCurrentGameToHistory: () =>
        set((state) => ({
          gameHistory: [
            {
              id: createId("history"),
              savedAt: new Date().toISOString(),
              snapshot: cloneGameState(state)
            },
            ...state.gameHistory
          ]
        })),
      deleteHistoryGame: (id) =>
        set((state) => ({
          gameHistory: state.gameHistory.filter((game) => game.id !== id)
        })),
      loadHistoryGame: (id) =>
        set((state) => {
          const archivedGame = state.gameHistory.find((game) => game.id === id);
          if (!archivedGame) {
            return state;
          }

          return cloneGameState(archivedGame.snapshot);
        }),
      resetGame: () => set((state) => ({ ...initialGame(), gameHistory: state.gameHistory }))
    }),
    {
      name: "poker-room-game"
    }
  )
);
