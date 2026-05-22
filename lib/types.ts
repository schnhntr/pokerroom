export type SettlementMode = "peer" | "bank";
export type SettlementInputMode = "chips" | "cash";

export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
};

export type BuyInRule = {
  id: string;
  label: string;
  cashAmount: number;
  chipsReceived: number;
};

export type BuyInEntry = {
  buyInRuleId: string;
  quantity: number;
};

export type Player = {
  id: string;
  name: string;
  buyIns: BuyInEntry[];
  exitChips?: number;
  exitCash?: number;
  settlementsComplete?: boolean[];
};

export type GameSetup = {
  name: string;
  currency: string;
  settlementMode: SettlementMode;
  inputMode: SettlementInputMode;
};

export type GameState = {
  game: GameSetup;
  buyInRules: BuyInRule[];
  players: Player[];
  bankPlayerId: string | null;
  completedSettlementKeys: string[];
};

export type PlayerComputed = {
  playerId: string;
  name: string;
  cashIn: number;
  chipsIn: number;
  exitChips: number | null;
  exitCash: number | null;
  finalValue: number;
  net: number;
};

export type SettlementTransaction = {
  id: string;
  key: string;
  fromPlayerId: string;
  fromName: string;
  toPlayerId: string;
  toName: string;
  amount: number;
  completed: boolean;
};

export type SettlementSummary = {
  totalCash: number;
  totalChips: number;
  chipValue: number | null;
  playerBreakdown: PlayerComputed[];
  settlements: SettlementTransaction[];
};
