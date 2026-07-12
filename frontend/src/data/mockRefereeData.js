/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOCK DATA cho role Referee.
 *
 * Lưu ý: Backend hiện tại CHƯA CÓ APIs riêng cho Referee.
 * Các model Race trong schema không có trường refereeId, leg, submission.
 *
 * TODO: Replace với backend APIs thật khi backend cung cấp endpoint cho:
 *   - GET  /api/referees/me/races         (race được phân công)
 *   - GET  /api/referees/me/races/:id    (chi tiết race + legs)
 *   - POST /api/referees/races/:id/start (start race)
 *   - GET  /api/referees/races/:id/legs/:legId
 *   - POST /api/referees/races/:id/legs/:legId/results
 *   - GET  /api/referees/me/submissions
 *   - GET  /api/referees/me/conflicts
 *   - GET  /api/referees/me/profile
 *
 * Tất cả data dưới đây là MOCK.
 */

const NOW = new Date();
const TODAY_START = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate());
const TODAY_END = new Date(TODAY_START);
TODAY_END.setHours(23, 59, 59, 999);

// ============================================================
// RACES (được phân công cho referee)
// ============================================================
export const MOCK_ASSIGNED_RACES = [
  {
    id: "race-001",
    raceId: 1,
    name: "GrandStride Spring Sprint",
    tournamentName: "Spring Championship 2026",
    tournamentId: 1,
    location: "Main Turf Track - Lane A",
    scheduledStartTime: new Date(TODAY_START.getTime() + 9 * 3600 * 1000).toISOString(), // 09:00 hôm nay
    actualStartTime: null,
    status: "Scheduled",       // Scheduled | InProgress | Paused | PendingResult | Completed | Cancelled
    bettingStatus: "Open",     // Open | Closed
    totalLegs: 3,
    legs: [
      {
        id: "leg-001",
        legId: 1,
        raceId: 1,
        legNumber: 1,
        name: "Leg 1 — Sprint (800m)",
        status: "AwaitingSubmission",  // AwaitingSubmission | SubmittedByMe | WaitingOtherReferee | AutoMatched | Conflicted
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 1, gateNumber: 1, horseName: "Thunder Flash", jockeyName: "Nguyễn Văn Minh", status: "FINISHED", rank: 1, note: "" },
          { horseId: 2, gateNumber: 2, horseName: "Silver Storm", jockeyName: "Trần Thị Lan", status: "FINISHED", rank: 2, note: "" },
          { horseId: 3, gateNumber: 3, horseName: "Golden Arrow", jockeyName: "Lê Hoàng Nam", status: "DNF",      rank: null, note: "Ngã trước vạch đích" },
          { horseId: 4, gateNumber: 4, horseName: "Night Rider",  jockeyName: "Phạm Đức Anh", status: "FINISHED", rank: 3, note: "" },
          { horseId: 5, gateNumber: 5, horseName: "Red Phoenix",  jockeyName: "Hoàng Thu Hà",  status: "DQ",      rank: null, note: "Vi phạm luật vượt đường" },
          { horseId: 6, gateNumber: 6, horseName: "Wind Chaser",  jockeyName: "Đặng Minh Tuấn",status: "FINISHED", rank: 4, note: "" },
        ],
      },
      {
        id: "leg-002",
        legId: 2,
        raceId: 1,
        legNumber: 2,
        name: "Leg 2 — Middle Distance (1500m)",
        status: "AwaitingSubmission",
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 1, gateNumber: 1, horseName: "Thunder Flash", jockeyName: "Nguyễn Văn Minh", status: null, rank: null, note: "" },
          { horseId: 2, gateNumber: 2, horseName: "Silver Storm", jockeyName: "Trần Thị Lan", status: null, rank: null, note: "" },
          { horseId: 3, gateNumber: 3, horseName: "Golden Arrow", jockeyName: "Lê Hoàng Nam", status: null, rank: null, note: "" },
          { horseId: 4, gateNumber: 4, horseName: "Night Rider",  jockeyName: "Phạm Đức Anh", status: null, rank: null, note: "" },
          { horseId: 6, gateNumber: 5, horseName: "Wind Chaser",  jockeyName: "Đặng Minh Tuấn",status: null, rank: null, note: "" },
        ],
      },
      {
        id: "leg-003",
        legId: 3,
        raceId: 1,
        legNumber: 3,
        name: "Leg 3 — Long Distance (3000m)",
        status: "AwaitingSubmission",
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 1, gateNumber: 1, horseName: "Thunder Flash", jockeyName: "Nguyễn Văn Minh", status: null, rank: null, note: "" },
          { horseId: 2, gateNumber: 2, horseName: "Silver Storm", jockeyName: "Trần Thị Lan", status: null, rank: null, note: "" },
          { horseId: 3, gateNumber: 3, horseName: "Golden Arrow", jockeyName: "Lê Hoàng Nam", status: null, rank: null, note: "" },
          { horseId: 4, gateNumber: 4, horseName: "Night Rider",  jockeyName: "Phạm Đức Anh", status: null, rank: null, note: "" },
          { horseId: 6, gateNumber: 5, horseName: "Wind Chaser",  jockeyName: "Đặng Minh Tuấn",status: null, rank: null, note: "" },
        ],
      },
    ],
    assignedRole: "Referee A",
    refereeId: 1,
    otherRefereeName: "Trọng tài B — Nguyễn Thị Hương",
  },
  {
    id: "race-002",
    raceId: 2,
    name: "Afternoon Turf Challenge",
    tournamentName: "Summer Series 2026",
    tournamentId: 2,
    location: "North Turf Track",
    scheduledStartTime: new Date(TODAY_START.getTime() + 14 * 3600 * 1000).toISOString(), // 14:00 hôm nay
    actualStartTime: null,
    status: "Scheduled",
    bettingStatus: "Open",
    totalLegs: 2,
    legs: [
      {
        id: "leg-004",
        legId: 4,
        raceId: 2,
        legNumber: 1,
        name: "Leg 1 — Warm-up (600m)",
        status: "AwaitingSubmission",
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 7, gateNumber: 1, horseName: "Blue Lightning", jockeyName: "Bùi Thanh Sơn", status: null, rank: null, note: "" },
          { horseId: 8, gateNumber: 2, horseName: "White Knight",  jockeyName: "Vũ Thị Mai",    status: null, rank: null, note: "" },
          { horseId: 9, gateNumber: 3, horseName: "Black Panther",jockeyName: "Đỗ Minh Quân", status: null, rank: null, note: "" },
          { horseId: 10,gateNumber: 4, horseName: "Green Dragon", jockeyName: "Lý Thị Thu",   status: null, rank: null, note: "" },
        ],
      },
      {
        id: "leg-005",
        legId: 5,
        raceId: 2,
        legNumber: 2,
        name: "Leg 2 — Final Sprint (1200m)",
        status: "AwaitingSubmission",
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 7, gateNumber: 1, horseName: "Blue Lightning", jockeyName: "Bùi Thanh Sơn", status: null, rank: null, note: "" },
          { horseId: 8, gateNumber: 2, horseName: "White Knight",  jockeyName: "Vũ Thị Mai",    status: null, rank: null, note: "" },
          { horseId: 9, gateNumber: 3, horseName: "Black Panther",jockeyName: "Đỗ Minh Quân", status: null, rank: null, note: "" },
          { horseId: 10,gateNumber: 4, horseName: "Green Dragon", jockeyName: "Lý Thị Thu",   status: null, rank: null, note: "" },
        ],
      },
    ],
    assignedRole: "Referee B",
    refereeId: 1,
    otherRefereeName: "Trọng tài A — Hoàng Đình Bảo",
  },
  {
    id: "race-003",
    raceId: 3,
    name: "Rainy Day Relay",
    tournamentName: "Monsoon Cup 2026",
    tournamentId: 3,
    location: "Indoor Arena Track",
    scheduledStartTime: new Date(TODAY_START.getTime() - 2 * 3600 * 1000).toISOString(), // 2 giờ trước (đang diễn ra)
    actualStartTime: new Date(TODAY_START.getTime() - 2 * 3600 * 1000).toISOString(),
    status: "InProgress",
    bettingStatus: "Closed",
    totalLegs: 2,
    legs: [
      {
        id: "leg-006",
        legId: 6,
        raceId: 3,
        legNumber: 1,
        name: "Leg 1 — Indoor Sprint",
        status: "SubmittedByMe",
        mySubmissionStatus: "SubmittedByMe",
        otherRefereeStatus: "WaitingOtherReferee",
        horses: [
          { horseId: 11, gateNumber: 1, horseName: "Iron Horse",   jockeyName: "Cao Văn Dũng", status: "FINISHED", rank: 1, note: "" },
          { horseId: 12, gateNumber: 2, horseName: "Mystic Fox",   jockeyName: "Trịnh Thị Ngọc",status: "FINISHED", rank: 2, note: "" },
          { horseId: 13, gateNumber: 3, horseName: "Terra Nova",   jockeyName: "Phan Minh Đức",status: "DNF",      rank: null, note: "Gãy móng" },
          { horseId: 14, gateNumber: 4, horseName: "Ocean Wave",   jockeyName: "Ngô Thị Hà",   status: "FINISHED", rank: 3, note: "" },
        ],
      },
      {
        id: "leg-007",
        legId: 7,
        raceId: 3,
        legNumber: 2,
        name: "Leg 2 — Final Leg",
        status: "AwaitingSubmission",
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 11, gateNumber: 1, horseName: "Iron Horse", jockeyName: "Cao Văn Dũng",   status: null, rank: null, note: "" },
          { horseId: 12, gateNumber: 2, horseName: "Mystic Fox", jockeyName: "Trịnh Thị Ngọc", status: null, rank: null, note: "" },
          { horseId: 13, gateNumber: 3, horseName: "Terra Nova", jockeyName: "Phan Minh Đức", status: null, rank: null, note: "" },
          { horseId: 14, gateNumber: 4, horseName: "Ocean Wave", jockeyName: "Ngô Thị Hà",    status: null, rank: null, note: "" },
        ],
      },
    ],
    assignedRole: "Referee A",
    refereeId: 1,
    otherRefereeName: "Trọng tài B — Đinh Thị Lan",
  },
  {
    id: "race-004",
    raceId: 4,
    name: "Dawn Cup Final",
    tournamentName: "Dawn Series 2026",
    tournamentId: 4,
    location: "South Grand Track",
    scheduledStartTime: new Date(TODAY_START.getTime() - 5 * 3600 * 1000).toISOString(), // 5 giờ trước
    actualStartTime: new Date(TODAY_START.getTime() - 5 * 3600 * 1000).toISOString(),
    status: "Paused",
    bettingStatus: "Closed",
    totalLegs: 2,
    legs: [
      {
        id: "leg-008",
        legId: 8,
        raceId: 4,
        legNumber: 1,
        name: "Leg 1 — Opening",
        status: "Conflicted",
        mySubmissionStatus: "SubmittedByMe",
        otherRefereeStatus: "SubmittedByMe",
        horses: [
          { horseId: 15, gateNumber: 1, horseName: "Shadow Runner", jockeyName: "Bạch Thị Thanh", status: "FINISHED", rank: 1, note: "" },
          { horseId: 16, gateNumber: 2, horseName: "Crimson King", jockeyName: "Hứa Văn Thành", status: "FINISHED", rank: 2, note: "" },
          { horseId: 17, gateNumber: 3, horseName: "Desert Wind",  jockeyName: "Chu Thị Hương",status: "FINISHED", rank: 3, note: "" },
          { horseId: 18, gateNumber: 4, horseName: "Arctic Star",  jockeyName: "Tạ Đình Phong", status: "FINISHED", rank: 4, note: "" },
        ],
        conflictReason: "Thứ hạng ngựa #3 và #4 khác biệt giữa 2 trọng tài",
      },
      {
        id: "leg-009",
        legId: 9,
        raceId: 4,
        legNumber: 2,
        name: "Leg 2 — Closing",
        status: "AwaitingSubmission",
        mySubmissionStatus: "NotSubmitted",
        otherRefereeStatus: "NotSubmitted",
        horses: [
          { horseId: 15, gateNumber: 1, horseName: "Shadow Runner", jockeyName: "Bạch Thị Thanh", status: null, rank: null, note: "" },
          { horseId: 16, gateNumber: 2, horseName: "Crimson King", jockeyName: "Hứa Văn Thành", status: null, rank: null, note: "" },
          { horseId: 17, gateNumber: 3, horseName: "Desert Wind",  jockeyName: "Chu Thị Hương",status: null, rank: null, note: "" },
          { horseId: 18, gateNumber: 4, horseName: "Arctic Star",  jockeyName: "Tạ Đình Phong", status: null, rank: null, note: "" },
        ],
      },
    ],
    assignedRole: "Referee A",
    refereeId: 1,
    otherRefereeName: "Trọng tài B — Võ Thị Mai",
  },
  {
    id: "race-005",
    raceId: 5,
    name: "Heritage Cup",
    tournamentName: "Heritage Series",
    tournamentId: 5,
    location: "Royal Turf",
    scheduledStartTime: new Date(TODAY_START.getTime() - 24 * 3600 * 1000).toISOString(), // Hôm qua
    actualStartTime: new Date(TODAY_START.getTime() - 24 * 3600 * 1000).toISOString(),
    status: "Completed",
    bettingStatus: "Closed",
    totalLegs: 3,
    legs: [
      {
        id: "leg-010",
        legId: 10,
        raceId: 5,
        legNumber: 1,
        name: "Leg 1",
        status: "AutoMatched",
        mySubmissionStatus: "SubmittedByMe",
        otherRefereeStatus: "SubmittedByMe",
        horses: [],
      },
      {
        id: "leg-011",
        legId: 11,
        raceId: 5,
        legNumber: 2,
        name: "Leg 2",
        status: "AutoMatched",
        mySubmissionStatus: "SubmittedByMe",
        otherRefereeStatus: "SubmittedByMe",
        horses: [],
      },
      {
        id: "leg-012",
        legId: 12,
        raceId: 5,
        legNumber: 3,
        name: "Leg 3",
        status: "AutoMatched",
        mySubmissionStatus: "SubmittedByMe",
        otherRefereeStatus: "SubmittedByMe",
        horses: [],
      },
    ],
    assignedRole: "Referee A",
    refereeId: 1,
    otherRefereeName: "Trọng tài B — Lê Văn Hùng",
  },
];

