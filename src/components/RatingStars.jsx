import { useState, useEffect } from "react";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";

export default function RatingStars({ booking, user }) {
  const [rated, setRated] = useState(false);
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    // Check if already rated
    fetch(`${API}/rating/check/${booking._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setRated(data.rated));
  }, []);

  async function submitRating() {
    if (!selected) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workerId: booking.workerId,
          workerName: booking.worker,
          bookingId: booking._id,
          stars: selected,
        }),
      });

      if (res.ok) {
        setDone(true);
        setRated(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (rated || done) {
    return (
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span style={{ fontSize: "12px", color: "#888" }}>Your rating:</span>
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            style={{
              fontSize: "16px",
              color: s <= selected ? "#ff7a18" : "#ddd",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "10px",
        background: "#fff8f0",
        borderRadius: "10px",
        padding: "10px",
      }}
    >
      <p style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>
        Rate {booking.worker}'s work:
      </p>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            onClick={() => setSelected(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            style={{
              fontSize: "28px",
              cursor: "pointer",
              color: s <= (hover || selected) ? "#ff7a18" : "#ddd",
              transition: "0.15s",
            }}
          >
            ★
          </span>
        ))}
        {selected > 0 && (
          <button
            onClick={submitRating}
            disabled={submitting}
            style={{
              marginLeft: "8px",
              padding: "4px 12px",
              background: "#ff3c00",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {submitting ? "..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}
