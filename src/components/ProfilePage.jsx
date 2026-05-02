import { useState, useEffect } from "react";

const API = "https://easyhome-back.onrender.com";

export default function ProfilePage({ user, onLogout, onNameUpdate }) {
  const [tab, setTab] = useState("info");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Info tab
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerHour, setPricePerHour] = useState(100);
  const [upiId, setUpiId] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password tab
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  // Earnings (worker only)
  const [earnings, setEarnings] = useState(null);
  const [earningsPeriod, setEarningsPeriod] = useState("year"); // "year" | "month"

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadProfile();
    if (user.role === "worker") loadEarnings();
  }, []);

  function loadProfile() {
    const url =
      user.role === "worker"
        ? `${API}/worker/profile`
        : `${API}/customer/profile`;
    fetch(url, { headers })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setService(data.service || "");
        setLocation(data.location || "");
        setPricePerHour(data.pricePerHour || 100);
        setUpiId(data.upiId || "");
        setIsUrgent(data.isUrgent || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  function loadEarnings() {
    fetch(`${API}/worker/earnings`, { headers })
      .then((r) => r.json())
      .then(setEarnings)
      .catch(() => {});
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const body =
        user.role === "worker"
          ? { name, phone, service, location, pricePerHour, upiId, isUrgent }
          : { name, phone };
      const url =
        user.role === "worker"
          ? `${API}/worker/profile`
          : `${API}/customer/profile`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onNameUpdate(name);
        alert("Profile updated ✅");
      }
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwdMsg("");
    if (!oldPwd || !newPwd) {
      setPwdMsg("Both fields required");
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg("Min 6 characters");
      return;
    }
    const res = await fetch(`${API}/change-password`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMsg("✅ Password changed!");
      setOldPwd("");
      setNewPwd("");
    } else setPwdMsg(`❌ ${data.error}`);
  }

  if (loading)
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );

  // ── EARNINGS GRAPH ──────────────────────────────────
  function EarningsGraph() {
    if (!earnings)
      return (
        <p style={{ color: "#aaa", textAlign: "center" }}>
          Loading earnings...
        </p>
      );

    const data =
      earningsPeriod === "month"
        ? earnings.months.slice(-1) // current month breakdown — show last 4 weeks
        : earnings.months;

    const maxVal = Math.max(...data.map((m) => m.amount), 1);

    return (
      <div>
        {/* SUMMARY CARDS */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {[
            {
              label: "Total Earnings",
              value: `₹${earnings.totalEarnings}`,
              icon: "💰",
              color: "#ff3c00",
            },
            {
              label: "This Month",
              value: `₹${earnings.thisMonth}`,
              icon: "📅",
              color: "#28a745",
            },
            {
              label: "Completed Jobs",
              value: profile?.jobs || 0,
              icon: "💼",
              color: "#6c63ff",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: "white",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: "20px" }}>{s.icon}</div>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: s.color,
                  marginTop: "4px",
                }}
              >
                {s.value}
              </div>
              <div
                style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* PERIOD TOGGLE */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["year", "month"].map((p) => (
            <button
              key={p}
              onClick={() => setEarningsPeriod(p)}
              style={{
                flex: 1,
                padding: "8px",
                border: "2px solid",
                borderColor: earningsPeriod === p ? "#ff7a18" : "#eee",
                borderRadius: "10px",
                background: earningsPeriod === p ? "#fff8f0" : "white",
                color: earningsPeriod === p ? "#ff3c00" : "#888",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              {p === "year" ? "📊 12 Months" : "📅 This Month"}
            </button>
          ))}
        </div>

        {/* BAR GRAPH */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <h5 style={{ margin: "0 0 16px", color: "#333" }}>
            {earningsPeriod === "year"
              ? "📈 Earnings — Last 12 Months"
              : "📅 This Month Earnings"}
          </h5>

          {earnings.months.every((m) => m.amount === 0) ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <span style={{ fontSize: "36px" }}>📊</span>
              <p style={{ color: "#aaa", marginTop: "10px" }}>
                No earnings yet
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "4px",
                height: "160px",
                padding: "0 4px",
              }}
            >
              {earnings.months.map((m, i) => {
                const pct = maxVal > 0 ? (m.amount / maxVal) * 100 : 0;
                const isCurrentMonth = i === earnings.months.length - 1;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {m.amount > 0 && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#ff3c00",
                          fontWeight: "bold",
                        }}
                      >
                        ₹
                        {m.amount >= 1000
                          ? `${(m.amount / 1000).toFixed(1)}k`
                          : m.amount}
                      </span>
                    )}
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(pct, 2)}%`,
                        background: isCurrentMonth
                          ? "linear-gradient(to top, #ff3c00, #ff7a18)"
                          : "linear-gradient(to top, #ffd0a0, #ffb066)",
                        borderRadius: "4px 4px 0 0",
                        transition: "height 0.5s ease",
                        minHeight: "4px",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#aaa",
                        textAlign: "center",
                        wordBreak: "break-all",
                      }}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MONTHLY BREAKDOWN TABLE */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "16px",
            marginTop: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <h5 style={{ margin: "0 0 12px" }}>📋 Monthly Breakdown</h5>
          {earnings.months.filter((m) => m.amount > 0).length === 0 ? (
            <p style={{ color: "#aaa", fontSize: "13px" }}>No earnings data</p>
          ) : (
            earnings.months
              .filter((m) => m.amount > 0)
              .reverse()
              .map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f5f5f5",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#555" }}>
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#ff3c00",
                      fontSize: "14px",
                    }}
                  >
                    ₹{m.amount}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: "80px" }}>
      {/* PROFILE HEADER */}
      <div className="profile-header">
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ff7a18, #ff3c00)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "22px",
            flexShrink: 0,
          }}
        >
          {(profile?.name || user.name)?.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{profile?.name || user.name}</h2>
          <p style={{ color: "#888", fontSize: "13px", margin: "2px 0" }}>
            {user.role === "worker" ? `🔧 ${profile?.service}` : "👤 Customer"}
          </p>
          {user.role === "worker" && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "4px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  background: "#fff8f0",
                  color: "#ff3c00",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                ⭐ {profile?.rating || 0} rating
              </span>
              <span
                style={{
                  fontSize: "11px",
                  background: "#f0f8ff",
                  color: "#007bff",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                💼 {profile?.jobs || 0} jobs
              </span>
              {profile?.adminBadge && (
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background:
                      profile.adminBadge === "Excellent"
                        ? "#e6ffed"
                        : profile.adminBadge === "Bad"
                          ? "#ffe6e6"
                          : "#fff8e0",
                    color:
                      profile.adminBadge === "Excellent"
                        ? "green"
                        : profile.adminBadge === "Bad"
                          ? "red"
                          : "orange",
                  }}
                >
                  {profile.adminBadge === "Excellent"
                    ? "🌟"
                    : profile.adminBadge === "Good"
                      ? "👍"
                      : "👎"}{" "}
                  {profile.adminBadge}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="profile-tabs">
        {[
          { key: "info", label: "✏️ Info" },
          { key: "history", label: "📋 History" },
          ...(user.role === "worker"
            ? [{ key: "earnings", label: "💰 Earnings" }]
            : []),
          { key: "password", label: "🔒 Password" },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INFO TAB ── */}
      {tab === "info" && (
        <div>
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {user.role === "worker" && (
            <>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="">Select Service</option>
                <option>Plumber</option>
                <option>Electrician</option>
                <option>Tutor</option>
                <option>Cleaner</option>
                <option>AC Repair</option>
                <option>Carpenter</option>
              </select>
              <input
                placeholder="Location / Area"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <input
                type="number"
                placeholder="Price per hour (₹)"
                value={pricePerHour}
                min={100}
                onChange={(e) => setPricePerHour(e.target.value)}
              />
              <input
                placeholder="UPI ID (e.g. name@upi)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px",
                  background: isUrgent ? "#fff0f0" : "#f9f9f9",
                  borderRadius: "12px",
                  marginTop: "12px",
                  border: isUrgent ? "1px solid #ffb0b0" : "1px solid #eee",
                }}
              >
                <div>
                  <p
                    style={{ fontWeight: "bold", margin: 0, fontSize: "14px" }}
                  >
                    🚨 Available for Urgent Jobs
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      margin: "2px 0 0",
                    }}
                  >
                    Appear in "Need Now" section
                  </p>
                </div>
                <div
                  className="toggle-switch"
                  onClick={() => setIsUrgent((p) => !p)}
                  style={{
                    cursor: "pointer",
                    width: "48px",
                    height: "26px",
                    background: isUrgent ? "#ff3c00" : "#ddd",
                    borderRadius: "13px",
                    position: "relative",
                    transition: "0.3s",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "3px",
                      left: isUrgent ? "24px" : "3px",
                      width: "20px",
                      height: "20px",
                      background: "white",
                      borderRadius: "50%",
                      transition: "0.3s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <button
            className="btn primary"
            onClick={saveProfile}
            disabled={saving}
            style={{ marginTop: "16px" }}
          >
            {saving ? "Saving..." : "Save Changes ✅"}
          </button>

          <button
            className="btn dark"
            onClick={onLogout}
            style={{ marginTop: "10px" }}
          >
            Logout 🚪
          </button>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div>
          {user.role === "worker" ? (
            <>
              <div className="earnings-box">
                <span>💰 Total Earnings</span>
                <strong>₹{profile?.earnings || 0}</strong>
              </div>
              {profile?.acceptedJobs?.length === 0 && (
                <p style={{ color: "#aaa", fontSize: "13px" }}>No jobs yet.</p>
              )}
              {profile?.acceptedJobs?.map((j) => (
                <div key={j._id} className="history-card">
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <strong>{j.service}</strong>
                    <span className={`status ${j.status}`}>{j.status}</span>
                  </div>
                  <p>{j.description}</p>
                  <p>
                    📍 {j.location} • ₹{j.finalPrice}
                  </p>
                  {j.paymentDone && (
                    <p style={{ color: "green", fontSize: "12px" }}>
                      💳 Paid via {j.paymentMode}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              {profile?.bookings?.length === 0 && (
                <p style={{ color: "#aaa", fontSize: "13px" }}>
                  No bookings yet.
                </p>
              )}
              {profile?.bookings?.map((b) => (
                <div key={b._id} className="history-card">
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <strong>{b.service}</strong>
                    <span className={`status ${b.status}`}>{b.status}</span>
                  </div>
                  <p>{b.description}</p>
                  <p>
                    📍 {b.location} • ₹{b.finalPrice}
                  </p>
                  {b.worker && (
                    <p style={{ color: "green", fontSize: "12px" }}>
                      ✅ Worker: {b.worker}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── EARNINGS TAB (Worker only) ── */}
      {tab === "earnings" && user.role === "worker" && <EarningsGraph />}

      {/* ── PASSWORD TAB ── */}
      {tab === "password" && (
        <div>
          <input
            type="password"
            placeholder="Current Password"
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
          />
          <input
            type="password"
            placeholder="New Password (min 6 chars)"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
          />
          {pwdMsg && (
            <p
              style={{
                color: pwdMsg.includes("✅") ? "green" : "red",
                fontSize: "13px",
              }}
            >
              {pwdMsg}
            </p>
          )}
          <button className="btn primary" onClick={changePassword}>
            Change Password 🔒
          </button>
        </div>
      )}
    </div>
  );
}
