"""
BƯỚC 7 — AI SERVICE (FastAPI)
=============================
Bọc 2 agent thành API cho backend Node gọi (hoặc test bằng Swagger/Postman).

  POST /predict-odds   -> Agent 1: dự đoán xác suất + odds ban đầu (ML)
  POST /risk-score     -> Agent 2: đánh giá rủi ro + đề xuất chỉnh odds (rule-based)
  GET  /health         -> kiểm tra service sống

CHẠY:
  pip install -r ai/requirements.txt
  uvicorn ai.service.main:app --reload --port 8000
Sau đó mở tài liệu tương tác:  http://localhost:8000/docs
"""

import sys
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

# Cho phép import ai/predict.py và ai/risk.py khi chạy bằng uvicorn.
sys.path.append(str(Path(__file__).resolve().parents[2]))
from ai.predict import predict_race           # noqa: E402
from ai.risk import assess_risk               # noqa: E402

app = FastAPI(
    title="Horse Racing AI Service",
    description="Agent 1 (Prediction, ML) + Agent 2 (Risk Management, rule-based)",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# Định nghĩa "hình dạng" dữ liệu vào/ra bằng Pydantic (tự kiểm tra kiểu + sinh docs).
# ---------------------------------------------------------------------------
class HorseIn(BaseModel):
    horseName: str
    OR: Optional[float] = Field(None, description="Official Rating (có thể thiếu)")
    RPR: Optional[float] = Field(None, description="Racing Post Rating (có thể thiếu)")
    age: Optional[float] = None
    weightLb: Optional[float] = None
    saddle: Optional[float] = None
    jockeyName: Optional[str] = None
    # trainerName đã bỏ: DB không lưu Trainer nên luôn null -> model dùng winrate
    # trainer trung bình chung (xem ai/predict.py).


class PredictRequest(BaseModel):
    horses: List[HorseIn]
    margin: float = Field(0.15, description="Biên lợi nhuận nhà cái (overround), 0.15=15%")


class RiskHorseIn(BaseModel):
    horseName: str
    current_odds: float
    total_bet: float = 0
    num_bettors: int = 0


class RiskRequest(BaseModel):
    treasury: float
    horses: List[RiskHorseIn]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict-odds")
def predict_odds(req: PredictRequest):
    """Agent 1 — trước khi mở cược: trả xác suất thắng + odds ban đầu + ranking."""
    horses = [h.model_dump() for h in req.horses]
    predictions = predict_race(horses, margin=req.margin)
    return {"predictions": predictions}


@app.post("/risk-score")
def risk_score(req: RiskRequest):
    """Agent 2 — sau khi mở cược: trả risk score + mức rủi ro + odds đề xuất."""
    horses = [h.model_dump() for h in req.horses]
    return assess_risk(req.treasury, horses)
