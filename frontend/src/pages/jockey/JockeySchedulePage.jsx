import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Sun, Moon } from "lucide-react";
import {
  JockeyPageHeader,
  JockeyTabs,
  JockeyEmptyState,
  JockeySkeleton,
  JockeyErrorAlert,
  JockeyScheduleItem,
} from "../../components/jockey/JockeyCommon";
import { jockeyScheduleService } from "../../services/jockeyService";
import "./JockeySchedulePage.css";

export default function JockeySchedulePage() {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  const fetchSchedule = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await jockeyScheduleService.getSchedule();
      setSchedule(data);
    } catch (e) {
      setError(e.message || "Failed to load schedule");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const tabs = useMemo(
    () => [
      { id: "upcoming", label: "Upcoming", count: schedule.upcoming.length },
      { id: "past", label: "Past", count: schedule.past.length },
    ],
    [schedule.upcoming.length, schedule.past.length]
  );

  const handleScheduleItemClick = (item) => {
    if (item.raceId && !item.raceId.startsWith("race-sched")) {
      navigate(`/jockey/races/${item.raceId}`);
    }
  };

  if (loading) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="Schedule"
            title="My Schedule"
            subtitle="View your upcoming and past races"
          />
          <JockeySkeleton type="list" count={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="Schedule"
            title="My Schedule"
            subtitle="View your upcoming and past races"
          />
          <JockeyErrorAlert message={error} onRetry={fetchSchedule} />
        </div>
      </div>
    );
  }

  const displayedSchedule = activeTab === "upcoming" ? schedule.upcoming : schedule.past;

  return (
    <div className="jock-page">
      <div className="jock-page-content">
        <JockeyPageHeader
          eyebrow="Schedule"
          title="My Schedule"
          subtitle="View your upcoming and past races"
          onRefresh={() => fetchSchedule(true)}
          refreshing={refreshing}
        />

        {error && <JockeyErrorAlert message={error} onRetry={fetchSchedule} />}

        <JockeyTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {displayedSchedule.length > 0 ? (
          <div className="jock-schedule-list">
            {displayedSchedule.map((dayGroup, groupIndex) => (
              <div key={groupIndex} className="jock-schedule-day-group">
                <div className="jock-schedule-day-header">
                  <div className="jock-schedule-day-info">
                    <span className="jock-schedule-day-name">{dayGroup.dayName}</span>
                    <span className="jock-schedule-day-date">
                      {new Date(dayGroup.date).toLocaleDateString("vi-VN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="jock-schedule-day-count">
                    {dayGroup.races.length} {dayGroup.races.length === 1 ? "event" : "events"}
                  </span>
                </div>

                <div className="jock-schedule-day-races">
                  {dayGroup.races.map((item, itemIndex) => (
                    <div key={itemIndex} className="jock-schedule-race-wrapper">
                      <JockeyScheduleItem
                        item={item}
                        onClick={() => handleScheduleItemClick(item)}
                      />
                      {itemIndex < dayGroup.races.length - 1 && (
                        <div className="jock-schedule-race-divider"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <JockeyEmptyState
            icon={Calendar}
            title={activeTab === "upcoming" ? "No Upcoming Events" : "No Past Events"}
            description={
              activeTab === "upcoming"
                ? "You don't have any scheduled events coming up."
                : "Your past schedule will appear here."
            }
          />
        )}

        {/* Calendar Legend */}
        <div className="jock-schedule-legend">
          <div className="jock-legend-item">
            <Sun size={16} />
            <span>Day Events</span>
          </div>
          <div className="jock-legend-item">
            <Moon size={16} />
            <span>Night Events</span>
          </div>
        </div>
      </div>
    </div>
  );
}
