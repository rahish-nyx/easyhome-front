import { useState, useEffect } from "react";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";

// ══════════════════════════════════════════════════════════
// ADMIN CHAT
// ══════════════════════════════════════════════════════════
function AdminChat({ headers }) {
  const [convos, setConvos] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadConvos();
  }, []);

  function loadConvos() {
    fetch(`${API}/admin/chats`, { headers })
      .then((r) => r.json())
      .then((d) => setConvos(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  function openChat(user) {
    setSelectedUser(user);
    fetch(`${API}/admin/chat/${user.userId}`, { headers })
      .then((r) => r.json())
      .then((d) => setMessages(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  async function sendReply() {
    if (!reply.trim() || !selectedUser) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/admin/chat/${selectedUser.userId}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: reply,
          receiverRole: selectedUser.senderRole,
        }),
      });
      if (res.ok) {
        setReply("");
        openChat(selectedUser);
        loadConvos();
      }
    } finally {
      setSending(false);
    }
  }

  if (selectedUser)
    return (
      <div>
        <button
          onClick={() => {
            setSelectedUser(null);
            loadConvos();
          }}
          style={{
            background: "none",
            border: "none",
            color: "#ff3c00",
            cursor: "pointer",
            fontSize: "clamp(13px,1.5vw,16px)",
            marginBottom: "14px",
            fontWeight: "700",
            padding: 0,
          }}
        >
          ← Back
        </button>
        <div
          style={{
            background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
            borderRadius: "clamp(10px,1.5vw,16px)",
            padding: "clamp(12px,1.8vw,18px) clamp(14px,2vw,22px)",
            color: "white",
            marginBottom: "14px",
            display: "flex",
            gap: "clamp(10px,1.5vw,16px)",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "clamp(34px,4vw,46px)",
              height: "clamp(34px,4vw,46px)",
              background: "rgba(255,255,255,0.25)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(16px,2vw,22px)",
              flexShrink: 0,
            }}
          >
            {selectedUser.senderRole === "worker" ? "🔧" : "👤"}
          </div>
          <div>
            <p
              style={{
                fontWeight: "bold",
                fontSize: "clamp(13px,1.5vw,17px)",
                margin: 0,
              }}
            >
              {selectedUser.userName}
            </p>
            <p
              style={{
                fontSize: "clamp(10px,1vw,13px)",
                opacity: 0.85,
                margin: 0,
              }}
            >
              {selectedUser.senderRole}
            </p>
          </div>
        </div>
        <div
          style={{
            background: "#f5f5f5",
            borderRadius: "clamp(10px,1.5vw,16px)",
            padding: "clamp(10px,1.5vw,16px)",
            minHeight: "clamp(220px,35vw,400px)",
            maxHeight: "clamp(300px,45vh,500px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          {messages.length === 0 && (
            <p
              style={{
                textAlign: "center",
                color: "#aaa",
                fontSize: "clamp(12px,1.3vw,15px)",
              }}
            >
              No messages yet
            </p>
          )}
          {messages.map((msg, i) => {
            const isAdmin = msg.senderRole === "admin";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isAdmin ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    background: isAdmin ? "#ff3c00" : "white",
                    color: isAdmin ? "white" : "#333",
                    padding: "clamp(8px,1.2vw,12px) clamp(10px,1.5vw,16px)",
                    borderRadius: isAdmin
                      ? "14px 14px 4px 14px"
                      : "14px 14px 14px 4px",
                    fontSize: "clamp(12px,1.3vw,15px)",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  {!isAdmin && (
                    <p
                      style={{
                        fontSize: "clamp(10px,1vw,12px)",
                        color: "#ff7a18",
                        fontWeight: "bold",
                        margin: "0 0 3px",
                      }}
                    >
                      {msg.senderName}
                    </p>
                  )}
                  <p style={{ margin: 0 }}>{msg.message}</p>
                  <p
                    style={{
                      fontSize: "clamp(9px,0.9vw,11px)",
                      opacity: 0.65,
                      textAlign: "right",
                      margin: "3px 0 0",
                    }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "clamp(8px,1.2vw,14px)" }}>
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendReply()}
            placeholder={`Reply to ${selectedUser.userName}...`}
            style={{
              flex: 1,
              padding: "clamp(10px,1.4vw,14px) clamp(14px,1.8vw,20px)",
              borderRadius: "50px",
              border: "1px solid #eee",
              fontSize: "clamp(13px,1.3vw,15px)",
              outline: "none",
              margin: 0,
            }}
          />
          <button
            onClick={sendReply}
            disabled={sending || !reply.trim()}
            style={{
              padding: "clamp(10px,1.4vw,14px) clamp(16px,2vw,24px)",
              background: reply.trim() ? "#ff3c00" : "#eee",
              color: reply.trim() ? "white" : "#aaa",
              border: "none",
              borderRadius: "50px",
              cursor: reply.trim() ? "pointer" : "default",
              fontWeight: "bold",
              fontSize: "clamp(12px,1.3vw,15px)",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {sending ? "..." : "Send ➤"}
          </button>
        </div>
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <h4 style={{ fontSize: "clamp(14px,1.6vw,18px)" }}>
          💬 All Conversations ({convos.length})
        </h4>
        <button
          onClick={loadConvos}
          style={{
            background: "none",
            border: "1px solid #eee",
            padding: "clamp(4px,0.8vw,7px) clamp(10px,1.5vw,16px)",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "clamp(11px,1.2vw,14px)",
            color: "#888",
          }}
        >
          🔄 Refresh
        </button>
      </div>
      {convos.length === 0 && (
        <p
          style={{
            color: "#aaa",
            textAlign: "center",
            padding: "20px",
            fontSize: "clamp(13px,1.3vw,15px)",
          }}
        >
          No messages yet
        </p>
      )}
      {convos.map((c, i) => (
        <div
          key={i}
          onClick={() => openChat(c)}
          style={{
            background: "white",
            borderRadius: "clamp(10px,1.5vw,16px)",
            padding: "clamp(12px,1.8vw,18px)",
            marginBottom: "8px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border:
              c.unread > 0 ? "2px solid #ff7a18" : "2px solid transparent",
            transition: "all 0.2s",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "clamp(10px,1.5vw,16px)",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "clamp(36px,4.5vw,50px)",
                height: "clamp(36px,4.5vw,50px)",
                background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(16px,2vw,22px)",
                flexShrink: 0,
              }}
            >
              {c.senderRole === "worker" ? "🔧" : "👤"}
            </div>
            <div>
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: "clamp(13px,1.4vw,16px)",
                  margin: 0,
                }}
              >
                {c.userName}
              </p>
              <p
                style={{
                  fontSize: "clamp(11px,1.2vw,13px)",
                  color: "#888",
                  margin: "2px 0 0",
                }}
              >
                {c.lastMessage?.slice(0, 50)}
                {c.lastMessage?.length > 50 ? "..." : ""}
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            {c.unread > 0 && (
              <span
                style={{
                  background: "#ff3c00",
                  color: "white",
                  borderRadius: "50%",
                  width: "clamp(18px,2.2vw,24px)",
                  height: "clamp(18px,2.2vw,24px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(10px,1vw,12px)",
                  fontWeight: "bold",
                }}
              >
                {c.unread}
              </span>
            )}
            <p
              style={{
                fontSize: "clamp(10px,1vw,12px)",
                color: "#aaa",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              {new Date(c.lastTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ADMIN ANALYTICS
// ══════════════════════════════════════════════════════════
function AdminAnalytics({ bookings, users }) {
  const totalBookings = bookings.length;
  const pending = bookings.filter((b) => b.status === "pending").length;
  const accepted = bookings.filter((b) => b.status === "accepted").length;
  const ongoing = bookings.filter((b) => b.status === "ongoing").length;
  const completed = bookings.filter((b) => b.status === "completed").length;
  const totalRevenue = bookings
    .filter((b) => b.paymentDone)
    .reduce((s, b) => s + (b.finalPrice || 0), 0);
  const urgentCount = bookings.filter((b) => b.urgency === "urgent").length;
  const normalCount = bookings.filter((b) => b.urgency === "normal").length;

  function Bar({ label, value, max, color }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div style={{ marginBottom: "clamp(10px,1.5vw,16px)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <span style={{ fontSize: "clamp(12px,1.3vw,15px)", color: "#555" }}>
            {label}
          </span>
          <span
            style={{ fontSize: "clamp(12px,1.3vw,15px)", fontWeight: "bold" }}
          >
            {value}
          </span>
        </div>
        <div
          style={{
            background: "#f0f0f0",
            borderRadius: "10px",
            height: "clamp(8px,1.2vw,12px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              background: color,
              height: "100%",
              borderRadius: "10px",
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>
    );
  }

  function PieChart() {
    if (totalBookings === 0)
      return <p style={{ color: "#aaa", textAlign: "center" }}>No data yet</p>;
    const pPct = Math.round((pending / totalBookings) * 100);
    const aPct = Math.round((accepted / totalBookings) * 100);
    const oPct = Math.round((ongoing / totalBookings) * 100);
    const cPct = Math.max(0, 100 - pPct - aPct - oPct);
    const segments = [
      { label: "Pending", pct: pPct, color: "#ffc107" },
      { label: "Accepted", pct: aPct, color: "#28a745" },
      { label: "Ongoing", pct: oPct, color: "#6c63ff" },
      { label: "Completed", pct: cPct, color: "#ff3c00" },
    ];
    let cum = 0;
    const conic = segments
      .map((s) => {
        const st = cum;
        cum += s.pct;
        return `${s.color} ${st}% ${cum}%`;
      })
      .join(", ");
    return (
      <div>
        <div
          style={{
            width: "clamp(140px,18vw,200px)",
            height: "clamp(140px,18vw,200px)",
            borderRadius: "50%",
            background: `conic-gradient(${conic})`,
            margin: "0 auto clamp(14px,2vw,20px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
          }}
        >
          {segments.map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <div
                style={{
                  width: "clamp(8px,1vw,12px)",
                  height: "clamp(8px,1vw,12px)",
                  borderRadius: "50%",
                  background: s.color,
                }}
              />
              <span
                style={{ fontSize: "clamp(11px,1.1vw,14px)", color: "#555" }}
              >
                {s.label} {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: "📋",
      label: "Bookings",
      value: totalBookings,
      bg: "#fff8f0",
      color: "#ff3c00",
    },
    {
      icon: "💰",
      label: "Revenue",
      value: `₹${totalRevenue}`,
      bg: "#f0fff4",
      color: "green",
    },
    {
      icon: "👤",
      label: "Customers",
      value: users.customers?.length || 0,
      bg: "#f0f4ff",
      color: "#007bff",
    },
    {
      icon: "🔧",
      label: "Workers",
      value: users.workers?.length || 0,
      bg: "#fff0f8",
      color: "#e91e8c",
    },
    {
      icon: "🚨",
      label: "Urgent",
      value: urgentCount,
      bg: "#fff0f0",
      color: "red",
    },
    {
      icon: "🕐",
      label: "Normal",
      value: normalCount,
      bg: "#f5f5f5",
      color: "#555",
    },
  ];

  return (
    <div>
      <p
        style={{
          fontSize: "clamp(11px,1.2vw,14px)",
          color: "#888",
          marginBottom: "16px",
        }}
      >
        📅 Showing last 30 days data
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(clamp(100px,14vw,160px), 1fr))",
          gap: "clamp(8px,1.5vw,16px)",
          marginBottom: "clamp(16px,2.5vw,26px)",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: s.bg,
              borderRadius: "clamp(10px,1.5vw,16px)",
              padding: "clamp(12px,2vw,20px)",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: "clamp(20px,3vw,32px)" }}>{s.icon}</div>
            <div
              style={{
                fontWeight: "bold",
                fontSize: "clamp(16px,2.5vw,28px)",
                color: s.color,
                marginTop: "4px",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "clamp(10px,1vw,13px)",
                color: "#888",
                marginTop: "2px",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
      {[
        {
          title: "📈 Status Breakdown",
          content: () => (
            <>
              <Bar
                label="🟡 Pending"
                value={pending}
                max={totalBookings}
                color="#ffc107"
              />
              <Bar
                label="✅ Accepted"
                value={accepted}
                max={totalBookings}
                color="#28a745"
              />
              <Bar
                label="🔵 Ongoing"
                value={ongoing}
                max={totalBookings}
                color="#6c63ff"
              />
              <Bar
                label="🏁 Completed"
                value={completed}
                max={totalBookings}
                color="#ff3c00"
              />
            </>
          ),
        },
        { title: "🥧 Distribution", content: () => <PieChart /> },
        {
          title: "🔧 By Service",
          content: () => {
            const map = {};
            bookings.forEach((b) => {
              map[b.service] = (map[b.service] || 0) + 1;
            });
            const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
            return sorted.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: "clamp(12px,1.3vw,15px)" }}>
                No data yet
              </p>
            ) : (
              sorted.map(([s, c]) => (
                <Bar
                  key={s}
                  label={s}
                  value={c}
                  max={sorted[0][1]}
                  color="linear-gradient(135deg,#ff7a18,#ff3c00)"
                />
              ))
            );
          },
        },
      ].map(({ title, content }) => (
        <div
          key={title}
          style={{
            background: "white",
            borderRadius: "clamp(12px,1.5vw,18px)",
            padding: "clamp(14px,2vw,22px)",
            marginBottom: "clamp(12px,1.8vw,20px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h5
            style={{
              marginBottom: "clamp(12px,1.5vw,18px)",
              fontSize: "clamp(13px,1.4vw,17px)",
            }}
          >
            {title}
          </h5>
          {content()}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SERVICE EDIT ROW
// ══════════════════════════════════════════════════════════
function ServiceEditRow({ service, headers, onDone }) {
  const [name, setName] = useState(service.name);
  const [icon, setIcon] = useState(service.icon);
  async function save() {
    await fetch(`${API}/admin/service/${service._id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, active: service.active }),
    });
    onDone();
  }
  return (
    <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center" }}>
      <input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        style={{
          width: "clamp(44px,5vw,60px)",
          padding: "clamp(6px,1vw,9px)",
          borderRadius: "8px",
          border: "1px solid #ddd",
          textAlign: "center",
          fontSize: "clamp(16px,2vw,22px)",
          margin: 0,
          flexShrink: 0,
        }}
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          flex: 1,
          padding: "clamp(6px,1vw,9px)",
          borderRadius: "8px",
          border: "1px solid #ddd",
          fontSize: "clamp(12px,1.3vw,15px)",
          margin: 0,
        }}
      />
      <button
        onClick={save}
        style={{
          padding: "clamp(6px,1vw,9px) clamp(10px,1.5vw,16px)",
          background: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "clamp(12px,1.2vw,14px)",
          fontWeight: "600",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        Save
      </button>
      <button
        onClick={onDone}
        style={{
          padding: "clamp(6px,1vw,9px) clamp(8px,1.2vw,14px)",
          background: "#eee",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ADMIN LOGIN PAGE — Clean, secure, no credential hints
// ══════════════════════════════════════════════════════════
function AdminLoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  function handleBack() {
    window.location.reload();
  }

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Generic error — don't reveal whether email or password is wrong
        setError(
          "Access denied. Invalid credentials or you are not authorized.",
        );
        return;
      }
      localStorage.setItem("adminToken", data.token);
      onLogin(data.token);
    } catch {
      setError("Cannot reach server. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f2f2f7",
        padding: "20px",
      }}
    >
      {/* BACK BUTTON */}
      <div
        style={{
          position: "absolute",
          top: "clamp(14px,2vw,24px)",
          left: "clamp(14px,2vw,24px)",
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: "none",
            border: "none",
            color: "#ff3c00",
            fontSize: "clamp(13px,1.4vw,15px)",
            cursor: "pointer",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          ← Back to App
        </button>
      </div>

      {/* LOGIN CARD */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          borderRadius: "24px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          padding: "clamp(28px,5vw,44px) clamp(24px,5vw,40px)",
          boxSizing: "border-box",
        }}
      >
        {/* LOGO / ICON */}
        <div
          style={{ textAlign: "center", marginBottom: "clamp(20px,3vw,32px)" }}
        >
          <div
            style={{
              width: "clamp(64px,10vw,80px)",
              height: "clamp(64px,10vw,80px)",
              background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto clamp(14px,2vw,20px)",
              boxShadow: "0 8px 24px rgba(255,69,0,0.3)",
            }}
          >
            <span style={{ fontSize: "clamp(28px,5vw,36px)" }}>🛡️</span>
          </div>
          <h2
            style={{
              fontSize: "clamp(20px,3vw,26px)",
              fontWeight: "800",
              margin: "0 0 6px",
              color: "#1a1a1a",
            }}
          >
            Admin Portal
          </h2>
          <p
            style={{
              color: "#888",
              fontSize: "clamp(12px,1.4vw,14px)",
              margin: 0,
            }}
          >
            EasyHome — Authorized Access Only
          </p>
        </div>

        {/* NOTICE BANNER */}
        <div
          style={{
            background: "#fff8f0",
            border: "1.5px solid #ffd0a0",
            borderRadius: "12px",
            padding: "clamp(10px,1.5vw,14px) clamp(12px,2vw,16px)",
            marginBottom: "clamp(18px,2.5vw,24px)",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "18px", flexShrink: 0 }}>🔒</span>
          <div>
            <p
              style={{
                fontWeight: "700",
                fontSize: "clamp(12px,1.3vw,14px)",
                color: "#e65100",
                margin: "0 0 2px",
              }}
            >
              Restricted Access
            </p>
            <p
              style={{
                fontSize: "clamp(11px,1.2vw,13px)",
                color: "#888",
                margin: 0,
              }}
            >
              This portal is for authorized administrators only. Unauthorized
              access attempts are logged.
            </p>
          </div>
        </div>

        {/* EMAIL INPUT */}
        <div style={{ marginBottom: "14px" }}>
          <label
            style={{
              display: "block",
              fontSize: "clamp(11px,1.2vw,13px)",
              fontWeight: "600",
              color: "#555",
              marginBottom: "6px",
            }}
          >
            Admin Email
          </label>
          <input
            type="email"
            placeholder="Enter your admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "clamp(11px,1.5vw,14px) clamp(14px,1.8vw,18px)",
              borderRadius: "12px",
              border: "1.5px solid #e8e8e8",
              fontSize: "clamp(13px,1.4vw,15px)",
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
              margin: 0,
            }}
            onFocus={(e) => (e.target.style.borderColor = "#ff7a18")}
            onBlur={(e) => (e.target.style.borderColor = "#e8e8e8")}
          />
        </div>

        {/* PASSWORD INPUT */}
        <div style={{ marginBottom: "clamp(16px,2.5vw,22px)" }}>
          <label
            style={{
              display: "block",
              fontSize: "clamp(11px,1.2vw,13px)",
              fontWeight: "600",
              color: "#555",
              marginBottom: "6px",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%",
                padding:
                  "clamp(11px,1.5vw,14px) clamp(48px,6vw,52px) clamp(11px,1.5vw,14px) clamp(14px,1.8vw,18px)",
                borderRadius: "12px",
                border: "1.5px solid #e8e8e8",
                fontSize: "clamp(13px,1.4vw,15px)",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
                margin: 0,
              }}
              onFocus={(e) => (e.target.style.borderColor = "#ff7a18")}
              onBlur={(e) => (e.target.style.borderColor = "#e8e8e8")}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "#aaa",
                padding: "0",
                lineHeight: 1,
              }}
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#ffe6e6",
              border: "1px solid #ffb3b3",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "14px", flexShrink: 0 }}>⛔</span>
            <p
              style={{
                color: "#c62828",
                fontSize: "clamp(12px,1.3vw,13px)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* LOGIN BUTTON */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "clamp(13px,1.8vw,16px)",
            background: loading
              ? "#ccc"
              : "linear-gradient(135deg,#ff7a18,#ff3c00)",
            color: "white",
            border: "none",
            borderRadius: "14px",
            cursor: loading ? "default" : "pointer",
            fontWeight: "800",
            fontSize: "clamp(14px,1.6vw,16px)",
            boxShadow: loading ? "none" : "0 6px 20px rgba(255,69,0,0.35)",
            transition: "all 0.25s",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          {loading ? "Verifying..." : "Login to Admin Panel →"}
        </button>

        {/* FOOTER NOTE — NO CREDENTIAL HINTS */}
        <p
          style={{
            textAlign: "center",
            fontSize: "clamp(10px,1.1vw,12px)",
            color: "#ccc",
            marginTop: "20px",
            lineHeight: 1.6,
          }}
        >
          Access is strictly limited to approved administrators.
          <br />
          Contact system owner if you need access.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ADMIN MANAGERS TAB — manage who can access admin panel
// ══════════════════════════════════════════════════════════
function AdminManagers({ headers }) {
  const [admins, setAdmins] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAdmins();
  }, []);

  function loadAdmins() {
    fetch(`${API}/admin/admins`, { headers })
      .then((r) => r.json())
      .then((d) => setAdmins(Array.isArray(d) ? d : []))
      .catch(() => {});
  }

  async function addAdmin() {
    setError("");
    setSuccess("");
    if (!newEmail.trim() || !newPass.trim()) {
      setError("Email and password required");
      return;
    }
    if (newPass.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API}/admin/add-admin`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), password: newPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add admin");
        return;
      }
      setSuccess(`Admin ${newEmail} added successfully ✅`);
      setNewEmail("");
      setNewPass("");
      loadAdmins();
    } finally {
      setAdding(false);
    }
  }

  async function removeAdmin(id) {
    if (admins.length <= 1) {
      alert("Cannot delete the only admin account!");
      return;
    }
    if (
      !window.confirm(
        "Remove this admin account? They will lose access immediately.",
      )
    )
      return;
    await fetch(`${API}/admin/remove-admin/${id}`, {
      method: "DELETE",
      headers,
    });
    loadAdmins();
  }

  return (
    <div>
      <div
        style={{
          background: "#fff8f0",
          border: "1.5px solid #ffd0a0",
          borderRadius: "clamp(12px,1.5vw,18px)",
          padding: "clamp(14px,2vw,22px)",
          marginBottom: "20px",
        }}
      >
        <h4
          style={{
            margin: "0 0 14px",
            fontSize: "clamp(13px,1.5vw,17px)",
            color: "#e65100",
          }}
        >
          ➕ Add New Admin
        </h4>
        <p
          style={{
            fontSize: "clamp(11px,1.2vw,13px)",
            color: "#888",
            marginBottom: "12px",
          }}
        >
          Only add people you fully trust — they will have full control over the
          platform.
        </p>
        <input
          placeholder="New admin email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "clamp(9px,1.3vw,13px)",
            borderRadius: "10px",
            border: "1px solid #ddd",
            fontSize: "clamp(12px,1.3vw,15px)",
            marginBottom: "10px",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <input
          placeholder="Password (min 8 characters)"
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          style={{
            width: "100%",
            padding: "clamp(9px,1.3vw,13px)",
            borderRadius: "10px",
            border: "1px solid #ddd",
            fontSize: "clamp(12px,1.3vw,15px)",
            marginBottom: "10px",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p
            style={{ color: "#c62828", fontSize: "13px", marginBottom: "8px" }}
          >
            ❌ {error}
          </p>
        )}
        {success && (
          <p
            style={{ color: "#2e7d32", fontSize: "13px", marginBottom: "8px" }}
          >
            {success}
          </p>
        )}
        <button
          onClick={addAdmin}
          disabled={adding}
          style={{
            width: "100%",
            padding: "clamp(10px,1.5vw,14px)",
            background: adding
              ? "#ccc"
              : "linear-gradient(135deg,#ff7a18,#ff4500)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: adding ? "default" : "pointer",
            fontWeight: "700",
            fontSize: "clamp(13px,1.4vw,15px)",
            fontFamily: "inherit",
          }}
        >
          {adding ? "Adding..." : "Add Admin Account ➕"}
        </button>
      </div>

      <h4 style={{ marginBottom: "12px", fontSize: "clamp(13px,1.5vw,17px)" }}>
        🛡️ Admin Accounts ({admins.length})
      </h4>
      {admins.length === 0 && (
        <p style={{ color: "#aaa", fontSize: "13px" }}>
          No admin accounts found.
        </p>
      )}
      {admins.map((a, i) => (
        <div
          key={a._id || i}
          style={{
            background: "white",
            borderRadius: "clamp(10px,1.5vw,16px)",
            padding: "clamp(12px,1.8vw,18px)",
            marginBottom: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "clamp(36px,4.5vw,46px)",
                height: "clamp(36px,4.5vw,46px)",
                background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(16px,2vw,20px)",
                flexShrink: 0,
              }}
            >
              🛡️
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontWeight: "700",
                  margin: 0,
                  fontSize: "clamp(12px,1.4vw,15px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {a.email}
              </p>
              <p
                style={{
                  fontSize: "clamp(10px,1vw,12px)",
                  color: "#888",
                  margin: "2px 0 0",
                }}
              >
                Admin Account
              </p>
            </div>
          </div>
          <button
            onClick={() => removeAdmin(a._id)}
            style={{
              padding: "clamp(6px,1vw,9px) clamp(10px,1.5vw,16px)",
              background: admins.length <= 1 ? "#f5f5f5" : "#ffe6e6",
              color: admins.length <= 1 ? "#bbb" : "red",
              border: "none",
              borderRadius: "8px",
              cursor: admins.length <= 1 ? "not-allowed" : "pointer",
              fontSize: "clamp(11px,1.2vw,13px)",
              fontWeight: "600",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            {admins.length <= 1 ? "🔒 Last Admin" : "🗑️ Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ══════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem("adminToken") || "",
  );
  const [tab, setTab] = useState("cities");

  const [cities, setCities] = useState([]);
  const [users, setUsers] = useState({ customers: [], workers: [] });
  const [bookings, setBookings] = useState([]);
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subs, setSubs] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [subBadge, setSubBadge] = useState(0);
  const [commBadge, setCommBadge] = useState(0);

  const [cityName, setCityName] = useState("");
  const [cityLat, setCityLat] = useState("");
  const [cityLng, setCityLng] = useState("");
  const [serviceRadius, setServiceRadius] = useState("");
  const [editingCityRadius, setEditingCityRadius] = useState(null);
  const [cityRadiusDraft, setCityRadiusDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceIcon, setNewServiceIcon] = useState("");
  const [editingService, setEditingService] = useState(null);

  const [ratingTarget, setRatingTarget] = useState(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingBadge, setRatingBadge] = useState("Good");
  const [ratingNote, setRatingNote] = useState("");

  const [settings, setSettings] = useState({});
  const [editPrice, setEditPrice] = useState("");
  const [editAdminUpi, setEditAdminUpi] = useState("");
  const [customerBenefits, setCustomerBenefits] = useState([]);
  const [workerBenefits, setWorkerBenefits] = useState([]);
  const [qrFile, setQrFile] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const headers = { Authorization: `Bearer ${adminToken}` };

  useEffect(() => {
    if (adminToken) loadAll();
  }, [adminToken]);

  function loadAll() {
    loadCities();
    loadUsers();
    loadBookings();
    loadUnreadCount();
    loadPendingWorkers();
    loadServices();
    loadSubs();
    loadCommissions();
    loadSettings();
  }

  function loadCities() {
    fetch(`${API}/admin/cities`, { headers })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          handleLogout();
          return [];
        }
        return r.json();
      })
      .then((d) => setCities(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  function loadUsers() {
    fetch(`${API}/admin/users`, { headers })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          handleLogout();
          return { customers: [], workers: [] };
        }
        return r.json();
      })
      .then((d) =>
        setUsers({
          customers: Array.isArray(d?.customers) ? d.customers : [],
          workers: Array.isArray(d?.workers) ? d.workers : [],
        }),
      )
      .catch(() => {});
  }
  function loadBookings() {
    fetch(`${API}/admin/bookings`, { headers })
      .then((r) => r.json())
      .then((d) => setBookings(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  function loadPendingWorkers() {
    fetch(`${API}/admin/pending-workers`, { headers })
      .then((r) => r.json())
      .then((d) => setPendingWorkers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  function loadServices() {
    fetch(`${API}/admin/services`, { headers })
      .then((r) => r.json())
      .then((d) => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  function loadUnreadCount() {
    fetch(`${API}/admin/chats`, { headers })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d))
          setUnreadCount(d.reduce((s, c) => s + (c.unread || 0), 0));
      })
      .catch(() => {});
  }
  function loadSubs() {
    fetch(`${API}/admin/subscriptions`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : [];
        setSubs(arr);
        setSubBadge(arr.filter((s) => s.status === "pending").length);
      })
      .catch(() => {});
  }
  function loadCommissions() {
    fetch(`${API}/admin/commissions`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : [];
        setCommissions(arr);
        setCommBadge(arr.filter((c) => c.status === "paid").length);
      })
      .catch(() => {});
  }
  function loadSettings() {
    fetch(`${API}/settings`)
      .then((r) => r.json())
      .then((d) => {
        setSettings(d);
        setEditPrice(d.subscriptionPrice || 199);
        setEditAdminUpi(d.adminUpi || "");
        setCustomerBenefits(d.subscriptionBenefitsCustomer || []);
        setWorkerBenefits(d.subscriptionBenefitsWorker || []);
      })
      .catch(() => {});
  }

  function handleLogout() {
    localStorage.removeItem("adminToken");
    setAdminToken("");
  }
  function handleBack() {
    window.location.reload();
  }

  async function addCity() {
    if (!cityName || !cityLat || !cityLng || !serviceRadius) {
      alert("Fill all fields");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API}/admin/city`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cityName,
          lat: Number(cityLat),
          lng: Number(cityLng),
          serviceRadius: Number(serviceRadius),
        }),
      });
      if (res.ok) {
        setCityName("");
        setCityLat("");
        setCityLng("");
        setServiceRadius("");
        loadCities();
      } else {
        const d = await res.json();
        alert(d.error || "Failed");
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleCity(id) {
    await fetch(`${API}/admin/city/${id}`, { method: "PUT", headers });
    loadCities();
  }
  async function deleteCity(id) {
    if (!window.confirm("Delete city?")) return;
    await fetch(`${API}/admin/city/${id}`, { method: "DELETE", headers });
    loadCities();
  }
  function cityRadiusKm(city) {
    const radius = Number(city.serviceRadius);
    if (!Number.isFinite(radius) || radius <= 0) return 10;
    return radius > 500 ? Math.round((radius / 1000) * 100) / 100 : radius;
  }
  function startCityRadiusEdit(city) {
    setEditingCityRadius(city._id);
    setCityRadiusDraft(String(cityRadiusKm(city)));
  }
  async function saveCityRadius(id) {
    const radius = Number(cityRadiusDraft);
    if (!Number.isFinite(radius) || radius <= 0) {
      alert("Enter valid radius in KM");
      return;
    }

    await fetch(`${API}/admin/city/${id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ serviceRadius: radius }),
    });

    setEditingCityRadius(null);
    setCityRadiusDraft("");
    loadCities();
  }
  async function approveWorker(id) {
    await fetch(`${API}/admin/worker/approve/${id}`, {
      method: "PUT",
      headers,
    });
    alert("Worker approved ✅");
    loadPendingWorkers();
    loadUsers();
  }
  async function rejectWorker(id) {
    await fetch(`${API}/admin/worker/reject/${id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    alert("Rejected & notified");
    setRejectingId(null);
    setRejectReason("");
    loadPendingWorkers();
  }
  async function toggleUrgent(id) {
    await fetch(`${API}/admin/worker/urgent/${id}`, { method: "PUT", headers });
    loadUsers();
  }
  async function deleteUser(role, id) {
    if (!window.confirm(`Delete this ${role}?`)) return;
    await fetch(`${API}/admin/user/${role}/${id}`, {
      method: "DELETE",
      headers,
    });
    loadUsers();
  }
  async function removeBooking(id) {
    if (!window.confirm("Remove this job?")) return;
    await fetch(`${API}/admin/booking/${id}`, { method: "DELETE", headers });
    loadBookings();
  }
  async function addService() {
    if (!newServiceName || !newServiceIcon) {
      alert("Name and icon required");
      return;
    }
    const res = await fetch(`${API}/admin/service`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newServiceName, icon: newServiceIcon }),
    });
    if (res.ok) {
      setNewServiceName("");
      setNewServiceIcon("");
      loadServices();
    } else {
      const d = await res.json();
      alert(d.error || "Failed");
    }
  }
  async function toggleService(id, current) {
    await fetch(`${API}/admin/service/${id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    loadServices();
  }
  async function deleteService(id) {
    if (!window.confirm("Delete service?")) return;
    await fetch(`${API}/admin/service/${id}`, { method: "DELETE", headers });
    loadServices();
  }
  async function submitAdminRating() {
    if (!ratingTarget) return;
    await fetch(`${API}/admin/rate`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: ratingTarget.id,
        targetName: ratingTarget.name,
        targetRole: ratingTarget.role,
        stars: ratingStars,
        badge: ratingBadge,
        note: ratingNote,
      }),
    });
    alert("Rating submitted ✅");
    setRatingTarget(null);
    setRatingStars(5);
    setRatingBadge("Good");
    setRatingNote("");
    loadUsers();
  }
  async function approveSub(id) {
    await fetch(`${API}/admin/subscription/approve/${id}`, {
      method: "PUT",
      headers,
    });
    alert("Approved ✅");
    loadSubs();
    loadUsers();
  }
  async function rejectSub(id) {
    await fetch(`${API}/admin/subscription/reject/${id}`, {
      method: "PUT",
      headers,
    });
    alert("Rejected");
    loadSubs();
  }
  async function approveCommission(id) {
    await fetch(`${API}/admin/commission/approve/${id}`, {
      method: "PUT",
      headers,
    });
    alert("Approved ✅");
    loadCommissions();
  }
  async function rejectCommission(id) {
    await fetch(`${API}/admin/commission/reject/${id}`, {
      method: "PUT",
      headers,
    });
    loadCommissions();
  }
  async function saveSettings() {
    setSavingSettings(true);
    try {
      const formData = new FormData();
      formData.append("subscriptionPrice", editPrice);
      formData.append("adminUpi", editAdminUpi);
      formData.append(
        "subscriptionBenefitsCustomer",
        JSON.stringify(customerBenefits),
      );
      formData.append(
        "subscriptionBenefitsWorker",
        JSON.stringify(workerBenefits),
      );
      if (qrFile) formData.append("qrCode", qrFile);
      const res = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers,
        body: formData,
      });
      if (res.ok) {
        alert("Settings saved ✅");
        loadSettings();
      }
    } finally {
      setSavingSettings(false);
    }
  }

  /* ── shared micro-styles ── */
  const card = {
    background: "white",
    borderRadius: "clamp(10px,1.5vw,16px)",
    padding: "clamp(12px,1.8vw,18px)",
    marginBottom: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };
  const inp = (extra = {}) => ({
    width: "100%",
    padding: "clamp(8px,1.2vw,13px) clamp(10px,1.5vw,16px)",
    borderRadius: "clamp(8px,1vw,12px)",
    border: "1px solid #ddd",
    fontSize: "clamp(12px,1.3vw,15px)",
    margin: "0 0 8px",
    fontFamily: "inherit",
    outline: "none",
    ...extra,
  });
  const btn = (bg, color = "white", extra = {}) => ({
    padding: "clamp(7px,1.2vw,11px) clamp(12px,1.8vw,20px)",
    background: bg,
    color,
    border: bg === "white" || bg === "#fff" ? "1px solid #ddd" : "none",
    borderRadius: "clamp(8px,1vw,12px)",
    cursor: "pointer",
    fontSize: "clamp(11px,1.2vw,14px)",
    fontWeight: "600",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    ...extra,
  });

  /* ── SHOW LOGIN PAGE IF NO TOKEN ── */
  if (!adminToken) return <AdminLoginPage onLogin={setAdminToken} />;

  /* ── DASHBOARD ── */
  const TABS = [
    "cities",
    "users",
    "bookings",
    "services",
    "subs",
    "commission",
    "settings",
    "admins",
    "chat",
    "analytics",
  ];
  const TICONS = {
    cities: "📍",
    users: "👥",
    bookings: "📋",
    services: "🛠️",
    subs: "👑",
    commission: "💸",
    settings: "⚙️",
    admins: "🛡️",
    chat: "💬",
    analytics: "📊",
  };
  const TLABELS = {
    cities: "Cities",
    users: "Users",
    bookings: "Jobs",
    services: "Svcs",
    subs: "Subs",
    commission: "Comm",
    settings: "Setup",
    admins: "Admins",
    chat: "Chat",
    analytics: "Stats",
  };

  return (
    <div
      style={{
        width: "100%",
        padding:
          "clamp(14px,2.5vw,28px) clamp(14px,3vw,32px) clamp(60px,10vw,80px)",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "clamp(16px,2.5vw,28px)",
        }}
      >
        <div>
          <button
            onClick={handleBack}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "clamp(12px,1.3vw,15px)",
              cursor: "pointer",
              padding: 0,
              fontWeight: "500",
              fontFamily: "inherit",
            }}
          >
            ← Back to App
          </button>
          <h2 style={{ margin: "4px 0 0", fontSize: "clamp(16px,2.5vw,28px)" }}>
            🛡️ Admin Panel
          </h2>
          <p
            style={{
              color: "#888",
              fontSize: "clamp(11px,1.2vw,14px)",
              margin: 0,
            }}
          >
            EasyHome Dashboard
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
            color: "white",
            border: "none",
            padding: "clamp(8px,1.2vw,13px) clamp(14px,2vw,24px)",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "clamp(12px,1.3vw,15px)",
            fontWeight: "600",
            fontFamily: "inherit",
          }}
        >
          Logout
        </button>
      </div>

      {/* STATS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(clamp(80px,12vw,130px),1fr))",
          gap: "clamp(8px,1.5vw,16px)",
          marginBottom: "clamp(16px,2.5vw,28px)",
        }}
      >
        {[
          {
            label: "Customers",
            value: users.customers?.length || 0,
            icon: "👤",
          },
          { label: "Workers", value: users.workers?.length || 0, icon: "🔧" },
          { label: "Bookings", value: bookings.length, icon: "📋" },
          {
            label: "Cities",
            value: cities.filter((c) => c.active).length,
            icon: "📍",
          },
          ...(pendingWorkers.length > 0
            ? [{ label: "Pending", value: pendingWorkers.length, icon: "⏳" }]
            : []),
          ...(subBadge > 0
            ? [{ label: "Sub Req", value: subBadge, icon: "👑" }]
            : []),
          ...(commBadge > 0
            ? [{ label: "Comm", value: commBadge, icon: "💸" }]
            : []),
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "white",
              borderRadius: "clamp(10px,1.5vw,16px)",
              padding: "clamp(10px,1.5vw,18px)",
              textAlign: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ fontSize: "clamp(18px,2.5vw,28px)" }}>{s.icon}</div>
            <div
              style={{
                fontWeight: "bold",
                fontSize: "clamp(16px,2.2vw,26px)",
                color: "#ff3c00",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "clamp(9px,1vw,12px)",
                color: "#888",
                marginTop: "2px",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div
        style={{
          display: "flex",
          gap: "clamp(4px,0.8vw,8px)",
          marginBottom: "clamp(16px,2.5vw,28px)",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "chat") loadUnreadCount();
              if (t === "subs") loadSubs();
              if (t === "commission") loadCommissions();
            }}
            style={{
              flexShrink: 0,
              padding: "clamp(7px,1.2vw,12px) clamp(10px,1.5vw,18px)",
              border: "2px solid",
              borderColor: tab === t ? "#ff7a18" : "#eee",
              borderRadius: "clamp(8px,1.2vw,14px)",
              background: tab === t ? "#fff8f0" : "white",
              color: tab === t ? "#ff3c00" : "#555",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "clamp(11px,1.2vw,14px)",
              position: "relative",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {TICONS[t]} {TLABELS[t]}
            {t === "chat" && unreadCount > 0 && <Dot color="#ff3c00" white />}
            {t === "users" && pendingWorkers.length > 0 && (
              <Dot color="orange" left />
            )}
            {t === "subs" && subBadge > 0 && <Dot color="#ffd700" dark />}
            {t === "commission" && commBadge > 0 && <Dot color="#ff9800" />}
          </button>
        ))}
      </div>

      {/* ══ CITIES ══ */}
      {tab === "cities" && (
        <div>
          <div
            style={{
              background: "#f9f9f9",
              borderRadius: "clamp(12px,1.5vw,18px)",
              padding: "clamp(14px,2vw,22px)",
              marginBottom: "16px",
            }}
          >
            <h4
              style={{
                marginBottom: "12px",
                fontSize: "clamp(13px,1.5vw,17px)",
              }}
            >
              ➕ Add New City
            </h4>
            <input
              placeholder="City Name"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              style={inp()}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                placeholder="Latitude"
                value={cityLat}
                onChange={(e) => setCityLat(e.target.value)}
                style={{ ...inp(), flex: 1 }}
              />
              <input
                placeholder="Longitude"
                value={cityLng}
                onChange={(e) => setCityLng(e.target.value)}
                style={{ ...inp(), flex: 1 }}
              />
            </div>
            <input
              placeholder="Service Radius (KM)"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(e.target.value)}
              style={inp()}
            />
            <p
              style={{
                fontSize: "clamp(10px,1vw,12px)",
                color: "#aaa",
                margin: "4px 0 10px",
              }}
            >
              💡 maps.google.com → right click → "What's here?"
            </p>
            <button
              onClick={addCity}
              disabled={adding}
              style={{
                width: "100%",
                padding: "clamp(10px,1.5vw,15px)",
                background: "#ff3c00",
                color: "white",
                border: "none",
                borderRadius: "clamp(10px,1.2vw,14px)",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "clamp(13px,1.4vw,16px)",
                fontFamily: "inherit",
              }}
            >
              {adding ? "Adding..." : "Add City ➕"}
            </button>
          </div>
          {cities.length === 0 && (
            <p style={{ textAlign: "center", color: "#aaa" }}>No cities yet</p>
          )}
          {cities.map((city) => (
            <div
              key={city._id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <p
                  style={{
                    fontWeight: "bold",
                    margin: 0,
                    fontSize: "clamp(13px,1.4vw,16px)",
                  }}
                >
                  📍 {city.name}
                </p>
                <p
                  style={{
                    fontSize: "clamp(10px,1vw,12px)",
                    color: "#888",
                    margin: "2px 0 0",
                  }}
                >
                  {city.lat}, {city.lng}
                </p>
                {editingCityRadius === city._id ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      marginTop: "8px",
                    }}
                  >
                    <input
                      type="number"
                      min="1"
                      value={cityRadiusDraft}
                      onChange={(e) => setCityRadiusDraft(e.target.value)}
                      placeholder="Radius KM"
                      style={{
                        ...inp(),
                        width: "120px",
                        margin: 0,
                        padding: "6px 8px",
                      }}
                    />
                    <button
                      onClick={() => saveCityRadius(city._id)}
                      style={btn("#28a745")}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingCityRadius(null);
                        setCityRadiusDraft("");
                      }}
                      style={btn("#eee", "#333")}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: "clamp(11px,1.1vw,13px)",
                      color: "#ff3c00",
                      margin: "4px 0 0",
                      fontWeight: "700",
                    }}
                  >
                    Radius: {cityRadiusKm(city)} KM
                  </p>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(10px,1vw,12px)",
                    padding: "3px 8px",
                    borderRadius: "20px",
                    background: city.active ? "#e6ffed" : "#ffe6e6",
                    color: city.active ? "green" : "red",
                  }}
                >
                  {city.active ? "Active" : "Inactive"}
                </span>
                <button
                  onClick={() => toggleCity(city._id)}
                  style={btn("#fff", "#333")}
                >
                  {city.active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => deleteCity(city._id)}
                  style={btn("#ff3c00")}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ USERS ══ */}
      {tab === "users" && (
        <div>
          {pendingWorkers.length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "clamp(13px,1.5vw,17px)" }}>
                  ⏳ Pending Approval
                </h4>
                <span
                  style={{
                    background: "#ff3c00",
                    color: "white",
                    borderRadius: "20px",
                    padding: "2px 10px",
                    fontSize: "clamp(10px,1vw,12px)",
                  }}
                >
                  {pendingWorkers.length} Pending
                </span>
              </div>
              {pendingWorkers.map((w) => (
                <div
                  key={w._id}
                  style={{
                    background: "#fff8f0",
                    border: "1px solid #ffd0a0",
                    borderRadius: "clamp(10px,1.5vw,16px)",
                    padding: "clamp(12px,1.8vw,18px)",
                    marginBottom: "10px",
                  }}
                >
                  <p
                    style={{
                      fontWeight: "bold",
                      margin: 0,
                      fontSize: "clamp(13px,1.4vw,16px)",
                    }}
                  >
                    {w.name}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(11px,1.2vw,14px)",
                      color: "#888",
                      margin: "2px 0",
                    }}
                  >
                    {w.email} • {w.phone}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(11px,1.2vw,14px)",
                      color: "#888",
                      margin: "2px 0",
                    }}
                  >
                    🔧 {w.service} • 📍 {w.location} • ₹{w.pricePerHour}/hr
                  </p>
                  {rejectingId === w._id && (
                    <input
                      placeholder="Rejection reason"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      style={{ ...inp(), margin: "8px 0 0" }}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => approveWorker(w._id)}
                      style={{
                        flex: 1,
                        ...btn("#28a745"),
                        fontSize: "clamp(12px,1.3vw,14px)",
                      }}
                    >
                      ✅ Approve
                    </button>
                    {rejectingId === w._id ? (
                      <>
                        <button
                          onClick={() => rejectWorker(w._id)}
                          style={{
                            flex: 1,
                            ...btn("#ff3c00"),
                            fontSize: "clamp(12px,1.3vw,14px)",
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          style={btn("#eee", "#333")}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setRejectingId(w._id)}
                        style={{
                          flex: 1,
                          ...btn("#fff", "#ff3c00", {
                            border: "1px solid #ff3c00",
                          }),
                          fontSize: "clamp(12px,1.3vw,14px)",
                        }}
                      >
                        ❌ Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #eee",
                  margin: "16px 0",
                }}
              />
            </>
          )}

          <h4
            style={{ marginBottom: "10px", fontSize: "clamp(13px,1.5vw,17px)" }}
          >
            👤 Customers ({users.customers?.length || 0})
          </h4>
          {users.customers?.map((c) => (
            <div key={c._id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: 0,
                        fontSize: "clamp(13px,1.4vw,16px)",
                      }}
                    >
                      {c.name}
                    </p>
                    {c.isSubscribed &&
                      new Date(c.subscriptionEnd) > new Date() && (
                        <span
                          style={{
                            fontSize: "clamp(9px,1vw,11px)",
                            background:
                              "linear-gradient(135deg,#ffd700,#ff9500)",
                            color: "white",
                            padding: "1px 6px",
                            borderRadius: "20px",
                            fontWeight: "bold",
                          }}
                        >
                          👑
                        </span>
                      )}
                  </div>
                  <p
                    style={{
                      fontSize: "clamp(11px,1.2vw,14px)",
                      color: "#888",
                      margin: "2px 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.email} • {c.phone}
                  </p>
                  {c.adminBadge && (
                    <span
                      style={{
                        fontSize: "clamp(10px,1vw,12px)",
                        background:
                          c.adminBadge === "Excellent"
                            ? "#e6ffed"
                            : c.adminBadge === "Bad"
                              ? "#ffe6e6"
                              : "#fff8e0",
                        color:
                          c.adminBadge === "Excellent"
                            ? "green"
                            : c.adminBadge === "Bad"
                              ? "red"
                              : "orange",
                        padding: "2px 8px",
                        borderRadius: "20px",
                      }}
                    >
                      {c.adminBadge} ⭐{c.adminRating}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() =>
                      setRatingTarget({
                        id: c._id,
                        name: c.name,
                        role: "customer",
                      })
                    }
                    style={btn("#fff8f0", "#ff3c00", {
                      border: "1px solid #ffd0a0",
                    })}
                  >
                    ⭐ Rate
                  </button>
                  <button
                    onClick={() => deleteUser("customer", c._id)}
                    style={btn("#ffe6e6", "red")}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          <h4
            style={{
              marginBottom: "10px",
              marginTop: "20px",
              fontSize: "clamp(13px,1.5vw,17px)",
            }}
          >
            🔧 Workers ({users.workers?.length || 0})
          </h4>
          {users.workers?.map((w) => (
            <div key={w._id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: "bold",
                        margin: 0,
                        fontSize: "clamp(13px,1.4vw,16px)",
                      }}
                    >
                      {w.name}
                    </p>
                    <span
                      style={{
                        fontSize: "clamp(10px,1vw,12px)",
                        background: "#fff8f0",
                        color: "#ff3c00",
                        padding: "2px 8px",
                        borderRadius: "20px",
                      }}
                    >
                      {w.service}
                    </span>
                    {w.isSubscribed &&
                      new Date(w.subscriptionEnd) > new Date() && (
                        <span
                          style={{
                            fontSize: "clamp(9px,1vw,11px)",
                            background:
                              "linear-gradient(135deg,#ffd700,#ff9500)",
                            color: "white",
                            padding: "1px 6px",
                            borderRadius: "20px",
                            fontWeight: "bold",
                          }}
                        >
                          👑
                        </span>
                      )}
                  </div>
                  <p
                    style={{
                      fontSize: "clamp(11px,1.2vw,14px)",
                      color: "#888",
                      margin: "2px 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {w.email} • {w.phone}
                  </p>
                  <p
                    style={{
                      fontSize: "clamp(11px,1.2vw,14px)",
                      color: "#888",
                      margin: "2px 0",
                    }}
                  >
                    📍 {w.location} • ⭐ {w.rating} • 💼 {w.jobs} jobs
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      marginTop: "4px",
                      flexWrap: "wrap",
                    }}
                  >
                    {w.isUrgent && (
                      <span
                        style={{
                          fontSize: "clamp(10px,1vw,12px)",
                          background: "#ffe0e0",
                          color: "red",
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        🚨 Need Now
                      </span>
                    )}
                    {w.adminBadge && (
                      <span
                        style={{
                          fontSize: "clamp(10px,1vw,12px)",
                          background:
                            w.adminBadge === "Excellent"
                              ? "#e6ffed"
                              : w.adminBadge === "Bad"
                                ? "#ffe6e6"
                                : "#fff8e0",
                          color:
                            w.adminBadge === "Excellent"
                              ? "green"
                              : w.adminBadge === "Bad"
                                ? "red"
                                : "orange",
                          padding: "2px 8px",
                          borderRadius: "20px",
                        }}
                      >
                        {w.adminBadge} ⭐{w.adminRating}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => toggleUrgent(w._id)}
                    style={{
                      ...btn(
                        w.isUrgent ? "#ffe0e0" : "#e6ffed",
                        w.isUrgent ? "red" : "green",
                      ),
                      fontSize: "clamp(10px,1vw,12px)",
                    }}
                  >
                    {w.isUrgent ? "Remove NeedNow" : "Add NeedNow"}
                  </button>
                  <button
                    onClick={() =>
                      setRatingTarget({
                        id: w._id,
                        name: w.name,
                        role: "worker",
                      })
                    }
                    style={{
                      ...btn("#fff8f0", "#ff3c00", {
                        border: "1px solid #ffd0a0",
                      }),
                      fontSize: "clamp(10px,1vw,12px)",
                    }}
                  >
                    ⭐ Rate
                  </button>
                  <button
                    onClick={() => deleteUser("worker", w._id)}
                    style={{
                      ...btn("#ffe6e6", "red"),
                      fontSize: "clamp(10px,1vw,12px)",
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ BOOKINGS ══ */}
      {tab === "bookings" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "clamp(13px,1.5vw,17px)" }}>
              📋 All Bookings ({bookings.length})
            </h4>
            <span
              style={{
                fontSize: "clamp(10px,1vw,12px)",
                color: "#888",
                background: "#f5f5f5",
                padding: "4px 10px",
                borderRadius: "20px",
              }}
            >
              Last 30 days
            </span>
          </div>
          {bookings.length === 0 && (
            <p style={{ color: "#aaa", fontSize: "clamp(12px,1.3vw,15px)" }}>
              No bookings yet.
            </p>
          )}
          {bookings.map((b) => (
            <div key={b._id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <p
                  style={{
                    fontWeight: "bold",
                    margin: 0,
                    fontSize: "clamp(13px,1.4vw,16px)",
                  }}
                >
                  {b.service}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "clamp(10px,1vw,12px)",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      background:
                        b.status === "completed"
                          ? "#e6ffed"
                          : b.status === "pending"
                            ? "#fff8e0"
                            : b.status === "ongoing"
                              ? "#e0f0ff"
                              : "#f0f0ff",
                      color:
                        b.status === "completed"
                          ? "green"
                          : b.status === "pending"
                            ? "orange"
                            : b.status === "ongoing"
                              ? "blue"
                              : "#6c63ff",
                    }}
                  >
                    {b.status}
                  </span>
                  <button
                    onClick={() => removeBooking(b._id)}
                    style={{
                      ...btn("#ffe6e6", "red"),
                      fontSize: "clamp(10px,1vw,12px)",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p
                style={{
                  fontSize: "clamp(11px,1.2vw,14px)",
                  color: "#555",
                  margin: "4px 0 2px",
                }}
              >
                {b.description}
              </p>
              <p
                style={{
                  fontSize: "clamp(11px,1.2vw,14px)",
                  color: "#888",
                  margin: "2px 0",
                }}
              >
                📍 {b.location} • 💰 ₹{b.confirmedPrice || b.finalPrice}
              </p>
              {b.finalPriceConfirmed && (
                <p
                  style={{
                    fontSize: "clamp(11px,1.1vw,13px)",
                    color: "green",
                    margin: "2px 0",
                  }}
                >
                  ✅ Confirmed: ₹{b.confirmedPrice}
                </p>
              )}
              {b.worker && (
                <p
                  style={{
                    fontSize: "clamp(11px,1.2vw,14px)",
                    color: "green",
                    margin: "2px 0",
                  }}
                >
                  ✅ Worker: {b.worker}
                </p>
              )}
              {b.paymentDone && (
                <p
                  style={{
                    fontSize: "clamp(11px,1.2vw,14px)",
                    color: "green",
                    margin: "2px 0",
                  }}
                >
                  💳 Paid via {b.paymentMode}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ SERVICES ══ */}
      {tab === "services" && (
        <div>
          <div
            style={{
              background: "#f9f9f9",
              borderRadius: "clamp(12px,1.5vw,18px)",
              padding: "clamp(14px,2vw,22px)",
              marginBottom: "16px",
            }}
          >
            <h4
              style={{
                marginBottom: "12px",
                fontSize: "clamp(13px,1.5vw,17px)",
              }}
            >
              ➕ Add New Service
            </h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                placeholder="Emoji"
                value={newServiceIcon}
                onChange={(e) => setNewServiceIcon(e.target.value)}
                style={{
                  ...inp(),
                  width: "clamp(58px,7vw,80px)",
                  textAlign: "center",
                  fontSize: "clamp(18px,2.5vw,26px)",
                  flexShrink: 0,
                  marginBottom: 0,
                }}
              />
              <input
                placeholder="Service name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                style={{ ...inp(), flex: 1, marginBottom: 0 }}
              />
            </div>
            <button
              onClick={addService}
              style={{
                marginTop: "12px",
                width: "100%",
                padding: "clamp(10px,1.5vw,15px)",
                background: "#ff3c00",
                color: "white",
                border: "none",
                borderRadius: "clamp(10px,1.2vw,14px)",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "clamp(13px,1.4vw,16px)",
                fontFamily: "inherit",
              }}
            >
              Add Service ➕
            </button>
          </div>
          <h4
            style={{ marginBottom: "12px", fontSize: "clamp(13px,1.5vw,17px)" }}
          >
            🛠️ All Services ({services.length})
          </h4>
          {services.map((s) => (
            <div
              key={s._id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {editingService === s._id ? (
                <ServiceEditRow
                  service={s}
                  headers={headers}
                  onDone={() => {
                    setEditingService(null);
                    loadServices();
                  }}
                />
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "clamp(10px,1.5vw,16px)",
                    }}
                  >
                    <span style={{ fontSize: "clamp(24px,3.5vw,36px)" }}>
                      {s.icon}
                    </span>
                    <div>
                      <p
                        style={{
                          fontWeight: "bold",
                          margin: 0,
                          fontSize: "clamp(13px,1.4vw,16px)",
                        }}
                      >
                        {s.name}
                      </p>
                      <span
                        style={{
                          fontSize: "clamp(10px,1vw,12px)",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: s.active ? "#e6ffed" : "#ffe6e6",
                          color: s.active ? "green" : "red",
                        }}
                      >
                        {s.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setEditingService(s._id)}
                      style={btn("#f5f5f5", "#333")}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => toggleService(s._id, s.active)}
                      style={btn("#f5f5f5", "#333")}
                    >
                      {s.active ? "Off" : "On"}
                    </button>
                    <button
                      onClick={() => deleteService(s._id)}
                      style={btn("#ff3c00")}
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══ SUBSCRIPTIONS ══ */}
      {tab === "subs" && (
        <div>
          {subs.filter((s) => s.status === "pending").length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "clamp(13px,1.5vw,17px)" }}>
                  ⏳ Pending Approval
                </h4>
                <span
                  style={{
                    background: "#ff3c00",
                    color: "white",
                    borderRadius: "20px",
                    padding: "2px 10px",
                    fontSize: "clamp(10px,1vw,12px)",
                  }}
                >
                  {subs.filter((s) => s.status === "pending").length} pending
                </span>
              </div>
              {subs
                .filter((s) => s.status === "pending")
                .map((s) => (
                  <div
                    key={s._id}
                    style={{
                      background: "#fff8f0",
                      border: "1px solid #ffd0a0",
                      borderRadius: "clamp(10px,1.5vw,16px)",
                      padding: "clamp(12px,1.8vw,18px)",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontWeight: "bold",
                            margin: 0,
                            fontSize: "clamp(13px,1.4vw,16px)",
                          }}
                        >
                          {s.userName}
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(11px,1.2vw,14px)",
                            color: "#888",
                            margin: "2px 0",
                          }}
                        >
                          {s.userEmail}
                        </p>
                        <span
                          style={{
                            fontSize: "clamp(10px,1vw,12px)",
                            background:
                              s.userRole === "worker" ? "#fff8f0" : "#f0f8ff",
                            color:
                              s.userRole === "worker" ? "#ff3c00" : "#007bff",
                            padding: "2px 8px",
                            borderRadius: "20px",
                          }}
                        >
                          {s.userRole === "worker"
                            ? "🔧 Worker"
                            : "👤 Customer"}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p
                          style={{
                            fontWeight: "bold",
                            color: "#ff3c00",
                            margin: 0,
                            fontSize: "clamp(16px,2.2vw,24px)",
                          }}
                        >
                          ₹{s.price}
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(10px,1vw,12px)",
                            color: "#aaa",
                            margin: "2px 0",
                          }}
                        >
                          {new Date(s.createdAt).toDateString()}
                        </p>
                      </div>
                    </div>
                    {s.screenshotNote && (
                      <div
                        style={{
                          background: "#f9f9f9",
                          borderRadius: "8px",
                          padding: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "clamp(11px,1.2vw,14px)",
                            color: "#555",
                            margin: 0,
                          }}
                        >
                          📝 {s.screenshotNote}
                        </p>
                      </div>
                    )}
                    <div
                      style={{ display: "flex", gap: "8px", marginTop: "10px" }}
                    >
                      <button
                        onClick={() => approveSub(s._id)}
                        style={{
                          flex: 1,
                          ...btn("#28a745"),
                          fontSize: "clamp(12px,1.3vw,15px)",
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Reject?")) rejectSub(s._id);
                        }}
                        style={{
                          flex: 1,
                          ...btn("#fff", "#ff3c00", {
                            border: "1px solid #ff3c00",
                          }),
                          fontSize: "clamp(12px,1.3vw,15px)",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #eee",
                  margin: "16px 0",
                }}
              />
            </>
          )}
          <h4
            style={{ marginBottom: "12px", fontSize: "clamp(13px,1.5vw,17px)" }}
          >
            👑 All Subscriptions ({subs.length})
          </h4>
          {subs.length === 0 && (
            <p style={{ color: "#aaa", fontSize: "clamp(12px,1.3vw,15px)" }}>
              No subscriptions yet
            </p>
          )}
          {subs.map((s) => (
            <div
              key={s._id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: "bold",
                    margin: 0,
                    fontSize: "clamp(13px,1.4vw,16px)",
                  }}
                >
                  {s.userName}
                </p>
                <p
                  style={{
                    fontSize: "clamp(11px,1.2vw,14px)",
                    color: "#888",
                    margin: "2px 0",
                  }}
                >
                  {s.userRole === "worker" ? "🔧 Worker" : "👤 Customer"} • ₹
                  {s.price}
                </p>
                {s.endDate && (
                  <p
                    style={{
                      fontSize: "clamp(10px,1vw,12px)",
                      color: "#888",
                      margin: "2px 0",
                    }}
                  >
                    Expires: {new Date(s.endDate).toDateString()}
                  </p>
                )}
              </div>
              <span
                style={{
                  fontSize: "clamp(10px,1vw,13px)",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  flexShrink: 0,
                  background:
                    s.status === "active"
                      ? "#e6ffed"
                      : s.status === "pending"
                        ? "#fff8e0"
                        : "#ffe6e6",
                  color:
                    s.status === "active"
                      ? "green"
                      : s.status === "pending"
                        ? "orange"
                        : "red",
                }}
              >
                {s.status === "active"
                  ? "👑 Active"
                  : s.status === "pending"
                    ? "⏳ Pending"
                    : "❌ Rejected"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ══ COMMISSION ══ */}
      {tab === "commission" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "clamp(13px,1.5vw,17px)" }}>
              💸 Commission Payments
            </h4>
            <span
              style={{
                fontSize: "clamp(10px,1vw,12px)",
                color: "#888",
                background: "#f5f5f5",
                padding: "4px 10px",
                borderRadius: "20px",
              }}
            >
              {commissions.filter((c) => c.status === "paid").length} pending
              review
            </span>
          </div>
          {commissions.filter((c) => c.status === "paid").length > 0 && (
            <>
              <h5
                style={{
                  color: "#e65100",
                  marginBottom: "10px",
                  fontSize: "clamp(12px,1.3vw,15px)",
                }}
              >
                ⏳ Awaiting Approval
              </h5>
              {commissions
                .filter((c) => c.status === "paid")
                .map((c) => (
                  <div
                    key={c._id}
                    style={{
                      background: "#fff3e0",
                      border: "1.5px solid #ff9800",
                      borderRadius: "clamp(10px,1.5vw,16px)",
                      padding: "clamp(12px,1.8vw,18px)",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: "bold",
                            margin: 0,
                            fontSize: "clamp(13px,1.4vw,16px)",
                          }}
                        >
                          {c.workerName}
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(11px,1.2vw,14px)",
                            color: "#888",
                            margin: "2px 0",
                          }}
                        >
                          Booking: ...{c.bookingId?.slice(-8)}
                        </p>
                        {c.screenshotNote && (
                          <p
                            style={{
                              fontSize: "clamp(11px,1.2vw,14px)",
                              color: "#555",
                              margin: "4px 0",
                              background: "#fff",
                              borderRadius: "6px",
                              padding: "6px",
                            }}
                          >
                            📝 {c.screenshotNote}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p
                          style={{
                            fontWeight: "bold",
                            color: "#e65100",
                            fontSize: "clamp(16px,2.2vw,24px)",
                            margin: 0,
                          }}
                        >
                          ₹{c.amount}
                        </p>
                        <p
                          style={{
                            fontSize: "clamp(10px,1vw,12px)",
                            color: "#aaa",
                          }}
                        >
                          {new Date(c.createdAt).toDateString()}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", marginTop: "10px" }}
                    >
                      <button
                        onClick={() => approveCommission(c._id)}
                        style={{
                          flex: 1,
                          ...btn("#28a745"),
                          fontSize: "clamp(12px,1.3vw,15px)",
                        }}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => rejectCommission(c._id)}
                        style={{
                          flex: 1,
                          ...btn("#fff", "#ff3c00", {
                            border: "1px solid #ff3c00",
                          }),
                          fontSize: "clamp(12px,1.3vw,15px)",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid #eee",
                  margin: "16px 0",
                }}
              />
            </>
          )}
          <h5
            style={{
              marginBottom: "10px",
              color: "#555",
              fontSize: "clamp(12px,1.3vw,15px)",
            }}
          >
            All Commissions ({commissions.length})
          </h5>
          {commissions.length === 0 && (
            <p style={{ color: "#aaa", fontSize: "clamp(12px,1.3vw,15px)" }}>
              No commissions yet
            </p>
          )}
          {commissions.map((c) => (
            <div
              key={c._id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div>
                <p
                  style={{
                    fontWeight: "bold",
                    margin: 0,
                    fontSize: "clamp(13px,1.4vw,16px)",
                  }}
                >
                  {c.workerName}
                </p>
                <p
                  style={{
                    fontSize: "clamp(11px,1.2vw,14px)",
                    color: "#888",
                    margin: "2px 0",
                  }}
                >
                  {new Date(c.createdAt).toDateString()}
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  style={{
                    fontWeight: "bold",
                    color: "#ff4500",
                    margin: 0,
                    fontSize: "clamp(13px,1.5vw,17px)",
                  }}
                >
                  ₹{c.amount}
                </p>
                <span
                  style={{
                    fontSize: "clamp(10px,1vw,12px)",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background:
                      c.status === "approved"
                        ? "#e8f5e9"
                        : c.status === "paid"
                          ? "#fff3e0"
                          : "#ffe6e6",
                    color:
                      c.status === "approved"
                        ? "green"
                        : c.status === "paid"
                          ? "orange"
                          : "red",
                  }}
                >
                  {c.status === "approved"
                    ? "✅ Approved"
                    : c.status === "paid"
                      ? "⏳ Paid"
                      : "❌ Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ SETTINGS ══ */}
      {tab === "settings" && (
        <div>
          <h4
            style={{
              marginBottom: "clamp(14px,2vw,22px)",
              fontSize: "clamp(14px,1.6vw,20px)",
            }}
          >
            ⚙️ Platform Settings
          </h4>
          {[
            {
              title: "💰 Subscription Price",
              content: () => (
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: "clamp(18px,2.5vw,28px)",
                      fontWeight: "900",
                      color: "#ff4500",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="Price per month"
                    style={{ ...inp(), flex: 1, marginBottom: 0 }}
                  />
                  <span
                    style={{
                      fontSize: "clamp(12px,1.3vw,15px)",
                      color: "#888",
                      whiteSpace: "nowrap",
                    }}
                  >
                    /month
                  </span>
                </div>
              ),
            },
            {
              title: "💳 Payment UPI ID",
              content: () => (
                <>
                  <input
                    value={editAdminUpi}
                    onChange={(e) => setEditAdminUpi(e.target.value)}
                    placeholder="yourname@upi"
                    style={{ ...inp(), marginBottom: 0 }}
                  />
                  <p
                    style={{
                      fontSize: "clamp(10px,1vw,12px)",
                      color: "#aaa",
                      marginTop: "6px",
                    }}
                  >
                    Used for subscriptions + commissions
                  </p>
                </>
              ),
            },
            {
              title: "📱 Payment QR Code",
              content: () => (
                <>
                  {settings.qrCodeUrl && (
                    <div style={{ textAlign: "center", marginBottom: "12px" }}>
                      <img
                        src={`${API}${settings.qrCodeUrl}`}
                        alt="QR"
                        style={{
                          width: "clamp(100px,14vw,160px)",
                          height: "clamp(100px,14vw,160px)",
                          borderRadius: "12px",
                          border: "2px solid #ffd0a0",
                        }}
                      />
                      <p
                        style={{
                          fontSize: "clamp(10px,1vw,12px)",
                          color: "#888",
                          marginTop: "6px",
                        }}
                      >
                        Current QR
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setQrFile(e.target.files[0])}
                    style={{ ...inp(), marginBottom: 0 }}
                  />
                </>
              ),
            },
          ].map(({ title, content }) => (
            <div key={title} style={{ ...card, marginBottom: "14px" }}>
              <h5
                style={{
                  marginBottom: "clamp(10px,1.5vw,16px)",
                  fontSize: "clamp(12px,1.4vw,16px)",
                }}
              >
                {title}
              </h5>
              {content()}
            </div>
          ))}

          {[
            {
              title: "👤 Customer Benefits",
              list: customerBenefits,
              setList: setCustomerBenefits,
              newItem: "New customer benefit",
            },
            {
              title: "🔧 Worker Benefits",
              list: workerBenefits,
              setList: setWorkerBenefits,
              newItem: "New worker benefit",
            },
          ].map(({ title, list, setList, newItem }) => (
            <div key={title} style={{ ...card, marginBottom: "14px" }}>
              <h5
                style={{
                  marginBottom: "clamp(10px,1.5vw,16px)",
                  fontSize: "clamp(12px,1.4vw,16px)",
                }}
              >
                {title}
              </h5>
              {list.map((b, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                >
                  <input
                    value={b}
                    onChange={(e) => {
                      const arr = [...list];
                      arr[i] = e.target.value;
                      setList(arr);
                    }}
                    style={{
                      ...inp(),
                      flex: 1,
                      marginBottom: 0,
                      fontSize: "clamp(12px,1.3vw,15px)",
                    }}
                  />
                  <button
                    onClick={() => setList(list.filter((_, j) => j !== i))}
                    style={{ ...btn("#ffe6e6", "red"), flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => setList([...list, newItem])}
                style={{
                  width: "100%",
                  padding: "clamp(8px,1.2vw,12px)",
                  background: "#f5f5f5",
                  border: "1px dashed #ddd",
                  borderRadius: "clamp(8px,1vw,12px)",
                  cursor: "pointer",
                  fontSize: "clamp(12px,1.3vw,15px)",
                  marginTop: "4px",
                  fontFamily: "inherit",
                }}
              >
                + Add Benefit
              </button>
            </div>
          ))}

          <button
            onClick={saveSettings}
            disabled={savingSettings}
            style={{
              width: "100%",
              padding: "clamp(12px,1.8vw,18px)",
              background: savingSettings
                ? "#ccc"
                : "linear-gradient(135deg,#ff7a18,#ff4500)",
              color: "white",
              border: "none",
              borderRadius: "clamp(10px,1.2vw,16px)",
              cursor: savingSettings ? "default" : "pointer",
              fontWeight: "bold",
              fontSize: "clamp(14px,1.6vw,18px)",
              boxShadow: "0 4px 16px rgba(255,69,0,0.3)",
              fontFamily: "inherit",
            }}
          >
            {savingSettings ? "Saving..." : "💾 Save All Settings"}
          </button>
        </div>
      )}

      {/* ══ ADMIN MANAGERS ══ */}
      {tab === "admins" && <AdminManagers headers={headers} />}

      {/* ══ CHAT ══ */}
      {tab === "chat" && <AdminChat headers={headers} />}

      {/* ══ ANALYTICS ══ */}
      {tab === "analytics" && (
        <AdminAnalytics bookings={bookings} users={users} />
      )}

      {/* RATING POPUP */}
      {ratingTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "clamp(16px,3vw,28px)",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "clamp(14px,2vw,22px)",
              padding: "clamp(18px,2.5vw,28px)",
              width: "100%",
              maxWidth: "clamp(320px,50vw,480px)",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "clamp(15px,2vw,22px)" }}>
              ⭐ Rate {ratingTarget.role}
            </h3>
            <p
              style={{
                color: "#888",
                fontSize: "clamp(12px,1.3vw,15px)",
                margin: "0 0 16px",
              }}
            >
              {ratingTarget.name}
            </p>
            <p
              style={{
                fontWeight: "bold",
                fontSize: "clamp(12px,1.3vw,15px)",
                marginBottom: "8px",
              }}
            >
              Stars:
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRatingStars(s)}
                  style={{
                    width: "clamp(32px,4vw,44px)",
                    height: "clamp(32px,4vw,44px)",
                    borderRadius: "50%",
                    border: "none",
                    background: s <= ratingStars ? "#ff7a18" : "#f0f0f0",
                    color: s <= ratingStars ? "white" : "#888",
                    fontSize: "clamp(14px,1.8vw,20px)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p
              style={{
                fontWeight: "bold",
                fontSize: "clamp(12px,1.3vw,15px)",
                marginBottom: "8px",
              }}
            >
              Badge:
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "14px",
                flexWrap: "wrap",
              }}
            >
              {["Excellent", "Good", "Bad"].map((b) => (
                <button
                  key={b}
                  onClick={() => setRatingBadge(b)}
                  style={{
                    flex: 1,
                    minWidth: "clamp(70px,10vw,100px)",
                    padding: "clamp(8px,1.2vw,12px)",
                    border: "2px solid",
                    borderColor: ratingBadge === b ? "#ff7a18" : "#eee",
                    borderRadius: "10px",
                    background: ratingBadge === b ? "#fff8f0" : "white",
                    color: ratingBadge === b ? "#ff3c00" : "#555",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "clamp(11px,1.2vw,14px)",
                    fontFamily: "inherit",
                  }}
                >
                  {b === "Excellent" ? "🌟" : b === "Good" ? "👍" : "👎"} {b}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Admin note (optional)..."
              value={ratingNote}
              onChange={(e) => setRatingNote(e.target.value)}
              style={{
                width: "100%",
                padding: "clamp(10px,1.5vw,14px)",
                borderRadius: "12px",
                border: "1px solid #eee",
                fontSize: "clamp(12px,1.3vw,15px)",
                resize: "none",
                height: "clamp(60px,10vw,90px)",
                marginBottom: "14px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={submitAdminRating}
                style={{
                  flex: 1,
                  ...btn("#ff3c00"),
                  fontSize: "clamp(13px,1.4vw,16px)",
                }}
              >
                Submit ✅
              </button>
              <button
                onClick={() => setRatingTarget(null)}
                style={{
                  ...btn("#eee", "#333"),
                  fontSize: "clamp(13px,1.4vw,16px)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* tiny badge dot helper */
function Dot({ color, white, dark, left }) {
  return (
    <span
      style={{
        position: "absolute",
        top: "-5px",
        [left ? "left" : "right"]: "-3px",
        background: color,
        color: white ? "white" : dark ? "#333" : "white",
        borderRadius: "50%",
        width: "14px",
        height: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "8px",
        fontWeight: "bold",
      }}
    />
  );
}
