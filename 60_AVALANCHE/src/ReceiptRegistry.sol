// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReceiptRegistry
 * @notice Heartel — Kudos 受領証およびスタッフ所属（Affiliation）証跡を
 *         オンチェーンに記録する最小コントラクト。
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

    // ═══════════════════════════════════════════════════════════════════════════
    // Kudos Receipt
    // ═══════════════════════════════════════════════════════════════════════════

    struct Receipt {
        uint32  points;
        uint64  issuedAt;
        address issuer;
    }

    mapping(bytes32 => Receipt) public receipts;
    mapping(address => bool) public issuers;

    event ReceiptRecorded(
        bytes32 indexed anchorHash,
        uint32  points,
        address indexed issuer,
        uint64  issuedAt
    );
    event IssuerUpdated(address indexed issuer, bool allowed);

    // ═══════════════════════════════════════════════════════════════════════════
    // Affiliation (staff ↔ company linkage proof)
    // ═══════════════════════════════════════════════════════════════════════════

    struct Affiliation {
        bytes32 companyHash;   // keccak256(company_id)
        bytes32 staffHash;     // keccak256(user_id)
        uint64  affiliatedAt;  // block.timestamp
        address issuer;
    }

    mapping(bytes32 => Affiliation) public affiliations;

    event AffiliationRecorded(
        bytes32 indexed anchorHash,
        bytes32 indexed companyHash,
        bytes32 indexed staffHash,
        address issuer,
        uint64  affiliatedAt
    );

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

    function setIssuer(address issuer, bool allowed) external onlyOwner {
        issuers[issuer] = allowed;
        emit IssuerUpdated(issuer, allowed);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Kudos Receipt — メイン関数
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Kudos 受領証をオンチェーンに記録する（冪等）。
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

    function isRecorded(bytes32 anchorHash) external view returns (bool) {
        return receipts[anchorHash].issuer != address(0);
    }

    function getReceipt(bytes32 anchorHash)
        external
        view
        returns (uint32 points, uint64 issuedAt, address issuer)
    {
        Receipt memory r = receipts[anchorHash];
        return (r.points, r.issuedAt, r.issuer);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Affiliation — メイン関数
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice スタッフと会社の所属関係をオンチェーンに記録する（冪等）。
     *         第三者が「この人はこの会社に所属していた」ことを検証可能にする。
     * @param anchorHash  keccak256(abi.encode(SCHEMA_ID, company_member_id, company_id, user_id))
     * @param companyHash keccak256(company_id) — 会社を特定するハッシュ
     * @param staffHash   keccak256(user_id)    — スタッフを特定するハッシュ
     */
    function recordAffiliation(
        bytes32 anchorHash,
        bytes32 companyHash,
        bytes32 staffHash
    ) external onlyIssuer {
        if (affiliations[anchorHash].issuer != address(0)) {
            revert AlreadyRecorded(anchorHash);
        }

        Affiliation memory a = Affiliation({
            companyHash:  companyHash,
            staffHash:    staffHash,
            affiliatedAt: uint64(block.timestamp),
            issuer:       msg.sender
        });

        affiliations[anchorHash] = a;
        emit AffiliationRecorded(anchorHash, companyHash, staffHash, msg.sender, a.affiliatedAt);
    }

    function isAffiliationRecorded(bytes32 anchorHash) external view returns (bool) {
        return affiliations[anchorHash].issuer != address(0);
    }

    function getAffiliation(bytes32 anchorHash)
        external
        view
        returns (bytes32 companyHash, bytes32 staffHash, uint64 affiliatedAt, address issuer)
    {
        Affiliation memory a = affiliations[anchorHash];
        return (a.companyHash, a.staffHash, a.affiliatedAt, a.issuer);
    }
}