// ============================================================
// SUBMISSIONS (lịch sử submission của referee)
// ============================================================
export const MOCK_MY_SUBMISSIONS = [
  {
    id: "sub-003",
    submissionId: 3,
    raceId: 3,
    raceName: "Rainy Day Relay",
    legId: 6,
    legName: "Leg 1 — Indoor Sprint",
    legNumber: 1,
    submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 phút trước
    comparisonStatus: "WaitingOtherReferee",
    results: [
      { horseId: 11, gateNumber: 1, horseName: "Iron Horse", jockeyName: "Cao Văn Dũng", status: "FINISHED", rank: 1, note: "" },
      { horseId: 12, gateNumber: 2, horseName: "Mystic Fox", jockeyName: "Trịnh Thị Ngọc", status: "FINISHED", rank: 2, note: "" },
      { horseId: 13, gateNumber: 3, horseName: "Terra Nova", jockeyName: "Phan Minh Đức", status: "DNF", rank: null, note: "Gãy móng" },
      { horseId: 14, gateNumber: 4, horseName: "Ocean Wave", jockeyName: "Ngô Thị Hà", status: "FINISHED", rank: 3, note: "" },
    ],
    refereeNote: "Điều kiện sân trơn, 1 ngựa gãy móng ở phút 3.",
  },
  {
    id: "sub-004",
    submissionId: 4,
    raceId: 4,
    raceName: "Dawn Cup Final",
    legId: 8,
    legName: "Leg 1 — Opening",
    legNumber: 1,
    submittedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 giờ trước
    comparisonStatus: "Conflicted",
    results: [
      { horseId: 15, gateNumber: 1, horseName: "Shadow Runner", jockeyName: "Bạch Thị Thanh", status: "FINISHED", rank: 1, note: "" },
      { horseId: 16, gateNumber: 2, horseName: "Crimson King", jockeyName: "Hứa Văn Thành", status: "FINISHED", rank: 2, note: "" },
      { horseId: 17, gateNumber: 3, horseName: "Desert Wind", jockeyName: "Chu Thị Hương", status: "FINISHED", rank: 3, note: "" },
      { horseId: 18, gateNumber: 4, horseName: "Arctic Star", jockeyName: "Tạ Đình Phong", status: "FINISHED", rank: 4, note: "" },
    ],
    refereeNote: "Ngựa #3 qua vạch sớm 0.2s.",
  },
  {
    id: "sub-001",
    submissionId: 1,
    raceId: 5,
    raceName: "Heritage Cup",
    legId: 10,
    legName: "Leg 1",
    legNumber: 1,
    submittedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), // Hôm qua
    comparisonStatus: "AutoMatched",
    results: [
      { horseId: 19, gateNumber: 1, horseName: "Forest Ghost", jockeyName: "Phạm Văn Lợi", status: "FINISHED", rank: 1, note: "" },
      { horseId: 20, gateNumber: 2, horseName: "Solar Flare", jockeyName: "Trần Văn Hùng", status: "FINISHED", rank: 2, note: "" },
      { horseId: 21, gateNumber: 3, horseName: "Moon Shadow", jockeyName: "Lê Thị Hồng", status: "FINISHED", rank: 3, note: "" },
    ],
    refereeNote: "",
  },
  {
    id: "sub-002",
    submissionId: 2,
    raceId: 5,
    raceName: "Heritage Cup",
    legId: 11,
    legName: "Leg 2",
    legNumber: 2,
    submittedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
    comparisonStatus: "AutoMatched",
    results: [
      { horseId: 19, gateNumber: 1, horseName: "Forest Ghost", jockeyName: "Phạm Văn Lợi", status: "FINISHED", rank: 2, note: "" },
      { horseId: 20, gateNumber: 2, horseName: "Solar Flare", jockeyName: "Trần Văn Hùng", status: "FINISHED", rank: 1, note: "" },
      { horseId: 21, gateNumber: 3, horseName: "Moon Shadow", jockeyName: "Lê Thị Hồng", status: "FINISHED", rank: 3, note: "" },
    ],
    refereeNote: "",
  },
];

