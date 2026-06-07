 
TÀI LIỆU API & DỮ LIỆU KIỂM THỬ: JOCKEY MANAGEMENT & INVITATION
📌 Tổng quan luồng nghiệp vụ (Invitation Flow)
Luồng giao tiếp giữa Horse Owner (Chủ ngựa) và Jockey (Nài ngựa) trước giải đấu diễn ra tuần tự như sau:
1.	Horse Owner tìm kiếm danh sách Jockey đủ điều kiện thi đấu $\rightarrow$ Gửi lời mời kèm thông tin raceId và horseId.
2.	Jockey nhận lời mời trong Inbox $\rightarrow$ Xem chi tiết $\rightarrow$ Bấm Accepted (Đồng ý) hoặc Declined (Từ chối kèm lý do).
3.	Horse Owner xem danh sách các Jockey đã Accepted $\rightarrow$ Ấn Confirm chọn 1 người duy nhất cho con ngựa trong trận đua đó.
4.	Hệ thống tự động xử lý: Tạo bản ghi chính thức trong danh sách thi đấu (entries), đồng thời tự động chuyển tất cả lời mời khác của cùng con ngựa trong trận đua đó sang trạng thái CANCELLED.
🔐 Yêu cầu an ninh gác cổng chung (Security Authentication)
●	Tất cả các API dưới đây (trừ API đăng ký/đăng nhập) đều yêu cầu đính kèm mã Access Token trong Header theo định dạng:
●	HTTP
Authorization: Bearer <chuỗi_access_token_nhận_được_khi_login>
●	
●	
●	Hệ thống sẽ tự động bốc thông tin định danh userId và roleCode (Quản trị viên, Chủ ngựa, Nài ngựa) trực tiếp từ mã Token này để xử lý và phân quyền.
🛠 Chi tiết các API và Dữ liệu mẫu (Test Data)
API 1: Xem danh sách / Tìm kiếm Jockey nâng cao
●	Endpoint: GET /api/invitations/jockeys
●	Method: GET
●	Mô tả cho Frontend: Trả về danh sách các Jockey đang hoạt động (isActive: true) và đã hoàn thiện hồ sơ bắt buộc (isProfileComplete: true - có đầy đủ licenseNumber và weight).
●	Tham số Query (URL Parameters):
○	name (String, Optional): Từ khóa tìm kiếm theo tên Jockey. Nếu để trống, API tự động trả về TẤT CẢ Jockey đủ điều kiện.
●	Dữ liệu phản hồi mẫu (Response 200 OK):
●	JSON
{
  "success": true,
  "jockeys": [
    {
      "userId": 12,
      "email": "jockey.minh@example.com",
      "fullName": "Nguyễn Văn Minh",
      "phoneNumber": "0912345678",
      "licenseNumber": "JC-2026-0001",
      "weight": 52.5,
      "bio": "Kinh nghiệm 5 năm đua ngựa đường trường."
    }
  ]
}
●	
●	
API 2: Gửi lời mời thi đấu
●	Endpoint: POST /api/invitations
●	Method: POST
●	Mô tả cho Frontend: Sử dụng khi Horse Owner bấm nút "Gửi lời mời" cho một Jockey cụ thể.
●	Dữ liệu gửi lên (Request Body JSON):
●	JSON
{
  "raceId": 1,
  "horseId": 3,
  "jockeyId": 12
}
●	
●	
●	Ràng buộc kiểm soát (Validation): * 1 Horse Owner chỉ gửi được 1 lời mời duy nhất cho mỗi bộ ba (jockeyId, horseId, raceId). Gửi lại lần 2 sẽ báo lỗi 400 Bad Request.
○	Nếu trận đua đã qua hạn đăng ký (registrationDeadline), hệ thống sẽ từ chối gửi.
●	Dữ liệu phản hồi mẫu (Response 201 Created):
●	JSON
{
  "message": "Invitation sent successfully",
  "invitation": {
    "invitationId": 101,
    "raceId": 1,
    "horseId": 3,
    "ownerId": 8,
    "jockeyId": 12,
    "status": "PENDING",
    "declineReason": null,
    "createdAt": "2026-06-03T10:45:00.000Z",
    "updatedAt": "2026-06-03T10:45:00.000Z"
  }
}
●	
●	
API 3: Xem danh sách hộp thư Lời mời (Inbox / Outbox)
●	Endpoint: GET /api/invitations
●	Method: GET
●	Mô tả cho Frontend: API này tự phân luồng thông minh dựa trên Token:
○	Nếu tài khoản đăng nhập là Jockey: API hoạt động như Inbox (Hộp thư đến).
○	Nếu tài khoản đăng nhập là Horse Owner: API hoạt động như Outbox (Hộp thư đi).
●	Tham số Query (URL Parameters):
○	status (String, Optional): Lọc theo trạng thái lời mời. Giá trị cho phép: PENDING, ACCEPTED, DECLINED, CANCELLED.
●	Dữ liệu phản hồi mẫu (Response 200 OK):
●	JSON
{
  "invitations": [
    {
      "invitationId": 101,
      "raceId": 1,
      "horseId": 3,
      "ownerId": 8,
      "jockeyId": 12,
      "status": "PENDING",
      "declineReason": null,
      "createdAt": "2026-06-03T10:45:00.000Z",
      "race": { "name": "Vòng Loại 1 - Xuân 2026" },
      "horse": { "name": "Xích Thố" },
      "jockey": { "fullName": "Nguyễn Văn Minh", "email": "jockey.minh@example.com" },
      "owner": { "fullName": "Trần Văn Chủ Ngựa", "email": "owner.tran@example.com" }
    }
  ]
}
●	
●	
API 4: Xem chi tiết một Lời mời cụ thể
●	Endpoint: GET /api/invitations/{id}
●	Method: GET
●	Mô tả cho Frontend: Sử dụng khi Jockey bấm vào một lời mời trong danh sách để mở màn hình "Chi tiết lời mời", hiển thị đầy đủ thông tin về trận đua, con ngựa và chủ ngựa trước khi đưa ra quyết định phản hồi.
●	Tham số Đường dẫn (Path Parameter): {id} là số invitationId cần xem.
●	Dữ liệu phản hồi mẫu (Response 200 OK):
●	JSON
{
  "invitationId": 101,
  "raceId": 1,
  "horseId": 3,
  "ownerId": 8,
  "jockeyId": 12,
  "status": "PENDING",
  "declineReason": null,
  "race": { "raceId": 1, "name": "Vòng Loại 1", "registrationDeadline": "2026-06-10T00:00:00.000Z" },
  "horse": { "horseId": 3, "name": "Xích Thố", "age": 4 },
  "jockey": { "fullName": "Nguyễn Văn Minh", "weight": 52.5 },
  "owner": { "fullName": "Trần Văn Chủ Ngựa" }
}
●	
●	
API 5: Jockey phản hồi lời mời
●	Endpoint: PUT /api/invitations/{id}/respond
●	Method: PUT
●	Mô tả cho Frontend: Dùng khi Jockey bấm nút Đồng ý hoặc Từ chối.
●	Tham số Đường dẫn (Path Parameter): {id} là invitationId cần phản hồi.
●	Kịch bản gửi dữ liệu (Request Body JSON):
○	Kịch bản 1 - Đồng ý (ACCEPTED):
○	JSON
{ "status": "ACCEPTED" }
○	
○	
○	Kịch bản 2 - Từ chối (DECLINED) - Bắt buộc truyền declineReason:
○	JSON
{
  "status": "DECLINED",
  "declineReason": "Trùng lịch thi đấu với một giải đua khác."
}
○	
○	
API 6: Chủ ngựa xác nhận chốt Jockey (Confirm)
●	Endpoint: POST /api/invitations/{id}/confirm
●	Method: POST
●	Mô tả cho Frontend: Dùng khi Horse Owner xem hộp thư đi, chọn một Jockey đã ACCEPTED và bấm nút "Xác nhận chốt nài ngựa này".
●	Tham số Đường dẫn (Path Parameter): {id} là invitationId được lựa chọn chốt.
●	Logic ngầm cần lưu ý để làm UI: Ngay khi bấm Confirm thành công:
1.	Bản ghi thi đấu chính thức tự động sinh ra trong bảng entries (để hiển thị danh sách thi đấu giải công khai).
2.	Tất cả các lời mời khác đang ở trạng thái PENDING hoặc ACCEPTED liên quan đến con ngựa này trong trận đua này sẽ tự động chuyển sang trạng thái CANCELLED. Frontend cần làm giao diện hiển thị nhãn "Đã hủy do hệ thống" cho các dòng tương ứng.
●	Dữ liệu phản hồi mẫu (Response 200 OK):
●	JSON
{
  "message": "Jockey confirmed successfully, cascading invitations cancelled.",
  "entry": {
    "entryId": 50,
    "raceId": 1,
    "horseId": 3,
    "jockeyId": 12,
    "createdAt": "2026-06-03T11:00:00.000Z"
  }
}
●	
●	
💾 Bộ dữ liệu kiểm thử thực tế (Test Data chuẩn trên Supabase)
Để thuận tiện cho các thành viên Frontend tạo tài khoản Test luồng khép kín, các bạn hãy sử dụng bộ dữ liệu mẫu gối đầu dưới đây:
👥 1. Tài khoản Người dùng thử nghiệm (Users)
userId	Email	Mật khẩu (Raw)	fullName	roleCode	Hồ sơ nâng cao (Jockey Profile)
13	owner.tran@example.com	password123	Trần Văn Chủ Ngựa	HORSE_OWNER	Không có
14	jockey.minh@example.com	password123	Nguyễn Văn Minh	JOCKEY	licenseNumber: "JC-2026-0001", weight: 52.5
15	jockey.hoang@example.com	password123	Lê Tuấn Hoàng	JOCKEY	licenseNumber: "JC-2026-0002", weight: 54.0
🏁 2. Thực thể Trận đua & Ngựa (Races & Horses)
●	RaceId = 1: Giải Đua Ngựa Mở Rộng Cup Xuân 2026 (Hạn đăng ký: 2026-06-10).
●	HorseId = 2: Ngựa Xích Thố (Thuộc quyền sở hữu của Chủ ngựa có userId: 13).
●	HorseId = 3: Ngựa Phi Yến (Thuộc quyền sở hữu của Chủ ngựa có userId: 13).
🧪 KỊCH BẢN TEST LUỒNG HOÀN CHỈNH KÈM DATA TRÊN SWAGGER UI
ĐIỀU KIỆN TIÊN QUYẾT (PREREQUISITES)
Đảm bảo bạn đã chạy thành công đoạn script SQL khởi tạo dữ liệu races (ID: 1) và horses (ID: 3, 4) ở lượt trước trên Supabase Cloud.
🟩 BƯỚC 1: ĐĂNG NHẬP TÀI KHOẢN CHỦ NGỰA (HORSE OWNER)
●	API Endpoint: POST /api/auth/login
●	Mục đích: Lấy Token để đại diện cho Chủ ngựa Trần Văn Minh thực hiện rải lời mời thi đấu.
●	Dữ liệu Paste vào Swagger (Request Body):
JSON
{
  "email": "owner.tran@example.com",
  "password": "password123"
}

