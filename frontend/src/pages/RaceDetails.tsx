import React from "react";
import { PageType, User, GateEntry } from "../types";
import { THE_ROYAL_SPRINT_ENTRIES } from "../constants/index";
import {
  Calendar,
  Route,
  Shield,
  Lock,
  Star,
  ChevronLeft,
  Coins,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Ticket,
} from "lucide-react";

interface RaceDetailsProps {
  onNavigate: (page: PageType) => void;
  currentUser: User | null;
  onUpdatePoints: (points: number) => void;
}

export default function RaceDetails({
  onNavigate,
  currentUser,
  onUpdatePoints,
}: RaceDetailsProps) {
  const [selectedGate, setSelectedGate] = React.useState<GateEntry | null>(
    null
  );
  const [betAmount, setBetAmount] = React.useState<string>("20");
  const [betSuccess, setBetSuccess] = React.useState<boolean>(false);
  const [betsList, setBetsList] = React.useState<
    { horseName: string; amount: number; odds: string }[]
  >([]);

  const handlePlaceBetClick = (gate: GateEntry) => {
    if (!currentUser) {
      onNavigate("signin");
      return;
    }
    setSelectedGate(gate);
    setBetSuccess(false);
  };

  const handleConfirmBet = () => {
    if (!currentUser || !selectedGate) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid bet amount.");
      return;
    }
    if (amount > currentUser.points) {
      alert(
        `Insufficient funds. Your current balance is ${currentUser.points} GS.`
      );
      return;
    }

    // Deduct points
    onUpdatePoints(currentUser.points - amount);

    // Track bet
    setBetsList([
      ...betsList,
      {
        horseName: selectedGate.horse,
        amount: amount,
        odds: selectedGate.odds,
      },
    ]);

    setBetSuccess(true);
    setTimeout(() => {
      setSelectedGate(null); // close modal
      setBetSuccess(false);
    }, 2000);
  };

  return (
    <div className="flex-grow pb-16">
      {/* Navigation Breadcrumb */}
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 pt-6">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-xs font-semibold tracking-wider uppercase cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <main className="w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-6 space-y-10">
        {/* Race Header Hero Cover */}
        <div className="relative w-full h-[320px] rounded-xl overflow-hidden glass-panel ambient-shadow border border-outline-variant/30 flex items-end">
          {/* Cover background image */}
          <div className="absolute inset-0 z-0">
            <img
              alt="Elite race track twilight cover"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-40 mix-blend-overlay filter blur-[1px] hover:blur-0 transition-all duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqHlaZFrp5-LrF_64t1_huXbHQZ-Pj07FqARs_OXkwMPu2mxtEEU_SNHuJrggtJZ6PONp7TVU12R1lzApX1NK0a-ab3MY4G1HeJuxKDIXIc31GUNoSZ4iN0doZuAHZk0ZDwPbEm89S7OeYX4nyiVFY1Ffo9lOM5GG_VA8efpek9GDSqfvzdBb2jtz3hOiAoIxBsLVR9J2b3UtevPsxPy_1BcUtScMxgXotBGfaA-vXoCyViVWtLuJh0FwC5g-10Djqgc4O4dJdMPnh"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#161B22] via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-[#0D1117]/80 to-transparent" />
          </div>

          {/* Overlaid Cover details */}
          <div className="relative z-10 p-6 sm:p-8 w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-secondary font-semibold uppercase tracking-[0.2em]">
                  The Autumn Cup
                </span>
                <span className="text-outline-variant">•</span>
                <span className="bg-secondary/15 text-secondary text-[10px] font-bold px-2 py-0.5 rounded border border-secondary/20 uppercase tracking-widest">
                  Scheduled
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-on-surface font-bold leading-tight">
                The Royal Sprint
              </h1>

              {/* Cover features metrics row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 font-sans text-xs text-on-surface-variant/90 leading-none">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-secondary/85" />
                  <span>Oct 24, 2026 · 14:00 GMT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-primary" />
                  <span>3km · 3 Legs</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Coins className="w-4 h-4 text-secondary/85" />
                  <span className="font-sans">14 Horses Max</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>2 Referees assigned</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Odds & Entries Block */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-2">
            <div>
              <h2 className="font-serif text-2xl text-on-surface font-semibold leading-none">
                Starting Gate &amp; Odds
              </h2>
              <p className="text-on-surface-variant text-xs mt-1.5">
                Place your stakes before the paddock gates lock officially.
              </p>
            </div>

            {currentUser && (
              <div className="bg-surface-container py-1.5 px-4 rounded-lg flex items-center gap-3">
                <Ticket className="w-4 h-4 text-primary" />
                <span className="font-sans text-xs text-on-surface">
                  Balance:{" "}
                  <strong className="font-mono text-secondary">
                    {currentUser.points} GS
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* warning warning unlock toggle block */}
          {!currentUser ? (
            <div className="bg-surface-container-high border-l-4 border-primary p-4 rounded-r-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary shrink-0" />
                <p className="text-on-surface text-xs leading-relaxed">
                  Authentication is required to unlock odds and place live
                  predictions. Complete your registration to receive starting
                  points!
                </p>
              </div>
              <button
                onClick={() => onNavigate("signin")}
                className="text-secondary hover:brightness-110 font-bold text-xs uppercase tracking-wider underline shrink-0 cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <div className="bg-primary/5 border border-primary/25 text-primary p-3 rounded-lg flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-pulse" />
              <p className="text-xs leading-relaxed">
                Welcome, <strong>{currentUser.fullName}</strong>! Gates are
                unlocked. Your role is{" "}
                <strong>{currentUser.role.toUpperCase()}</strong>. Tap "Place
                Bet" on any horse to wager points dynamically.
              </p>
            </div>
          )}

          {/* Main Entries Data Table layout matches Figma screen perfectly */}
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 overflow-hidden ambient-shadow">
            {/* Table Header Row */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-outline-variant/35 bg-surface-container-highest/20 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              <div className="col-span-2 sm:col-span-1 text-center">Gate</div>
              <div className="col-span-7 sm:col-span-5">
                Entry (Horse &amp; Jockey)
              </div>
              <div className="hidden sm:block col-span-3">
                Race Form History
              </div>
              <div className="col-span-3 sm:col-span-1 text-right">Odds</div>
              <div className="col-span-12 sm:col-span-2 text-right">Action</div>
            </div>

            {/* Rows list with precise content */}
            <div className="divide-y divide-outline-variant/20">
              {THE_ROYAL_SPRINT_ENTRIES.map((entry: GateEntry) => (
                <div
                  key={entry.gate}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[#1C2128]/70 transition-colors relative"
                >
                  {entry.favorite && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-xl" />
                  )}

                  {/* Gate item */}
                  <div className="col-span-2 sm:col-span-1 text-center font-serif text-xl text-on-surface-variant/80 font-bold">
                    {entry.gate}
                  </div>

                  {/* Horse & Jockey column */}
                  <div className="col-span-7 sm:col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center overflow-hidden shrink-0">
                      {entry.imageUrl ? (
                        <img
                          alt={entry.horse}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          src={entry.imageUrl}
                        />
                      ) : (
                        <span className="text-xs uppercase font-serif text-on-surface-variant font-bold">
                          {entry.horse[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                        {entry.horse}
                        {entry.favorite && (
                          <span
                            className="text-secondary flex items-center"
                            title="Favorite Contender"
                          >
                            <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant/80">
                        J: {entry.jockey}
                      </div>
                    </div>
                  </div>

                  {/* Form History column */}
                  <div className="hidden sm:flex col-span-3 items-center gap-1.5">
                    {entry.form.map((pos: number | string, idx: number) => {
                      const isWin = pos === 1;
                      const hasStats = pos !== "-";
                      return (
                        <span
                          key={idx}
                          className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
                            isWin
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : hasStats
                              ? "bg-surface-container-high text-on-surface-variant/80 border border-outline-variant/20"
                              : "bg-surface-container-high text-on-surface-variant/40"
                          }`}
                        >
                          {pos}
                        </span>
                      );
                    })}
                  </div>

                  {/* Odds column */}
                  <div className="col-span-3 sm:col-span-1 text-right font-serif text-sm font-semibold text-secondary">
                    {currentUser ? (
                      <span className="font-mono text-base font-bold bg-secondary/5 border border-secondary/10 px-2 py-0.5 rounded">
                        {entry.odds}
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-1 select-none">
                        <Lock className="w-3.5 h-3.5 text-on-surface-variant/60" />
                        <span className="blur-[4px] text-xs opacity-55">
                          X / X
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="col-span-12 sm:col-span-2 text-right mt-2 sm:mt-0">
                    {currentUser ? (
                      <button
                        onClick={() => handlePlaceBetClick(entry)}
                        className="w-full bg-secondary text-on-secondary py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-115 active:scale-95 hover:shadow-lg hover:shadow-secondary/5 transition-all cursor-pointer"
                      >
                        Place Bet
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-outline-variant/30 text-on-surface-variant/60 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed opacity-50"
                      >
                        Place Bet
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Existing Bets Stakes Tracker */}
        {betsList.length > 0 && (
          <section className="bg-surface-container border border-outline-variant/25 rounded-xl p-5 space-y-3">
            <h3 className="font-serif text-lg text-on-surface font-semibold flex items-center gap-2 leading-none">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Stakes Placed ({betsList.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {betsList.map((bet, i) => (
                <div
                  key={i}
                  className="bg-surface-container-low p-3.5 rounded-lg border border-primary/20 flex justify-between items-center"
                >
                  <div>
                    <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">
                      Horse
                    </span>
                    <strong className="text-on-surface text-sm">
                      {bet.horseName}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">
                      Wager
                    </span>
                    <strong className="text-secondary text-sm font-mono font-bold">
                      {bet.amount} GS @ {bet.odds}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Stake/Bet dialog popover modal */}
      {selectedGate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-xl max-w-sm w-full p-6 border border-outline-variant/30 shadow-2xl relative animate-fadeIn">
            <h3 className="font-serif text-xl font-bold text-on-surface flex items-center gap-2 mb-2">
              <Ticket className="w-5 h-5 text-secondary" /> Place Bet Prediction
            </h3>
            <p className="text-on-surface-variant text-xs leading-relaxed mb-6">
              Place your wager on <strong>{selectedGate.horse}</strong> at
              lock-in odds of{" "}
              <strong className="text-secondary font-mono">
                {selectedGate.odds}
              </strong>
              .
            </p>

            {betSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-primary animate-scaleUp" />
                <h4 className="text-on-surface font-bold text-sm">
                  Stake Confirmed Successfully!
                </h4>
                <p className="text-xs text-on-surface-variant/80">
                  Updating stable balance ledger...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      className="text-xs font-semibold text-on-surface-variant"
                      htmlFor="betAmount"
                    >
                      Stake Amount (GS)
                    </label>
                    <span className="text-xs font-semibold text-on-surface-variant/80">
                      Balance:{" "}
                      <strong className="font-mono text-secondary">
                        {currentUser?.points} GS
                      </strong>
                    </span>
                  </div>
                  <div className="relative border border-outline-variant/30 rounded-lg bg-surface-container-lowest flex items-center px-3">
                    <Coins className="w-4 h-4 text-on-surface-variant mr-2.5" />
                    <input
                      id="betAmount"
                      type="number"
                      min="1"
                      max={currentUser?.points || 1}
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="bg-transparent border-none text-on-surface text-sm py-3 font-semibold focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setSelectedGate(null)}
                    className="flex-1 py-2.5 border border-outline-variant/50 hover:bg-surface-container-high rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBet}
                    className="flex-1 py-2.5 bg-secondary text-on-secondary hover:brightness-110 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Wager Stake
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