// ============================================================
// CONFLICTS (các leg đang conflict)
// ============================================================
// BUG-REF-006: Mock data có đủ mySubmission, otherSubmission, differences
// để ConflictComparison hiển thị đúng.
export const MOCK_CONFLICTS = [
  {
    id: "conflict-001",
    conflictId: 1,
    raceId: 4,
    raceName: "Dawn Cup Final",
    legId: 8,
    legName: "Leg 1 — Opening",
    legNumber: 1,
    status: "Conflicted",
    detectedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    description: "Kết quả Leg 1 có sự khác biệt giữa 2 trọng tài. Hệ thống đã tạm dừng race.",
    mySubmission: [
      { horseId: 15, gateNumber: 1, horseName: "Shadow Runner", jockeyName: "Bạch Thị Thanh", status: "FINISHED", rank: 1, note: "" },
      { horseId: 16, gateNumber: 2, horseName: "Crimson King", jockeyName: "Hứa Văn Thành", status: "FINISHED", rank: 2, note: "" },
      { horseId: 17, gateNumber: 3, horseName: "Desert Wind", jockeyName: "Chu Thị Hương", status: "FINISHED", rank: 3, note: "" },
      { horseId: 18, gateNumber: 4, horseName: "Arctic Star", jockeyName: "Tạ Đình Phong", status: "FINISHED", rank: 4, note: "" },
    ],
    otherSubmission: [
      { horseId: 15, gateNumber: 1, horseName: "Shadow Runner", jockeyName: "Bạch Thị Thanh", status: "FINISHED", rank: 1, note: "" },
      { horseId: 16, gateNumber: 2, horseName: "Crimson King", jockeyName: "Hứa Văn Thành", status: "FINISHED", rank: 2, note: "" },
      { horseId: 17, gateNumber: 3, horseName: "Desert Wind", jockeyName: "Chu Thị Hương", status: "FINISHED", rank: 4, note: "" }, // rank khác
      { horseId: 18, gateNumber: 4, horseName: "Arctic Star", jockeyName: "Tạ Đình Phong", status: "FINISHED", rank: 3, note: "" }, // rank khác
    ],
    differences: [17, 18], // horseId của các ngựa có kết quả khác nhau
    systemNote: "Khác biệt ở thứ hạng ngựa #3 và #4. Đã gửi email cho Chief Referee.",
    adminNote: "Đang chờ xem lại video.",
    statements: [],
  },
];

