import { useState, useEffect } from "react";

const API = "https://easyhome-api.onrender.com";

function StarDisplay({ rating, count }) {
  const stars = Math.round(rating || 0);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "4px",
      }}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{ fontSize: "14px", color: s <= stars ? "#ff7a18" : "#ddd" }}
        >
          ★
        </span>
      ))}
      <span style={{ fontSize: "11px", color: "#888", marginLeft: "2px" }}>
        {rating > 0
          ? `${rating} (${count} review${count !== 1 ? "s" : ""})`
          : "New"}
      </span>
    </div>
  );
}

export default function WorkersList({ data, role, onBookWorker, userCity }) {
  const [selected, setSelected] = useState(null);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [workerRatings, setWorkerRatings] = useState({});

  useEffect(() => {
    if (role === "worker" || !data?.length) return;
    data.forEach((w) => {
      if (w._id) {
        fetch(`${API}/rating/${w._id}`)
          .then((r) => r.json())
          .then((ratings) => {
            if (Array.isArray(ratings) && ratings.length > 0) {
              const avg =
                ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
              setWorkerRatings((prev) => ({
                ...prev,
                [w._id]: {
                  avg: Math.round(avg * 10) / 10,
                  count: ratings.length,
                },
              }));
            }
          })
          .catch(() => {});
      }
    });
  }, [data, role]);

  useEffect(() => {
    if (role !== "worker") return;
    setLoadingJobs(true);
    const token = localStorage.getItem("token");
    if (userCity?.lat && userCity?.lng) {
      fetch(
        `${API}/nearby-jobs?lat=${userCity.lat}&lng=${userCity.lng}&radius=10000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
        .then((r) => r.json())
        .then((d) => {
          setNearbyJobs(Array.isArray(d) ? d : []);
          setLoadingJobs(false);
        })
        .catch(() => setLoadingJobs(false));
    } else {
      fetch(`${API}/normal-jobs`)
        .then((r) => r.json())
        .then((d) => {
          const workerService = localStorage.getItem("workerService") || "";
          setNearbyJobs(
            Array.isArray(d)
              ? d.filter((j) => !workerService || j.service === workerService)
              : [],
          );
          setLoadingJobs(false);
        })
        .catch(() => setLoadingJobs(false));
    }
  }, [role, userCity]);

  function acceptNearbyJob(job) {
    const token = localStorage.getItem("token");
    setAcceptingId(job._id);
    fetch(`${API}/booking/${job._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })
      .then(() => {
        alert("Job Accepted ✅");
        setNearbyJobs((prev) => prev.filter((j) => j._id !== job._id));
        setSelectedJob(null);
      })
      .finally(() => setAcceptingId(null));
  }

  // ══════════════════════════════════════════════
  // CUSTOMER VIEW
  // ══════════════════════════════════════════════
  if (role !== "worker") {
    return (
      <>
        <h3 style={{ marginTop: "20px" }}>👷🏻 Nearby Workers</h3>

        {(!data || data.length === 0) && (
          <p style={{ color: "#aaa", fontSize: "13px", marginTop: "8px" }}>
            No workers available yet.
          </p>
        )}

        {data?.map((w, i) => {
          const rData = workerRatings[w._id];
          return (
            <div
              key={i}
              className="worker-premium"
              style={{ cursor: "pointer" }}
              onClick={() => setSelected(w)}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div className="worker-avatar">
                  {w.name?.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{w.name}</h3>
                  <p style={{ margin: "2px 0", fontSize: "13px" }}>
                    🔧 {w.service}
                  </p>
                  <StarDisplay
                    rating={rData?.avg || w.rating || 0}
                    count={rData?.count || 0}
                  />
                </div>
                <div style={{ textAlign: "right" }}>
                  {/* ✅ Changed: /hr → /work */}
                  <p
                    style={{
                      fontWeight: "bold",
                      color: "#ff3c00",
                      fontSize: "14px",
                      margin: 0,
                    }}
                  >
                    ₹{w.pricePerHour}/work
                  </p>
                  <p
                    style={{ fontSize: "11px", color: "#888", margin: "2px 0" }}
                  >
                    {w.jobs || 0} jobs
                  </p>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                📍 {w.location}
              </p>
            </div>
          );
        })}

        {/* WORKER DETAIL POPUP — phone hidden, Price/work shown */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "16px",
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#888",
                }}
              >
                ✕
              </button>

              <div className="modal-header">
                <div className="modal-avatar">
                  {selected.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{selected.name}</h3>
                  <p style={{ margin: "2px 0" }}>🔧 {selected.service}</p>
                  <StarDisplay
                    rating={
                      workerRatings[selected._id]?.avg || selected.rating || 0
                    }
                    count={workerRatings[selected._id]?.count || 0}
                  />
                </div>
              </div>

              <div className="modal-details">
                <div className="modal-row">
                  <span>📍 Location</span>
                  <strong>{selected.location || "N/A"}</strong>
                </div>
                <div className="modal-row">
                  <span>⭐ Rating</span>
                  <strong>{selected.rating || "New"}</strong>
                </div>
                <div className="modal-row">
                  <span>💼 Jobs Done</span>
                  <strong>{selected.jobs || 0}</strong>
                </div>
                {/* ✅ Changed: Price/hr → Price/work */}
                <div className="modal-row">
                  <span>💰 Price/work</span>
                  <strong>₹{selected.pricePerHour}</strong>
                </div>
                {/* ✅ Phone REMOVED — not shown to customers */}
              </div>

              <button
                className="btn primary"
                onClick={() => {
                  setSelected(null);
                  onBookWorker(selected);
                }}
              >
                Book This Worker ✅
              </button>
              <button className="btn dark" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ══════════════════════════════════════════════
  // WORKER VIEW — nearby normal jobs
  // ══════════════════════════════════════════════
  return (
    <>
      <h3 style={{ marginTop: "20px" }}>🗺️ Nearby Normal Jobs</h3>

      {!userCity && (
        <p
          style={{
            color: "#aaa",
            fontSize: "13px",
            marginTop: "6px",
            background: "#f9f9f9",
            padding: "10px",
            borderRadius: "10px",
          }}
        >
          📍 Set your location above to see nearby jobs
        </p>
      )}

      {loadingJobs && (
        <p style={{ color: "#aaa", fontSize: "13px", marginTop: "6px" }}>
          Loading nearby jobs...
        </p>
      )}

      {!loadingJobs && nearbyJobs.length === 0 && userCity && (
        <p style={{ color: "#aaa", fontSize: "13px", marginTop: "6px" }}>
          No normal jobs nearby right now.
        </p>
      )}

      {nearbyJobs.map((job) => (
        <div
          key={job._id}
          className="worker-premium"
          style={{ cursor: "pointer" }}
          onClick={() => setSelectedJob(job)}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontSize: "14px", margin: 0 }}>{job.service}</h3>
            <span
              style={{
                fontSize: "11px",
                background: "#fff8e0",
                color: "orange",
                padding: "3px 8px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              Normal
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
            {job.description?.slice(0, 60)}
            {job.description?.length > 60 ? "..." : ""}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
            }}
          >
            <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>
              📍 {job.location}
            </p>
            {/* ✅ Changed: /hr → /work for job listings too */}
            <p style={{ fontWeight: "bold", color: "#ff3c00", margin: 0 }}>
              ₹{job.finalPrice}
            </p>
          </div>
        </div>
      ))}

      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedJob(null)}
              style={{
                position: "absolute",
                top: "14px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#888",
              }}
            >
              ✕
            </button>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "36px" }}>📋</span>
              <h3 style={{ marginTop: "8px" }}>{selectedJob.service}</h3>
              <span
                style={{
                  fontSize: "11px",
                  background: "#fff8e0",
                  color: "orange",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}
              >
                Normal Job
              </span>
            </div>
            <div className="modal-details">
              <div className="modal-row">
                <span>📝 Description</span>
                <strong>{selectedJob.description}</strong>
              </div>
              <div className="modal-row">
                <span>📍 Location</span>
                <strong>{selectedJob.location}</strong>
              </div>
              <div className="modal-row">
                <span>💰 Budget</span>
                {/* ✅ Changed: removed /hr */}
                <strong>₹{selectedJob.finalPrice}</strong>
              </div>
            </div>
            <button
              className="btn primary"
              disabled={acceptingId === selectedJob._id}
              onClick={() => acceptNearbyJob(selectedJob)}
            >
              {acceptingId === selectedJob._id
                ? "Accepting..."
                : "✅ Accept This Job"}
            </button>
            <button
              className="btn dark"
              style={{ marginTop: "10px" }}
              onClick={() => setSelectedJob(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
