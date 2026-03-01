/**
 * Avalanche ウォレットクライアント
 * トランザクション送信・署名に使用
 * ※秘密鍵は環境変数から読み込み、本番では安全に管理すること
 */

import { createAvalancheWalletClient } from "@avalanche-sdk/client";
import { privateKeyToAvalancheAccount } from "@avalanche-sdk/client/accounts";
import type { AvalancheWalletClient } from "@avalanche-sdk/client";
import { parseEther } from "@avalanche-sdk/client/utils";
import { chain, rpcUrl } from "./config.js";

let _walletClient: AvalancheWalletClient | null = null;

/**
 * 環境変数 AVALANCHE_PRIVATE_KEY からウォレットクライアントを取得
 * 未設定の場合は null（読み取り専用モード）
 */
export function getWalletClient(): AvalancheWalletClient | null {
  const pk = process.env.AVALANCHE_PRIVATE_KEY;
  if (!pk) return null;

  if (!_walletClient) {
    const account = privateKeyToAvalancheAccount(pk as `0x${string}`);
    _walletClient = createAvalancheWalletClient({
      account,
      chain,
      transport: {
        type: "http",
        url: rpcUrl,
      },
    });
  }
  return _walletClient;
}

/**
 * AVAX を送金
 * @param to 送金先アドレス
 * @param amountAvax AVAX 量（例: 0.001）
 * @returns トランザクションハッシュ
 */
export async function sendAvax(
  to: `0x${string}`,
  amountAvax: number
): Promise<`0x${string}`> {
  const wallet = getWalletClient();
  if (!wallet) {
    throw new Error("AVALANCHE_PRIVATE_KEY が設定されていません");
  }
  const result = await wallet.send({
    to,
    amount: parseEther(String(amountAvax)),
  });
  const txHash = result.txHashes?.[0]?.txHash;
  if (!txHash) throw new Error("トランザクション送信に失敗しました");
  return txHash as `0x${string}`;
}
