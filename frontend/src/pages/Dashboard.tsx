import React from "react";
import { PageType, User, HorseRank, JockeyRank, Race } from "../types";
import { UPCOMING_RACES, TOP_HORSES, TOP_JOCKEYS } from "../constants/index";
import RaceCard from "../components/RaceCard";
import {
  Calendar,
  MapPin,
  Award,
  Trophy,
  ChevronRight,
  Activity,
  Swords,
  ArrowRight,
} from "lucide-react";

interface DashboardProps {
  onNavigate: (page: PageType) => void;
  currentUser: User | null;
}

export default function Dashboard({ onNavigate, currentUser }: DashboardProps) {
  const [activeRankTab, setActiveRankTab] = React.useState<
    "combined" | "horses" | "jockeys"
  >("combined");
  const [searchRank, setSearchRank] = React.useState("");

  const filteredHorses = TOP_HORSES.filter(
    (h: HorseRank) =>
      h.name.toLowerCase().includes(searchRank.toLowerCase()) ||
      h.stable.toLowerCase().includes(searchRank.toLowerCase())
  );

  const filteredJockeys = TOP_JOCKEYS.filter((j: JockeyRank) =>
    j.name.toLowerCase().includes(searchRank.toLowerCase())
  );

  return (
    <div className="flex-grow pb-16">
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
            The Premier Management Experience
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-[56px] text-on-surface font-bold leading-[1.1] max-w-3xl drop-shadow-lg">
            Where Champions <br className="hidden sm:inline" />
            Are Made
          </h1>
          <p className="font-sans text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
            Take the reins of an elite racing stable. Train top-tier
            thoroughbreds, compete in high-stakes tournaments, and cement your
            legacy on the track.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            <button
              onClick={() => onNavigate("racedetails")}
              className="bg-secondary text-on-secondary text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-lg cursor-pointer hover:bg-secondary/90 transition-all duration-200 shadow-lg shadow-secondary/20 active:scale-95 text-center shrink-0"
            >
              View Races
            </button>
            <button
              onClick={() =>
                currentUser ? onNavigate("racedetails") : onNavigate("signup")
              }
              className="bg-transparent border border-outline-variant text-on-surface hover:text-white hover:bg-surface-container text-sm font-semibold tracking-wider uppercase px-8 py-4 rounded-lg cursor-pointer transition-all active:scale-95 text-center shrink-0"
            >
              {currentUser ? "Enter Stable" : "Register"}
            </button>
          </div>
        </div>
      </section>

      {/* Upcoming Races Strip */}
      <section className="py-12 w-full max-w-[1200px] mx-auto px-6 sm:px-8 mt-[-80px] relative z-30">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-xs text-primary font-mono font-semibold tracking-widest uppercase">
              Live Competitions
            </span>
            <h2 className="font-serif text-3xl text-on-surface font-semibold mt-1">
              Upcoming Races
            </h2>
          </div>
          <button
            onClick={() => onNavigate("racedetails")}
            className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            View Schedule
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar snap-x scroll-smooth">
          {UPCOMING_RACES.map((race: Race) => (
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
                  Featured Event
                </span>
              </div>
            </div>

            <div className="p-6">
              <h2 className="font-serif text-3xl text-on-surface mb-2 font-semibold tracking-tight">
                The Triple Crown Invitational
              </h2>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                The most prestigious tournament of the season. Only the
                top-rated stables are invited to compete for the ultimate glory.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface-variant text-[11px] block uppercase tracking-wider">
                      Dates
                    </span>
                    <span className="text-on-surface text-xs font-bold font-mono">
                      Nov 12 - Nov 20
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface-variant text-[11px] block uppercase tracking-wider">
                      Location
                    </span>
                    <span className="text-on-surface text-xs font-bold">
                      Ascot Virtual Track
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container p-4 rounded-lg flex items-start gap-3">
                  <Swords className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface-variant text-[11px] block uppercase tracking-wider">
                      Total Races
                    </span>
                    <span className="text-on-surface text-xs font-bold font-mono">
                      12 Events
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container p-4 rounded-lg border border-secondary/35 relative overflow-hidden flex items-start gap-3">
                  <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-secondary/10 rounded-full blur-lg" />
                  <Award className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-secondary text-[11px] block uppercase tracking-wider font-semibold">
                      Prize Pool
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
                  "Launching Tournament Hub: Registration and Bracket list is opening soon!"
                )
              }
              className="w-full bg-secondary text-on-secondary/95 font-semibold text-xs tracking-wider uppercase py-3 rounded-lg cursor-pointer hover:bg-secondary/90 transition-colors"
            >
              Tournament Hub
            </button>
          </div>
        </div>

        {/* Live Leaderboard Preview */}
        <div className="w-full lg:w-[410px] bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-col">
          <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-highest/30 rounded-t-xl">
            <h2 className="font-serif text-xl text-on-surface flex items-center gap-2 font-bold leading-none">
              <Trophy className="w-5 h-5 text-primary" />
              Leaderboard Standings
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
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-all ${
                activeRankTab === "combined"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All Stats
            </button>
            <button
              onClick={() => {
                setActiveRankTab("horses");
                setSearchRank("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-all ${
                activeRankTab === "horses"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Horses
            </button>
            <button
              onClick={() => {
                setActiveRankTab("jockeys");
                setSearchRank("");
              }}
              className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase text-center border-b-2 transition-all ${
                activeRankTab === "jockeys"
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Jockeys
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Live Search inside Ranking widget */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search rankings..."
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
                    Top Horses
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {filteredHorses.length > 0 ? (
                      filteredHorses.map((horse: HorseRank) => (
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
                                Stable: {horse.stable}
                              </span>
                            </div>
                          </div>
                          <span className="text-on-surface/90 font-mono text-xs font-semibold bg-surface-container px-2 py-1 rounded">
                            {horse.pts.toLocaleString()} pts
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant/60 block py-2 italic">
                        No horses found.
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
                    Top Jockeys
                  </h3>
                  <div className="flex flex-col gap-2">
                    {filteredJockeys.length > 0 ? (
                      filteredJockeys.map((jockey: JockeyRank) => (
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
                            {jockey.wins} Wins
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant/60 block py-2 italic">
                        No jockeys found.
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
                    "Leaderboards contain historical results from 2024 to 2026. A detailed breakdown is loading!"
                  )
                }
                className="text-on-surface-variant hover:text-on-surface text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                Full Leaderboards{" "}
                <ChevronRight className="w-4 h-4 text-secondary" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
