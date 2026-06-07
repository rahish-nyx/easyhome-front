export default function SearchResults({
  query,
  workers,
  services,
  onBookWorker,
  onSelectService,
  user,
}) {
  if (!query?.trim()) return null;

  const q = query.toLowerCase();

  const matchedWorkers = workers.filter(
    (w) =>
      w.name?.toLowerCase().includes(q) ||
      w.service?.toLowerCase().includes(q) ||
      w.location?.toLowerCase().includes(q),
  );

  const matchedServices = services.filter((s) =>
    s.name?.toLowerCase().includes(q),
  );

  const total = matchedWorkers.length + matchedServices.length;

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        padding: "16px",
        marginTop: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        border: "1px solid #f0f0f0",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>
          🔍 Results for "{query}"
        </p>
        <span style={{ fontSize: "12px", color: "#888" }}>{total} found</span>
      </div>

      {total === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <span style={{ fontSize: "36px" }}>🔎</span>
          <p style={{ color: "#aaa", fontSize: "13px", marginTop: "8px" }}>
            No results found for "{query}"
          </p>
        </div>
      )}

      {/* MATCHED SERVICES */}
      {matchedServices.length > 0 && (
        <>
          <p
            style={{
              fontSize: "12px",
              color: "#888",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            📂 Services
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            {matchedServices.map((s, i) => (
              <div
                key={i}
                onClick={() => onSelectService?.(s)}
                style={{
                  background: "linear-gradient(135deg, #ff7a18, #ff3c00)",
                  color: "white",
                  borderRadius: "20px",
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{s.icon}</span> {s.name}
              </div>
            ))}
          </div>
        </>
      )}

      {/* MATCHED WORKERS */}
      {matchedWorkers.length > 0 && (
        <>
          <p
            style={{
              fontSize: "12px",
              color: "#888",
              marginBottom: "8px",
              fontWeight: "bold",
            }}
          >
            👷 Workers
          </p>
          {matchedWorkers.slice(0, 5).map((w, i) => (
            <div
              key={i}
              onClick={() => onBookWorker?.(w)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px",
                background: "#f9f9f9",
                borderRadius: "12px",
                marginBottom: "8px",
                cursor: "pointer",
                transition: "0.2s",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "linear-gradient(135deg, #ff7a18, #ff3c00)",
                  borderRadius: "50%",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: "14px",
                  flexShrink: 0,
                }}
              >
                {w.name?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>
                  {w.name}
                </p>
                <p style={{ fontSize: "12px", color: "#888", margin: "2px 0" }}>
                  🔧 {w.service} • 📍 {w.location}
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: "11px",
                        color:
                          s <= Math.round(w.rating || 0) ? "#ff7a18" : "#ddd",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    fontWeight: "bold",
                    color: "#ff3c00",
                    fontSize: "13px",
                    margin: 0,
                  }}
                >
                  ₹{w.pricePerHour}/work
                </p>
                <p style={{ fontSize: "11px", color: "#888", margin: "2px 0" }}>
                  {w.jobs || 0} jobs
                </p>
              </div>
            </div>
          ))}
          {matchedWorkers.length > 5 && (
            <p
              style={{
                textAlign: "center",
                color: "#ff7a18",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              +{matchedWorkers.length - 5} more workers
            </p>
          )}
        </>
      )}
    </div>
  );
}