●	Hành động tiếp theo: Copy chuỗi accessToken ở phần Response trả về. Bấm vào nút Authorize ở góc trên cùng của Swagger UI, dán chuỗi đó vào và ấn Xác nhận.
🟩 BƯỚC 2: CHỦ NGỰA GỬI LỜI MỜI CHO JOCKEY MINH (ID: 12)
●	API Endpoint: POST /api/invitations
●	Mục đích: Gửi lời mời cho Jockey Minh điều khiển ngựa Xích Thố tham gia trận đua Vòng Loại 1.
●	Dữ liệu Paste vào Swagger (Request Body):
JSON
{
  "raceId": 1,
  "horseId": 2,
  "jockeyId": 14
}

●	Hành động tiếp theo: Nhớ lưu lại số invitationId (Ví dụ trả về: 1) của Jockey Minh ở phần kết quả trả về để dùng cho các bước sau.
🟩 BƯỚC 3: CHỦ NGỰA GỬI LỜI MỜI CẠNH TRANH CHO JOCKEY HOÀNG (ID: 13)
●	API Endpoint: POST /api/invitations
●	Mục đích: Tiếp tục gửi lời mời cho Jockey Hoàng cho cùng trận đấu và con ngựa đó để thử nghiệm tính năng hủy tự động hàng loạt.
●	Dữ liệu Paste vào Swagger (Request Body):
JSON
{
  "raceId": 1,
  "horseId": 2,
  "jockeyId": 15
}

