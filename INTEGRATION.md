# Arisan3 Integration Guide

Dokumen ini menjelaskan langkah integrasi smart contract Arisan3 ke frontend dan backend.

## 0. Ringkasan Arsitektur

Komponen utama:

1. `ArisanFactory`
   - Deployed sekali di Base Sepolia.
   - Membuat pool baru dengan EIP-1167 clone.
   - Event utama: `ArisanCreated(pool, organizer, maxMembers, iuranAmount, periodDuration)`.

2. `ArisanPool`
   - Satu pool clone per grup arisan.
   - User berinteraksi langsung dengan alamat pool clone.
   - Fungsi utama: `join()`, `leavePool()`, `depositIuran(period)`, `triggerPeriod()`, `claim()`.

3. Frontend Next.js
   - Connect wallet via wagmi + Coinbase Smart Wallet.
   - Write contract via wagmi/viem.
   - Read list/detail/history lewat backend/indexer, bukan manual scan dari frontend.

4. Backend/indexer
   - PRD mengarah ke Ponder + PostgreSQL + Hono REST API + Redis cache + notification service.
   - Backend meng-index event dari factory dan semua pool clone, lalu menyediakan API untuk halaman detail, history, portfolio, dan notifikasi.

## 1. Catatan Penting: PRD vs Contract Saat Ini

Ada perbedaan antara PRD dan implementasi smart contract sekarang. Untuk integrasi, gunakan contract aktual sebagai source of truth.

| Area | PRD | Contract aktual |
| --- | --- | --- |
| Identitas arisan | `uint256 arisanId` | `address pool` clone |
| `createArisan` output | `uint256 arisanId` | `address pool` |
| Join | `join(uint256 arisanId)` | `join()` di alamat pool |
| Deposit | `depositIuran(uint256 arisanId, uint256 period)` | `depositIuran(uint256 period)` di alamat pool |
| Trigger | `triggerPeriod(uint256 arisanId)` | `triggerPeriod()` di alamat pool |
| Event factory | event memakai `id` | event memakai `pool` address |
| Event pool | sebagian event punya `id` | event pool tidak punya `id`; identitas pool berasal dari `event.log.address` |

Implikasi:

- Frontend route `/arisan/[id]` dan `/join/[code]` sebaiknya memakai `poolAddress` sebagai `id/code` untuk MVP.
- Backend boleh tetap menyimpan `id` internal, tetapi wajib menyimpan `poolAddress` sebagai primary lookup.
- `frontend/lib/abi.ts` harus disesuaikan dengan ABI hasil compile contract aktual sebelum write contract diaktifkan.

## 2. Langkah Smart Contract

### 2.1 Setup env contract

Di folder `smart-contract`, buat `.env`:

```bash
cd smart-contract
cp .env.example .env
```

Isi variable:

```bash
BASE_SEPOLIA_RPC_URL=
PRIVATE_KEY=
FEE_RECIPIENT=
USDC_ADDRESS=
VRF_COORDINATOR=
VRF_KEY_HASH=
VRF_SUBSCRIPTION_ID=
BASESCAN_API_KEY=
```

Catatan:

- `USDC_ADDRESS` harus sama dengan `NEXT_PUBLIC_USDC_ADDRESS` di frontend.
- `FEE_RECIPIENT` idealnya multisig/team treasury.
- `VRF_SUBSCRIPTION_ID`, `VRF_COORDINATOR`, dan `VRF_KEY_HASH` harus berasal dari Chainlink VRF v2.5 Base Sepolia.

### 2.2 Test sebelum deploy

```bash
cd smart-contract
forge build
forge test -vvv
forge test --fuzz-runs 1000 -vvv
```

Karena contract immutable dan tidak ada admin pause, jangan lanjut deploy kalau test lifecycle, fuzz, atau invariant gagal.

### 2.3 Deploy implementation + factory

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

Output deploy akan menghasilkan:

- `ArisanPool` implementation address.
- `ArisanFactory` address.

Simpan `ArisanFactory` address untuk:

