/**
 * Avalanche ブロックチェーン統合パッケージ
 * @see https://build.avax.network/docs/tooling/avalanche-sdk
 */

export {
  getAvalancheClient,
  getBalance,
  getTransactionReceipt,
} from "./client.js";

export {
  getWalletClient,
  sendAvax,
} from "./wallet.js";

export {
  chain,
  rpcUrl,
  avalancheNetwork,
  type AvalancheNetwork,
} from "./config.js";
