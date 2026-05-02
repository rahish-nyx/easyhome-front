export default function HowItWorks() {
  const steps = [
    { icon: "📍", title: "Set Location", desc: "Tell us where you are" },
    { icon: "🔍", title: "Find Service", desc: "Browse or search workers" },
    { icon: "📋", title: "Book Job", desc: "Post your requirement" },
    { icon: "✅", title: "Get it Done", desc: "Worker arrives & completes" },
  ];

  return (
    <div style={{ marginTop: "24px" }}>
      <h3 style={{ marginBottom: "14px" }}>⚙️ How It Works</h3>

      {/* STEPS */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              minWidth: "100px",
              background: "white",
              borderRadius: "16px",
              padding: "14px 10px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* STEP NUMBER */}
            <div
              style={{
                position: "absolute",
                top: "-1px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "20px",
                height: "20px",
                background: "linear-gradient(135deg, #ff7a18, #ff3c00)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontSize: "28px", marginTop: "8px" }}>
              {step.icon}
            </div>
            <p
              style={{ fontWeight: "bold", fontSize: "12px", marginTop: "6px" }}
            >
              {step.title}
            </p>
            <p style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* JOIN BOX */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          borderRadius: "20px",
          padding: "20px",
          marginTop: "16px",
          color: "white",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "32px" }}>🔧</span>
        <h3 style={{ marginTop: "8px", fontSize: "16px" }}>
          Are You a Skilled Worker?
        </h3>
        <p
          style={{
            fontSize: "12px",
            opacity: 0.75,
            marginTop: "4px",
            marginBottom: "14px",
          }}
        >
          Join hundreds of workers getting daily jobs on EasyHome
        </p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {["💰 Earn Daily", "📱 Easy App", "🏆 Build Ratings"].map((b) => (
            <span
              key={b}
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