- `frontend/.env.local` -> `NEXT_PUBLIC_FACTORY_ADDRESS`.
- Backend/indexer env -> `FACTORY_ADDRESS`.

### 2.4 VRF consumer untuk pool clone

Perhatikan desain sekarang: `triggerPeriod()` dipanggil dari `ArisanPool` clone, sehingga request VRF berasal dari alamat pool clone.

Artinya setiap pool clone perlu menjadi consumer di subscription Chainlink VRF. Jika belum ditambahkan, `triggerPeriod()` berisiko gagal saat request randomness.

Pilihan implementasi MVP:

1. Manual ops:
   - Setelah factory emit `ArisanCreated(pool, ...)`, tambahkan `pool` sebagai consumer di Chainlink VRF Subscription UI.
   - Cocok untuk demo kecil.

2. Backend ops job:
   - Backend mendeteksi event `ArisanCreated`.
   - Backend mengirim alert internal: "add pool X as VRF consumer".
   - Bisa dikembangkan menjadi otomatis jika subscription owner key dikelola aman.

3. Perubahan contract di fase berikutnya:
   - Pertimbangkan desain yang membuat factory/subscription owner bisa otomatis register consumer, atau gunakan flow deploy yang memasukkan pool ke subscription.

Untuk demo, dokumentasikan langkah manual ini ke tim supaya arisan yang baru dibuat tidak stuck di periode pertama.

## 3. Langkah Frontend

Frontend ada di folder `frontend` dan sudah memakai:

- Next.js 14 App Router.
- wagmi + viem.
- Coinbase Smart Wallet + injected wallet.
- `frontend/lib/api.ts` untuk data dari indexer.

### 3.1 Setup env frontend

Buat `frontend/.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

Isi minimal:

```bash
NEXT_PUBLIC_FACTORY_ADDRESS=0xFactoryDariDeploy
NEXT_PUBLIC_USDC_ADDRESS=0xUSDCBaseSepolia
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://sepolia.base.org
NEXT_PUBLIC_INDEXER_URL=http://localhost:42069
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
```

`NEXT_PUBLIC_FACTORY_ADDRESS` jangan dibiarkan `0x0000000000000000000000000000000000000000`.

### 3.2 Update ABI frontend dari contract aktual

Jalankan build contract:

```bash
cd smart-contract
forge build
```

Ambil ABI dari:

```text
smart-contract/out/ArisanFactory.sol/ArisanFactory.json
smart-contract/out/ArisanPool.sol/ArisanPool.json
```

Lalu update `frontend/lib/abi.ts`.

Minimum ABI yang harus benar:

```ts
// ArisanFactory
createArisan((address,uint256,uint256,uint256,uint256)) returns (address)
getPools() returns (address[])
poolCount() returns (uint256)
event ArisanCreated(address indexed pool, address indexed organizer, uint256 maxMembers, uint256 iuranAmount, uint256 periodDuration)

