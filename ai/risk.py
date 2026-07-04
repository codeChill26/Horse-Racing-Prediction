"""
BƯỚC 4 (AI_Feature.md) — AGENT 2: RISK MANAGEMENT ENGINE (RULE-BASED)
====================================================================
KHÔNG dùng Machine Learning. Vì sao? App còn mới, CHƯA có lịch sử cược để train.
Agent 2 vốn được định nghĩa bằng CÔNG THỨC nghiệp vụ (liability, treasury, risk).
=> Đây là "AI luật" (rule-based / expert system), không phải model học từ dữ liệu.

Ý tưởng nhà cái:
  - Người chơi cược vào từng con. Tổng tiền thu về = pool.
  - Nếu con X thắng: nhà cái phải TRẢ = tiền_cược_X * odds_X, và GIỮ tiền cược các con khác.
  - liability(X) = payout(X) - pool  (dương = nhà cái LỖ nếu X thắng)
  - Rủi ro = kịch bản xấu nhất (liability lớn nhất) so với treasury (vốn nhà cái).
  - Nếu 1 cửa bị cược quá nhiều -> hạ odds cửa đó để giảm khoản phải trả.
"""

# Ngưỡng phân mức rủi ro theo tỉ lệ (max liability / treasury).
RISK_LEVELS = [
    (0.10, "LOW"),       # <=10% treasury: an toàn
    (0.25, "MEDIUM"),    # <=25%
    (0.50, "HIGH"),      # <=50%
    (float("inf"), "CRITICAL"),  # còn lại: nguy hiểm
]

# Nếu một cửa chiếm > ngưỡng này của pool -> coi là "bị cược lệch", đề xuất hạ odds.
OVER_EXPOSURE_SHARE = 0.40
# Mức hạ odds tối đa mỗi lần đề xuất (10%).
MAX_ODDS_CUT = 0.10


def _risk_level(ratio):
    for threshold, label in RISK_LEVELS:
        if ratio <= threshold:
            return label
    return "CRITICAL"


def assess_risk(treasury, horses):
    """
    treasury: vốn hiện có của nhà cái (số).
    horses  : list dict, mỗi con: {horseName, current_odds, total_bet, num_bettors?}
              - current_odds: odds đang treo cho con này
              - total_bet   : tổng tiền người chơi đã đặt vào con này

    Trả về dict: risk_score, risk_level, total_pool, per-horse liability + odds đề xuất.
    """
    pool = sum(float(h.get("total_bet", 0)) for h in horses)

    details = []
    max_liability = 0.0
    for h in horses:
        bet = float(h.get("total_bet", 0))
        odds = float(h.get("current_odds", 1))
        payout = bet * odds                 # phải trả nếu con này thắng
        liability = payout - pool           # dương = lỗ
        share = (bet / pool) if pool > 0 else 0.0  # cửa này chiếm bao nhiêu % pool

        # Đề xuất odds mới: nếu cửa bị cược lệch (share cao) -> hạ odds để giảm payout.
        suggested_odds = odds
        reason = "giữ nguyên"
        if share > OVER_EXPOSURE_SHARE and liability > 0:
            # Hạ odds tỉ lệ theo mức vượt ngưỡng, nhưng không quá MAX_ODDS_CUT.
            cut = min(MAX_ODDS_CUT, (share - OVER_EXPOSURE_SHARE))
            suggested_odds = round(odds * (1 - cut), 2)
            reason = f"cửa này chiếm {share*100:.0f}% pool -> hạ odds {cut*100:.0f}%"

        details.append({
            "horseName": h.get("horseName"),
            "total_bet": bet,
            "current_odds": odds,
            "pool_share": round(share * 100, 1),
            "liability_if_win": round(liability, 2),
            "suggested_odds": suggested_odds,
            "reason": reason,
        })
        max_liability = max(max_liability, liability)

    # Risk score = kịch bản xấu nhất so với vốn nhà cái. Chặn chia 0.
    treasury = float(treasury) if treasury else 0.0
    risk_score = (max_liability / treasury) if treasury > 0 else float("inf")
    risk_score = max(risk_score, 0.0)  # liability âm nghĩa là luôn lãi -> rủi ro 0

    return {
        "risk_score": round(risk_score, 3),
        "risk_level": _risk_level(risk_score),
        "total_pool": round(pool, 2),
        "worst_case_liability": round(max_liability, 2),
        "treasury": round(treasury, 2),
        "horses": details,
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    demo = [
        {"horseName": "Thunderbolt", "current_odds": 2.5, "total_bet": 8000, "num_bettors": 40},
        {"horseName": "Silver Arrow", "current_odds": 3.2, "total_bet": 1500, "num_bettors": 12},
        {"horseName": "Old Timer", "current_odds": 7.0, "total_bet": 500, "num_bettors": 5},
    ]
    result = assess_risk(treasury=10000, horses=demo)
    print("=" * 60)
    print(f"RISK SCORE: {result['risk_score']}  ({result['risk_level']})")
    print(f"Pool: {result['total_pool']} | Xấu nhất phải trả (net): "
          f"{result['worst_case_liability']} | Treasury: {result['treasury']}")
    print("-" * 60)
    for h in result["horses"]:
        print(f"  {h['horseName']:14s} share={h['pool_share']:5.1f}% "
              f"liability={h['liability_if_win']:9.2f} "
              f"odds {h['current_odds']}->{h['suggested_odds']} ({h['reason']})")
