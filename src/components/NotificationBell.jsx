import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const API = "https://easyhome-api.onrender.com";
let socket;

export default function NotificationBell({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (user.role !== "worker") return;

    const token = localStorage.getItem("token");
    const workerId = localStorage.getItem("workerId");

    fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setNotifications(data || []));

    socket = io(API);

    socket.on("connect", () => {
      socket.emit("register_worker", workerId);
    });

    socket.on("new_job", (job) => {
      setNotifications((prev) => [
        { ...job, read: false, createdAt: new Date(), _id: Date.now() },
        ...prev,
      ]);

      if (Notification.permission === "granted") {
        new Notification(`New ${job.service} Job! 🔔`, {
          body: `${job.description} — ₹${job.finalPrice}`,
        });
      }
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    if (user.role === "worker" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function markRead() {
    const token = localStorage.getItem("token");
    fetch(`${API}/notifications/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // ✅ DELETE single notification
  function deleteNotification(e, id) {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    fetch(`${API}/notification/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }

  function toggleOpen() {
    setOpen((prev) => {
      if (!prev) markRead();
      return !prev;
    });
  }

  if (user.role !== "worker") return null;

  return (
    <div className="bell-wrapper">

      <div className="bell-btn" onClick={toggleOpen}>
        🔔
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </div>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h4>Notifications {notifications.length > 0 && `(${notifications.length})`}</h4>
            <span onClick={() => setOpen(false)} className="notif-close">✕</span>
          </div>

          {notifications.length === 0 && (
            <p className="notif-empty">No notifications yet</p>
          )}

          {notifications.map((n, i) => (
            <div key={n._id || i} className={`notif-item ${n.read ? "read" : "unread"}`}>

              {/* ✅ DELETE BUTTON */}
              <button
                className="notif-delete"
                onClick={(e) => deleteNotification(e, n._id)}
              >✕</button>

              <div className="notif-top">
                <span className="notif-service">{n.service}</span>
                {n.urgency === "urgent" && <span className="badge">URGENT</span>}
              </div>
              <p>{n.description}</p>
              <p>📍 {n.location}</p>
              <p>💰 ₹{n.finalPrice}</p>
              <p className="notif-time">
                {new Date(n.createdAt).toLocaleTimeString()}
              </p>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}