// ArisanPool
join()
leavePool()
depositIuran(uint256 period)
triggerPeriod()
claim()
claimable(address) returns (uint256)
state() returns (uint8)
currentPeriod() returns (uint256)
periodStartTimestamp() returns (uint256)
vrfPending() returns (bool)
getMembers() returns (address[])
getWinnerHistory() returns (address[])
isMember(address) returns (bool)
config() returns (address organizer, uint256 iuranAmount, uint256 periodDuration, uint256 maxMembers, uint256 gracePeriodSeconds)
paidPeriods(address,uint256) returns (bool)
periodCollected(uint256) returns (uint256)
```

Jangan pakai ABI lama yang masih memanggil `join(arisanId)` atau `triggerPeriod(arisanId)`.

### 3.3 Flow create arisan

File target:

- `frontend/app/create/page.tsx`
- `frontend/lib/contracts.ts`
- `frontend/lib/abi.ts`

Langkah:

1. Convert input USDC ke 6 decimals.

```ts
const iuranAmount = parseUnits(form.iuranAmount, USDC_DECIMALS);
```

2. Convert hari ke detik.

```ts
const periodDuration = BigInt(form.periodDays * 86400);
const gracePeriodSeconds = BigInt(form.graceDays * 86400);
```

3. Panggil factory.

```ts
writeContract({
  address: FACTORY_ADDRESS,
  abi: arisanFactoryAbi,
  functionName: "createArisan",
  args: [
    {
      organizer: address,
      iuranAmount,
      periodDuration,
      maxMembers: BigInt(form.maxMembers),
      gracePeriodSeconds,
    },
  ],
});
```

Catatan contract:

- Field `organizer` di struct tidak menjadi source of truth. Contract memakai `msg.sender` sebagai organizer.
- Tetap isi `organizer: address` agar tuple lengkap dan gampang dibaca.

4. Setelah tx confirmed, ambil `pool` dari event `ArisanCreated`.

Frontend bisa melakukan salah satu:

- Parse receipt logs dengan ABI factory.
- Atau tunggu backend/indexer memunculkan pool baru di API.

Untuk UX tercepat, parse receipt lalu redirect:

```text
/arisan/<poolAddress>
```

5. Metadata non-chain seperti nama arisan tidak masuk contract. Simpan salah satu:

- Local-only untuk MVP demo.
- Backend metadata table keyed by `poolAddress`.
- Query param invite sementara, jika backend belum siap.

### 3.4 Flow join arisan

File target:

- `frontend/app/join/[code]/page.tsx`
- `frontend/components/TxStepper.tsx`

Untuk MVP, `code` = `poolAddress`.

Langkah:

1. Fetch detail arisan dari backend:

```ts
const arisan = await fetchArisan(poolAddress);
```

2. Cek allowance USDC owner -> spender.

Spender adalah alamat pool clone, bukan factory.

```ts
readContract({
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: "allowance",
  args: [walletAddress, poolAddress],
});
```

3. Jika allowance kurang dari `iuranAmount`, panggil approve:

```ts
writeContract({
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: "approve",
  args: [poolAddress, iuranAmount],
});
```

4. Setelah approve confirmed, panggil:

```ts
writeContract({
  address: poolAddress,
  abi: arisanPoolAbi,
  functionName: "join",
  args: [],
});
```

5. Setelah join confirmed:

- Backend akan index `MemberJoined`.
- Redirect ke `/arisan/<poolAddress>`.
- Tampilkan state baru dari `fetchArisan(poolAddress)`.

### 3.5 Flow bayar iuran

File target:

- `frontend/app/arisan/[id]/page.tsx`
- `frontend/components/ActionButton.tsx`

Langkah:

1. Ambil `currentPeriod` dari backend atau direct read contract.
2. Cek `paidPeriods(walletAddress, currentPeriod)`.
3. Cek allowance USDC ke `poolAddress`.
4. Jika kurang, approve ke `poolAddress`.
5. Panggil:

```ts
writeContract({
  address: poolAddress,
  abi: arisanPoolAbi,
  functionName: "depositIuran",
  args: [BigInt(currentPeriod)],
});
```

### 3.6 Flow trigger periode

`triggerPeriod()` permissionless. Siapa pun boleh memanggil setelah deadline.

Frontend boleh menampilkan tombol ketika:

- `state === "ACTIVE"`.
- `now >= periodDeadline`.
- `vrfPending === false`, atau request lama sudah timeout sesuai contract.
- `periodCollected(currentPeriod) > 0`.

Panggilan:

```ts
writeContract({
  address: poolAddress,
  abi: arisanPoolAbi,
  functionName: "triggerPeriod",
  args: [],
});
```

Setelah tx confirmed, UI harus menunggu event `WinnerSelected` dari indexer. Jangan langsung anggap pemenang sudah ada, karena VRF callback terjadi setelah request.

### 3.7 Flow claim

Langkah:

1. Read `claimable(walletAddress)` dari pool.
2. Jika > 0, tampilkan tombol claim.
3. Panggil:

```ts
writeContract({
  address: poolAddress,
  abi: arisanPoolAbi,
  functionName: "claim",
  args: [],
});
```

Setelah confirmed, backend akan index `FundsClaimed`.

### 3.8 Data frontend: direct read vs backend

Gunakan backend untuk data agregat:

- Detail arisan.
- Member grid.
- Status paid per member.
- Winner history.
- Event history.
- Portfolio wallet.

Gunakan direct contract read untuk data yang perlu real-time sebelum indexer catch up:

- `claimable(address)`.
- `allowance(owner, pool)`.
- `balanceOf(owner)`.
- `paidPeriods(owner, currentPeriod)` saat user mau bayar.

## 4. Langkah Backend

Backend belum ada di repo. Sesuai PRD, buat service baru, misalnya:

```text
backend/
  package.json
  ponder.config.ts
  ponder.schema.ts
  src/
    index.ts
    api.ts
    cache.ts
    notifications.ts
