import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flag, Filter, Search, Plus } from "lucide-react";
import {
  JockeyPageHeader,
  JockeyToolbar,
  JockeySearchInput,
  JockeyFilterSelect,
  JockeyTabs,
  JockeyRaceCard,
  JockeyEmptyState,
  JockeySkeleton,
  JockeyErrorAlert,
} from "../../components/jockey/JockeyCommon";
import { jockeyRaceService } from "../../services/jockeyService";
import { RACE_STATUS } from "../../data/mockJockeyData";
import "./JockeyMyRacesPage.css";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Races" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const SURFACE_OPTIONS = [
  { value: "ALL", label: "All Surfaces" },
  { value: "Turf", label: "Turf" },
  { value: "Dirt", label: "Dirt" },
  { value: "Synthetic", label: "Synthetic" },
];

export default function JockeyMyRacesPage() {
  const navigate = useNavigate();
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [surfaceFilter, setSurfaceFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("upcoming");

  const fetchRaces = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const filters = {};
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (surfaceFilter !== "ALL") filters.surface = surfaceFilter;

      const data = await jockeyRaceService.getMyRaces(filters);
      setRaces(data);
    } catch (e) {
      setError(e.message || "Failed to load races");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, surfaceFilter]);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  const filteredRaces = useMemo(() => {
    let filtered = races;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (race) =>
          race.name.toLowerCase().includes(searchLower) ||
          race.tournamentName.toLowerCase().includes(searchLower) ||
          race.venue.toLowerCase().includes(searchLower) ||
          race.myHorse?.horseName?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [races, search]);

  const upcomingRaces = useMemo(
    () => filteredRaces.filter((r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS"),
    [filteredRaces]
  );

  const pastRaces = useMemo(
    () => filteredRaces.filter((r) => r.status === "COMPLETED"),
    [filteredRaces]
  );

  const tabs = useMemo(
    () => [
      { id: "upcoming", label: "Upcoming", count: upcomingRaces.length },
      { id: "past", label: "Past", count: pastRaces.length },
    ],
    [upcomingRaces.length, pastRaces.length]
  );

  const displayedRaces = activeTab === "upcoming" ? upcomingRaces : pastRaces;

  const handleRaceClick = (race) => {
    navigate(`/jockey/races/${race.id}`);
  };

  if (loading) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="My Races"
            title="Race Management"
            subtitle="View and manage your assigned races"
          />
          <div className="jock-races-grid">
            <JockeySkeleton type="card" count={6} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="My Races"
            title="Race Management"
            subtitle="View and manage your assigned races"
          />
          <JockeyErrorAlert message={error} onRetry={fetchRaces} />
        </div>
      </div>
    );
  }

  return (
    <div className="jock-page">
      <div className="jock-page-content">
        <JockeyPageHeader
          eyebrow="My Races"
          title="Race Management"
          subtitle="View and manage your assigned races"
          onRefresh={() => fetchRaces(true)}
          refreshing={refreshing}
        />

        {error && <JockeyErrorAlert message={error} onRetry={fetchRaces} />}

        <JockeyTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <JockeyToolbar>
          <JockeySearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search races, tournaments, horses..."
          />
          <JockeyFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            label="Status"
          />
          <JockeyFilterSelect
            value={surfaceFilter}
            onChange={setSurfaceFilter}
            options={SURFACE_OPTIONS}
            label="Surface"
          />
        </JockeyToolbar>

        {displayedRaces.length > 0 ? (
          <div className="jock-races-grid">
            {displayedRaces.map((race) => (
              <JockeyRaceCard
                key={race.id}
                race={race}
                onClick={() => handleRaceClick(race)}
              />
            ))}
          </div>
        ) : (
          <JockeyEmptyState
            icon={Flag}
            title={activeTab === "upcoming" ? "No Upcoming Races" : "No Past Races"}
            description={
              activeTab === "upcoming"
                ? "You don't have any upcoming races. Check back later for new assignments."
                : "Your race history will appear here after completing races."
            }
          />
        )}
      </div>
    </div>
  );
}
