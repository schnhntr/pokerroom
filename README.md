# Poker Room

Poker Room is a production-ready mobile-first Progressive Web App for home poker settlement. It tracks buy-ins, rebuys, final chip stacks or cashouts, and generates the smallest possible payout plan with exact decimal-safe math.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui-style component architecture
- Zustand
- decimal.js

## Features

- searchable ISO 4217 currency picker
- peer-to-peer and bank settlement modes
- custom buy-in rules with reordering
- player management with reordering
- unlimited rebuys
- chips remaining and cash taken settlement flows
- greedy debt simplification for minimum transactions
- copy and native share summary actions
- local persistence with Zustand
- installable PWA with offline shell caching
- premium dark, mobile-first poker UI

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```text
app/             Next.js app router entrypoints, metadata, manifest
components/      Screen UI and shadcn-style primitives
lib/             Currency data, settlement engine, formatting helpers
store/           Zustand local persistence store
public/          Service worker and app icons
```

## Settlement Logic

- `chips remaining` mode calculates chip value as `total cash / total chips issued`
- `cash taken` mode uses direct cashout values
- `decimal.js` avoids floating-point rounding issues
- settlements are optimized by matching the largest debtors and creditors first

## Persistence

The current game is stored in local storage under `poker-room-game`, so refreshes and accidental tab closes do not wipe the session.