```

Stack yang direkomendasikan PRD:

- Ponder untuk EVM event indexing.
- PostgreSQL untuk database.
- Hono untuk REST API.
- Redis untuk cache.
- Resend untuk email.
- node-cron untuk deadline reminder.
- Railway untuk deployment backend + Postgres + Redis.

### 4.1 Env backend

Contoh `.env` backend:

```bash
BASE_SEPOLIA_RPC_URL=
FACTORY_ADDRESS=0xFactoryDariDeploy
START_BLOCK=12345678
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
RESEND_API_KEY=
APP_BASE_URL=http://localhost:3000
CHAIN_ID=84532
```

`START_BLOCK` gunakan block saat factory deploy supaya indexer tidak scan dari genesis.

### 4.2 Model data

Karena contract aktual memakai pool address sebagai identitas, schema backend sebaiknya seperti ini:

```text
Arisan
- poolAddress: hex, primary key
- organizer: hex
- iuranAmount: bigint string
- periodDuration: bigint string
- maxMembers: int
- gracePeriodSeconds: bigint string
- state: OPEN | ACTIVE | COMPLETED
- currentPeriod: int
- periodStartTimestamp: bigint string nullable
- vrfPending: boolean
- createdAt: bigint string
- createdTxHash: hex
- name: string nullable

Member
- id: poolAddress:memberAddress
- poolAddress: hex
- address: hex
- slotIndex: int
- joinedAt: bigint string

Payment
- id: poolAddress:memberAddress:period
- poolAddress: hex
- member: hex
- period: int
- amount: bigint string
- paidAt: bigint string
- txHash: hex

Winner
- id: poolAddress:period
- poolAddress: hex
- period: int
- winner: hex
- netAmount: bigint string
- fee: bigint string
- timestamp: bigint string
- txHash: hex

Claim
- id: txHash:logIndex
- poolAddress: hex
- recipient: hex
- amount: bigint string
- timestamp: bigint string
- txHash: hex

