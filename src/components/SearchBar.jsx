export default function SearchBar({
  search,
  setSearch,
  activeFilter,
  setActiveFilter,
  role,
}) {
  const services = [
    "All",
    "Plumber",
    "Electrician",
    "Tutor",
    "Cleaner",
    "AC Repair",
    "Carpenter",
  ];

  return (
    <div style={{ marginTop: "12px", marginBottom: "4px" }}>
      {/* SEARCH INPUT */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderRadius: "50px",
          padding: "10px 16px",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
        }}
      >
        <span style={{ fontSize: "16px" }}>🔍</span>
        <input
          placeholder={
            role === "worker" ? "Search jobs..." : "Search workers, services..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "14px",
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
          paddingBottom: "4px",
          marginTop: "10px",
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
              flexShrink: 0,
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
