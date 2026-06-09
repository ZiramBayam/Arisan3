# Arisan3 Smart Contracts

Smart contract Arisan3 dibangun dengan Foundry. Fokusnya adalah arisan berbasis USDC, dikelola lewat satu contract manager, dan pemilihan pemenang memakai Chainlink VRF v2.5.

## Isi Project

- `src/ArisanFactory.sol` - contract manager utama: create arisan, join, leave, deposit iuran, trigger periode, pilih pemenang, dan claim dana.
- `src/ArisanPool.sol` - referensi flow pool lama, tidak dipakai oleh deploy utama.
- `src/interfaces/IArisanPool.sol` - enum dan struct config/data yang dipakai contract.
- `script/Deploy.s.sol` - script deploy `ArisanFactory`.
- `script/HelperConfig.s.sol` - loader konfigurasi deploy dari environment variable.
- `script/CreateArisan.s.sol` - script membuat arisan baru dari contract manager.
- `script/AddVRFConsumer.s.sol` - script menambahkan `ArisanFactory` sebagai Chainlink VRF consumer.
- `test/unit/ArisanFactory.t.sol` - unit test lifecycle utama dan guard condition.
- `test/fuzz/ArisanPool.fuzz.t.sol` - fuzz test untuk input dan alur pool.
- `test/invariant/ArisanFactory.invariant.t.sol` - invariant test untuk konsistensi state arisan.
- `test/mocks/MockUSDC.sol` - mock ERC-20 USDC 6 decimals.
- `test/mocks/MockVRFCoordinator.sol` - mock Chainlink VRF coordinator untuk test lokal.

## Cara Kerja Singkat

1. Organizer membuat arisan lewat `ArisanFactory.createArisan` dan mendapat `arisanId`.
2. Member join dengan `join(arisanId)` saat arisan masih `OPEN` dan langsung membayar iuran periode pertama.
3. Arisan otomatis berubah ke `ACTIVE` saat jumlah member mencapai `maxMembers`.
4. Setelah durasi periode selesai, siapa pun bisa memanggil `triggerPeriod(arisanId)` untuk request randomness.
5. Callback VRF memilih satu pemenang dari shuffle bag, memisahkan fee, lalu menambah saldo `claimable`.
6. Pemenang dan fee recipient mengambil dana lewat `claim`.
7. Arisan masuk `COMPLETED` setelah semua periode selesai.

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

Deploy script akan membuat `ArisanFactory` sebagai contract manager yang menyimpan fee recipient, VRF config, USDC address, dan semua state arisan.

## Create Arisan Dari Factory

Jika `ArisanFactory` sudah deploy, isi env berikut:

```shell
FACTORY_ADDRESS=0xFactoryAddress
ARISAN_IURAN_AMOUNT=100000000
ARISAN_PERIOD_DURATION=86400
ARISAN_MAX_MEMBERS=3
ARISAN_GRACE_PERIOD_SECONDS=0
```

`ARISAN_IURAN_AMOUNT` memakai decimals USDC, jadi `100000000` berarti 100 USDC jika USDC 6 decimals.

Lalu jalankan:

```shell
source .env
forge script script/CreateArisan.s.sol:CreateArisan \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Output script akan mencetak `ARISAN_ID`.

## Setup VRF Consumer

`triggerPeriod(arisanId)` melakukan request VRF dari alamat `ArisanFactory`, jadi cukup daftarkan `FACTORY_ADDRESS` sebagai consumer di Chainlink VRF subscription yang sama dengan `VRF_SUBSCRIPTION_ID`.

Untuk demo awal, setelah deploy `ArisanFactory`, tambahkan alamat factory lewat Chainlink VRF UI.

Alternatif lewat Foundry, jalankan dengan private key owner VRF subscription:

```shell
source .env
forge script script/AddVRFConsumer.s.sol:AddVRFConsumer \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Jika `FACTORY_ADDRESS` belum menjadi consumer, `triggerPeriod(arisanId)` bisa gagal saat request randomness.

## Catatan Integrasi

- User harus `approve` USDC ke alamat `ArisanFactory` sebelum `join` atau `depositIuran`.
- `config.organizer` dari input tidak dipakai sebagai source of truth; organizer selalu `msg.sender`.
- Pencairan dana memakai pull payment melalui `claim`, bukan transfer langsung saat pemenang dipilih.
- Contract manager tidak punya admin drain.
- `gracePeriodSeconds` sudah ada di struct config, tetapi belum dipakai dalam logic periode.
- `triggerPeriod` permissionless supaya periode bisa tetap berjalan walau organizer tidak aktif.

## Catatan Testing

Test yang ada mencakup:

- create arisan lewat factory
- join dan leave saat pool masih open
- deposit iuran per periode
- request dan fulfill VRF
- claim dana pemenang
- lifecycle penuh sampai completed
- shuffle bag agar pemenang tidak berulang sebelum semua member menang
- fuzz dan invariant untuk menjaga state tetap konsisten

Sebelum deploy ke network publik, tetap jalankan test penuh dan review ulang konfigurasi VRF subscription, token USDC, fee recipient, serta RPC yang dipakai.
