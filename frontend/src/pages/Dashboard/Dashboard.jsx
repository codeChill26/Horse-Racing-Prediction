import { useState } from "react";
import { UPCOMING_RACES, TOP_HORSES, TOP_JOCKEYS } from "../../constants";
import RaceCard from "../../components/RaceCard";
import Footer from "../../layouts/Footer";
import {
  Calendar,
  MapPin,
  Award,
  Trophy,
  ChevronRight,
  Swords,
  ArrowRight,
  Target,
  Flag,
} from "lucide-react";

export default function Dashboard({ onNavigate, currentUser }) {
  const [activeRankTab, setActiveRankTab] = useState("combined");
  const [searchRank, setSearchRank] = useState("");

  const filteredHorses = TOP_HORSES.filter(
    (h) =>
      h.name.toLowerCase().includes(searchRank.toLowerCase()) ||
      h.stable.toLowerCase().includes(searchRank.toLowerCase())
  );

  const filteredJockeys = TOP_JOCKEYS.filter((j) =>
    j.name.toLowerCase().includes(searchRank.toLowerCase())
  );

  return (
    <div className="flex-grow pb-16 flex flex-col min-h-screen">
      {/* Navigation Bar */}
      <header className="w-full bg-background/80 backdrop-blur-md border-b border-outline-variant/10 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate("dashboard")}
              className="font-serif text-2xl text-primary font-bold tracking-tight hover:opacity-90 active:scale-98 transition-all bg-transparent border-none cursor-pointer"
            >
              GrandStride
            </button>

            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => onNavigate("racedetails")}
                className="text-on-surface-variant hover:text-primary text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
              >
                <Target className="w-4 h-4 text-primary" />
                Giải đấu
              </button>
              <button
                onClick={() => onNavigate("racedetails")}
                className="text-on-surface-variant hover:text-primary text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
              >
                <Flag className="w-4 h-4 text-primary" />
                Lịch đua
              </button>
              <button
                onClick={() =>
                  alert(
                    "Bảng xếp hạng lưu giữ kết quả từ năm 2024 đến năm 2026. Báo cáo chi tiết đang chuẩn bị tải!"
                  )
                }
                className="text-on-surface-variant hover:text-primary text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-primary" />
                Bảng xếp hạng
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <span className="text-xs text-on-surface-variant hidden sm:inline">
                  Xin chào,{" "}
                  <strong className="text-primary">
                    {currentUser.fullName}
                  </strong>
                </span>
                <button
                  onClick={() => onNavigate("racedetails")}
                  className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold uppercase hover:brightness-110 active:scale-98 transition-all border-none cursor-pointer"
                >
                  Vào Chuồng Ngựa
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate("login")}
                  className="border border-outline-variant/50 text-on-surface px-4 py-2 rounded-lg text-xs font-semibold uppercase hover:bg-surface-container transition-all bg-transparent cursor-pointer"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => onNavigate("signup")}
                  className="bg-primary text-on-primary px-4 py-2 rounded-lg text-xs font-semibold uppercase hover:brightness-110 active:scale-98 transition-all border-none cursor-pointer"
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[75vh] min-h-[550px] max-h-[750px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent z-10" />
          <img
            alt="Horse Racing"
            className="w-full h-full object-cover object-center scale-105 filter brightness-95 transform transition-transform duration-[10s] hover:scale-100"
            referrerPolicy="no-referrer"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB69ieDnrzy_zjI_oFuL3c_XY2BK8E8lQEyOy8HabV6fES5YlVRWh9FplTA-tIxpQZIziNtD_oDLIP-7fpMBXvA-8bSiPOBKBfCGQ3LkJxyKtmPWQ48cJj-qKLcwl-Hf1dSdjkAN6DddWLLQyksYZUOmvUMyhz94n0UkedQKzBGzH8f2QqK9U3InpHpFYPnPsWqiGbWpfhFQfdThlexsk8k9g6xT6KAEsv7ZVDcZPleb93_MkGINIHRWjD-avsqJHWi8meq31GqsZrt"
          />
        </div>

        <div className="relative z-20 w-full max-w-[1200px] mx-auto px-6 sm:px-8 flex flex-col items-start gap-4">
          <span className="text-secondary font-mono text-xs tracking-[0.2em] font-semibold uppercase animate-pulse">
            Trải Nghiệm Quản Lý Đua Ngựa Đỉnh Cao
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-[56px] text-white font-bold leading-[1.1] max-w-3xl drop-shadow-lg">
            Nơi Những Nhà Vô Địch <br className="hidden sm:inline" />
            Ra Đời
          </h1>
          <p className="font-sans text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
            Nắm quyền kiểm soát chuồng ngựa ưu tú nhất. Huấn luyện chiến mã
            thuần chủng hàng đầu, tham gia những vòng đua kịch tính và khẳng
            định huyền thoại của bạn trên đấu trường.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            <button
              onClick={() => onNavigate("racedetails")}
              className="bg-secondary text-on-secondary text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-lg cursor-pointer hover:bg-secondary/90 transition-all duration-200 shadow-lg shadow-secondary/20 active:scale-[0.98] text-center shrink-0 border-none"
            >
              Xem Lịch Đua
            </button>
            <button
              onClick={() =>
                currentUser ? onNavigate("racedetails") : onNavigate("signup")
              }
              className="bg-transparent border border-outline-variant text-on-surface hover:text-white hover:bg-surface-container text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-lg cursor-pointer transition-all active:scale-[0.98] text-center shrink-0"
            >
              {currentUser ? "Vào Chuồng Ngựa" : "Đăng Ký Ngay"}
            </button>
          </div>
        </div>
      </section>

      {/* Upcoming Races Strip */}
      <section className="py-12 w-full max-w-[1200px] mx-auto px-6 sm:px-8 mt-[-80px] relative z-30">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-xs text-primary font-mono font-semibold tracking-widest uppercase">
              Trận Đấu Trực Tiếp
            </span>
            <h2 className="font-serif text-3xl text-white font-semibold mt-1">
              Vòng Đua Sắp Diễn Ra
            </h2>
          </div>
          <button
            onClick={() => onNavigate("racedetails")}
            className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase transition-colors bg-transparent border-none cursor-pointer"
          >
            Lịch Trình Chi Tiết
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar snap-x scroll-smooth">
          {UPCOMING_RACES.map((race) => (
            <RaceCard key={race.id} race={race} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      {/* Main Content Area: Bento Grid Layout */}
      <section className="py-12 w-full max-w-[1200px] mx-auto px-6 sm:px-8 flex flex-col lg:flex-row gap-6">
        {/* Featured Tournament Widget */}
        <div className="flex-1 bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="h-56 relative w-full bg-surface-container-highest">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/90 to-surface-container-lowest/40 mix-blend-multiply z-10" />
              <img
                alt="Paddock at dusk"
                className="w-full h-full object-cover z-0"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy37bgxBtqF3UxhQav05cMIY8y5XQWBucBHw2k2q2EHCdkrOsYXsTPEGNBYdkjgKsjPzDZgOWqIoHixbCo4I74xcy2ncryOpsez-iVlaqLwPA4yhfCQ93arcdywWc_dqK0og42r9DdLtL-ozSX2pBNt2rang9XHK4hHEMG3HASzO_y2ocSWEZXurP332DB6TKCGB5GDO5mYUT6vN-vjKGXZMvoT9L6Z1q22rKOktpoXNQ23P5bFUXQbjggW_4CjTcgjaxdFpXrcz6z"
              />
              <div className="absolute top-4 left-4 z-20">
                <span className="inline-flex items-center px-3 py-1.5 rounded bg-surface/90 backdrop-blur-md text-primary text-xs font-semibold uppercase tracking-wider border border-primary/20">
                  Sự Kiện Nổi Bật
                </span>
              </div>
            </div>

            <div className="p-6">
              <h2 className="font-serif text-3xl text-on-surface mb-2 font-semibold tracking-tight">
                Giải Đấu Triple Crown Danh Giá
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                Giải đấu danh giá và đầy kịch tính nhất của mùa giải đua năm
                nay. Chỉ những chuồng ngựa tinh anh hàng đầu được mời tham gia
                tranh tài để giành lấy vinh quang huyền thoại.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface-variant text-[11px] block uppercase tracking-wider">
                      Thời Gian
                    </span>
                    <span className="text-on-surface text-xs font-bold font-mono">
                      12 thg 11 - 20 thg 11
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface-variant text-[11px] block uppercase tracking-wider">
                      Địa Điểm
                    </span>
                    <span className="text-on-surface text-xs font-bold">
                      Trường Đua Ảo Ascot
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
                  <Swords className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface-variant text-[11px] block uppercase tracking-wider">
                      Số Kỳ Đua
                    </span>
                    <span className="text-on-surface text-xs font-bold font-mono">
                      12 Trận đua
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container p-4 rounded-lg border border-secondary/35 relative overflow-hidden flex items-start gap-3">
                  <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-secondary/10 rounded-full blur-lg" />
                  <Award className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-secondary text-[11px] block uppercase tracking-wider font-semibold">
                      Quỹ Giải Thưởng
                    </span>
                    <span className="text-secondary text-base font-extrabold font-mono leading-none">
                      1,500,000 GS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-0 border-t border-outline-variant/20">
            <button
              onClick={() =>
                alert(
                  "Hệ thống đang tải Trung tâm Giải đấu: Đăng ký sơ tuyển và Lịch đấu chủng tộc sẽ sớm công bố!"
                )
              }
              className="w-full bg-secondary text-on-secondary/95 font-semibold text-xs tracking-wider uppercase py-3 rounded-lg cursor-pointer hover:bg-secondary/90 transition-colors border-none"
            >
              Cổng Giải Đấu
            </button>
          </div>
        </div>

        {/* Live Leaderboard Preview */}
        <div className="w-full lg:w-[410px] bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col">
          <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-highest/30 rounded-t-xl">
            <h2 className="font-serif text-xl text-primary flex items-center gap-2 font-bold leading-none">
              <Trophy className="w-5 h-5 text-primary" />
              Bảng Xếp Hạng Trực Tiếp
            </h2>
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-error" />
            </span>
          </div>

          {/* Tab Filters */}
          <div className="px-6 pt-4 flex gap-2 border-b border-outline-variant/10">
            <button
              onClick={() => {
                setActiveRankTab("combined");
                setSearchRank("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-all cursor-pointer ${
                activeRankTab === "combined"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => {
                setActiveRankTab("horses");
                setSearchRank("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-all cursor-pointer ${
                activeRankTab === "horses"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Chiến Mã
            </button>
            <button
              onClick={() => {
                setActiveRankTab("jockeys");
                setSearchRank("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-all cursor-pointer ${
                activeRankTab === "jockeys"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Nài Ngựa
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Live Search inside Ranking widget */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Tìm chiến mã hoặc nài ngựa..."
                value={searchRank}
                onChange={(e) => setSearchRank(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 text-xs rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-secondary transition-all"
              />
            </div>

            <div className="space-y-6 overflow-y-auto max-h-[360px] no-scrollbar flex-grow pr-1">
              {/* Horses */}
              {(activeRankTab === "combined" || activeRankTab === "horses") && (
                <div>
                  <h3 className="text-secondary font-mono text-[10px] uppercase tracking-widest mb-3 border-b border-outline-variant/20 pb-1 font-semibold">
                    Chiến Mã Hàng Đầu
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {filteredHorses.length > 0 ? (
                      filteredHorses.map((horse) => (
                        <div
                          key={horse.name}
                          className="flex items-center justify-between p-2 rounded hover:bg-surface-container/60 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-serif text-base font-bold w-6 text-center ${
                                horse.rank === 1
                                  ? "text-secondary"
                                  : "text-on-surface-variant/70"
                              }`}
                            >
                              {horse.rank}
                            </span>
                            <div>
                              <span className="text-on-surface text-sm font-semibold block group-hover:text-primary transition-colors">
                                {horse.name}
                              </span>
                              <span className="text-on-surface-variant text-[11px]">
                                Chuồng: {horse.stable}
                              </span>
                            </div>
                          </div>
                          <span className="text-on-surface/90 font-mono text-xs font-semibold bg-surface-container px-2 py-1 rounded">
                            {horse.pts.toLocaleString()} điểm
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant/60 block py-2 italic">
                        Không tìm thấy chiến mã nào.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Jockeys */}
              {(activeRankTab === "combined" ||
                activeRankTab === "jockeys") && (
                <div className={activeRankTab === "combined" ? "pt-2" : ""}>
                  <h3 className="text-secondary font-mono text-[10px] uppercase tracking-widest mb-3 border-b border-outline-variant/20 pb-1 font-semibold">
                    Nài Ngựa Xuất Sắc
                  </h3>
                  <div className="flex flex-col gap-2">
                    {filteredJockeys.length > 0 ? (
                      filteredJockeys.map((jockey) => (
                        <div
                          key={jockey.name}
                          className="flex items-center justify-between p-2 rounded hover:bg-surface-container/60 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border font-semibold text-xs font-mono shrink-0 ${
                                jockey.rank === 1
                                  ? "border-secondary/60 text-secondary"
                                  : "border-outline-variant/50 text-on-surface-variant"
                              }`}
                            >
                              {jockey.initials}
                            </div>
                            <span className="text-on-surface text-sm font-semibold group-hover:text-primary transition-colors">
                              {jockey.name}
                            </span>
                          </div>
                          <span className="text-on-surface/90 font-mono text-xs font-semibold bg-surface-container px-2 py-1 rounded">
                            {jockey.wins} thắng
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant/60 block py-2 italic flex-left">
                        Không tìm thấy nài ngựa nào.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20 text-center">
              <button
                onClick={() =>
                  alert(
                    "Bảng xếp hạng lưu giữ kết quả từ năm 2024 đến năm 2026. Báo cáo chi tiết đang chuẩn bị tải!"
                  )
                }
                className="text-on-surface-variant hover:text-on-surface text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                Xem Toàn Bộ BXH{" "}
                <ChevronRight className="w-4 h-4 text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </section>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