EventLog
- id: txHash:logIndex
- poolAddress: hex nullable
- type: string
- actor: hex nullable
- period: int nullable
- amount: bigint string nullable
- txHash: hex
- timestamp: bigint string
```

### 4.3 Event yang harus di-index

Factory:

- `ArisanCreated(address indexed pool, address indexed organizer, uint256 maxMembers, uint256 iuranAmount, uint256 periodDuration)`

Pool:

- `MemberJoined(address indexed member, uint256 slotIndex)`
- `ArisanStarted(uint256 timestamp)`
- `IuranDeposited(address indexed member, uint256 indexed period, uint256 amount)`
- `RandomnessRequested(uint256 vrfRequestId)`
- `WinnerSelected(uint256 indexed period, address indexed winner, uint256 netAmount, uint256 fee)`
- `FundsClaimed(address indexed recipient, uint256 amount)`
- `ArisanCompleted(uint256 timestamp)`

Karena event pool tidak membawa `id`, backend harus memakai alamat contract yang mengeluarkan event sebagai `poolAddress`.

### 4.4 Strategi indexing pool clone

Backend harus bisa menemukan pool baru dari event factory.

Langkah:

1. Ponder listen ke `ArisanFactory:ArisanCreated`.
2. Saat event masuk:
   - Insert row `Arisan`.
   - Simpan `poolAddress`.
   - Tambahkan `poolAddress` ke daftar contract pool yang di-index.
   - Invalidate cache portfolio organizer.
   - Kirim alert internal untuk VRF consumer setup jika masih manual.

3. Ponder listen ke event dari semua pool clone.

Kalau Ponder config mendukung factory/dynamic contracts di versi yang dipakai tim, gunakan itu. Kalau belum, fallback:

- Index factory untuk discovery.
- Jalankan worker yang sync `getPools()` dari factory.
- Register pool addresses ke config/service indexer.

### 4.5 Handler backend

Behavior minimum handler:

1. `ArisanCreated`
   - Create `Arisan`.
   - `state = "OPEN"`.
   - `currentPeriod = 0`.
   - Tambahkan event log.

2. `MemberJoined`
   - Create `Member`.
   - Create `Payment` untuk period `0`, karena `join()` langsung membayar iuran pertama.
   - Tambahkan event log.
   - Invalidate cache `/arisan/:poolAddress` dan portfolio member.

3. `ArisanStarted`
   - Update `state = "ACTIVE"`.
   - Set `periodStartTimestamp`.
   - Tambahkan event log.

4. `IuranDeposited`
   - Create `Payment`.
   - Tambahkan event log.
   - Invalidate payment matrix dan detail arisan.

5. `RandomnessRequested`
   - Set `vrfPending = true`.
   - Tambahkan event log.

6. `WinnerSelected`
   - Create `Winner`.
   - Update `currentPeriod = period + 1`.
   - Set `vrfPending = false`.
   - Refresh `periodStartTimestamp` dari contract read jika diperlukan.
   - Tambahkan event log.

7. `ArisanCompleted`
   - Update `state = "COMPLETED"`.
   - Tambahkan event log.

8. `FundsClaimed`
   - Create `Claim`.
   - Tambahkan event log.

### 4.6 REST API yang harus tersedia

Frontend `frontend/lib/api.ts` sudah mengarah ke endpoint ini:

```text
GET /arisan/:id
GET /arisan/:id/history
GET /wallet/:address/portfolio
```

PRD juga meminta endpoint tambahan:

```text
GET /arisan/:id/payments/:period
POST /notify/register
DELETE /notify/unregister
GET /health
```

Untuk MVP, `:id` = `poolAddress`.

### 4.7 Response contract untuk frontend

`GET /arisan/:poolAddress` harus mengembalikan shape yang cocok dengan `frontend/lib/api.ts`:

```json
{
  "id": "0xPoolAddress",
  "name": "Arisan Kantor Q3",
  "state": "ACTIVE",
  "currentPeriod": 1,
  "iuranAmount": "50000000",
  "periodDeadline": 1780000000,
  "maxMembers": 6,
  "organizer": "0xOrganizer",
  "members": [
    {
      "address": "0xMember",
      "slotIndex": 0,
      "paidThisPeriod": true
    }
  ],
  "winnerHistory": [
    {
      "period": 0,
      "winner": "0xWinner",
      "amount": "298500000"
    }
  ]
}
```

Hitung `periodDeadline`:

```text
periodDeadline = periodStartTimestamp + periodDuration
```

`paidThisPeriod` dihitung dari table `Payment` untuk `currentPeriod`.

`winnerHistory.amount` pakai `netAmount`, bukan total pool sebelum fee.

### 4.8 Portfolio API

`GET /wallet/:address/portfolio` mengembalikan semua arisan yang wallet tersebut ikuti atau organize:

```json
[
  {
    "arisanId": "0xPoolAddress",
    "name": "Arisan Kantor Q3",
    "state": "ACTIVE",
    "role": "MEMBER",
    "iuranAmount": "50000000",
    "currentPeriod": 1,
    "periodDeadline": 1780000000,
    "totalContributed": "100000000",
    "paidThisPeriod": true
  }
]
```

Rules:

- `role = "ORGANIZER"` jika address sama dengan organizer.
- `role = "MEMBER"` jika ada di table `Member`.
- `totalContributed` = sum `Payment.amount` untuk address itu.
- `paidThisPeriod` = ada payment untuk `currentPeriod`.

### 4.9 History API

`GET /arisan/:poolAddress/history` mengembalikan array event:

```json
[
  {
    "id": "0xTxHash:0",
    "type": "MemberJoined",
    "arisanId": "0xPoolAddress",
    "actor": "0xMember",
    "period": 0,
    "amount": "50000000",
    "txHash": "0xTxHash",
    "timestamp": 1780000000
  }
]
```

Urutkan terbaru terakhir atau terbaru pertama secara konsisten. Frontend `EventFeed` harus mengikuti keputusan itu.

### 4.10 Caching

Sesuai PRD:

| Data | TTL | Invalidasi |
| --- | --- | --- |
| State arisan | 30 detik | Event apapun dari pool |
| Payment matrix | 15 detik | `IuranDeposited`, `MemberJoined` |
| Portfolio wallet | 30 detik | `MemberJoined`, `WinnerSelected`, `FundsClaimed` |
| Winner history | 60 detik | `WinnerSelected` |

Cache key yang disarankan:

```text
arisan:<poolAddress>
arisan:<poolAddress>:history
arisan:<poolAddress>:payments:<period>
wallet:<address>:portfolio
```

### 4.11 Notification service

PRD meminta reminder deadline.

Minimal flow:

1. Cron jalan setiap jam.
2. Query semua arisan `ACTIVE`.
3. Hitung `periodDeadline`.
4. Jika deadline kurang dari 24 jam:
   - Cari member yang belum punya `Payment` di `currentPeriod`.
   - Kirim email reminder via Resend jika user sudah register email.
5. Jika deadline sudah lewat dan belum ada `WinnerSelected` untuk period tersebut:
   - Kirim alert ke organizer atau internal ops bahwa `triggerPeriod()` perlu dipanggil.

Endpoint:

```text
POST /notify/register
DELETE /notify/unregister
```

Data notification:

```text
NotificationSubscriber
- id: walletAddress:email
- walletAddress
- email
- verifiedAt nullable
- unsubscribedAt nullable
```

Untuk MVP, jangan simpan private key user. Backend hanya mengirim reminder; transaksi tetap dipanggil user dari wallet.

### 4.12 VRF subscription monitoring

PRD menetapkan threshold:

| Kondisi | Threshold | Aksi |
| --- | --- | --- |
| Warning | < 5 LINK | Alert tim, mulai top up |
| Critical | < 2 LINK | Top up segera |
| Emergency | < 0.5 LINK | Top up darurat |

Tambahkan job monitoring berkala:

- Read status subscription VRF.
- Kirim alert internal jika saldo masuk threshold.
- Pastikan pool baru sudah ditambahkan sebagai consumer.

## 5. Urutan Integrasi End-to-End

Gunakan urutan ini supaya FE dan BE tidak saling menunggu terlalu lama:

1. Smart contract
   - Jalankan test.
   - Deploy `ArisanFactory`.
   - Catat `FACTORY_ADDRESS`, `START_BLOCK`, `USDC_ADDRESS`, dan config VRF.

2. Frontend ABI/env
   - Update `frontend/lib/abi.ts` dari hasil `forge build`.
   - Isi `frontend/.env.local`.
   - Pastikan write call memakai pool address untuk `join`, `depositIuran`, `triggerPeriod`, dan `claim`.

3. Backend discovery
   - Buat backend Ponder.
   - Index `ArisanFactory:ArisanCreated`.
   - Simpan pool clone sebagai `poolAddress`.

4. Backend pool events
   - Index event `MemberJoined`, `ArisanStarted`, `IuranDeposited`, `RandomnessRequested`, `WinnerSelected`, `FundsClaimed`, `ArisanCompleted`.
   - Expose `GET /arisan/:poolAddress`, `/history`, dan `/portfolio`.

5. Frontend data switch
   - Ganti `MOCK_ARISAN`, `MOCK_HISTORY`, `MOCK_PORTFOLIO` dengan call ke `frontend/lib/api.ts`.
   - Tambahkan loading/error state.

6. Full manual test
   - Wallet A create arisan.
   - Tambahkan pool clone ke VRF consumer.
   - Wallet B/C/D approve + join.
   - Pool menjadi `ACTIVE`.
   - Member bayar periode berikutnya.
   - Setelah deadline, panggil `triggerPeriod()`.
   - Tunggu `WinnerSelected`.
   - Winner panggil `claim()`.
   - Cek detail, history, dan portfolio update dari backend.

## 6. Checklist Integrasi Frontend

- [ ] `frontend/lib/abi.ts` sama dengan ABI contract aktual.
- [ ] `NEXT_PUBLIC_FACTORY_ADDRESS` terisi factory deploy terbaru.
- [ ] `NEXT_PUBLIC_USDC_ADDRESS` sama dengan contract deploy config.
- [ ] `/create` memanggil `factory.createArisan`.
- [ ] `/create` redirect ke `/arisan/<poolAddress>`.
- [ ] `/join/[code]` memperlakukan `code` sebagai pool address atau resolve via backend.
- [ ] Approve USDC spender = pool address, bukan factory.
- [ ] Join memanggil `pool.join()`.
- [ ] Deposit memanggil `pool.depositIuran(currentPeriod)`.
- [ ] Trigger memanggil `pool.triggerPeriod()`.
- [ ] Claim memanggil `pool.claim()`.
- [ ] Semua mock data diganti API backend saat backend siap.
- [ ] Contract revert diterjemahkan lewat `frontend/lib/errors.ts`.

## 7. Checklist Integrasi Backend

- [ ] Backend folder dibuat.
- [ ] Ponder connect ke Base Sepolia RPC.
- [ ] Factory address dan start block terkonfigurasi.
- [ ] Handler `ArisanCreated` menyimpan pool address.
- [ ] Event pool clone ter-index.
- [ ] Schema menyimpan Arisan, Member, Payment, Winner, Claim, EventLog.
- [ ] `GET /arisan/:poolAddress` sesuai shape frontend.
- [ ] `GET /arisan/:poolAddress/history` sesuai shape frontend.
- [ ] `GET /wallet/:address/portfolio` sesuai shape frontend.
- [ ] Redis cache dan invalidasi event berjalan.
- [ ] Health check tersedia di `GET /health`.
- [ ] Notification register/unregister tersedia jika masuk scope demo.
- [ ] VRF consumer setup untuk pool baru terdokumentasi atau otomatis.
- [ ] VRF subscription balance dimonitor.

## 8. Common Pitfalls

1. Approve ke factory
   - Salah. `join()` dan `depositIuran()` menarik USDC dari pool clone.
   - Spender harus `poolAddress`.

2. Memakai `arisanId` angka di frontend
   - Contract aktual memakai `poolAddress`.
   - Gunakan `poolAddress` sebagai route id untuk MVP.

3. Langsung menunggu winner setelah `triggerPeriod()`
   - `triggerPeriod()` hanya request VRF.
   - Winner baru ada setelah callback dan event `WinnerSelected`.

4. Pool clone belum jadi VRF consumer
   - Request randomness bisa gagal.
   - Tambahkan consumer setelah `ArisanCreated`.

5. Nama arisan dianggap ada di contract
   - Tidak ada field `name` di contract.
   - Simpan di backend metadata jika dibutuhkan.

6. Backend membaca event pool tanpa tahu pool address
   - Event pool tidak punya `id`.
   - Gunakan `event.log.address` sebagai `poolAddress`.

7. Menghitung deadline dari waktu frontend
   - Deadline harus dari `periodStartTimestamp + periodDuration` berdasarkan data contract/indexer.

## 9. Definition of Done

Integrasi dianggap selesai jika:

- User bisa create pool dari frontend dan mendapatkan pool address.
- User lain bisa approve USDC dan join dari invite link.
- Backend menampilkan member dan payment status tanpa mock data.
- Pool bisa masuk `ACTIVE` setelah slot penuh.
- Member bisa bayar iuran periode aktif.
- `triggerPeriod()` berhasil request VRF dan backend mencatat `WinnerSelected`.
- Winner bisa `claim()`.
- `/arisan/:id`, `/arisan/:id/history`, dan `/portfolio` memakai data backend.
- Semua alamat/env yang dipakai frontend, backend, dan deploy script konsisten.
