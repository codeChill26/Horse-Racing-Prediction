# AI Sub-Agent Architecture

## AI Sub-Agent 1 — Prediction Engine

### Mục tiêu
Dự đoán xác suất chiến thắng của từng ngựa trước khi mở cược.

### Input
- Lịch sử thi đấu của ngựa
- Thành tích nài ngựa
- Thành tích cặp Horse + Jockey
- Các thống kê liên quan

### Output
- Xác suất thắng (%)
- Xếp hạng các ngựa
- Odds ban đầu (1 / Probability)

### Vai trò
- Chỉ hoạt động trước khi mở cược.
- Đề xuất odds ban đầu.
- Admin xem xét và approve/reject trước khi công bố.

---

## AI Sub-Agent 2 — Risk Management Engine

### Mục tiêu
Theo dõi thị trường cược theo thời gian thực và quản lý rủi ro cho nhà cái.

### Input
- Odds hiện tại
- Tổng tiền cược trên từng ngựa
- Số lượng người chơi
- Liability
- Treasury

### Chức năng
- Tính Risk Score
- Đánh giá mức độ rủi ro (Low → Critical)
- Đề xuất điều chỉnh odds khi một cửa bị cược quá nhiều
- Giúp cân bằng liability giữa các lựa chọn cược

### Output
- Risk Score
- Mức độ rủi ro
- Odds đề xuất mới

### Vai trò
- Chỉ hoạt động sau khi mở cược.
- Đưa ra đề xuất điều chỉnh odds.
- Admin quyết định có áp dụng hay không.
- Không ảnh hưởng đến những vé đã được đặt trước khi odds thay đổi.