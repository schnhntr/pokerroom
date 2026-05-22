"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  History,
  Landmark,
  Eye,
  Plus,
  Receipt,
  RotateCcw,
  Share2,
  Trash2,
  Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { getCurrencyOptions } from "@/lib/currencies";
import { buildSettlementShareText, computeSettlement, validateGameState } from "@/lib/game";
import { formatChipCount, formatCurrency } from "@/lib/format";
import { ArchivedGame, BuyInRule, Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/store/use-game-store";

const steps = [
  "Create Game",
  "Buy-In Rules",
  "Players",
  "Buy-Ins",
  "Settlement Input",
  "Results"
];

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function CurrencyPicker() {
  const currency = useGameStore((state) => state.game.currency);
  const setGameMeta = useGameStore((state) => state.setGameMeta);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currencies = useMemo(() => getCurrencyOptions("en"), []);

  const filtered = currencies.filter((option) => {
    const text = `${option.code} ${option.symbol} ${option.name}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between rounded-2xl">
          <span>{currencies.find((item) => item.code === currency)?.symbol} {currency}</span>
          <span className="text-xs text-muted-foreground">Change</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Choose currency</DialogTitle>
          <DialogDescription>Search any ISO 4217 currency and use one currency for the whole game.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search INR, USD, AED..." />
        </div>
        <ScrollArea className="h-80 px-3 pb-3">
          <div className="space-y-2 px-3">
            {filtered.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setGameMeta({ currency: option.code });
                  setQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  option.code === currency
                    ? "border-primary bg-primary/10 text-white"
                    : "border-white/8 bg-black/10 text-muted-foreground hover:border-white/20 hover:text-white"
                )}
              >
                <div className="font-medium text-white">{option.symbol} {option.code}</div>
                <div className="text-sm">{option.name}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({
  mode,
  rule,
  onSave,
  trigger
}: {
  mode: "create" | "edit";
  rule?: BuyInRule;
  onSave: (rule: Omit<BuyInRule, "id">) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(rule?.label ?? "");
  const [cashAmount, setCashAmount] = useState(String(rule?.cashAmount ?? ""));
  const [chipsReceived, setChipsReceived] = useState(String(rule?.chipsReceived ?? ""));

  useEffect(() => {
    setLabel(rule?.label ?? "");
    setCashAmount(String(rule?.cashAmount ?? ""));
    setChipsReceived(String(rule?.chipsReceived ?? ""));
  }, [rule]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add buy-in rule" : "Edit buy-in rule"}</DialogTitle>
          <DialogDescription>Each rule maps cash paid to chips issued. Keep the names short and table-friendly.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-label">Label</Label>
            <Input id="rule-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Standard" />
          </div>
          <FieldRow>
            <div className="space-y-2">
              <Label htmlFor="rule-cash">Cash amount</Label>
              <Input
                id="rule-cash"
                type="number"
                min="1"
                value={cashAmount}
                onChange={(event) => setCashAmount(event.target.value)}
                placeholder="500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-chips">Chips received</Label>
              <Input
                id="rule-chips"
                type="number"
                min="1"
                value={chipsReceived}
                onChange={(event) => setChipsReceived(event.target.value)}
                placeholder="1000"
              />
            </div>
          </FieldRow>
          <Button
            className="w-full"
            onClick={() => {
              const payload = {
                label: label.trim() || "Buy-In",
                cashAmount: Number(cashAmount) || 0,
                chipsReceived: Number(chipsReceived) || 0
              };
              if (payload.cashAmount <= 0 || payload.chipsReceived <= 0) {
                return;
              }
              onSave(payload);
              setOpen(false);
              if (mode === "create") {
                setLabel("");
                setCashAmount("");
                setChipsReceived("");
              }
            }}
          >
            Save rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlayerDialog({
  player,
  onSave,
  trigger
}: {
  player?: Player;
  onSave: (name: string) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player?.name ?? "");

  useEffect(() => {
    setName(player?.name ?? "");
  }, [player]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{player ? "Edit player" : "Add player"}</DialogTitle>
          <DialogDescription>Use the names everyone already calls each other at the table.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="player-name">Name</Label>
            <Input
              id="player-name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sachin"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              const nextName = name.trim();
              if (!nextName) {
                return;
              }
              onSave(nextName);
              setOpen(false);
              if (!player) {
                setName("");
              }
            }}
          >
            Save player
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GameHistoryDialog({ archivedGame }: { archivedGame: ArchivedGame }) {
  const loadHistoryGame = useGameStore((state) => state.loadHistoryGame);
  const deleteHistoryGame = useGameStore((state) => state.deleteHistoryGame);
  const summary = useMemo(() => computeSettlement(archivedGame.snapshot), [archivedGame]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="h-4 w-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{archivedGame.snapshot.game.name.trim() || "Untitled Game"}</DialogTitle>
          <DialogDescription>
            Saved {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(archivedGame.savedAt))}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <SummaryStats
            summary={summary}
            currency={archivedGame.snapshot.game.currency}
            inputMode={archivedGame.snapshot.game.inputMode}
            settlementMode={archivedGame.snapshot.game.settlementMode}
          />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Settlement</h3>
            {summary.settlements.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-black/15 p-4 text-sm text-muted-foreground">
                Everyone was already settled.
              </div>
            ) : (
              summary.settlements.map((transaction) => (
                <div key={transaction.id} className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                  <div className="text-white">
                    {transaction.fromName} pays {transaction.toName}
                  </div>
                  <div className="mt-1 text-sm text-emerald-100">
                    {formatCurrency(transaction.amount, archivedGame.snapshot.game.currency)}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Players</h3>
            {summary.playerBreakdown.map((player) => (
              <div key={player.playerId} className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-white">{player.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Cash in {formatCurrency(player.cashIn, archivedGame.snapshot.game.currency)} • Final value {formatCurrency(player.finalValue, archivedGame.snapshot.game.currency)}
                    </div>
                  </div>
                  <Badge className={cn(player.net >= 0 ? "text-emerald-100" : "text-rose-100")}>
                    {player.net >= 0 ? "+" : ""}
                    {formatCurrency(player.net, archivedGame.snapshot.game.currency)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => loadHistoryGame(archivedGame.id)}>
              Load Into Active Game
            </Button>
            <Button variant="ghost" onClick={() => deleteHistoryGame(archivedGame.id)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PokerRoomApp() {
  const store = useGameStore();
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const hasActiveContent =
    store.game.name.trim().length > 0 ||
    store.players.length > 0 ||
    store.completedSettlementKeys.length > 0;
  const issues = validateGameState(store);
  const summary = useMemo(
    () =>
      issues.length === 0
        ? computeSettlement({
            game: store.game,
            buyInRules: store.buyInRules,
            players: store.players,
            bankPlayerId: store.bankPlayerId,
            completedSettlementKeys: store.completedSettlementKeys
          })
        : null,
    [issues.length, store.bankPlayerId, store.buyInRules, store.completedSettlementKeys, store.game, store.players]
  );

  function archiveAndStartFresh() {
    if (!hasActiveContent) {
      startFreshWithoutSaving();
      return;
    }
    store.saveCurrentGameToHistory();
    store.resetGame();
    setStep(0);
  }

  function startFreshWithoutSaving() {
    store.resetGame();
    setStep(0);
  }

  async function copySummary() {
    if (!summary) {
      return;
    }

    const text = buildSettlementShareText(store, summary);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareSummary() {
    if (!summary) {
      return;
    }

    const text = buildSettlementShareText(store, summary);
    if (navigator.share) {
      await navigator.share({
        title: store.game.name || "Poker Room Settlement",
        text
      });
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-felt px-5 py-6 shadow-glow sm:px-8 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_80%_0%,rgba(255,215,128,0.12),transparent_22%)]" />
          <div className="relative flex flex-col gap-4">
            <Badge className="w-fit border-emerald-400/20 bg-emerald-400/10 text-emerald-200">Offline-ready settlement app</Badge>
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">Poker Room</h1>
                <p className="max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Run the whole cash-game settlement flow in one place: buy-ins, rebuys, final stacks, and the cleanest possible payout plan.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 rounded-[24px] border border-white/10 bg-black/20 p-3 text-center">
                <Stat label="Players" value={String(store.players.length)} />
                <Stat label="Rules" value={String(store.buyInRules.length)} />
                <Stat label="Mode" value={store.game.inputMode === "chips" ? "Chips" : "Cash"} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={archiveAndStartFresh}>
                <History className="h-4 w-4" />
                Save & New Game
              </Button>
              <Button variant="ghost" onClick={startFreshWithoutSaving}>
                <RotateCcw className="h-4 w-4" />
                Start Fresh
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-6">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition",
                    index === step
                      ? "border-emerald-300/30 bg-emerald-300/12 text-white"
                      : "border-white/10 bg-black/15 text-slate-300 hover:border-white/20 hover:text-white"
                  )}
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                  <div className="mt-1 text-sm font-medium">{label}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr,0.85fr]">
          <div className="space-y-6">
            {step === 0 && (
              <Card>
                <SectionHeading
                  title="Create Game"
                  description="Set the basics once, then everything else stays fast and consistent through the night."
                />
                <div className="mt-5 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="game-name">Game name</Label>
                    <Input
                      id="game-name"
                      placeholder="Friday Freezeout"
                      value={store.game.name}
                      onChange={(event) => store.setGameMeta({ name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <CurrencyPicker />
                  </div>
                  <FieldRow>
                    <ModeToggle
                      title="Settlement mode"
                      value={store.game.settlementMode}
                      items={[
                        { value: "peer", label: "Peer-to-peer", icon: <Users className="h-4 w-4" /> },
                        { value: "bank", label: "Bank settlement", icon: <Landmark className="h-4 w-4" /> }
                      ]}
                      onChange={(value) => store.setGameMeta({ settlementMode: value as "peer" | "bank" })}
                    />
                    <ModeToggle
                      title="Settlement input"
                      value={store.game.inputMode}
                      items={[
                        { value: "chips", label: "Chips remaining", icon: <Receipt className="h-4 w-4" /> },
                        { value: "cash", label: "Cash taken", icon: <Receipt className="h-4 w-4" /> }
                      ]}
                      onChange={(value) => store.setGameMeta({ inputMode: value as "chips" | "cash" })}
                    />
                  </FieldRow>
                  {store.game.settlementMode === "bank" && (
                    <div className="space-y-2">
                      <Label>Bank player</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {store.players.length === 0 && <div className="text-sm text-muted-foreground">Add players first to choose the host bank.</div>}
                        {store.players.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => store.setBankPlayerId(player.id)}
                            className={cn(
                              "rounded-2xl border px-4 py-3 text-left transition",
                              store.bankPlayerId === player.id
                                ? "border-primary bg-primary/10 text-white"
                                : "border-white/10 bg-black/10 text-muted-foreground hover:border-white/20 hover:text-white"
                            )}
                          >
                            {player.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {step === 1 && (
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <SectionHeading
                    title="Buy-In Rules"
                    description="Create the cash-to-chip options your table actually uses, then tap them during rebuys."
                  />
                  <RuleDialog
                    mode="create"
                    onSave={(rule) => store.addRule(rule)}
                    trigger={
                      <Button size="sm" disabled={store.buyInRules.length >= 20}>
                        <Plus className="h-4 w-4" />
                        Add rule
                      </Button>
                    }
                  />
                </div>
                <div className="mt-5 space-y-3">
                  {store.buyInRules.map((rule) => (
                    <div key={rule.id} className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{rule.label}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {formatCurrency(rule.cashAmount, store.game.currency)} for {formatChipCount(rule.chipsReceived)} chips
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={() => store.moveRule(rule.id, "up")}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => store.moveRule(rule.id, "down")}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <RuleDialog
                            mode="edit"
                            rule={rule}
                            onSave={(payload) => store.updateRule(rule.id, payload)}
                            trigger={<Button size="sm" variant="outline">Edit</Button>}
                          />
                          <Button size="sm" variant="ghost" onClick={() => store.deleteRule(rule.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <SectionHeading
                    title="Players"
                    description="Keep names short, warn on duplicates, and reorder the table whenever you want."
                  />
                  <PlayerDialog
                    onSave={(name) => store.addPlayer(name)}
                    trigger={
                      <Button size="sm" disabled={store.players.length >= 50}>
                        <Plus className="h-4 w-4" />
                        Add player
                      </Button>
                    }
                  />
                </div>
                <div className="mt-5 space-y-3">
                  {store.players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between rounded-[24px] border border-white/10 bg-black/15 p-4">
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-sm text-muted-foreground">{player.buyIns.length} buy-in entries</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => store.movePlayer(player.id, "up")}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => store.movePlayer(player.id, "down")}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <PlayerDialog
                          player={player}
                          onSave={(name) => store.updatePlayer(player.id, name)}
                          trigger={<Button size="sm" variant="outline">Edit</Button>}
                        />
                        <Button size="sm" variant="ghost" onClick={() => store.deletePlayer(player.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <SectionHeading
                  title="Track Buy-Ins"
                  description="Tap in rebuys quickly per player. Quantities update the cash pot and chip pool automatically."
                />
                <div className="mt-5 space-y-4">
                  {store.players.map((player) => (
                    <div key={player.id} className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="font-medium text-white">{player.name}</div>
                        <PlayerTotals player={player} />
                      </div>
                      <div className="space-y-3">
                        {store.buyInRules.map((rule) => {
                          const quantity = player.buyIns.find((entry) => entry.buyInRuleId === rule.id)?.quantity ?? 0;
                          return (
                            <div key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/6 bg-black/20 px-3 py-3">
                              <div>
                                <div className="font-medium text-white">{rule.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatCurrency(rule.cashAmount, store.game.currency)} for {formatChipCount(rule.chipsReceived)} chips
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => store.setPlayerBuyInQuantity(player.id, rule.id, Math.max(0, quantity - 1))}
                                >
                                  -
                                </Button>
                                <div className="w-10 text-center text-lg font-semibold">{quantity}</div>
                                <Button
                                  size="icon"
                                  onClick={() => store.setPlayerBuyInQuantity(player.id, rule.id, quantity + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 4 && (
              <Card>
                <SectionHeading
                  title={store.game.inputMode === "chips" ? "Enter Final Chip Counts" : "Enter Cash Taken"}
                  description={
                    store.game.inputMode === "chips"
                      ? "Record each player’s stack and the app will value chips automatically."
                      : "Record actual cashouts and skip chip valuation entirely."
                  }
                />
                <div className="mt-5 space-y-3">
                  {store.players.map((player) => (
                    <div key={player.id} className="grid gap-3 rounded-[24px] border border-white/10 bg-black/15 p-4 sm:grid-cols-[1fr,180px] sm:items-center">
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {store.game.inputMode === "chips" ? "Final chips" : "Cashout amount"}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        value={store.game.inputMode === "chips" ? String(player.exitChips ?? "") : String(player.exitCash ?? "")}
                        onChange={(event) =>
                          store.setExitValue(player.id, event.target.value === "" ? undefined : Number(event.target.value))
                        }
                        placeholder={store.game.inputMode === "chips" ? "0" : "0.00"}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {step === 5 && (
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <SectionHeading
                    title="Settlement Results"
                    description="Review the math, then copy or share the exact payment instructions."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={copySummary} disabled={!summary}>
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="outline" onClick={shareSummary} disabled={!summary}>
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="ghost" onClick={startFreshWithoutSaving}>
                      <RotateCcw className="h-4 w-4" />
                      Start fresh
                    </Button>
                    <Button variant="ghost" onClick={archiveAndStartFresh} disabled={!summary}>
                      <History className="h-4 w-4" />
                      Save & New Game
                    </Button>
                  </div>
                </div>
                {!summary ? (
                  <div className="mt-5 rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                    Fix the items in the side panel to generate settlement results.
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    <SummaryStats summary={summary} currency={store.game.currency} inputMode={store.game.inputMode} settlementMode={store.game.settlementMode} />
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Settlement Cards</h3>
                      {summary.settlements.length === 0 ? (
                        <div className="rounded-[24px] border border-white/10 bg-black/15 p-5 text-sm text-muted-foreground">
                          Everyone is already square.
                        </div>
                      ) : (
                        summary.settlements.map((transaction) => (
                          <button
                            key={transaction.id}
                            type="button"
                            onClick={() => store.toggleSettlementComplete(transaction.key)}
                            className={cn(
                              "w-full rounded-[24px] border p-4 text-left transition",
                              transaction.completed
                                ? "border-white/10 bg-black/20 opacity-70"
                                : "border-emerald-400/20 bg-emerald-400/10"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-[0.16em] text-emerald-200/70">Transaction</div>
                                <div className="mt-2 text-xl font-semibold text-white">
                                  {transaction.fromName} pays {transaction.toName}
                                </div>
                                <div className="mt-1 text-lg text-emerald-100">
                                  {formatCurrency(transaction.amount, store.game.currency)}
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full border",
                                  transaction.completed
                                    ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
                                    : "border-white/10 bg-black/20 text-muted-foreground"
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardTitle>Table status</CardTitle>
              <CardDescription className="mt-1">The app keeps the active game in local storage, so refreshes and reopens are safe.</CardDescription>
              <div className="mt-4 space-y-3">
                <MiniStat label="Currency" value={store.game.currency} />
                <MiniStat label="Mode" value={store.game.settlementMode === "peer" ? "Peer-to-peer" : "Bank"} />
                <MiniStat label="Input" value={store.game.inputMode === "chips" ? "Chips remaining" : "Cash taken"} />
              </div>
            </Card>

            <Card>
              <CardTitle>Game History</CardTitle>
              <CardDescription className="mt-1">Archive finished tables, review them separately, or load one back into the active game.</CardDescription>
              <div className="mt-4 space-y-3">
                {store.gameHistory.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-muted-foreground">
                    No saved games yet.
                  </div>
                ) : (
                  store.gameHistory.map((archivedGame) => (
                    <div key={archivedGame.id} className="rounded-[24px] border border-white/10 bg-black/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{archivedGame.snapshot.game.name.trim() || "Untitled Game"}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {archivedGame.snapshot.players.length} players • {archivedGame.snapshot.game.currency} •{" "}
                            {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(archivedGame.savedAt))}
                          </div>
                        </div>
                        <GameHistoryDialog archivedGame={archivedGame} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <CardTitle>Readiness</CardTitle>
              <CardDescription className="mt-1">These are the blockers that would stop a clean settlement right now.</CardDescription>
              <div className="mt-4 space-y-2">
                {issues.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                    Ready to settle.
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div key={issue} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-slate-300">
                      {issue}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {summary && (
              <Card>
                <CardTitle>Player Breakdown</CardTitle>
                <CardDescription className="mt-1">Transparent calculations for every player at the table.</CardDescription>
                <div className="mt-4 space-y-3">
                  {summary.playerBreakdown.map((player) => (
                    <div key={player.playerId} className="rounded-[22px] border border-white/10 bg-black/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{player.name}</div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Cash in</span>
                            <span className="text-right text-white">{formatCurrency(player.cashIn, store.game.currency)}</span>
                            <span>Chips in</span>
                            <span className="text-right text-white">{formatChipCount(player.chipsIn)}</span>
                            <span>{store.game.inputMode === "chips" ? "Chips out" : "Cash out"}</span>
                            <span className="text-right text-white">
                              {store.game.inputMode === "chips"
                                ? formatChipCount(player.exitChips ?? 0)
                                : formatCurrency(player.exitCash ?? 0, store.game.currency)}
                            </span>
                            <span>Final value</span>
                            <span className="text-right text-white">{formatCurrency(player.finalValue, store.game.currency)}</span>
                          </div>
                        </div>
                        <Badge className={cn(player.net >= 0 ? "text-emerald-100" : "text-rose-100")}>
                          {player.net >= 0 ? "+" : ""}
                          {formatCurrency(player.net, store.game.currency)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <CardTitle>Share Preview</CardTitle>
              <CardDescription className="mt-1">What gets copied and shared once results are ready.</CardDescription>
              <div className="mt-4">
                <Textarea
                  value={summary ? buildSettlementShareText(store, summary) : "Settlement summary will appear here once the game is ready."}
                  readOnly
                />
              </div>
            </Card>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#08100d]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              Previous
            </Button>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {step + 1} / {steps.length}
            </div>
            <Button onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))} disabled={step === steps.length - 1}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function ModeToggle({
  title,
  value,
  items,
  onChange
}: {
  title: string;
  value: string;
  items: { value: string; label: string; icon: React.ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-[24px] border px-4 py-3 text-left transition",
              value === item.value
                ? "border-primary bg-primary/10 text-white"
                : "border-white/10 bg-black/10 text-muted-foreground hover:border-white/20 hover:text-white"
            )}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerTotals({ player }: { player: Player }) {
  const rules = useGameStore((state) => state.buyInRules);
  const currency = useGameStore((state) => state.game.currency);
  const totals = player.buyIns.reduce(
    (acc, entry) => {
      const rule = rules.find((item) => item.id === entry.buyInRuleId);
      if (!rule) {
        return acc;
      }

      return {
        cash: acc.cash + rule.cashAmount * entry.quantity,
        chips: acc.chips + rule.chipsReceived * entry.quantity
      };
    },
    { cash: 0, chips: 0 }
  );

  return (
    <div className="text-right text-sm text-muted-foreground">
      <div>{formatCurrency(totals.cash, currency)}</div>
      <div>{formatChipCount(totals.chips)} chips</div>
    </div>
  );
}

function SummaryStats({
  summary,
  currency,
  inputMode,
  settlementMode
}: {
  summary: ReturnType<typeof computeSettlement>;
  currency: string;
  inputMode: "chips" | "cash";
  settlementMode: "peer" | "bank";
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total cash" value={formatCurrency(summary.totalCash, currency)} />
      <StatCard label="Total chips" value={formatChipCount(summary.totalChips)} />
      <StatCard label="Chip value" value={summary.chipValue !== null ? formatCurrency(summary.chipValue, currency) : "Direct cash"} />
      <StatCard label="Mode" value={`${inputMode === "chips" ? "Chips" : "Cash"} • ${settlementMode === "peer" ? "P2P" : "Bank"}`} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/15 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export { PokerRoomApp };