●	Hành động tiếp theo: Gửi thành công, hệ thống sinh ra một lời mời nữa có trạng thái mặc định là PENDING.
🟩 BƯỚC 4: JOCKEY MINH ĐĂNG NHẬP & ĐỒNG Ý THI ĐẤU (ACCEPTED)
●	API 4.1 (Đổi Token): Gọi POST /api/auth/login với tài khoản của Jockey Minh để lấy Token mới:
JSON
{
  "email": "jockey.minh@example.com",
  "password": "password123"
}

(Bốc accessToken mới này dán đè vào mục Authorize trên đầu Swagger UI để đổi quyền sang Jockey).
●	API 4.2 (Phản hồi lời mời): Gọi PUT /api/invitations/{id}/respond
○	Điền vào ô id trên đường dẫn URL: Số invitationId của Jockey Minh thu được từ Bước 2 (ví dụ: 1).
○	Dữ liệu Paste vào Swagger (Request Body):
JSON
{
  "status": "ACCEPTED"
}

🟩 BƯỚC 5: CHỦ NGỰA QUAY LẠI CHỐT (CONFIRM) JOCKEY MINH
●	API 5.1 (Đổi lại Token): Đăng nhập lại bằng tài khoản owner.tran@example.com như ở Bước 1, lấy Token chủ ngựa dán lại vào mục Authorize gác cổng.
●	API 5.2 (Xác nhận chốt nài ngựa): Gọi POST /api/invitations/{id}/confirm
○	Điền vào ô id trên đường dẫn URL: Số invitationId của Jockey Minh (ví dụ: 1).
○	API này không cần Request Body, bạn chỉ việc ấn Execute.
🏁 KẾT QUẢ KIỂM NGHIỆM THỰC TẾ TRÊN SUPABASE CLOUD
Sau khi bạn hoàn thành bấm nút Execute ở Bước 5, hãy bật trình duyệt tab Table Editor của Supabase lên để nghiệm thu thành quả logic:
1.	Bảng entries: Tự động sinh ra 1 bản ghi chốt danh sách thi đấu chính thức dạng:
○	race_id: 1, horse_id: 2, jockey_id: 14
2.	Bảng jockey_invitations:
○	Bản ghi lời mời của Jockey Minh (Id: 12) giữ trạng thái ACCEPTED.
○	Bản ghi lời mời cạnh tranh của Jockey Hoàng (Id: 13) tự động chuyển màu trạng thái sang CANCELLED chuẩn xác 100% đúng như cam kết nghiệp vụ!
 
