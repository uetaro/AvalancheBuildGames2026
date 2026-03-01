/**
 * Avalanche 接続サンプル
 * 実行: npm run example
 * 事前に .env で AVALANCHE_PRIVATE_KEY を設定すると送金も試せる
 */

import "dotenv/config";
import { getBalance } from "./client.js";
import { getWalletClient } from "./wallet.js";
import { avalancheNetwork, rpcUrl } from "./config.js";

const SAMPLE_ADDRESS = "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e" as const;

async function main() {
  console.log("=== Avalanche 接続確認 ===\n");
  console.log(`ネットワーク: ${avalancheNetwork}`);
  console.log(`RPC URL: ${rpcUrl}\n`);

  // 残高取得（読み取りのみ、秘密鍵不要）
  try {
    const balance = await getBalance(SAMPLE_ADDRESS);
    const avax = Number(balance) / 1e18;
    console.log(`サンプルアドレス ${SAMPLE_ADDRESS} の残高: ${avax} AVAX`);
  } catch (e) {
    console.error("残高取得エラー:", e);
  }

  // ウォレットがあれば送金デモ（オプション）
  const wallet = getWalletClient();
  if (wallet) {
    console.log("\nウォレット検出: 送金可能（デモは実行しません）");
    // 実際の送金は慎重に: await sendAvax("0x...", 0.001);
  } else {
    console.log("\nAVALANCHE_PRIVATE_KEY 未設定: 読み取り専用モード");
  }

  console.log("\n接続成功");
}

main().catch(console.error);
