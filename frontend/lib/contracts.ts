import { type Address } from "viem";
import { baseSepolia } from "viem/chains";

export const ACTIVE_CHAIN = baseSepolia;

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as Address;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;

export const USDC_DECIMALS = 6;
export const FEE_BPS = 50;
