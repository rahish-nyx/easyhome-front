import { useState, useEffect } from "react";

const API = "https://easyhome-api.onrender.com";

// ── Inject keyframe animations once into <head> ──────────
const ANIM_CSS = `
@keyframes eh-float {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-10px); }
}
@keyframes eh-pulse-ring {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,165,0,0.45); }
  50%      { box-shadow: 0 0 0 16px rgba(255,165,0,0); }
}
@keyframes eh-shimmer {
  0%   { background-position: -300% center; }
  100% { background-position:  300% center; }
}
@keyframes eh-pop {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  60%  { transform: scale(1.28) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg);   opacity: 1; }
}
@keyframes eh-fade-up {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes eh-slide-right {
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes eh-spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes eh-orb1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(10px,-15px) scale(1.1); }
  66%     { transform: translate(-8px,8px) scale(0.95); }
}
@keyframes eh-orb2 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(-12px,10px) scale(1.08); }
}
@keyframes eh-glow {
  0%,100% { box-shadow: 0 8px 32px rgba(255,69,0,0.35); }
  50%      { box-shadow: 0 8px 52px rgba(255,120,0,0.65), 0 0 60px rgba(255,69,0,0.2); }
}
@keyframes eh-bounce-in {
  0%   { transform: scale(0.72); opacity: 0; }
  70%  { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
`;

function injectAnimStyles() {
  if (document.getElementById("eh-sub-anim")) return;
  const style = document.createElement("style");
  style.id = "eh-sub-anim";
  style.textContent = ANIM_CSS;
  document.head.appendChild(style);
}

// ── KEY CHANGE: wrap is now FULL WIDTH, matching .container ──
const wrap = {
  width: "100%",
  padding: "clamp(16px,3.5vw,28px) clamp(14px,3.5vw,28px) 90px",
  boxSizing: "border-box",
  animation: "eh-fade-up 0.4s ease both",
};

// ── Reusable back button ─────────────────────────────────
function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: "#ff4500",
        fontSize: "clamp(13px,1.5vw,16px)",
        cursor: "pointer",
        marginBottom: "clamp(16px,2.5vw,28px)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontWeight: "700",
        padding: 0,
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      ← Back
    </button>
  );
}