Tournament + Horses (Public) 
Public APIs - Giải đấu & Ngựa công khai
Tài liệu tách riêng theo nhóm API liên quan để Frontend dễ tra cứu và gắn đúng màn hình.
 
Public APIs - Giải đấu & Ngựa công khai
API Spec cho Frontend - Bản tiếng Việt
1. Public Tournaments - Giải đấu công khai
API 1: Xem danh sách giải đấu công khai
Endpoint: GET /api/tournaments
Method: GET
Mô tả cho Frontend:
Sử dụng ở màn hình danh sách giải đấu cho người dùng chưa đăng nhập hoặc đã đăng nhập đều xem được. API này chỉ trả về các giải đấu có trạng thái được public như OPEN, ONGOING, FINISHED. Không dùng API này cho trang quản trị vì Admin cần thấy cả DRAFT hoặc CANCELLED.
Khi nào dùng:
·        Trang Home cần hiển thị các giải đấu đang mở.
·        Trang Tournament List cho người dùng thường.
·        Dropdown chọn giải đấu public.
Auth: Không cần đăng nhập.
Tham số Query: Không có.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "tournaments": [
 	{
       "tournamentId": 12,
   	"name": "Spring Derby 2026",
       "description": "Giải đua mùa xuân 2026",
   	"status": "OPEN",
   	"startAt": "2026-06-10T00:00:00.000Z",
   	"endAt": "2026-06-20T00:00:00.000Z",
   	"createdAt": "2026-06-01T10:00:00.000Z",
   	"updatedAt": "2026-06-01T10:00:00.000Z"
 	}
   ]
 }
API 2: Xem chi tiết một giải đấu công khai
Endpoint: GET /api/tournaments/{id}
Method: GET
Mô tả cho Frontend:
Sử dụng khi người dùng bấm vào một giải đấu trong danh sách để mở trang chi tiết giải đấu. API này chỉ dùng cho các giải đấu đang được public. Nếu giải đấu là DRAFT hoặc không tồn tại, FE sẽ nhận lỗi.
Khi nào dùng:
·        User bấm vào card giải đấu.
·        Màn hình Tournament Detail cần hiển thị tên, mô tả, thời gian bắt đầu/kết thúc.
Auth: Không cần đăng nhập.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	tournamentId cần xem chi tiết
 
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "tournament": {
 	"tournamentId": 12,
 	"name": "Spring Derby 2026",
 	"description": "Giải đua mùa xuân 2026",
 	"status": "OPEN",
 	"startAt": "2026-06-10T00:00:00.000Z",
 	"endAt": "2026-06-20T00:00:00.000Z",
 	"createdAt": "2026-06-01T10:00:00.000Z",
 	"updatedAt": "2026-06-01T10:00:00.000Z"
   }
 }
Lỗi thường gặp:
{ "error": "Invalid tournament id" }
{ "error": "Tournament not found" }
2. Public Horses - Ngựa công khai
API 9: Xem danh sách ngựa đã được duyệt
Endpoint: GET /api/horses
Method: GET
Mô tả cho Frontend:
Sử dụng ở màn hình danh sách ngựa public. API chỉ trả về các ngựa có trạng thái APPROVED, nghĩa là đã được Admin duyệt và có thể hiển thị cho người dùng thường.
Khi nào dùng:
·        Trang danh sách ngựa public.
·        Trang chọn/xem hồ sơ ngựa đã được duyệt.
·        Màn hình hiển thị thành tích của ngựa.
Auth: Không cần đăng nhập.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "horses": [
 	{
   	"horseId": 10,
   	"ownerId": 7,
   	"name": "Storm",
   	"breed": "Arabian",
       "dateOfBirth": "2020-01-01T00:00:00.000Z",
   	"sex": "M",
   	"color": "Brown",
   	"status": "APPROVED",
       "rejectionReason": null,
   	"approvedAt": "2026-06-02T10:00:00.000Z",
       "careerMetrics": {
         "totalStarts": 3,
     	"wins": 1,
     	"winRate": 33.33,
         "avgFinishPosition": 2.33,
         "recentFormText": "1-2-4"
   	}
 	}
   ]
 }
API 10: Xem chi tiết một ngựa public
Endpoint: GET /api/horses/{id}
Method: GET
Mô tả cho Frontend:
Sử dụng khi người dùng bấm vào một con ngựa trong danh sách để xem hồ sơ chi tiết. API này chỉ xem được ngựa đã APPROVED.
Khi nào dùng:
·        User mở màn hình Horse Detail.
·        FE cần hiển thị thông tin giống, tuổi, màu, thành tích gần đây.
Auth: Không cần đăng nhập.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	horseId cần xem
 
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "horse": {
 	"horseId": 10,
 	"name": "Storm",
 	"breed": "Arabian",
 	"status": "APPROVED",
     "careerMetrics": {
       "totalStarts": 3,
   	"wins": 1,
   	"winRate": 33.33,
       "recentFormText": "1-2-4"
 	}
   }
 }
