def calculate_risk_score(transaction):
    score = 0
    reasons = []

    if transaction.event_type == "payment.failed":
        score += 30
        reasons.append("Failed payment")

    if transaction.event_type == "dispute.opened":
        score += 50
        reasons.append("Dispute opened")

    score = min(score, 100)

    return {
        "risk_score": score,
        "reasons": reasons
    }