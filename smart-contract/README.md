# Arisan3 Smart Contracts

Smart contract Arisan3 dibangun dengan Foundry. Fokusnya adalah pool arisan berbasis USDC, dibuat lewat factory, dan pemilihan pemenang memakai Chainlink VRF v2.5.

## Isi Project

- `src/ArisanPool.sol` - logic utama pool arisan: join, leave, deposit iuran, trigger periode, pilih pemenang, dan claim dana.
- `src/ArisanFactory.sol` - factory untuk membuat pool baru memakai clone EIP-1167.
- `src/interfaces/IArisanPool.sol` - enum, struct, dan interface initialize yang dipakai factory.
- `script/Deploy.s.sol` - script deploy implementation dan factory.
- `script/HelperConfig.s.sol` - loader konfigurasi deploy dari environment variable.
- `test/unit/ArisanPool.t.sol` - unit test lifecycle utama dan guard condition.
- `test/fuzz/ArisanPool.fuzz.t.sol` - fuzz test untuk input dan alur pool.
- `test/invariant/ArisanPool.invariant.t.sol` - invariant test untuk konsistensi state pool.
- `test/mocks/MockUSDC.sol` - mock ERC-20 USDC 6 decimals.
- `test/mocks/MockVRFCoordinator.sol` - mock Chainlink VRF coordinator untuk test lokal.

## Cara Kerja Singkat

1. Organizer membuat pool lewat `ArisanFactory.createArisan`.
2. Member join saat pool masih `OPEN` dan langsung membayar iuran periode pertama.
3. Pool otomatis berubah ke `ACTIVE` saat jumlah member mencapai `maxMembers`.
4. Setelah durasi periode selesai, siapa pun bisa memanggil `triggerPeriod` untuk request randomness.
5. Callback VRF memilih satu pemenang dari shuffle bag, memisahkan fee, lalu menambah saldo `claimable`.
6. Pemenang dan fee recipient mengambil dana lewat `claim`.
7. Pool masuk `COMPLETED` setelah semua periode selesai.

## Parameter Penting

- Solidity: `0.8.20`
- Token iuran: USDC / ERC-20 6 decimals
- Fee protocol: `50` BPS atau `0.5%`
- Minimal member: `3`
- Maksimal member: `50`
- Minimal durasi periode: `1 days`
- VRF request confirmations: `3`
- VRF request timeout: `1 days`

## Setup

Install dependency Foundry lebih dulu:

```shell
forge install
```

Copy file environment:

```shell
cp .env.example .env
```

Isi variable berikut:

```shell
BASE_SEPOLIA_RPC_URL=
PRIVATE_KEY=
FEE_RECIPIENT=
USDC_ADDRESS=
VRF_COORDINATOR=
VRF_KEY_HASH=
VRF_SUBSCRIPTION_ID=
BASESCAN_API_KEY=
```

## Command

Build:

```shell
forge build
```

Jalankan semua test:

```shell
forge test -vvv
```

Jalankan fuzz dan invariant dengan 1000 runs:

```shell
forge test --fuzz-runs 1000 -vvv
```

Coverage:

```shell
forge coverage
```

Format Solidity:

```shell
forge fmt
```

## Deploy Base Sepolia

Pastikan `.env` sudah terisi, lalu load env dan deploy:

```shell
source .env
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --verify \
  --etherscan-api-key "$BASESCAN_API_KEY"
```

Deploy script akan membuat:

- `ArisanPool` sebagai implementation contract.
- `ArisanFactory` sebagai factory yang menyimpan implementation, fee recipient, VRF config, dan USDC address.

## Catatan Integrasi

- User harus `approve` USDC ke alamat pool sebelum `join` atau `depositIuran`.
- `config.organizer` dari input factory tidak dipakai sebagai source of truth; organizer selalu `msg.sender`.
- Pencairan dana memakai pull payment melalui `claim`, bukan transfer langsung saat pemenang dipilih.
- Pool clone tidak upgradeable dan tidak punya admin drain.
- `gracePeriodSeconds` sudah ada di struct config, tetapi belum dipakai dalam logic periode.
- `triggerPeriod` permissionless supaya periode bisa tetap berjalan walau organizer tidak aktif.

## Catatan Testing

Test yang ada mencakup:

- create pool lewat factory
- join dan leave saat pool masih open
- deposit iuran per periode
- request dan fulfill VRF
- claim dana pemenang
- lifecycle penuh sampai completed
- shuffle bag agar pemenang tidak berulang sebelum semua member menang
- fuzz dan invariant untuk menjaga state tetap konsisten

Sebelum deploy ke network publik, tetap jalankan test penuh dan review ulang konfigurasi VRF subscription, token USDC, fee recipient, serta RPC yang dipakai.
