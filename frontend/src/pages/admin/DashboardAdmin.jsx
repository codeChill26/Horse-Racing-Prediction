/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { horseService } from "../../services/horseService";
import { tournamentService } from "../../services/tournamentService";
import { raceService } from "../../services/raceService";
import { userService } from "../../services/userService";
import { formatPoints } from "../../utils/formatter";
import {
  Award,
  AlertTriangle,
  Gavel,
  Wallet
} from "lucide-react";
import "./DashboardAdmin.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalHorses: 0,
    pendingHorses: 0,
    totalTourneys: 0,
    pendingDiscrepancies: 0,
    activeViolations: 0,
    totalUsers: 0,
    walletBalance: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const horses = await horseService.getHorsesList();
        const pendingH = horses.filter((h) => h.status === "Pending").length;
        const tourneys = await tournamentService.getTournamentsList();
        const userList = await userService.getUsersList();
        const walletDetails = await userService.getSpectatorWalletDetails();
        const discrepancy = await raceService.getDiscrepancyDetails();
        const violationsList = await raceService.fetchViolationsList();

        setStats({
          totalHorses: horses.length,
          pendingHorses: pendingH,
          totalTourneys: tourneys.length,
          pendingDiscrepancies: discrepancy.status === "Pending Review" ? 1 : 0,
          activeViolations: violationsList.filter((v) => v.status === "Action Required").length,
          totalUsers: userList.length,
          walletBalance: walletDetails.currentBalance
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  // Highly professional mock data for charts matching Recharts specs
  const participationData = [
    { name: "Tháng 1", "Lượt tham gia": 120, "Giao dịch (M)": 1.2 },
    { name: "Tháng 2", "Lượt tham gia": 150, "Giao dịch (M)": 1.4 },
    { name: "Tháng 3", "Lượt tham gia": 310, "Giao dịch (M)": 2.8 },
    { name: "Tháng 4", "Lượt tham gia": 240, "Giao dịch (M)": 2.1 },
    { name: "Tháng 5", "Lượt tham gia": 420, "Giao dịch (M)": 3.9 },
    { name: "Tháng 6", "Lượt tham gia": 510, "Giao dịch (M)": 4.5 }
  ];

  const breedDistribution = [
    { name: "Arabian Thorough", value: 45, color: "#8dd6a6" },
    { name: "Thoroughbred", value: 35, color: "#e6c364" },
    { name: "Quarter Horse", value: 12, color: "#bfc9bf" },
    { name: "Appaloosa", value: 8, color: "#4c5057" }
  ];

  return (
    <>
      {/* Welcome banner with stats counter */}
      <div className="adm-dash__hero select-none">
        <div className="adm-dash__hero-left">
          <h2 className="adm-dash__title">Hệ Thống Kiểm Soát GrandStride</h2>
          <p className="adm-dash__subtitle">
            Theo dõi thời gian thực, quản lý giải đấu và xét duyệt thẩm phán trường đua chuyên nghiệp.
          </p>
        </div>
        <div className="adm-dash__sync-badge">
          <span className="adm-dash__sync-dot" />
          ĐỒNG BỘ MÁY CHỦ BÁO CÁO: <span className="font-mono text-secondary">HOẠT ĐỘNG</span>
        </div>
      </div>

      {loading ? (
        <div className="adm-dash__loading">
          <div className="adm-dash__spinner" />
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Bento-grid of Stats Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat Card 1: Horses pending approval */}
            <div className="bg-[#161B22] p-5 rounded-2xl border border-[#30363D] relative overflow-hidden group select-none">
              <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-[0.03] text-primary transition-transform duration-300 group-hover:scale-110">
                <Award className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-sans text-on-surface-variant font-bold tracking-wider uppercase">
                  Duyệt Hồ Sơ Ngựa
                </span>
                <span className="p-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
                  <Award className="w-4.5 h-4.5" />
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-black text-on-surface">
                  {stats.totalHorses}
                </span>
                {stats.pendingHorses > 0 && (
                  <span className="text-secondary font-sans text-[11px] font-bold bg-secondary/10 px-2.5 py-0.5 rounded-full border border-secondary/20">
                    {stats.pendingHorses} Chờ duyệt
                  </span>
                )}
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2 font-sans font-medium">
                Tổ hợp đăng ký ngựa tham chiến chính quy
              </p>
            </div>

            {/* Stat Card 2: Discrepancy active alerts */}
            <div className="bg-[#161B22] p-5 rounded-2xl border border-[#30363D] relative overflow-hidden group select-none">
              <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-[0.03] text-error transition-transform duration-300 group-hover:scale-110">
                <AlertTriangle className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-sans text-on-surface-variant font-bold tracking-wider uppercase">
                  Sai Lệch Trọng Tài
                </span>
                <span className="p-1.5 bg-error/10 text-error rounded-lg border border-error/20">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`font-serif text-3xl font-black ${stats.pendingDiscrepancies > 0 ? "text-error" : "text-on-surface"}`}>
                  {stats.pendingDiscrepancies}
                </span>
                <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full ${stats.pendingDiscrepancies > 0 ? "bg-error/10 text-error border border-error/20" : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                  {stats.pendingDiscrepancies > 0 ? "Khẩn cấp" : "Đã sạch"}
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2 font-sans font-medium">
                Mâu thuẫn kết quả từ các tháp camera
              </p>
            </div>

            {/* Stat Card 3: Violations active count */}
            <div className="bg-[#161B22] p-5 rounded-2xl border border-[#30363D] relative overflow-hidden group select-none">
              <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-[0.03] text-secondary transition-transform duration-300 group-hover:scale-110">
                <Gavel className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-sans text-on-surface-variant font-bold tracking-wider uppercase">
                  Vi Phạm Kỷ Luật
                </span>
                <span className="p-1.5 bg-secondary/10 text-secondary rounded-lg border border-secondary/20">
                  <Gavel className="w-4.5 h-4.5" />
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`font-serif text-3xl font-black ${stats.activeViolations > 0 ? "text-secondary" : "text-on-surface"}`}>
                  {stats.activeViolations}
                </span>
                <span className="text-on-surface-variant font-sans text-[11px] font-semibold bg-surface-container-highest px-2 py-0.5 rounded-full border border-outline-variant">
                  Chờ biểu quyết
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-2 font-sans font-medium">
                Sử dụng roi quá hạn hoặc vấn đề dược phẩm
              </p>
            </div>

            {/* Stat Card 4: Wallet Balance (Spectator Points Overall supply) */}
            <div className="bg-[#161B22] p-5 rounded-2xl border border-[#30363D] relative overflow-hidden group select-none">
              <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-[0.03] text-primary transition-transform duration-300 group-hover:scale-110">
                <Wallet className="w-32 h-32" />
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-sans text-on-surface-variant font-bold tracking-wider uppercase">
                  Quỹ Ví Khán Giả (Ví dụ)
                </span>
                <span className="p-1.5 bg-[#ffe08f]/10 text-secondary rounded-lg border border-[#ffe08f]/20">
                  <Wallet className="w-4.5 h-4.5" />
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-serif text-2xl font-black text-[#ffe08f] tracking-tight">
                  {formatPoints(stats.walletBalance)}
                </span>
                <span className="text-[10px] text-[#ffe08f] font-mono font-bold tracking-wider">PTS</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-3 font-sans font-medium">
                Tổng lưu lượng hạch toán ban điều hành
              </p>
            </div>
          </div>

          {/* Visual Charts Section using Recharts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
            {/* Main Area Area Chart of activities */}
            <div className="bg-[#161B22] p-6 rounded-2xl border border-[#30363D] lg:col-span-2 flex flex-col min-h-80">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-serif font-black text-sm text-on-surface tracking-wider uppercase">
                    Lực lượng lượng dịch thể thao
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-sans mt-0.5">
                    Thống kê lưu huỳnh người đăng ký và điểm giao dịch hành chính nửa đầu 2026.
                  </p>
                </div>
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={participationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorParticipate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8dd6a6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8dd6a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                    <XAxis dataKey="name" stroke="#8b949e" fontSize={10} fontFamily="Inter" />
                    <YAxis stroke="#8b949e" fontSize={10} fontFamily="Inter" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161b22",
                        borderColor: "#30363d",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#dae3ee"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Lượt tham gia"
                      stroke="#8dd6a6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorParticipate)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie distribution chart for breed percentages */}
            <div className="bg-[#161B22] p-6 rounded-2xl border border-[#30363D] flex flex-col">
              <div>
                <h3 className="font-serif font-black text-sm text-on-surface tracking-wider uppercase">
                  Cấu Trúc Giống Ngựa
                </h3>
                <p className="text-[10px] text-on-surface-variant font-sans mt-0.5">
                  Phân bố tỉ trọng chủng ngựa đăng ký tại GrandStride Turf.
                </p>
              </div>
              <div className="flex-1 flex flex-col justify-center items-center py-4 min-h-[160px]">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={breedDistribution} innerRadius={42} outerRadius={60} paddingAngle={4} dataKey="value">
                      {breedDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161b22",
                        borderColor: "#30363d",
                        borderRadius: "8px",
                        fontSize: "11px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legends */}
                <div className="grid grid-cols-2 gap-3.5 w-full mt-4 text-[10px] font-sans">
                  {breedDistribution.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-on-surface-variant font-medium truncate">{entry.name} ({entry.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tasks Audit logs */}
          <div className="bg-[#161B22] p-6 rounded-2xl border border-[#30363D] select-none">
            <h3 className="font-serif font-black text-sm text-on-surface tracking-wider uppercase mb-5">
              Nhiệm Vụ Kiểm Tra Gần Đây
            </h3>
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 bg-surface-container-low border border-[#30363D]/50 rounded-xl group/item hover:border-primary/20 transition-all">
                <div className="flex items-start gap-3.5">
                  <span className="p-2 bg-error/10 text-error rounded-lg">
                    <AlertTriangle className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <span className="font-sans font-bold text-xs text-on-surface block">
                      Giải quyết xung đột kết quả chung cuộc RC-1402
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-1">
                      Hai tháp camera ghi nhận thứ tự 2 và 3 mẫu thuẫn ở vạch đích.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-sans font-bold text-error bg-error/10 px-2.5 py-0.5 rounded-full shrink-0 border border-error/20">
                  ƯU TIÊN LỚN
                </span>
              </div>

              <div className="flex items-start justify-between p-4 bg-surface-container-low border border-[#30363D]/50 rounded-xl group/item hover:border-primary/20 transition-all">
                <div className="flex items-start gap-3.5">
                  <span className="p-2 bg-secondary/10 text-secondary rounded-lg">
                    <Gavel className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <span className="font-sans font-bold text-xs text-on-surface block">
                      Xem xét phiếu kháng nghị nài ngựa J. Doe
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-1">
                      Khiếu nại về hành vi sử dụng roi quá số lần quy định tại Belmont Stakes.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-sans font-semibold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full shrink-0 border border-secondary/20">
                  MẪU KHÁNG NGHỊ
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
