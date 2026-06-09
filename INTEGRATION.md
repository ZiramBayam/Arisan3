# Arisan3 Integration Guide

Dokumen ini menjelaskan integrasi contract Arisan3 saat ini ke frontend dan backend/indexer.

## 0. Ringkasan Arsitektur

Komponen utama:

1. `ArisanFactory`
   - Deployed sekali di Base Sepolia.
   - Menjadi contract manager untuk semua arisan.
   - Identitas arisan adalah `uint256 arisanId`.
   - Event utama: `ArisanCreated(id, organizer, memberCount, iuranAmount)`.

2. Frontend Next.js
   - Connect wallet via wagmi + viem.
   - Write call diarahkan ke `NEXT_PUBLIC_FACTORY_ADDRESS`.
   - Route `/arisan/[id]` dan `/join/[code]` dapat memakai `arisanId` untuk MVP.

3. Backend/indexer
   - Meng-index event dari satu alamat `ArisanFactory`.
   - Menyediakan API detail, history, portfolio, dan metadata nama arisan bila dibutuhkan.

## 1. Contract API

Gunakan ABI hasil compile contract aktual sebagai source of truth:

```text
smart-contract/out/ArisanFactory.sol/ArisanFactory.json
smart-contract/abis/ArisanFactory.abi.json
```

Minimum ABI yang perlu dipakai frontend:

```ts
createArisan((address,uint256,uint256,uint256,uint256)) returns (uint256)
join(uint256 arisanId)
leavePool(uint256 arisanId)
depositIuran(uint256 arisanId, uint256 period)
triggerPeriod(uint256 arisanId)
claim()
claimable(address) returns (uint256)
state(uint256 arisanId) returns (uint8)
currentPeriod(uint256 arisanId) returns (uint256)
periodStartTimestamp(uint256 arisanId) returns (uint256)
vrfPending(uint256 arisanId) returns (bool)
getMembers(uint256 arisanId) returns (address[])
getWinnerHistory(uint256 arisanId) returns (address[])
isMember(uint256 arisanId, address account) returns (bool)
config(uint256 arisanId) returns (address organizer, uint256 iuranAmount, uint256 periodDuration, uint256 maxMembers, uint256 gracePeriodSeconds)
paidPeriods(uint256 arisanId, address member, uint256 period) returns (bool)
periodCollected(uint256 arisanId, uint256 period) returns (uint256)
```

Event utama:

```ts
ArisanCreated(uint256 indexed id, address organizer, uint256 memberCount, uint256 iuranAmount)
MemberJoined(uint256 indexed id, address member, uint256 slotIndex)
ArisanStarted(uint256 indexed id, uint256 timestamp)
IuranDeposited(uint256 indexed id, address member, uint256 period, uint256 amount)
RandomnessRequested(uint256 indexed id, uint256 vrfRequestId)
WinnerSelected(uint256 indexed id, uint256 period, address winner, uint256 netAmount, uint256 fee)
FundsClaimed(address indexed recipient, uint256 amount)
ArisanCompleted(uint256 indexed id, uint256 timestamp)
```

## 2. Deploy Dan VRF

Env contract:

```bash
BASE_SEPOLIA_RPC_URL=
PRIVATE_KEY=
FACTORY_ADDRESS=
FEE_RECIPIENT=
USDC_ADDRESS=
VRF_COORDINATOR=
VRF_KEY_HASH=
VRF_SUBSCRIPTION_ID=
ARISAN_IURAN_AMOUNT=
ARISAN_PERIOD_DURATION=
ARISAN_MAX_MEMBERS=
ARISAN_GRACE_PERIOD_SECONDS=
BASESCAN_API_KEY=
```

Deploy:

```bash
cd smart-contract
source .env

forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify \
  --etherscan-api-key "$BASESCAN_API_KEY"
```

Simpan alamat hasil deploy sebagai:

```bash
FACTORY_ADDRESS=0xFactoryAddress
NEXT_PUBLIC_FACTORY_ADDRESS=0xFactoryAddress
```

Tambahkan `FACTORY_ADDRESS` sebagai Chainlink VRF consumer. Lewat script:

```bash
cd smart-contract
source .env

forge script script/AddVRFConsumer.s.sol:AddVRFConsumer \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Create arisan lewat script:

```bash
cd smart-contract
source .env

forge script script/CreateArisan.s.sol:CreateArisan \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Output script mencetak `ARISAN_ID`.

## 3. Frontend Flow

Create:

1. Convert USDC dengan 6 decimals.
2. Convert durasi hari ke detik.
3. Panggil `createArisan(params)` ke `FACTORY_ADDRESS`.
4. Ambil `arisanId` dari return value atau event `ArisanCreated`.
5. Redirect ke `/arisan/<arisanId>`.

Join:

1. Treat `code` sebagai `arisanId` untuk MVP.
2. Cek allowance USDC owner ke spender `FACTORY_ADDRESS`.
3. Jika kurang, panggil `USDC.approve(FACTORY_ADDRESS, iuranAmount)`.
4. Panggil `join(arisanId)`.

Deposit:

1. Ambil `currentPeriod(arisanId)`.
2. Cek allowance ke `FACTORY_ADDRESS`.
3. Panggil `depositIuran(arisanId, currentPeriod)`.

Trigger:

1. Pastikan deadline lewat berdasarkan `periodStartTimestamp + periodDuration`.
2. Panggil `triggerPeriod(arisanId)`.
3. Tunggu event `WinnerSelected`.

Claim:

1. Read `claimable(walletAddress)`.
2. Jika lebih dari 0, panggil `claim()`.

## 4. Backend Shape

Untuk MVP, backend boleh memakai `arisanId` sebagai id utama:

```text
GET /arisan/:arisanId
GET /arisan/:arisanId/history
GET /wallet/:address/portfolio
```

Indexer cukup listen ke satu contract address:

```text
FACTORY_ADDRESS
```

History event memakai field `arisanId` dari indexed event `id`. `winnerHistory.amount` harus memakai `netAmount`, bukan total pool sebelum fee.

## 5. Checklist

- [ ] `NEXT_PUBLIC_FACTORY_ADDRESS` berisi alamat deploy terbaru.
- [ ] `frontend/lib/abi.ts` memakai ABI manager terbaru.
- [ ] `USDC.approve` memakai spender `FACTORY_ADDRESS`.
- [ ] Create memanggil `createArisan(params)` dan menyimpan `arisanId`.
- [ ] Join memanggil `join(arisanId)`.
- [ ] Deposit memanggil `depositIuran(arisanId, currentPeriod)`.
- [ ] Trigger memanggil `triggerPeriod(arisanId)`.
- [ ] Claim memanggil `claim()`.
- [ ] Backend/indexer listen ke event dari `FACTORY_ADDRESS`.
- [ ] `FACTORY_ADDRESS` sudah menjadi VRF consumer.

## 6. Validasi

Sebelum deploy:

```bash
cd smart-contract
forge build
forge test -vvv
forge test --fuzz-runs 1000 -vvv
```

Sebelum menjalankan frontend:

```bash
cd frontend
npm install
npm run typecheck
```
