import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Trophy,
  User,
  Star,
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  JockeyErrorAlert,
  JockeySkeleton,
  JockeyRaceStatusBadge,
  JockeyLegStatusBadge,
  JockeyFormBadge,
  JockeyEmptyState,
  JockeyModal,
} from "../../components/jockey/JockeyCommon";
import { jockeyRaceService } from "../../services/jockeyService";
import "./JockeyRaceDetailPage.css";

export default function JockeyRaceDetailPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const [race, setRace] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, setRefreshing] = useState(false);
  const [showScratchModal, setShowScratchModal] = useState(false);
  const [scratchReason, setScratchReason] = useState("");

  const fetchRaceData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [raceData, competitorsData] = await Promise.all([
        jockeyRaceService.getRaceById(raceId),
        jockeyRaceService.getCompetitors(raceId),
      ]);
      setRace(raceData);
      setCompetitors(competitorsData);
    } catch (e) {
      setError(e.message || "Failed to load race details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [raceId]);

  useEffect(() => {
    fetchRaceData();
  }, [fetchRaceData]);

  const handleScratchRequest = async () => {
    try {
      await jockeyRaceService.requestScratching(raceId, scratchReason);
      setShowScratchModal(false);
      setScratchReason("");
      alert("Scratching request submitted successfully");
    } catch (e) {
      alert(e.message || "Failed to submit scratching request");
    }
  };

  const handleConfirmParticipation = async () => {
    try {
      await jockeyRaceService.confirmParticipation(raceId);
      alert("Participation confirmed");
      fetchRaceData();
    } catch (e) {
      alert(e.message || "Failed to confirm participation");
    }
  };

  if (loading) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <div className="jock-detail-header">
            <button className="jock-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <JockeySkeleton type="card" count={1} />
          <div className="jock-detail-grid">
            <JockeySkeleton type="stats" count={4} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <div className="jock-detail-header">
            <button className="jock-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <JockeyErrorAlert message={error} onRetry={() => fetchRaceData()} />
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <div className="jock-detail-header">
            <button className="jock-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <JockeyEmptyState
            icon={Flag}
            title="Race Not Found"
            description="The race you're looking for doesn't exist or has been removed."
            action={() => navigate("/jockey/races")}
            actionLabel="Back to Races"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="jock-page">
      <div className="jock-page-content">
        {/* Header */}
        <div className="jock-detail-header">
          <button className="jock-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Back
          </button>
          <JockeyRaceStatusBadge status={race.status} />
        </div>

        {/* Race Title Section */}
        <div className="jock-race-detail-hero">
          <div className="jock-race-detail-info">
            <h1 className="jock-race-detail-name">{race.name}</h1>
            <p className="jock-race-detail-tournament">{race.tournamentName}</p>
            <div className="jock-race-detail-meta">
              <span className="jock-meta-item">
                <MapPin size={16} />
                {race.venue}
              </span>
              <span className="jock-meta-item">
                <Clock size={16} />
                {new Date(race.raceDate).toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {" • "}
                {race.raceTime}
              </span>
              <span className="jock-meta-item">
                <Trophy size={16} />
                Prize Pool: {new Intl.NumberFormat("vi-VN").format(race.prizePool)} VND
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="jock-detail-stats">
          <div className="jock-detail-stat">
            <span className="jock-detail-stat-icon">
              <Flag size={20} />
            </span>
            <div className="jock-detail-stat-content">
              <span className="jock-detail-stat-label">Distance</span>
              <span className="jock-detail-stat-value">{race.distance}m</span>
            </div>
          </div>
          <div className="jock-detail-stat">
            <span className="jock-detail-stat-icon">
              <Star size={20} />
            </span>
            <div className="jock-detail-stat-content">
              <span className="jock-detail-stat-label">Surface</span>
              <span className="jock-detail-stat-value">{race.surface}</span>
            </div>
          </div>
          <div className="jock-detail-stat">
            <span className="jock-detail-stat-icon">
              <User size={20} />
            </span>
            <div className="jock-detail-stat-content">
              <span className="jock-detail-stat-label">Gate</span>
              <span className="jock-detail-stat-value">#{race.gateNumber}</span>
            </div>
          </div>
          <div className="jock-detail-stat">
            <span className="jock-detail-stat-icon">
              <Trophy size={20} />
            </span>
            <div className="jock-detail-stat-content">
              <span className="jock-detail-stat-label">Odds</span>
              <span className="jock-detail-stat-value">{race.odds}</span>
            </div>
          </div>
        </div>

        {/* My Assignment */}
        <div className="jock-detail-section">
          <h2 className="jock-section-title">My Assignment</h2>
          <div className="jock-assignment-card">
            <div className="jock-assignment-header">
              <div
                className="jock-silk-preview"
                style={{ backgroundColor: race.silkColor }}
              >
                <span className="jock-silk-number">{race.gateNumber}</span>
              </div>
              <div className="jock-assignment-details">
                <h3 className="jock-assignment-horse">{race.myHorse?.horseName}</h3>
                <p className="jock-assignment-trainer">
                  Trainer: {race.myHorse?.trainerName}
                </p>
                <p className="jock-assignment-trainer">
                  Color: {race.myHorse?.color} | Age: {race.myHorse?.age}
                </p>
              </div>
            </div>

            <div className="jock-assignment-metrics">
              <div className="jock-metric">
                <span className="jock-metric-label">Weight Carried</span>
                <span className="jock-metric-value">{race.weightCarried}kg</span>
              </div>
              <div className="jock-metric">
                <span className="jock-metric-label">Weight Allowance</span>
                <span className="jock-metric-value">{race.weightAllowance}kg</span>
              </div>
              <div className="jock-metric">
                <span className="jock-metric-label">Form</span>
                <JockeyFormBadge form={race.form} />
              </div>
            </div>

            {race.instructions && (
              <div className="jock-assignment-notes">
                <h4 className="jock-notes-title">Race Instructions</h4>
                <p className="jock-notes-content">{race.instructions}</p>
              </div>
            )}

            {race.trainerNotes && (
              <div className="jock-assignment-notes">
                <h4 className="jock-notes-title">Trainer Notes</h4>
                <p className="jock-notes-content">{race.trainerNotes}</p>
              </div>
            )}

            <div className="jock-assignment-actions">
              {race.status === "SCHEDULED" && !race.isScratched && (
                <>
                  <button
                    className="jock-btn jock-btn--primary"
                    onClick={handleConfirmParticipation}
                  >
                    <CheckCircle size={18} />
                    Confirm Participation
                  </button>
                  <button
                    className="jock-btn jock-btn--danger"
                    onClick={() => setShowScratchModal(true)}
                  >
                    <XCircle size={18} />
                    Request Scratching
                  </button>
                </>
              )}
              {race.isScratched && (
                <div className="jock-scratched-notice">
                  <AlertTriangle size={18} />
                  <span>You have been scratched from this race</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leg Progress */}
        {race.legs && race.legs.length > 0 && (
          <div className="jock-detail-section">
            <h2 className="jock-section-title">Race Progress</h2>
            <div className="jock-legs-timeline">
              {race.legs.map((leg, index) => (
                <div
                  key={leg.id}
                  className={`jock-leg-item jock-leg-item--${leg.status.toLowerCase()}`}
                >
                  <div className="jock-leg-marker">
                    {leg.status === "COMPLETED" ? (
                      <CheckCircle size={24} />
                    ) : leg.status === "LIVE" ? (
                      <span className="jock-leg-live-dot"></span>
                    ) : (
                      <span className="jock-leg-number">{leg.legNumber}</span>
                    )}
                  </div>
                  <div className="jock-leg-content">
                    <div className="jock-leg-header">
                      <h4 className="jock-leg-name">{leg.legName}</h4>
                      <JockeyLegStatusBadge status={leg.status} />
                    </div>
                    <p className="jock-leg-distance">{leg.distance}m</p>
                    {leg.results && (
                      <div className="jock-leg-results">
                        <span>Rank: {leg.results.rank}</span>
                        <span>Time: {leg.results.time}s</span>
                        <span>Speed: {leg.results.speed} m/s</span>
                      </div>
                    )}
                  </div>
                  {index < race.legs.length - 1 && (
                    <div className="jock-leg-connector"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitors */}
        <div className="jock-detail-section">
          <h2 className="jock-section-title">Competitors</h2>
          <div className="jock-competitors-list">
            {competitors.map((comp, index) => (
              <div
                key={index}
                className={`jock-competitor-card ${comp.jockeyName === race.jockeyName ? "jock-competitor-card--me" : ""}`}
              >
                <div className="jock-competitor-position">
                  {comp.gateNumber}
                </div>
                <div
                  className="jock-competitor-silk"
                  style={{ backgroundColor: comp.silkColor }}
                ></div>
                <div className="jock-competitor-info">
                  <h4 className="jock-competitor-name">{comp.jockeyName}</h4>
                  <p className="jock-competitor-horse">{comp.horseName}</p>
                </div>
                <div className="jock-competitor-metrics">
                  <div className="jock-competitor-metric">
                    <span className="jock-competitor-label">Weight</span>
                    <span className="jock-competitor-value">{comp.weight}kg</span>
                  </div>
                  <div className="jock-competitor-metric">
                    <span className="jock-competitor-label">Odds</span>
                    <span className="jock-competitor-value">{comp.odds}</span>
                  </div>
                </div>
                <div className="jock-competitor-form">
                  <JockeyFormBadge form={comp.form} />
                </div>
                {comp.recentFinish && (
                  <div className="jock-competitor-last">
                    <span className="jock-competitor-last-label">Last:</span>
                    <span className="jock-competitor-last-value">
                      {comp.recentFinish}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scratching Modal */}
        <JockeyModal
          isOpen={showScratchModal}
          onClose={() => setShowScratchModal(false)}
          title="Request Scratching"
          size="md"
        >
          <div className="jock-modal-form">
            <p className="jock-modal-warning">
              <AlertTriangle size={18} />
              You are requesting to be scratched from this race. Please provide
              a detailed reason for this request.
            </p>
            <div className="jock-form-group">
              <label className="jock-form-label">Reason for Scratching</label>
              <textarea
                className="jock-textarea"
                value={scratchReason}
                onChange={(e) => setScratchReason(e.target.value)}
                placeholder="Please provide a detailed reason (minimum 10 characters)..."
                rows={4}
              />
            </div>
            <div className="jock-modal-actions">
              <button
                className="jock-btn jock-btn--secondary"
                onClick={() => setShowScratchModal(false)}
              >
                Cancel
              </button>
              <button
                className="jock-btn jock-btn--danger"
                onClick={handleScratchRequest}
                disabled={scratchReason.trim().length < 10}
              >
                Submit Request
              </button>
            </div>
          </div>
        </JockeyModal>
      </div>
    </div>
  );
}
