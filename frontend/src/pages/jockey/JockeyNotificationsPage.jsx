import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  Mail,
} from "lucide-react";
import {
  JockeyPageHeader,
  JockeyTabs,
  JockeyNotificationItem,
  JockeyEmptyState,
  JockeySkeleton,
  JockeyErrorAlert,
  JockeyFilterSelect,
} from "../../components/jockey/JockeyCommon";
import JockeyInvitationInbox from "../../components/jockey/JockeyInvitationInbox";
import { jockeyNotificationService } from "../../services/jockeyService";
import "./JockeyNotificationsPage.css";

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "RACE_ASSIGNMENT", label: "Race Assignment" },
  { value: "RACE_UPDATE", label: "Race Update" },
  { value: "HORSE_UPDATE", label: "Horse Update" },
  { value: "TRAINER_MESSAGE", label: "Trainer Message" },
  { value: "SYSTEM", label: "System" },
  { value: "RACE_RESULT", label: "Race Result" },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: "ALL", label: "All Priorities" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

export default function JockeyNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("invitations");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await jockeyNotificationService.getNotifications();
      setNotifications(data);
    } catch (e) {
      setError(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (activeTab === "unread") {
      filtered = filtered.filter((n) => !n.read);
    }

    if (typeFilter !== "ALL") {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    if (priorityFilter !== "ALL") {
      filtered = filtered.filter((n) => n.priority === priorityFilter);
    }

    return filtered;
  }, [notifications, activeTab, typeFilter, priorityFilter]);

  const groupedNotifications = useMemo(() => {
    const groups = {};
    for (const notif of filteredNotifications) {
      const date = new Date(notif.timestamp).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notif);
    }
    return groups;
  }, [filteredNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const tabs = useMemo(
    () => [
      { id: "invitations", label: "Lời mời", icon: Mail, count: null },
      { id: "all", label: "Tất cả", count: notifications.length },
      { id: "unread", label: "Chưa đọc", count: unreadCount },
    ],
    [notifications.length, unreadCount]
  );

  const handleMarkAsRead = async (notificationId) => {
    try {
      await jockeyNotificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await jockeyNotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Failed to mark all as read:", e);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await jockeyNotificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    if (notification.raceId) {
      navigate(`/jockey/races/${notification.raceId}`);
    }
  };

  if (loading) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="Notifications"
            title="Notifications"
            subtitle="Stay updated with your races and assignments"
          />
          <JockeySkeleton type="list" count={8} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="jock-page">
        <div className="jock-page-content">
          <JockeyPageHeader
            eyebrow="Notifications"
            title="Notifications"
            subtitle="Stay updated with your races and assignments"
          />
          <JockeyErrorAlert message={error} onRetry={fetchNotifications} />
        </div>
      </div>
    );
  }

  return (
    <div className="jock-page">
      <div className="jock-page-content">
        <JockeyPageHeader
          eyebrow="Notifications"
          title="Notifications"
          subtitle={`You have ${unreadCount} unread notifications`}
          onRefresh={() => fetchNotifications(true)}
          refreshing={refreshing}
          actions={
            unreadCount > 0 && (
              <button
                className="jock-btn jock-btn--secondary"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck size={18} />
                Mark All as Read
              </button>
            )
          }
        />

        {error && <JockeyErrorAlert message={error} onRetry={fetchNotifications} />}

        <JockeyTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "invitations" ? (
          <JockeyInvitationInbox />
        ) : (
          <>
            <div className="jock-notifications-filters">
              <JockeyFilterSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={TYPE_FILTER_OPTIONS}
                label="Type"
              />
              <JockeyFilterSelect
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={PRIORITY_FILTER_OPTIONS}
                label="Priority"
              />
            </div>

            {Object.keys(groupedNotifications).length > 0 ? (
          <div className="jock-notifications-list">
            {Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="jock-notification-group">
                <div className="jock-notification-group-header">
                  <span className="jock-notification-group-date">{date}</span>
                  <span className="jock-notification-group-count">
                    {items.length} notification{items.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="jock-notification-group-items">
                  {items.map((notification) => (
                    <div key={notification.id} className="jock-notification-wrapper">
                      <JockeyNotificationItem
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkRead={handleMarkAsRead}
                      />
                      <button
                        className="jock-notification-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <JockeyEmptyState
            icon={Bell}
            title="No Notifications"
            description={
              activeTab === "unread"
                ? "You have no unread notifications. Great job staying on top of things!"
                : "You don't have any notifications matching your filters."
            }
          />
        )}
          </>
        )}
      </div>
    </div>
  );
}
