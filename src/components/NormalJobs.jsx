import { useState, useEffect } from "react";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";

export default function NormalJobs({
  userRole,
  userService,
  onAcceptJob,
  onLoginClick,
}) {
  const [jobs, setJobs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const services = [
    "All",
    "Plumber",
    "Electrician",
    "Tutor",
    "Cleaner",
    "AC Repair",
    "Carpenter",
  ];

  useEffect(() => {
    fetch(`${API}/normal-jobs`)
      .then((r) => r.json())
      .then((data) => {
        setJobs(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...jobs];

    // Filter by service chip
    if (activeFilter !== "All") {
      result = result.filter((j) => j.service === activeFilter);
    }

    // Filter by search text
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) =>
          j.service?.toLowerCase().includes(q) ||
          j.description?.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q),
      );
    }

    setFiltered(result);
  }, [jobs, search, activeFilter]);

  // Worker can accept only their own service category
  const canAccept = (job) =>
    userRole === "worker" && userService === job.service;

  return (
    <div style={{ marginTop: "20px" }}>
      {/* HEADER */}
      <h3 style={{ marginBottom: "12px" }}>📋 Normal Jobs</h3>

      {/* SEARCH BAR */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderRadius: "50px",
          padding: "8px 14px",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          marginBottom: "12px",
        }}
      >
        <span>🔍</span>
        <input
          placeholder="Search jobs, services, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "13px",
            background: "transparent",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#aaa",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* FILTER CHIPS */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
          marginBottom: "12px",
        }}
      >
        {services.map((s) => (
          <button
            key={s}
            onClick={() => setActiveFilter(s)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "2px solid",
              borderColor: activeFilter === s ? "#ff7a18" : "#eee",
              background:
                activeFilter === s
                  ? "linear-gradient(135deg, #ff7a18, #ff3c00)"
                  : "white",
              color: activeFilter === s ? "white" : "#555",
              fontSize: "12px",
              fontWeight: "bold",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "0.2s",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* JOBS */}
      {loading && (
        <p style={{ color: "#aaa", textAlign: "center" }}>Loading jobs...</p>
      )}

      {!loading && filtered.length === 0 && (
        <p
          style={{
            color: "#aaa",
            textAlign: "center",
            fontSize: "13px",
            padding: "20px 0",
          }}
        >
          No jobs found {search ? `for "${search}"` : ""}
        </p>
      )}

      <div style={{ display: "grid", gap: "10px" }}>
        {filtered.slice(0, 7).map((job) => (
          <div
            key={job._id}
            onClick={() => setSelectedJob(job)}
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "14px",
              boxShadow: "0 3px 10px rgba(0,0,0,0.07)",
              cursor: "pointer",
              transition: "0.2s",
              border: canAccept(job)
                ? "2px solid #ff7a18"
                : "2px solid transparent",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    background: "#fff8f0",
                    color: "#ff3c00",
                    padding: "3px 8px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {job.service}
                </span>
                {canAccept(job) && (
                  <span
                    style={{
                      fontSize: "10px",
                      background: "#e6ffed",
                      color: "green",
                      padding: "2px 6px",
                      borderRadius: "20px",
                    }}
                  >
                    ✅ Your Category
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: "#ff3c00",
                }}
              >
                ₹{job.finalPrice}/work
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#555", marginTop: "6px" }}>
              {job.description}
            </p>
            <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              📍 {job.location}
            </p>
          </div>
        ))}
      </div>

      {/* JOB DETAIL POPUP */}
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
                <span>💰 Price</span>
                <strong>₹{selectedJob.finalPrice}/work</strong>
              </div>
              <div className="modal-row">
                <span>⚡ Type</span>
                <strong>Normal Job</strong>
              </div>
            </div>

            {/* Worker can accept if their service matches */}
            {canAccept(selectedJob) && (
              <button
                className="btn primary"
                onClick={() => {
                  onAcceptJob(selectedJob);
                  setSelectedJob(null);
                }}
              >
                ✅ Accept This Job
              </button>
            )}

            {/* Customer/guest sees a note */}
            {userRole === "customer" && (
              <p
                style={{
                  textAlign: "center",
                  color: "#888",
                  fontSize: "12px",
                  marginTop: "10px",
                }}
              >
                This job was posted by another customer
              </p>
            )}

            {!userRole && (
              <button
                className="btn primary"
                onClick={() => {
                  setSelectedJob(null);
                  onLoginClick?.();
                }}
              >
                Login to Book or Accept
              </button>
            )}

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
    </div>
  );
}
