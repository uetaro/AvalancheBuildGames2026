/**
 * Avalanche 読み取り専用クライアント
 * 残高取得・トランザクション確認などに使用
 */

import { createAvalancheClient } from "@avalanche-sdk/client";
import type { AvalancheClient } from "@avalanche-sdk/client";
import { chain, rpcUrl } from "./config.js";

let _client: AvalancheClient | null = null;

/**
 * Avalanche パブリッククライアントを取得（シングルトン）
 */
export function getAvalancheClient(): AvalancheClient {
  if (!_client) {
    _client = createAvalancheClient({
      chain,
      transport: {
        type: "http",
        url: rpcUrl,
      },
    });
  }
  return _client;
}

/**
 * C-Chain の残高を取得
 */
export async function getBalance(address: `0x${string}`): Promise<bigint> {
  const client = getAvalancheClient();
  return client.getBalance({ address });
}

/**
 * トランザクションのレシートを取得（確認用）
 */
export async function getTransactionReceipt(hash: `0x${string}`) {
  const client = getAvalancheClient();
  return client.getTransactionReceipt({ hash });
}
