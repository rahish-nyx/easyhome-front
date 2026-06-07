import { useState } from "react";

/* ── inject keyframes once ── */
const URGENT_CSS = `
@keyframes uj-pulse-border {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,69,0,0.5); }
  50%      { box-shadow: 0 0 0 8px rgba(255,69,0,0); }
}
@keyframes uj-badge-blink {
  0%,100% { opacity:1; }
  50%      { opacity:0.65; }
}
@keyframes uj-slide-in {
  from { opacity:0; transform:translateX(20px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes uj-fire {
  0%,100% { transform: scale(1) rotate(-3deg); }
  50%      { transform: scale(1.18) rotate(3deg); }
}
@keyframes uj-shimmer-line {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
`;
(function injectUrgentStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("uj-styles")) return;
  const s = document.createElement("style");
  s.id = "uj-styles";
  s.textContent = URGENT_CSS;
  document.head.appendChild(s);
})();

export default function UrgentJobs({
  data,
  urgentWorkers,
  onPost,
  role,
  onAcceptJob,
  onBookWorker,
}) {
  const jobs = Array.isArray(data) ? data : [];
  const workers = Array.isArray(urgentWorkers) ? urgentWorkers : [];
  const [selected, setSelected] = useState(null);

  /* nothing to show for guest */
  const hasContent =
    (role === "customer" && workers.length > 0) ||
    (role === "worker" && jobs.length > 0) ||
    !role;

  return (
    <div style={{ marginTop: "clamp(18px,3vw,28px)" }}>
      {/* ── SECTION HEADER ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "clamp(12px,2vw,18px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(8px,1.5vw,14px)",
          }}
        >
          {/* Fire icon with animation */}
          <div
            style={{
              width: "clamp(38px,5vw,50px)",
              height: "clamp(38px,5vw,50px)",
              background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
              borderRadius: "clamp(10px,1.5vw,14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(18px,2.8vw,26px)",
              boxShadow: "0 4px 14px rgba(255,69,0,0.45)",
              animation: "uj-pulse-border 2.5s ease-in-out infinite",
              flexShrink: 0,
            }}
          >
            🚨
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "clamp(15px,2.2vw,22px)",
                  fontWeight: 800,
                  color: "#1a1a1a",
                  letterSpacing: "-0.3px",
                }}
              >
                NEED NOW
              </h3>
              {/* Live badge */}
              <span
                style={{
                  background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
                  color: "white",
                  fontSize: "clamp(8px,1vw,11px)",
                  fontWeight: 800,
                  padding: "clamp(2px,0.4vw,4px) clamp(7px,1.2vw,10px)",
                  borderRadius: "20px",
                  letterSpacing: "0.5px",
                  animation: "uj-badge-blink 2s ease infinite",
                }}
              >
                LIVE
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "clamp(10px,1.2vw,13px)",
                color: "#888",
                marginTop: "2px",
              }}
            >
              {role === "customer"
                ? "Workers ready to help right now"
                : "Urgent jobs near you"}
            </p>
          </div>
        </div>

        {role === "customer" && (
          <button
            onClick={onPost}
            style={{
              background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
              color: "white",
              border: "none",
              padding: "clamp(8px,1.2vw,12px) clamp(14px,2vw,20px)",
              borderRadius: "clamp(10px,1.2vw,14px)",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "clamp(11px,1.3vw,14px)",
              boxShadow: "0 4px 14px rgba(255,69,0,0.4)",
              transition: "all 0.22s",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 22px rgba(255,69,0,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 14px rgba(255,69,0,0.4)";
            }}
          >
            + Post Urgent
          </button>
        )}
      </div>

      {/* ── CUSTOMER VIEW: urgent available workers ── */}
      {role === "customer" && (
        <>
          {workers.length === 0 ? (
            <EmptyState msg="No urgent workers available right now." />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(clamp(200px,28vw,280px), 1fr))",
                gap: "clamp(10px,1.8vw,18px)",
              }}
            >
              {workers.map((w, i) => (
                <WorkerUrgentCard
                  key={i}
                  worker={w}
                  delay={i * 0.07}
                  onClick={() => setSelected({ type: "worker", data: w })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── WORKER VIEW: urgent jobs posted ── */}
      {role === "worker" && (
        <>
          {jobs.length === 0 ? (
            <EmptyState msg="No urgent jobs posted right now." />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(clamp(200px,28vw,280px), 1fr))",
                gap: "clamp(10px,1.8vw,18px)",
              }}
            >
              {jobs.map((job, i) => (
                <JobUrgentCard
                  key={i}
                  job={job}
                  delay={i * 0.07}
                  onClick={() => setSelected({ type: "job", data: job })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* guest / no-role fallback */}
      {!role && <EmptyState msg="Login to see urgent workers near you." />}

      {/* ══ POPUP MODAL ══ */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* WORKER DETAIL */}
            {selected.type === "worker" && (
              <>
                {/* top accent strip */}
                <div
                  style={{
                    height: 6,
                    background: "linear-gradient(90deg,#ff7a18,#ff3c00)",
                    borderRadius: "4px 4px 0 0",
                    margin:
                      "calc(-1 * clamp(20px,3vw,36px)) calc(-1 * clamp(20px,3vw,36px)) clamp(16px,2.5vw,24px)",
                    marginTop: "calc(-1 * clamp(20px,3vw,36px))",
                  }}
                />

                <div className="modal-header">
                  <div
                    className="modal-avatar"
                    style={{ fontSize: "clamp(15px,2.2vw,22px)" }}
                  >
                    {selected.data.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "clamp(15px,2vw,20px)" }}>
                      {selected.data.name}
                    </h3>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "#ff4500",
                        fontWeight: 600,
                        fontSize: "clamp(12px,1.4vw,15px)",
                      }}
                    >
                      🔧 {selected.data.service}
                    </p>
                    <span
                      style={{
                        fontSize: "clamp(10px,1.1vw,12px)",
                        background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
                        color: "white",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontWeight: 700,
                      }}
                    >
                      🚨 URGENT
                    </span>
                  </div>
                </div>
                <div className="modal-details">
                  {[
                    ["📍 Location", selected.data.location || "N/A"],
                    ["⭐ Rating", selected.data.rating || "New"],
                    ["💼 Jobs Done", selected.data.jobs || 0],
                    ["💰 Price", `₹${selected.data.pricePerHour}/work`],
                    ["📞 Phone", selected.data.phone],
                  ].map(([label, val]) => (
                    <div className="modal-row" key={label}>
                      <span>{label}</span>
                      <strong>{val}</strong>
                    </div>
                  ))}
                </div>
                <button
                  className="btn primary"
                  onClick={() => {
                    setSelected(null);
                    onBookWorker(selected.data);
                  }}
                >
                  Book Now ✅
                </button>
                <button className="btn dark" onClick={() => setSelected(null)}>
                  Close
                </button>
              </>
            )}

            {/* JOB DETAIL */}
            {selected.type === "job" && (
              <>
                <div
                  style={{
                    height: 6,
                    background: "linear-gradient(90deg,#ff7a18,#ff3c00)",
                    borderRadius: "4px 4px 0 0",
                    margin:
                      "calc(-1 * clamp(20px,3vw,36px)) calc(-1 * clamp(20px,3vw,36px)) clamp(16px,2.5vw,24px)",
                    marginTop: "calc(-1 * clamp(20px,3vw,36px))",
                  }}
                />
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "clamp(14px,2.5vw,22px)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "clamp(36px,6vw,52px)",
                      animation: "uj-fire 1.5s ease-in-out infinite",
                      display: "inline-block",
                    }}
                  >
                    🚨
                  </span>
                  <h3
                    style={{
                      marginTop: "10px",
                      fontSize: "clamp(15px,2vw,20px)",
                    }}
                  >
                    {selected.data.title}
                  </h3>
                  <span
                    style={{
                      fontSize: "clamp(10px,1.1vw,12px)",
                      background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
                      color: "white",
                      padding: "3px 12px",
                      borderRadius: 20,
                      fontWeight: 700,
                    }}
                  >
                    URGENT 🔥
                  </span>
                </div>
                <div className="modal-details">
                  <div className="modal-row">
                    <span>📍 Location</span>
                    <strong>{selected.data.location}</strong>
                  </div>
                  <div className="modal-row">
                    <span>💰 Price</span>
                    <strong
                      style={{
                        color: "#ff4500",
                        fontSize: "clamp(15px,2vw,20px)",
                        fontWeight: 800,
                      }}
                    >
                      {selected.data.price}
                    </strong>
                  </div>
                </div>
                <button
                  className="btn primary"
                  onClick={() => {
                    onAcceptJob(selected.data);
                    setSelected(null);
                  }}
                >
                  Accept Job ✅
                </button>
                <button className="btn dark" onClick={() => setSelected(null)}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Worker urgent card ─────────────────────────────── */
function WorkerUrgentCard({ worker, delay, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "linear-gradient(135deg,#ff7a18,#ff3c00)"
          : "white",
        borderRadius: "clamp(14px,2vw,20px)",
        padding: "clamp(14px,2.2vw,22px)",
        cursor: "pointer",
        boxShadow: hovered
          ? "0 12px 32px rgba(255,69,0,0.45)"
          : "0 3px 14px rgba(0,0,0,0.08)",
        border: `2px solid ${hovered ? "transparent" : "#ffe8d6"}`,
        transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered
          ? "translateY(-6px) scale(1.02)"
          : "translateY(0) scale(1)",
        animation: `uj-slide-in 0.4s ease ${delay}s both`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* shimmer overlay when hovered */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
            backgroundSize: "200% auto",
            animation: "uj-shimmer-line 1.5s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* LIVE badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "clamp(10px,1.5vw,14px)",
        }}
      >
        <span
          style={{
            fontSize: "clamp(9px,1.1vw,11px)",
            fontWeight: 800,
            padding: "clamp(3px,0.5vw,5px) clamp(8px,1.2vw,12px)",
            borderRadius: 20,
            background: hovered
              ? "rgba(255,255,255,0.25)"
              : "linear-gradient(135deg,#ff7a18,#ff3c00)",
            color: "white",
            letterSpacing: "0.8px",
            animation: "uj-badge-blink 2s ease infinite",
          }}
        >
          🔴 LIVE
        </span>
        <span style={{ fontSize: "clamp(18px,2.8vw,26px)" }}>⚡</span>
      </div>

      {/* Avatar + name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(8px,1.2vw,12px)",
          marginBottom: "clamp(10px,1.5vw,14px)",
        }}
      >
        <div
          style={{
            width: "clamp(38px,5vw,50px)",
            height: "clamp(38px,5vw,50px)",
            background: hovered
              ? "rgba(255,255,255,0.25)"
              : "linear-gradient(135deg,#ff7a18,#ff3c00)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(14px,2vw,18px)",
            fontWeight: 800,
            color: "white",
            flexShrink: 0,
          }}
        >
          {worker.name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: "clamp(13px,1.7vw,17px)",
              color: hovered ? "white" : "#1a1a1a",
              lineHeight: 1.2,
            }}
          >
            {worker.name}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(11px,1.2vw,13px)",
              color: hovered ? "rgba(255,255,255,0.8)" : "#ff4500",
              fontWeight: 600,
            }}
          >
            🔧 {worker.service}
          </p>
        </div>
      </div>

      {/* Details row */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(4px,0.8vw,7px)",
          marginBottom: "clamp(12px,1.8vw,16px)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(11px,1.2vw,13px)",
            color: hovered ? "rgba(255,255,255,0.85)" : "#666",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>📍</span> {worker.location || "Nearby"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(11px,1.2vw,13px)",
            color: hovered ? "rgba(255,255,255,0.85)" : "#666",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span>⭐</span> {worker.rating || "New"} · {worker.jobs || 0} jobs
          done
        </p>
      </div>

      {/* Price */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(10px,1vw,12px)",
              color: hovered ? "rgba(255,255,255,0.7)" : "#aaa",
            }}
          >
            Starting from
          </p>
          <p
            style={{
              margin: 0,
              fontWeight: 900,
              fontSize: "clamp(16px,2.5vw,24px)",
              color: hovered ? "white" : "#ff3c00",
              lineHeight: 1,
            }}
          >
            ₹{worker.pricePerHour}/work
          </p>
        </div>
        <div
          style={{
            width: "clamp(30px,4vw,40px)",
            height: "clamp(30px,4vw,40px)",
            background: hovered ? "rgba(255,255,255,0.22)" : "#fff5f0",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(14px,2vw,18px)",
            transition: "all 0.25s",
            transform: hovered ? "scale(1.12)" : "scale(1)",
          }}
        >
          →
        </div>
      </div>
    </div>
  );
}

/* ── Job urgent card ────────────────────────────────── */
function JobUrgentCard({ job, delay, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "linear-gradient(135deg,#ff7a18,#ff3c00)"
          : "white",
        borderRadius: "clamp(14px,2vw,20px)",
        padding: "clamp(14px,2.2vw,22px)",
        cursor: "pointer",
        boxShadow: hovered
          ? "0 12px 32px rgba(255,69,0,0.45)"
          : "0 3px 14px rgba(0,0,0,0.08)",
        border: `2px solid ${hovered ? "transparent" : "#ffe8d6"}`,
        transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered
          ? "translateY(-6px) scale(1.02)"
          : "translateY(0) scale(1)",
        animation: `uj-slide-in 0.4s ease ${delay}s both`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* shimmer overlay */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
            backgroundSize: "200% auto",
            animation: "uj-shimmer-line 1.5s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "clamp(10px,1.5vw,16px)",
        }}
      >
        <span
          style={{
            fontSize: "clamp(9px,1.1vw,11px)",
            fontWeight: 800,
            padding: "clamp(3px,0.5vw,5px) clamp(8px,1.2vw,12px)",
            borderRadius: 20,
            background: hovered
              ? "rgba(255,255,255,0.25)"
              : "linear-gradient(135deg,#ff7a18,#ff3c00)",
            color: "white",
            letterSpacing: "0.8px",
            animation: "uj-badge-blink 2s ease infinite",
          }}
        >
          🔴 URGENT
        </span>
        <span
          style={{
            fontSize: "clamp(20px,3vw,28px)",
            animation: "uj-fire 1.5s ease-in-out infinite",
            display: "inline-block",
          }}
        >
          🚨
        </span>
      </div>

      {/* Job title */}
      <p
        style={{
          margin: "0 0 clamp(8px,1.2vw,12px)",
          fontWeight: 800,
          fontSize: "clamp(13px,1.8vw,18px)",
          color: hovered ? "white" : "#1a1a1a",
          lineHeight: 1.3,
        }}
      >
        {job.title}
      </p>

      {/* Location */}
      <p
        style={{
          margin: "0 0 clamp(12px,1.8vw,16px)",
          fontSize: "clamp(11px,1.2vw,13px)",
          color: hovered ? "rgba(255,255,255,0.85)" : "#666",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <span>📍</span> {job.location}
      </p>

      {/* Price + arrow */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontWeight: 900,
            fontSize: "clamp(18px,3vw,26px)",
            color: hovered ? "white" : "#ff3c00",
            lineHeight: 1,
          }}
        >
          {job.price}
        </p>
        <div
          style={{
            width: "clamp(30px,4vw,40px)",
            height: "clamp(30px,4vw,40px)",
            background: hovered ? "rgba(255,255,255,0.22)" : "#fff5f0",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(14px,2vw,18px)",
            transition: "all 0.25s",
          }}
        >
          →
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function EmptyState({ msg }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg,#fff8f0,#fff3e8)",
        border: "1.5px dashed #ffd0a0",
        borderRadius: "clamp(14px,2vw,20px)",
        padding: "clamp(20px,3.5vw,32px)",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "clamp(28px,5vw,40px)", opacity: 0.5 }}>🔕</span>
      <p
        style={{
          margin: "8px 0 0",
          color: "#aaa",
          fontSize: "clamp(12px,1.3vw,15px)",
        }}
      >
        {msg}
      </p>
    </div>
  );
}
