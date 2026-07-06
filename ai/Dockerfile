# ai/Dockerfile — đóng gói AI service (FastAPI) chạy bằng Docker.
#
# Build context là thư mục ai/. Code được đặt vào /app/ai để khớp cách import
# "ai.service.main:app" và "from ai.predict import ..." (giống chạy từ gốc dự án).

FROM python:3.12-slim

WORKDIR /app

# Cài thư viện trước để tận dụng Docker layer cache (đổi code không phải cài lại).
COPY requirements.txt /app/ai/requirements.txt
RUN pip install --no-cache-dir -r /app/ai/requirements.txt

# Sao chép toàn bộ code AI (kèm models/model.pkl) vào /app/ai.
COPY . /app/ai/

# Cổng nội bộ của uvicorn.
EXPOSE 8000

# --host 0.0.0.0: nhận request từ ngoài container (mặc định chỉ nghe trong container).
CMD ["uvicorn", "ai.service.main:app", "--host", "0.0.0.0", "--port", "8000"]
