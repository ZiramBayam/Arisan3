# Arisan3

Indonesian rotating savings (arisan), reimagined as an immutable smart contract on Base Sepolia. This repo contains the Next.js 14 frontend per the v1.0 PRD.

> **Brand**
> Prime `#FCFBF4` · Accent `#1DB954`

## Stack

- Next.js 14 (App Router) + React 18
- Tailwind CSS (custom `prime` / `accent` palette)
- OnchainKit + Coinbase Smart Wallet (passkey onboarding)
- viem v2 + wagmi v2
- TanStack Query

## Routes (per PRD §7.2)

| Path | Purpose |
| --- | --- |
| `/` | Landing — hero + how-it-works + CTA |
| `/create` | Form to deploy a new `ArisanPool` instance |
| `/join/[code]` | Invite-link onboarding (approve + join stepper) |
| `/arisan/[id]` | Live detail: countdown, member grid, action button |
| `/arisan/[id]/history` | Full event log streamed from Ponder |
| `/portfolio` | All arisans the connected wallet participates in |

## Getting started

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_FACTORY_ADDRESS once the contract is deployed
# (optional) NEXT_PUBLIC_ONCHAINKIT_API_KEY for Coinbase services

npm install
npm run dev
```

Open <http://localhost:3000>.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | — | Coinbase Developer Platform key |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | `0x000…000` | Deployed `ArisanFactory` |
| `NEXT_PUBLIC_USDC_ADDRESS` | Base Sepolia USDC | ERC-20 used for iuran |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC` | `https://sepolia.base.org` | Public RPC fallback |
| `NEXT_PUBLIC_INDEXER_URL` | `http://localhost:42069` | Ponder REST base |

## Project structure

```
app/                    # App Router routes + global layout/providers
  ├ create/             # Organizer flow
  ├ join/[code]/        # Member onboarding stepper
  ├ arisan/[id]/        # Live arisan + nested /history
  └ portfolio/          # Wallet portfolio
components/             # MemberGrid, CountdownTimer, ActionButton, TxStepper, EventFeed…
lib/                    # ABIs, viem clients, wagmi config, format helpers, API fetchers
```

## What's wired vs. stubbed

The frontend is fully navigable. The following call-sites are marked `TODO` for real contract integration:

- `app/create/page.tsx` → `factory.createArisan(params)` via `useWriteContract`
- `app/join/[code]/page.tsx` → `USDC.approve` then `pool.join(id)`
- `app/arisan/[id]/page.tsx` → live data + `pool.depositIuran` / `triggerPeriod` / `claim`

Mock data lives in `lib/mock.ts` so screens render before the indexer + contract are live.

## Design notes

- The button system uses `.btn-primary` (`#1DB954` filled), `.btn-secondary` (outline on cream), and `.btn-ghost` (text-only).
- Countdown turns yellow under 48 h, red under 24 h (PRD §7.4).
- All contract reverts pass through `lib/errors.ts` so the user sees Indonesian, actionable messages (PRD §7.5).
- Cream background `#FCFBF4` is set on `<html>` and `<body>` so iOS Safari rubber-band stays on-brand.

## Out of scope for this repo

Smart contracts (`ArisanFactory.sol`, `ArisanPool.sol`), Ponder indexer, and notification service live in sibling repos per the team split in PRD §13.1.