Lỗi thường gặp:
{ "error": "Horse not found" }
 
Admin Management 
Admin APIs - Quản lý giải đấu & cổng đăng ký race
Tài liệu tách riêng theo nhóm API liên quan để Frontend dễ tra cứu và gắn đúng màn hình.
 
Admin APIs - Quản lý giải đấu & cổng đăng ký race
1. Admin Tournaments - Quản lý giải đấu cho Admin
API 3: Admin xem danh sách giải đấu
Endpoint: GET /api/admin/tournaments?status={STATUS}
Method: GET
Mô tả cho Frontend:
Sử dụng ở trang Admin quản lý giải đấu. Khác với API public, API này cho Admin xem được tất cả trạng thái như DRAFT, OPEN, ONGOING, FINISHED, CANCELLED.
Khi nào dùng:
·        Admin mở màn hình Tournament Management.
·        Admin lọc giải đấu theo trạng thái.
·        Admin cần xem giải đấu nháp để chỉnh sửa hoặc mở đăng ký.
Auth: Cần token ADMIN.
Tham số Query:
Tên	Kiểu	Bắt buộc	Giá trị hợp lệ	Mô tả
status	String	Không	ALL, DRAFT, OPEN, ONGOING, FINISHED, CANCELLED	Lọc danh sách giải đấu theo trạng thái. Nếu không truyền hoặc truyền ALL thì trả về tất cả.
 
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "tournaments": [
 	{
       "tournamentId": 1,
   	"name": "Spring Derby 2026",
       "description": null,
   	"status": "DRAFT",
       "cancelReason": null,
   	"startAt": null,
   	"endAt": null,
   	"createdAt": "2026-06-01T10:00:00.000Z",
   	"updatedAt": "2026-06-01T10:00:00.000Z",
   	"_count": { "races": 0 }
 	}
   ]
 }
Lỗi thường gặp:
·        401: Chưa đăng nhập hoặc token sai.
·        403: User không phải Admin.
·        400: status không hợp lệ.
API 4: Admin xem chi tiết một giải đấu
Endpoint: GET /api/admin/tournaments/{id}
Method: GET
Mô tả cho Frontend:
Sử dụng khi Admin bấm vào một giải đấu trong trang quản lý để xem chi tiết hoặc chuẩn bị chỉnh sửa. API này có thể xem cả giải đấu DRAFT hoặc CANCELLED, nên dùng cho Admin thay vì API public.
Khi nào dùng:
·        Admin mở trang Tournament Detail trong dashboard.
·        Admin cần load dữ liệu cũ vào form Edit Tournament.
Auth: Cần token ADMIN.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	tournamentId cần xem
 
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "tournament": {
 	"tournamentId": 1,
 	"name": "Spring Derby 2026",
 	"status": "DRAFT",
 	"_count": { "races": 0 }
   }
 }
Lỗi thường gặp:
·        400: ID không hợp lệ.
·        404: Không tìm thấy giải đấu.
API 5: Admin tạo giải đấu mới
Endpoint: POST /api/admin/tournaments
Method: POST
Mô tả cho Frontend:
Sử dụng khi Admin submit form tạo giải đấu mới. Giải đấu sau khi tạo mặc định ở trạng thái DRAFT, chưa hiển thị ở trang public cho người dùng thường.
Khi nào dùng:
·        Admin bấm nút Create Tournament.
·        FE gửi dữ liệu từ form tạo giải đấu.
Auth: Cần token ADMIN.
Dữ liệu gửi lên (Request Body):
{
   "name": "Spring Derby 2026",
   "description": "Optional",
   "startAt": "2026-06-10T00:00:00.000Z",
   "endAt": "2026-06-20T00:00:00.000Z"
 }
Quy tắc validate:
·        name bắt buộc, không được rỗng.
·        startAt và endAt không bắt buộc.
·        Nếu có startAt hoặc endAt, phải là ISO datetime hợp lệ.
·        Nếu có cả hai, startAt phải nhỏ hơn hoặc bằng endAt.
Dữ liệu phản hồi mẫu (Response 201 Created):
{
   "message": "Tournament created successfully",
   "tournament": {
 	"tournamentId": 123,
 	"name": "Spring Derby 2026",
 	"status": "DRAFT",
 	"_count": { "races": 0 }
   }
 }
API 6: Admin cập nhật thông tin giải đấu
Endpoint: PATCH /api/admin/tournaments/{id}
Method: PATCH
Mô tả cho Frontend:
Sử dụng khi Admin chỉnh sửa thông tin cơ bản của giải đấu như tên, mô tả, ngày bắt đầu, ngày kết thúc. API này không dùng để đổi trạng thái vòng đời như mở giải, hủy giải; muốn đổi trạng thái dùng API đổi status riêng.
Khi nào dùng:
·        Admin submit form Edit Tournament.
·        Admin sửa tên/mô tả/thời gian của giải đấu.
Auth: Cần token ADMIN.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	tournamentId cần cập nhật
 
