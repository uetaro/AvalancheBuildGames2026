// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReceiptRegistry
 * @notice Heartel — チェックアウト時の Kudos 受領証をオンチェーンに記録する最小コントラクト。
 *         設計書 DD-OPS-CHECKOUT-ONCHAIN §4 準拠。
 *
 * デプロイ先: Avalanche Fuji Testnet (ChainId=43113)
 *             本番は Avalanche C-Chain (ChainId=43114)
 *
 * デプロイ手順 (Hardhat):
 *   1. npm install --save-dev hardhat @openzeppelin/contracts
 *   2. npx hardhat compile
 *   3. npx hardhat run scripts/deploy.js --network fuji
 *   4. 取得した CONTRACT_ADDRESS を Supabase Secrets に設定
 */
contract ReceiptRegistry is Ownable {
    // ── エラー ───────────────────────────────────────────────────────────────
    error AlreadyRecorded(bytes32 anchorHash);
    error NotIssuer(address caller);

    // ── データ構造 ────────────────────────────────────────────────────────────
    struct Receipt {
        uint32  points;     // 付与ポイント
        uint64  issuedAt;   // block.timestamp（Unix 秒）
        address issuer;     // 発行者アドレス（= issuer ウォレット）
    }

    // anchorHash → Receipt（anchorHash が存在しない場合 issuer == address(0)）
    mapping(bytes32 => Receipt) public receipts;

    // 発行権限を持つアドレス一覧
    mapping(address => bool) public issuers;

    // ── イベント ──────────────────────────────────────────────────────────────
    event ReceiptRecorded(
        bytes32 indexed anchorHash,
        uint32  points,
        address indexed issuer,
        uint64  issuedAt
    );
    event IssuerUpdated(address indexed issuer, bool allowed);

    // ── 修飾子 ────────────────────────────────────────────────────────────────
    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert NotIssuer(msg.sender);
        _;
    }

    // ── コンストラクタ ────────────────────────────────────────────────────────
    constructor(address[] memory initialIssuers) Ownable(msg.sender) {
        for (uint256 i = 0; i < initialIssuers.length; i++) {
            issuers[initialIssuers[i]] = true;
            emit IssuerUpdated(initialIssuers[i], true);
        }
    }

    // ── 管理関数 ──────────────────────────────────────────────────────────────

    /**
     * @notice 発行者アドレスの権限を付与または剥奪する（owner のみ）
     */
    function setIssuer(address issuer, bool allowed) external onlyOwner {
        issuers[issuer] = allowed;
        emit IssuerUpdated(issuer, allowed);
    }

    // ── メイン関数 ────────────────────────────────────────────────────────────

    /**
     * @notice Kudos 受領証をオンチェーンに記録する。
     *         同じ anchorHash は 1 度しか記録できない（冪等）。
     * @param anchorHash keccak256(abi.encode(SCHEMA_ID, kudos_uuid, stay_uuid, ...))
     * @param points     付与した制度ポイント
     */
    function recordReceipt(bytes32 anchorHash, uint32 points) external onlyIssuer {
        if (receipts[anchorHash].issuer != address(0)) {
            revert AlreadyRecorded(anchorHash);
        }

        Receipt memory r = Receipt({
            points:   points,
            issuedAt: uint64(block.timestamp),
            issuer:   msg.sender
        });

        receipts[anchorHash] = r;
        emit ReceiptRecorded(anchorHash, points, msg.sender, r.issuedAt);
    }

    // ── ビュー関数 ────────────────────────────────────────────────────────────

    /**
     * @notice anchorHash がすでに記録済みか確認する（冪等チェック・検証 UI 用）
     */
    function isRecorded(bytes32 anchorHash) external view returns (bool) {
        return receipts[anchorHash].issuer != address(0);
    }

    /**
     * @notice 記録済みレシートの詳細を返す（検証 UI 用）
     */
    function getReceipt(bytes32 anchorHash)
        external
        view
        returns (uint32 points, uint64 issuedAt, address issuer)
    {
        Receipt memory r = receipts[anchorHash];
        return (r.points, r.issuedAt, r.issuer);
    }
}