// ============================================================
// PROFILE
// ============================================================
export const MOCK_REFEREE_PROFILE = {
  userId: 1,
  email: "trongtai@example.com",
  fullName: "Nguyễn Văn Trọng",
  phoneNumber: "0901234567",
  avatarUrl: null,
  roleCode: "REFEREE",
  roleName: "Trọng tài",
  isActive: true,
  isProfileComplete: true,
  createdAt: new Date("2025-01-15").toISOString(),
  stats: {
    totalRacesAssigned: 24,
    totalLegsSubmitted: 67,
    autoMatchedRate: 82.1,   // %
    conflictCount: 5,
    pendingConflicts: 1,
  },
};

// ============================================================
// DASHBOARD
// ============================================================
export function getMockDashboard() {
  const races = MOCK_ASSIGNED_RACES;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduledToday = races.filter(
    (r) =>
      r.status === "Scheduled" &&
      new Date(r.scheduledStartTime) >= today &&
      new Date(r.scheduledStartTime) < new Date(today.getTime() + 86400 * 1000),
  );
  const inProgress = races.filter((r) => r.status === "InProgress");
  const paused = races.filter((r) => r.status === "Paused");
  const completed = races.filter((r) => r.status === "Completed");

  // Đếm leg chờ nhập
  const pendingLegs = races
    .flatMap((r) => r.legs)
    .filter(
      (l) =>
        l.status === "AwaitingSubmission" && l.mySubmissionStatus === "NotSubmitted",
    );
  const mySubmittedLegs = races.flatMap((r) => r.legs).filter(
    (l) => l.mySubmissionStatus === "SubmittedByMe" || l.mySubmissionStatus === "WaitingOtherReferee",
  );
  const conflictedLegs = races
    .flatMap((r) => r.legs)
    .filter((l) => l.status === "Conflicted");

  return {
    stats: {
      totalAssigned: races.length,
      scheduledToday: scheduledToday.length,
      inProgress: inProgress.length,
      paused: paused.length,
      completed: completed.length,
      pendingLegs: pendingLegs.length,
      mySubmittedLegs: mySubmittedLegs.length,
      conflictedLegs: conflictedLegs.length,
    },
    racesToday: scheduledToday,
    racesInProgress: inProgress,
    conflicts: conflictedLegs,
    upcomingRaces: races.filter(
      (r) => r.status === "Scheduled" && new Date(r.scheduledStartTime) > today,
    ),
  };
}