// ── Benefit item ─────────────────────────────────────────
function BenefitItem({ icon, text, iconBg, delay = 0, showCheck = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(12px,2vw,20px)",
        padding: "clamp(14px,2vw,22px)",
        background: "white",
        borderRadius: "clamp(14px,2vw,20px)",
        marginBottom: "clamp(10px,1.5vw,14px)",
        boxShadow: hovered
          ? "0 8px 28px rgba(0,0,0,0.1)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        border: `1.5px solid ${hovered ? "#ffd0a0" : "#f0f0f0"}`,
        animation: `eh-slide-right 0.4s ease ${delay}s both`,
        transform: hovered ? "translateX(8px)" : "translateX(0)",
        transition: "transform 0.22s, box-shadow 0.22s, border-color 0.22s",
        cursor: "default",
        width: "100%",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: "clamp(44px,6vw,68px)",
          height: "clamp(44px,6vw,68px)",
          background: iconBg || "#fff5f0",
          borderRadius: "clamp(12px,1.5vw,18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(22px,3.5vw,34px)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "clamp(13px,1.5vw,17px)",
          color: "#333",
          lineHeight: 1.55,
          fontWeight: "500",
          flex: 1,
        }}
      >
        {text}
      </p>
      {showCheck && (
        <span
          style={{
            marginLeft: "auto",
            color: "#28a745",
            fontSize: "clamp(18px,2vw,24px)",
            flexShrink: 0,
            fontWeight: "700",
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}

// ── Step number circle ───────────────────────────────────
function StepCircle({ n }) {
  return (
    <div
      style={{
        width: "clamp(28px,3.5vw,40px)",
        height: "clamp(28px,3.5vw,40px)",
        background: "linear-gradient(135deg,#ff7a18,#ff4500)",
        color: "white",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "clamp(12px,1.4vw,16px)",
        fontWeight: "800",
        flexShrink: 0,
        boxShadow: "0 3px 10px rgba(255,69,0,0.32)",
      }}
    >
      {n}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════
export default function SubscriptionPage({ user, onBack }) {
  const [mySub, setMySub] = useState(null);
  const [adminUpi, setAdminUpi] = useState("admin@easyhome.upi");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [note, setNote] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noteHasFocus, setNoteHasFocus] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const isWorker = user?.role === "worker";
  const price = 199;

  useEffect(() => {
    injectAnimStyles();
    Promise.all([
      fetch(`${API}/subscription/my`, { headers })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API}/subscription/upi`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([sub, upiData]) => {
      setMySub(sub);
      if (upiData?.upi) setAdminUpi(upiData.upi);
      setLoading(false);
    });
  }, []);

  const workerBenefits = [
    {
      text: "No 10% commission deducted on completed jobs",
      icon: "💰",
      bg: "#fff8f0",
    },
    {
      text: "Listed first — high visibility to customers",
      icon: "📈",
      bg: "#f0fff4",
    },
    {
      text: "Auto-listed in Urgent (Need Now) for full month",
      icon: "🚨",
      bg: "#fff0f0",
    },
    {
      text: "Premium badge shown on your worker card",
      icon: "👑",
      bg: "#fffde7",
    },
  ];
  const customerBenefits = [
    {
      text: "Up to 3 days free service check by expert workers",
      icon: "⚡",
      bg: "#e8f4fd",
    },
    {
      text: "Fast acceptance of your booked services",
      icon: "🚀",
      bg: "#f0fff4",
    },
    { text: "Priority support from EasyHome team", icon: "🌟", bg: "#fffde7" },
    { text: "Premium badge on your profile", icon: "🏷️", bg: "#f3e5f5" },
  ];

  const planGradFrom = isWorker ? "#ff7a18" : "#1565c0";
  const planGradTo = isWorker ? "#ff3c00" : "#0056cc";
  const planColor = isWorker ? "#ff4500" : "#007bff";
  const planGrad = `linear-gradient(135deg, ${planGradFrom}, ${planGradTo})`;
  const planIcon = isWorker ? "🔧" : "👤";
  const planTitle = isWorker ? "Worker Premium" : "Customer Premium";
  const benefits = isWorker ? workerBenefits : customerBenefits;

  async function requestSubscription() {
    setRequesting(true);
    try {
      const res = await fetch(`${API}/subscription/request`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotNote: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setMySub(data);
      setStep(3);
    } catch {
      alert("Something went wrong");
    } finally {
      setRequesting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(adminUpi).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // ── LOADING ──────────────────────────────────────────
  if (loading)
    return (
      <div style={{ ...wrap, textAlign: "center", paddingTop: "80px" }}>
        <div
          style={{
            fontSize: "48px",
            animation: "eh-spin-slow 1.2s linear infinite",
            display: "inline-block",
          }}
        >
          ⏳
        </div>
        <p
          style={{
            color: "#aaa",
            marginTop: "16px",
            fontSize: "15px",
            fontWeight: "500",
          }}
        >
          Loading your plan...
        </p>
      </div>
    );

  // ── ACTIVE ───────────────────────────────────────────
  if (mySub?.status === "active") {
    const daysLeft = mySub.endDate
      ? Math.max(
          0,
          Math.ceil((new Date(mySub.endDate) - new Date()) / 86400000),
        )
      : 0;
    return (
      <div style={wrap}>
        <BackBtn onClick={onBack} />

        {/* ACTIVE HERO — full width */}
        <div
          style={{
            background: planGrad,
            borderRadius: "clamp(20px,3vw,32px)",
            padding: "clamp(28px,5vw,60px) clamp(24px,5vw,60px)",
            color: "white",
            textAlign: "center",
            marginBottom: "clamp(20px,3vw,36px)",
            position: "relative",
            overflow: "hidden",
            animation:
              "eh-glow 3s ease-in-out infinite, eh-bounce-in 0.5s ease both",
            width: "100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-30%",
              right: "-10%",
              width: "clamp(120px,22vw,260px)",
              height: "clamp(120px,22vw,260px)",
              background: "rgba(255,255,255,0.09)",
              borderRadius: "50%",
              animation: "eh-orb1 6s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-25%",
              left: "-8%",
              width: "clamp(90px,16vw,200px)",
              height: "clamp(90px,16vw,200px)",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "50%",
              animation: "eh-orb2 8s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              fontSize: "clamp(52px,8vw,90px)",
              animation: "eh-float 3s ease-in-out infinite",
              position: "relative",
              zIndex: 1,
              display: "block",
            }}
          >
            👑
          </div>
          <h2
            style={{
              margin: "12px 0 6px",
              position: "relative",
              zIndex: 1,
              fontSize: "clamp(20px,3.5vw,40px)",
            }}
          >
            Premium Active!
          </h2>
          <p
            style={{
              opacity: 0.88,
              position: "relative",
              zIndex: 1,
              margin: "0 0 24px",
              fontSize: "clamp(13px,1.6vw,20px)",
            }}
          >
            You're a premium member
          </p>

          {/* Days ring */}
          <div
            style={{
              width: "clamp(100px,14vw,160px)",
              height: "clamp(100px,14vw,160px)",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              border: "3px solid rgba(255,255,255,0.45)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              backdropFilter: "blur(8px)",
              animation: "eh-pulse-ring 3s ease-in-out infinite",
              position: "relative",
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: "clamp(30px,5vw,52px)",
                fontWeight: "900",
                lineHeight: 1,
              }}
            >
              {daysLeft}
            </span>
            <span
              style={{
                fontSize: "clamp(11px,1.2vw,14px)",
                opacity: 0.85,
                marginTop: "2px",
              }}
            >
              days left
            </span>
          </div>

          <p
            style={{
              fontSize: "clamp(12px,1.2vw,15px)",
              opacity: 0.72,
              position: "relative",
              zIndex: 1,
              margin: 0,
            }}
          >
            Expires {new Date(mySub.endDate).toDateString()}
          </p>
        </div>

        <h4
          style={{
            marginBottom: "clamp(12px,2vw,20px)",
            color: "#222",
            fontSize: "clamp(14px,1.8vw,20px)",
          }}
        >
          ✅ Your Active Benefits
        </h4>
        {benefits.map((b, i) => (
          <BenefitItem
            key={i}
            icon={b.icon}
            text={b.text}
            iconBg={b.bg}
            delay={i * 0.07}
            showCheck
          />
        ))}
      </div>
    );
  }

  // ── PENDING ──────────────────────────────────────────
  if (mySub?.status === "pending")
    return (
      <div style={wrap}>
        <BackBtn onClick={onBack} />
        <div
          style={{
            textAlign: "center",
            padding: "clamp(32px,6vw,64px) clamp(20px,5vw,60px)",
            background: "linear-gradient(135deg,#fff8f0,#fff3e8)",
            borderRadius: "clamp(18px,3vw,32px)",
            border: "1.5px solid #ffd0a0",
            boxShadow: "0 8px 32px rgba(255,120,0,0.12)",
            animation: "eh-fade-up 0.5s ease both",
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: "clamp(52px,8vw,80px)",
              animation: "eh-float 2.5s ease-in-out infinite",
              display: "block",
            }}
          >
            ⏳
          </div>
          <h3
            style={{
              marginTop: "18px",
              color: "#ff4500",
              fontSize: "clamp(18px,2.5vw,30px)",
            }}
          >
            Payment Under Review
          </h3>
          <p
            style={{
              color: "#666",
              fontSize: "clamp(13px,1.5vw,18px)",
              lineHeight: 1.8,
              marginTop: "12px",
            }}
          >
            Your payment request is submitted.
            <br />
            Admin will verify and activate your
            <br />
            premium within <strong>24 hours</strong>.
          </p>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "clamp(14px,2vw,22px)",
              marginTop: "22px",
              border: "1px solid #eee",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <p
              style={{
                fontSize: "clamp(12px,1.3vw,16px)",
                color: "#888",
                margin: 0,
              }}
            >
              📅 Submitted: {new Date(mySub.createdAt).toDateString()}
            </p>
            <p
              style={{
                fontSize: "clamp(12px,1.3vw,16px)",
                color: "#888",
                margin: 0,
              }}
            >
              ✉️ Email notification on activation
            </p>
          </div>
        </div>
      </div>
    );

  // ── STEP 1 — PLAN ────────────────────────────────────
  if (step === 1)
    return (
      <div style={wrap}>
        <BackBtn onClick={onBack} />

        {/* PLAN HERO — full width */}
        <div
          style={{
            background: planGrad,
            borderRadius: "clamp(20px,3vw,32px)",
            padding: "clamp(28px,5vw,60px) clamp(24px,5vw,60px)",
            color: "white",
            textAlign: "center",
            marginBottom: "clamp(20px,3vw,32px)",
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 12px 40px ${planColor}55`,
            animation: "eh-fade-up 0.4s ease both",
            width: "100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40%",
              right: "-15%",
              width: "clamp(150px,22vw,280px)",
              height: "clamp(150px,22vw,280px)",
              background: "rgba(255,255,255,0.09)",
              borderRadius: "50%",
              animation: "eh-orb1 7s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-30%",
              left: "-10%",
              width: "clamp(110px,16vw,210px)",
              height: "clamp(110px,16vw,210px)",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "50%",
              animation: "eh-orb2 9s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              fontSize: "clamp(48px,8vw,90px)",
              animation: "eh-float 3s ease-in-out infinite",
              position: "relative",
              zIndex: 1,
              display: "block",
            }}
          >
            {planIcon}
          </div>
          <h2
            style={{
              margin: "12px 0 6px",
              fontSize: "clamp(20px,3.5vw,40px)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {planTitle}
          </h2>
          <p
            style={{
              opacity: 0.88,
              fontSize: "clamp(12px,1.5vw,18px)",
              position: "relative",
              zIndex: 1,
              marginBottom: "clamp(14px,2.5vw,28px)",
            }}
          >
            Unlock all premium features
          </p>

          {/* Price badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: "6px",
              background: "rgba(255,255,255,0.17)",
              borderRadius: "clamp(18px,3vw,28px)",
              padding: "clamp(10px,1.5vw,16px) clamp(24px,4vw,44px)",
              backdropFilter: "blur(10px)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <span
              style={{
                fontSize: "clamp(32px,6vw,70px)",
                fontWeight: "900",
                letterSpacing: "-1px",
              }}
            >
              ₹{price}
            </span>
            <span style={{ fontSize: "clamp(13px,1.6vw,20px)", opacity: 0.85 }}>
              /month
            </span>
          </div>
        </div>

        {/* Benefits header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "clamp(12px,2vw,20px)",
          }}
        >
          <h4
            style={{
              color: "#222",
              fontSize: "clamp(14px,1.8vw,22px)",
              margin: 0,
            }}
          >
            ⭐ Premium Benefits
          </h4>
          <span
            style={{
              fontSize: "clamp(11px,1.1vw,14px)",
              background: "#e8f5e9",
              color: "#2e7d32",
              padding: "clamp(3px,0.5vw,6px) clamp(10px,1.5vw,16px)",
              borderRadius: "20px",
              fontWeight: "700",
            }}
          >
            All included ✓
          </span>
        </div>

        {benefits.map((b, i) => (
          <BenefitItem
            key={i}
            icon={b.icon}
            text={b.text}
            iconBg={b.bg}
            delay={i * 0.08}
          />
        ))}

        {/* CTA — full width shimmer button */}
        <button
          onClick={() => setStep(2)}
          style={{
            width: "100%",
            padding: "clamp(16px,2.5vw,24px)",
            background: `linear-gradient(90deg, ${planGradFrom}, ${planGradTo}, ${planGradFrom}aa, ${planGradTo}, ${planGradFrom})`,
            backgroundSize: "300% auto",
            animation: "eh-shimmer 2.5s linear infinite",
            color: "white",
            border: "none",
            borderRadius: "clamp(14px,2.5vw,22px)",
            cursor: "pointer",
            fontWeight: "800",
            fontSize: "clamp(15px,2vw,22px)",
            marginTop: "clamp(20px,3vw,32px)",
            boxShadow: `0 8px 28px ${planColor}55`,
            transition: "transform 0.22s, box-shadow 0.22s",
            letterSpacing: "0.02em",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px) scale(1.01)";
            e.currentTarget.style.boxShadow = `0 16px 40px ${planColor}77`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0) scale(1)";
            e.currentTarget.style.boxShadow = `0 8px 28px ${planColor}55`;
          }}
        >
          Get Premium — ₹{price}/month 🚀
        </button>

        <p
          style={{
            textAlign: "center",
            fontSize: "clamp(11px,1.1vw,13px)",
            color: "#bbb",
            marginTop: "10px",
          }}
        >
          🔒 Secure UPI payment · Manual verification within 24hrs
        </p>
      </div>
    );

  // ── STEP 2 — PAYMENT ─────────────────────────────────
  if (step === 2)
    return (
      <div style={wrap}>
        <BackBtn onClick={() => setStep(1)} />

        <div style={{ animation: "eh-fade-up 0.4s ease both", width: "100%" }}>
          <h3
            style={{
              fontSize: "clamp(18px,2.8vw,32px)",
              fontWeight: "800",
              margin: "0 0 6px",
            }}
          >
            💳 Complete Payment
          </h3>
          <p
            style={{
              color: "#888",
              fontSize: "clamp(13px,1.4vw,18px)",
              marginBottom: "clamp(18px,3vw,32px)",
            }}
          >
            Pay ₹{price} to activate your premium plan
          </p>

          {/* UPI CARD — full width */}
          <div
            style={{
              background: "white",
              borderRadius: "clamp(16px,2.5vw,28px)",
              padding: "clamp(18px,3vw,36px)",
              boxShadow: "0 6px 24px rgba(0,0,0,0.09)",
              marginBottom: "clamp(16px,2.5vw,28px)",
              border: "1.5px solid #f0f0f0",
              width: "100%",
            }}
          >
            <p
              style={{
                color: "#aaa",
                fontSize: "clamp(11px,1.1vw,13px)",
                margin: "0 0 clamp(12px,2vw,18px)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                fontWeight: "600",
              }}
            >
              Pay to UPI
            </p>

            {/* UPI ID row */}
            <div
              style={{
                background: "linear-gradient(135deg,#fff8f0,#fff5f0)",
                borderRadius: "clamp(10px,1.5vw,16px)",
                padding: "clamp(14px,2vw,22px)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "clamp(10px,2vw,20px)",
                marginBottom: "clamp(12px,2vw,18px)",
                border: "1px solid #ffd0a0",
              }}
            >
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p
                  style={{
                    fontSize: "clamp(15px,2vw,24px)",
                    fontWeight: "800",
                    color: "#ff4500",
                    margin: 0,
                    wordBreak: "break-all",
                  }}
                >
                  {adminUpi}
                </p>
                <p
                  style={{
                    fontSize: "clamp(11px,1.1vw,13px)",
                    color: "#aaa",
                    margin: "4px 0 0",
                  }}
                >
                  EasyHome Premium
                </p>
              </div>
              <button
                onClick={handleCopy}
                style={{
                  background: copied
                    ? "linear-gradient(135deg,#28a745,#20c053)"
                    : "linear-gradient(135deg,#ff7a18,#ff4500)",
                  color: "white",
                  border: "none",
                  padding: "clamp(9px,1.5vw,14px) clamp(16px,2.5vw,28px)",
                  borderRadius: "clamp(10px,1.5vw,14px)",
                  cursor: "pointer",
                  fontSize: "clamp(12px,1.4vw,16px)",
                  fontWeight: "700",
                  flexShrink: 0,
                  transition: "all 0.25s",
                  boxShadow: "0 3px 10px rgba(255,69,0,0.25)",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                {copied ? "✓ Copied!" : "Copy ID"}
              </button>
            </div>

            {/* Amount row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "clamp(14px,2vw,22px)",
                background: "linear-gradient(135deg,#fff8f0,#fff3e8)",
                borderRadius: "clamp(10px,1.5vw,16px)",
                border: "1px solid #ffd0a0",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(14px,1.6vw,20px)",
                  color: "#666",
                  fontWeight: "500",
                }}
              >
                Amount to Pay
              </span>
              <span
                style={{
                  fontWeight: "900",
                  fontSize: "clamp(22px,3.5vw,44px)",
                  color: "#ff4500",
                }}
              >
                ₹{price}
              </span>
            </div>
          </div>

          {/* HOW TO PAY */}
          <div
            style={{
              background: "white",
              borderRadius: "clamp(14px,2.5vw,24px)",
              padding: "clamp(16px,2.5vw,32px)",
              marginBottom: "clamp(14px,2.5vw,28px)",
              boxShadow: "0 3px 14px rgba(0,0,0,0.06)",
              border: "1px solid #f5f5f5",
              width: "100%",
            }}
          >
            <h5
              style={{
                margin: "0 0 clamp(14px,2vw,22px)",
                color: "#333",
                fontSize: "clamp(13px,1.5vw,18px)",
              }}
            >
              📋 How to Pay
            </h5>
            {[
              "Open any UPI app (PhonePe, GPay, Paytm etc.)",
              `Send ₹${price} to: ${adminUpi}`,
              "Note your Transaction ID",
              "Tap 'I Have Paid' — admin activates within 24 hrs",
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "clamp(12px,2vw,20px)",
                  alignItems: "flex-start",
                  marginBottom: i < 3 ? "clamp(12px,1.8vw,18px)" : "0",
                }}
              >
                <StepCircle n={i + 1} />
                <p
                  style={{
                    fontSize: "clamp(13px,1.4vw,17px)",
                    color: "#555",
                    margin: 0,
                    paddingTop: "clamp(4px,0.6vw,6px)",
                    lineHeight: 1.55,
                  }}
                >
                  {s}
                </p>
              </div>
            ))}
          </div>

          {/* NOTE INPUT */}
          <input
            placeholder="Transaction ID or payment note (recommended)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onFocus={() => setNoteHasFocus(true)}
            onBlur={() => setNoteHasFocus(false)}
            style={{
              width: "100%",
              padding: "clamp(13px,1.8vw,18px) clamp(15px,2vw,22px)",
              borderRadius: "clamp(12px,1.5vw,16px)",
              border: `1.5px solid ${noteHasFocus ? "#ff7a18" : "#e8e8e8"}`,
              boxShadow: noteHasFocus
                ? "0 0 0 3px rgba(255,122,24,0.15)"
                : "none",
              fontSize: "clamp(13px,1.4vw,17px)",
              marginBottom: "clamp(14px,2vw,22px)",
              boxSizing: "border-box",
              fontFamily: "inherit",
              outline: "none",
              transition: "border-color 0.22s, box-shadow 0.22s",
              background: "white",
              marginTop: 0,
            }}
          />

          {/* SUBMIT BUTTON */}
          <button
            onClick={requestSubscription}
            disabled={requesting}
            style={{
              width: "100%",
              padding: "clamp(16px,2.5vw,24px)",
              background: requesting
                ? "#ccc"
                : "linear-gradient(135deg,#28a745,#20c053)",
              color: "white",
              border: "none",
              borderRadius: "clamp(14px,2.5vw,22px)",
              cursor: requesting ? "default" : "pointer",
              fontWeight: "800",
              fontSize: "clamp(15px,2vw,22px)",
              boxShadow: requesting
                ? "none"
                : "0 8px 24px rgba(40,167,69,0.35)",
              transition: "all 0.25s",
              letterSpacing: "0.02em",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              if (!requesting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 14px 36px rgba(40,167,69,0.45)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = requesting
                ? "none"
                : "0 8px 24px rgba(40,167,69,0.35)";
            }}
          >
            {requesting ? "Submitting..." : "✅ I Have Paid — Submit Request"}
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "clamp(11px,1.1vw,13px)",
              color: "#ccc",
              marginTop: "12px",
            }}
          >
            🛡️ Verified by our admin team within 24 hours
          </p>
        </div>
      </div>
    );

  // ── STEP 3 — SUCCESS ─────────────────────────────────
  return (
    <div style={{ ...wrap, textAlign: "center" }}>
      <div
        style={{
          padding: "clamp(36px,6vw,72px) clamp(24px,5vw,60px)",
          background: "linear-gradient(135deg,#f0fff4,#e8f5e9)",
          borderRadius: "clamp(20px,3vw,32px)",
          border: "1.5px solid #b2dfdb",
          boxShadow: "0 12px 40px rgba(40,167,69,0.14)",
          animation: "eh-bounce-in 0.5s ease both",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "clamp(60px,10vw,110px)",
            display: "block",
            animation: "eh-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          🎉
        </span>
        <h2
          style={{
            color: "#2e7d32",
            marginTop: "20px",
            fontSize: "clamp(22px,3.5vw,42px)",
            animation: "eh-fade-up 0.5s ease 0.2s both",
          }}
        >
          Request Submitted!
        </h2>
        <p
          style={{
            color: "#555",
            fontSize: "clamp(14px,1.6vw,20px)",
            lineHeight: 1.8,
            marginTop: "12px",
            animation: "eh-fade-up 0.5s ease 0.3s both",
          }}
        >
          Your payment request has been submitted.
          <br />
          Admin will verify and activate your
          <br />
          premium within <strong>24 hours</strong>.
        </p>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "clamp(16px,2.5vw,28px)",
            marginTop: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            animation: "eh-fade-up 0.5s ease 0.4s both",
          }}
        >
          <p
            style={{
              fontSize: "clamp(13px,1.4vw,18px)",
              color: "#888",
              margin: 0,
            }}
          >
            ✉️ Email when activated
          </p>
          <p
            style={{
              fontSize: "clamp(13px,1.4vw,18px)",
              color: "#888",
              margin: 0,
            }}
          >
            ⏱️ Usually within 1–24 hours
          </p>
        </div>
      </div>

      <button
        onClick={onBack}
        style={{
          marginTop: "clamp(18px,3vw,32px)",
          padding: "clamp(14px,2vw,22px) clamp(32px,6vw,70px)",
          background: "linear-gradient(135deg,#ff7a18,#ff4500)",
          color: "white",
          border: "none",
          borderRadius: "clamp(14px,2vw,20px)",
          cursor: "pointer",
          fontWeight: "700",
          fontSize: "clamp(14px,1.8vw,20px)",
          boxShadow: "0 6px 20px rgba(255,69,0,0.32)",
          transition: "all 0.22s",
          animation: "eh-fade-up 0.5s ease 0.5s both",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(255,69,0,0.42)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(255,69,0,0.32)";
        }}
      >
        Back to App 🏠
      </button>
    </div>
  );
}