Dữ liệu gửi lên (Request Body):
{
   "name": "Updated name",
   "description": "Updated description",
   "startAt": "2026-06-11T00:00:00.000Z",
   "endAt": "2026-06-22T00:00:00.000Z"
 }
Lưu ý cho FE:
Body cần có ít nhất một field cần cập nhật. Không nên gửi body rỗng.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "message": "Tournament updated successfully",
   "tournament": {
 	"tournamentId": 123,
 	"status": "OPEN"
   }
 }
Lỗi thường gặp:
·        409: Không thể chỉnh sửa giải đấu đã FINISHED hoặc CANCELLED.
API 7: Admin đổi trạng thái giải đấu
Endpoint: PATCH /api/admin/tournaments/{id}/status
Method: PATCH
Mô tả cho Frontend:
Sử dụng khi Admin muốn thay đổi vòng đời của giải đấu, ví dụ từ DRAFT sang OPEN, từ OPEN sang ONGOING, hoặc hủy giải đấu. Đây là API riêng cho nút đổi trạng thái, không phải API edit thông tin.
Khi nào dùng:
·        Admin bấm nút Publish/Open Tournament.
·        Admin bấm Start Tournament.
·        Admin bấm Finish Tournament.
·        Admin bấm Cancel Tournament.
Auth: Cần token ADMIN.
Dữ liệu gửi lên (Request Body):
Mở giải đấu:
{ "status": "OPEN" }
Hủy giải đấu:
{
   "status": "CANCELLED",
   "cancelReason": "Bad weather"
 }
Luồng trạng thái hợp lệ:
DRAFT -> OPEN -> ONGOING -> FINISHED
 DRAFT | OPEN | ONGOING -> CANCELLED
Lưu ý cho FE:
Nếu Admin chọn CANCELLED, FE bắt buộc hiển thị ô nhập lý do hủy cancelReason.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "message": "Tournament status updated successfully",
   "tournament": {
 	"tournamentId": 123,
 	"status": "OPEN"
   }
 }
Lỗi thường gặp:
·        400: Thiếu status hoặc hủy mà không có cancelReason.
·        409: Chuyển trạng thái không hợp lệ.
API 8: Admin xóa hoặc hủy giải đấu
Endpoint: DELETE /api/admin/tournaments/{id}?reason={reason}
Method: DELETE
Mô tả cho Frontend:
Sử dụng khi Admin muốn xóa giải đấu. Backend sẽ tự quyết định: nếu giải đấu chưa có race thì xóa hẳn; nếu đã có race thì không xóa cứng mà chuyển sang CANCELLED.
Khi nào dùng:
·        Admin bấm Delete Tournament.
·        FE nên hiển thị popup xác nhận trước khi gọi API.
·        Nếu tournament đã có race, FE nên yêu cầu Admin nhập lý do hủy.
Auth: Cần token ADMIN.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	tournamentId cần xóa/hủy
 
Tham số Query:
Tên	Kiểu	Bắt buộc	Mô tả
reason	String	Có nếu giải đấu có race	Lý do hủy giải đấu
 
Dữ liệu phản hồi mẫu khi xóa hẳn:
{ "message": "Tournament deleted successfully" }
Dữ liệu phản hồi mẫu khi chuyển sang hủy:
{
   "message": "Tournament contains races; cancelled instead of deleting",
   "tournament": {
 	"tournamentId": 123,
 	"status": "CANCELLED",
 	"cancelReason": "Bad weather"
   }
 }
2. Admin Races - Mở/đóng cổng đăng ký race
API 18: Admin mở hoặc đóng cổng đăng ký của race
Endpoint: PUT /api/admin/races/{id}/registration-gate
Method: PUT
Mô tả cho Frontend:
Sử dụng khi Admin muốn cho phép hoặc ngừng cho chủ ngựa đăng ký vào một race. Nếu Admin đóng cổng đăng ký, backend sẽ tự động từ chối các đơn PENDING của race đó.
Khi nào dùng:
·        Admin bấm Open Registration cho một race.
·        Admin bấm Close Registration cho một race.
·        FE cần cập nhật trạng thái nút đăng ký sau khi API thành công.
Auth: Cần token ADMIN.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	raceId cần mở/đóng cổng đăng ký
 
Dữ liệu gửi lên (Request Body):
Mở cổng đăng ký:
{ "isOpen": true }
Đóng cổng đăng ký:
{ "isOpen": false }
Lưu ý cho FE:
Khi đóng cổng đăng ký, response có autoRejectedCount. FE có thể hiển thị thông báo: “Đã đóng đăng ký và tự động từ chối X đơn đang chờ”.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "message": "Race registration gate closed successfully",
   "race": {
 	"raceId": 1,
 	"tournamentId": 123,
 	"name": "Race 1",
 	"scheduledAt": null,
     "registrationOpen": false,
     "registrationOpenedAt": "2026-06-05T09:00:00.000Z",
     "registrationClosedAt": "2026-06-05T10:00:00.000Z",
 	"createdAt": "2026-06-01T10:00:00.000Z",
 	"updatedAt": "2026-06-05T10:00:00.000Z"
   },
   "autoRejectedCount": 2
 }
