# 60_AVALANCHE

このフォルダは **Avalanche（アバランチ）** というブロックチェーンに、プログラムからつなぐためのコードが入っています。  
「アドレスの残高を調べる」「AVAX を送金する」といった処理を TypeScript から書けます。

---

## いまの自分に必要なもの

- **Node.js** が入っていること（バージョン 20 以上）
  - 入ってるか確認: ターミナルで `node -v` と打って Enter
  - 入ってない → [nodejs.org](https://nodejs.org/) から LTS をインストール
- ターミナル（コマンドを打つ画面）が使えること

---

## 1. 最初にやること（1回だけ）

ターミナルで、このフォルダに移動してからパッケージを入れます。

```bash
cd 60_AVALANCHE
npm install
```

`npm install` が終わったら準備完了です。

---

## 2. つながっているか確認する

**秘密鍵は不要**です。Avalanche の「Fuji テストネット」に接続して、サンプルアドレスの残高を取ってきます。

```bash
npm run example
```

成功すると、例えば次のように出ます。

```
=== Avalanche 接続確認 ===

ネットワーク: fuji
RPC URL: https://api.avax-test.network/ext/bc/C/rpc

サンプルアドレス 0xA0Cf... の残高: 0 AVAX

AVALANCHE_PRIVATE_KEY 未設定: 読み取り専用モード

接続成功
```

ここまで出れば「Avalanche に接続できる状態」になっています。

---

## 3. 自分で「残高を調べる」コードを書く

このフォルダ内に、例えば `src/my-first.ts` というファイルを新規作成して、次を貼り付けます。

```typescript
import "dotenv/config";
import { getBalance } from "./client.js";

// 調べたいアドレス（0x で始まる形式）
const address = "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e";

const balance = await getBalance(address);
const avax = Number(balance) / 1e18;  // wei → AVAX に変換

console.log(`残高: ${avax} AVAX`);
```

実行するには:

```bash
npx tsx src/my-first.ts
```

「残高: 0 AVAX」のように表示されれば、自分のコードから Avalanche を読めています。

---

## 4. 「送金」までやりたい場合（テスト用）

本物の AVAX ではなく、**テスト用の Fuji ネット**で送金を試せます。

### 4-1. テスト用 AVAX をもらう

1. ブラウザで [Fuji Faucet](https://faucet.avax.network/) を開く
2. 自分のウォレットアドレス（0x...）を入力して、テスト用 AVAX を受け取る
3. 送金に使う「秘密鍵」を、安全なメモに控えておく（人に共有しない）

### 4-2. 秘密鍵を渡して実行

**絶対に本番の秘密鍵や本物の資産が入ったウォレットでは試さないでください。**  
テスト用ウォレットだけを使います。

1. `60_AVALANCHE` フォルダに `.env` ファイルを作る（なければ）
2. 中身を次のようにする（`0x...` の部分を自分の**テスト用**秘密鍵に置き換える）:

```
AVALANCHE_NETWORK=fuji
AVALANCHE_PRIVATE_KEY=0xあなたのテスト用秘密鍵
```

3. 送金するコードの例（`src/send-test.ts` など）:

```typescript
import "dotenv/config";
import { sendAvax } from "./wallet.js";

// 送り先アドレス（例）
const to = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
const amount = 0.001;  // 0.001 AVAX

const txHash = await sendAvax(to, amount);
console.log("送金しました。トランザクションハッシュ:", txHash);
```

4. 実行:

```bash
npx tsx src/send-test.ts
```

「送金しました。トランザクションハッシュ: 0x...」と出れば、Fuji 上で送金が行われています。

---

## 5. 他のプロジェクト（50_API など）から使う

50_API や 30_STAFF_WEB など、別の Node プロジェクトから使う場合は、次のどちらかです。

- **同じリポジトリ内**なら、パスで読み込む:
  ```typescript
  import { getBalance, sendAvax } from "../60_AVALANCHE/src/index.js";
  ```
- **パッケージとして扱う**なら、`60_AVALANCHE` を npm のローカルパスで依存に追加してから、上のように `getBalance` や `sendAvax` を import して使います。

「残高を見るだけ」なら `getBalance`、「トランザクションを送る」なら `sendAvax` を使う、と覚えておけば大丈夫です。

---

## 用語の整理

| 用語 | 意味（このプロジェクトでのイメージ） |
|------|--------------------------------------|
| **Avalanche** | ブロックチェーンの名前。ここでは「C-Chain」という EVM 互換チェーンを使う |
| **Fuji** | テスト用のネットワーク。本物の資産は動いていない |
| **mainnet** | 本番のネットワーク。本物の AVAX が動く |
| **AVAX** | Avalanche 上の通貨の名前 |
| **秘密鍵** | そのウォレットを操作するための鍵。漏れると資産を取られるので絶対に共有しない |
| **RPC URL** | ブロックチェーンに「問い合わせる先」の URL。ここではデフォルトの URL を使うので、通常は触らなくてよい |

---

## 困ったとき

- **`node: command not found`**  
  → Node.js が入っていないか、パスが通っていない。Node.js をインストールし直すか、ターミナルを開き直す。
- **`npm run example` で接続エラー**  
  → インターネットにつながっているか確認。社内ネットで RPC がブロックされていないかも確認。
- **送金で「Insufficient balance」**  
  → Fuji 用の AVAX が足りない。Faucet でもう一度受け取る。

---

## 参考リンク

- [Avalanche Client SDK（英語）](https://build.avax.network/docs/tooling/avalanche-sdk/client/getting-started)
- [Fuji テストネット用 Faucet](https://faucet.avax.network/)
