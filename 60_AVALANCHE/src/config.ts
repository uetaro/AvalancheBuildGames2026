/**
 * Avalanche チェーン設定
 * 環境変数 AVALANCHE_NETWORK で mainnet / fuji を切り替え
 */

import type { Chain } from "@avalanche-sdk/client";
import { avalanche, avalancheFuji } from "@avalanche-sdk/client/chains";

export type AvalancheNetwork = "mainnet" | "fuji";

const network = (process.env.AVALANCHE_NETWORK ?? "fuji") as AvalancheNetwork;

export const avalancheNetwork: AvalancheNetwork = network;

/** 使用するチェーン（mainnet または fuji テストネット） */
export const chain: Chain = network === "mainnet" ? avalanche : avalancheFuji;

/** カスタム RPC URL（未設定時はチェーンのデフォルトを使用） */
export const rpcUrl =
  process.env.AVALANCHE_RPC_URL ??
  (network === "mainnet"
    ? "https://api.avax.network/ext/bc/C/rpc"
    : "https://api.avax-test.network/ext/bc/C/rpc");