3. Admin Horses - Admin duyệt ngựa
API 13: Admin xem danh sách ngựa theo trạng thái
Endpoint: GET /api/admin/horses?status={STATUS}
Method: GET
Mô tả cho Frontend:
Sử dụng trong trang Admin Horse Review để Admin xem danh sách ngựa đang chờ duyệt hoặc đã duyệt/từ chối. Đây là API cho dashboard quản trị, không phải public.
Khi nào dùng:
·        Admin mở màn hình quản lý ngựa.
·        Admin lọc ngựa theo PENDING, APPROVED, REJECTED.
·        Admin cần xem danh sách ngựa cần review.
Auth: Cần token ADMIN.
Tham số Query:
Tên	Kiểu	Bắt buộc	Giá trị hợp lệ	Mô tả
status	String	Không	PENDING, APPROVED, REJECTED, ALL	Lọc ngựa theo trạng thái.
 
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "horses": [
 	{
   	"horseId": 10,
   	"name": "Storm",
   	"status": "PENDING",
       "rejectionReason": null
 	}
   ]
 }
Lưu ý cho FE:
API list này không có careerMetrics. Nếu cần xem chi tiết thành tích thì gọi API chi tiết bên dưới.
API 14: Admin xem chi tiết một ngựa
Endpoint: GET /api/admin/horses/{id}
Method: GET
Mô tả cho Frontend:
Sử dụng khi Admin bấm vào một con ngựa trong danh sách để xem đầy đủ thông tin trước khi duyệt hoặc từ chối.
Khi nào dùng:
·        Admin mở modal hoặc trang Horse Review Detail.
·        Admin cần xem kỹ thông tin ngựa trước khi bấm Approve/Reject.
Auth: Cần token ADMIN.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	horseId cần xem
 
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "horse": {
 	"horseId": 10,
 	"name": "Storm",
 	"breed": "Arabian",
 	"status": "PENDING",
     "careerMetrics": {
       "totalStarts": 0,
   	"wins": 0,
   	"winRate": 0
 	}
   }
 }
API 15: Admin duyệt hoặc từ chối ngựa
Endpoint: PATCH /api/admin/horses/{id}/status
Method: PATCH
Mô tả cho Frontend:
Sử dụng khi Admin bấm nút Approve hoặc Reject trong màn hình review ngựa. Nếu Reject, FE bắt buộc yêu cầu Admin nhập lý do từ chối.
Khi nào dùng:
·        Admin bấm Approve Horse.
·        Admin bấm Reject Horse.
·        Sau khi gọi thành công, FE nên reload lại danh sách ngựa đang chờ duyệt.
Auth: Cần token ADMIN.
Dữ liệu gửi lên (Request Body):
Duyệt ngựa:
{ "status": "APPROVED" }
Từ chối ngựa:
{
   "status": "REJECTED",
   "reason": "Invalid documents"
 }
Quy tắc validate:
·        status chỉ nhận APPROVED hoặc REJECTED.
·        Nếu status là REJECTED, bắt buộc có reason.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "message": "Horse review updated successfully",
   "horse": {
 	"horseId": 10,
 	"status": "APPROVED"
   }
 }
4. Race Entries - Admin duyệt đơn đăng ký race
API 17: Admin duyệt hoặc từ chối đơn đăng ký race
Endpoint: PUT /api/entries/{id}/status
Method: PUT
Mô tả cho Frontend:
Sử dụng khi Admin xem danh sách đơn đăng ký race và quyết định duyệt hoặc từ chối một đơn. FE nên dùng endpoint chuẩn này, không nên dùng alias lồng theo race.
Khi nào dùng:
·        Admin bấm Approve Entry.
·        Admin bấm Reject Entry.
·        Sau khi gọi thành công, FE reload danh sách entry.
Auth: Cần token ADMIN.
Tham số Đường dẫn (Path Parameter):
Tên	Kiểu	Bắt buộc	Mô tả
id	Number	Có	entryId cần duyệt/từ chối
 
Dữ liệu gửi lên (Request Body):
Duyệt đơn:
{ "status": "APPROVED" }
Từ chối đơn:
{
   "status": "REJECTED",
   "reason": "Invalid documents"
 }
Quy tắc validate:
·        status chỉ nhận APPROVED hoặc REJECTED.
·        Nếu REJECTED, bắt buộc có reason.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "message": "Race entry status updated successfully",
   "entry": {
 	"entryId": 3,
 	"status": "APPROVED"
   }
 }
 
Horse Owner 
Horse Owner APIs - Quản lý ngựa & đăng ký race
Tài liệu tách riêng theo nhóm API liên quan để Frontend dễ tra cứu và gắn đúng màn hình.
 
Horse Owner APIs - Quản lý ngựa & đăng ký race
1. Horse Owner Horses - Chủ ngựa quản lý ngựa của mình
API 11: Chủ ngựa xem danh sách ngựa của mình
Endpoint: GET /api/horses/mine
Method: GET
Mô tả cho Frontend:
Sử dụng ở dashboard của chủ ngựa để xem tất cả ngựa thuộc về tài khoản hiện tại, bao gồm ngựa đang chờ duyệt, đã duyệt hoặc bị từ chối. Không dùng API public vì API public chỉ trả ngựa đã được duyệt.
Khi nào dùng:
·        Horse Owner mở trang My Horses.
·        FE cần hiển thị trạng thái từng con ngựa: PENDING, APPROVED, REJECTED.
·        FE cần cho chủ ngựa biết ngựa nào đủ điều kiện đăng ký race.
Auth: Cần token HORSE_OWNER.
Dữ liệu phản hồi mẫu (Response 200 OK):
{
   "horses": [
 	{
   	"horseId": 10,
   	"name": "Storm",
   	"status": "PENDING",
       "careerMetrics": {
         "totalStarts": 0,
     	"winRate": 0
   	}
 	}
   ]
 }
API 12: Chủ ngựa gửi hồ sơ ngựa mới để Admin duyệt
Endpoint: POST /api/horses
Method: POST
Mô tả cho Frontend:
Sử dụng khi chủ ngựa điền form đăng ký ngựa mới. Sau khi gửi, ngựa sẽ ở trạng thái PENDING và chờ Admin duyệt. Ngựa chưa được duyệt thì chưa nên cho đăng ký vào race.
Khi nào dùng:
·        Horse Owner bấm Add Horse.
·        FE submit form đăng ký ngựa.
·        Sau khi tạo thành công, FE có thể chuyển về màn hình My Horses.
Auth: Cần token HORSE_OWNER.
Dữ liệu gửi lên (Request Body):
{
   "name": "Storm",
   "breed": "Arabian",
   "dateOfBirth": "2020-01-01",
   "sex": "M",
   "color": "Brown"
 }
Quy tắc validate:
·        name bắt buộc, không được rỗng.
·        dateOfBirth nếu có thì phải là date string hợp lệ.
Dữ liệu phản hồi mẫu (Response 201 Created):
{
   "message": "Horse submitted for approval",
   "horse": {
 	"horseId": 10,
 	"status": "PENDING"
   }
 }
2. Race Entries - Chủ ngựa đăng ký ngựa vào race
API 16: Chủ ngựa tạo đơn đăng ký ngựa vào race
Endpoint chính: POST /api/entries
Endpoint thay thế: POST /api/races/{raceId}/entries
Method: POST
Mô tả cho Frontend:
Sử dụng khi chủ ngựa chọn một race, chọn ngựa của mình, chọn Jockey nếu có, rồi gửi đơn đăng ký tham gia race. Đơn sau khi tạo sẽ ở trạng thái PENDING để Admin duyệt.
Khi nào dùng:
·        Horse Owner bấm Register Race.
·        FE submit form gồm raceId, horseId, jockeyId.
·        Chỉ nên cho chọn ngựa có trạng thái APPROVED.
·        Chỉ nên cho chọn race đang mở đăng ký.
Auth: Cần token HORSE_OWNER.
Dữ liệu gửi lên với endpoint chính `POST /api/entries`:
{
   "raceId": 1,
   "horseId": 10,
   "jockeyId": 21
 }
Dữ liệu gửi lên với endpoint thay thế `POST /api/races/{raceId}/entries`:
{
   "horseId": 10,
   "jockeyId": 21
 }
Lưu ý cho FE:
·        jockeyId là optional.
·        Nếu muốn chọn Jockey, FE nên gọi API danh sách Jockey đủ điều kiện trước: GET /api/invitations/jockeys.
·        Một con ngựa chỉ được đăng ký một lần trong cùng một race.
Dữ liệu phản hồi mẫu (Response 201 Created):
{
   "message": "Race entry created successfully",
   "entry": {
 	"entryId": 3,
 	"raceId": 1,
 	"horseId": 10,
 	"jockeyId": 21,
 	"status": "PENDING",
     "rejectionReason": null,
 	"reviewedById": null,
 	"reviewedAt": null,
 	"horse": {
   	"horseId": 10,
   	"name": "Storm",
   	"status": "APPROVED"
 	},
 	"race": {
   	"raceId": 1,
   	"name": "Race 1",
       "tournamentId": 123,
       "registrationOpen": true
 	},
 	"jockey": {
   	"userId": 21,
   	"fullName": "Jockey Demo",
   	"email": "jockey@local.test",
   	"isActive": true,
       "isProfileComplete": true,
   	"role": { "code": "JOCKEY" }
 	}
   }
 }
Lỗi thường gặp:
·        401: Chưa đăng nhập hoặc token sai.
·        403: User không phải chủ ngựa hoặc đăng ký ngựa không thuộc về mình.
·        404: Không tìm thấy race, horse hoặc jockey.
·        409: Race đã đóng đăng ký, ngựa chưa được duyệt, jockey không hợp lệ, hoặc ngựa đã đăng ký race này rồi.

