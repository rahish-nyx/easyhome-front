import { useState } from "react";

const API = "https://easyhome-back.onrender.com";

export default function AuthPage({ onLogin, isPopup = false }) {
  const [role, setRole] = useState("customer");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState(200);

  // Register OTP steps
  const [regStep, setRegStep] = useState(1); // 1=form, 2=otp verify
  const [regOtp, setRegOtp] = useState("");
  const [pendingApproval, setPendingApproval] = useState(false);

  function reset() {
    setError("");
    setRegStep(1);
    setRegOtp("");
    setPendingApproval(false);
  }

  // ── CUSTOMER LOGIN — email + password ───────────────
  async function handleCustomerLogin() {
    setError("");
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("userName", data.name);
      if (data.id) {
        localStorage.setItem("customerId", data.id);
        localStorage.setItem("workerId", data.id);
      }
      onLogin(data.role, data.name, data.id);
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  // ── CUSTOMER REGISTER — Step 1: send OTP ───────────
  async function handleSendRegisterOtp() {
    setError("");
    if (!name || !email || !password || !phone) {
      setError("All fields required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/customer/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, forRegister: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setRegStep(2);
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  // ── CUSTOMER REGISTER — Step 2: verify OTP then register ──
  async function handleVerifyAndRegister() {
    setError("");
    if (!regOtp) {
      setError("Enter OTP");
      return;
    }
    setLoading(true);
    try {
      // Verify OTP first
      const otpRes = await fetch(`${API}/customer/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: regOtp }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        setError(otpData.error);
        return;
      }

      // Now register
      const res = await fetch(`${API}/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("userName", data.name);
      if (data.id) {
        localStorage.setItem("customerId", data.id);
        localStorage.setItem("workerId", data.id);
      }
      onLogin(data.role, data.name, data.id);
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  // ── WORKER REGISTER ─────────────────────────────────
  async function handleWorkerRegister() {
    setError("");
    if (!name || !email || !password || !phone || !service) {
      setError("All fields required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/worker/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          service,
          location,
          pricePerHour: price,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      if (data.pending) setPendingApproval(true);
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  // ── WORKER LOGIN ─────────────────────────────────────
  async function handleWorkerLogin() {
    setError("");
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/worker/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.pending) {
          setPendingApproval(true);
          return;
        }
        setError(data.error);
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("userName", data.name);
      if (data.id) {
        localStorage.setItem("workerId", data.id);
        localStorage.setItem("customerId", data.id);
      }
      onLogin(data.role, data.name, data.id);
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  }

  // ── PENDING APPROVAL SCREEN ──────────────────────────
  if (pendingApproval) {
    return (
      <div
        className={isPopup ? "" : "container"}
        style={{ padding: isPopup ? "10px 0" : undefined }}
      >
        <div style={{ textAlign: "center", padding: "20px 10px" }}>
          <span style={{ fontSize: "56px" }}>⏳</span>
          <h3 style={{ marginTop: "12px", color: "#ff3c00" }}>
            Application Submitted!
          </h3>
          <p style={{ color: "#555", fontSize: "14px", lineHeight: 1.6 }}>
            Your worker account is under review.
            <br />
            Admin will verify your details and send an
            <br />
            <strong>approval email</strong> to your inbox.
          </p>
          <div
            style={{
              background: "#fff8f0",
              border: "1px solid #ffd0a0",
              borderRadius: "12px",
              padding: "14px",
              margin: "16px 0",
              textAlign: "left",
            }}
          >
            <p style={{ fontSize: "13px", margin: 0, color: "#888" }}>
              📧 Check: <strong>{email}</strong>
              <br />
              ⏱️ Usually approved within 24 hours
            </p>
          </div>
          <button
            className="btn dark"
            onClick={() => {
              setPendingApproval(false);
              setMode("login");
              reset();
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── OTP VERIFY SCREEN (register step 2) ─────────────
  if (role === "customer" && mode === "register" && regStep === 2) {
    return (
      <div
        className={isPopup ? "" : "container"}
        style={{ padding: isPopup ? "10px 0" : undefined }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <span style={{ fontSize: "40px" }}>📧</span>
          <h3 style={{ marginTop: "8px" }}>Verify Email</h3>
          <p style={{ color: "#888", fontSize: "13px" }}>
            OTP sent to <strong>{email}</strong>
          </p>
        </div>
        <input
          placeholder="Enter 6-digit OTP"
          value={regOtp}
          onChange={(e) =>
            setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          maxLength={6}
          style={{
            textAlign: "center",
            fontSize: "22px",
            letterSpacing: "8px",
            fontWeight: "bold",
          }}
        />
        {error && <p style={{ color: "red", fontSize: "13px" }}>❌ {error}</p>}
        <button
          className="btn primary"
          onClick={handleVerifyAndRegister}
          disabled={loading || regOtp.length < 6}
        >
          {loading ? "Verifying..." : "Verify & Create Account ✅"}
        </button>
        <button
          className="btn dark"
          style={{ marginTop: "10px" }}
          onClick={() => {
            setRegStep(1);
            setRegOtp("");
            setError("");
          }}
        >
          ← Change Details
        </button>
        <p
          style={{
            textAlign: "center",
            color: "#ff7a18",
            fontSize: "13px",
            marginTop: "12px",
            cursor: "pointer",
          }}
          onClick={handleSendRegisterOtp}
        >
          Resend OTP
        </p>
      </div>
    );
  }

  // ── MAIN FORM ─────────────────────────────────────────
  return (
    <div
      className={isPopup ? "" : "container"}
      style={{ padding: isPopup ? "10px 0" : undefined }}
    >
      {!isPopup && (
        <div
          style={{
            textAlign: "center",
            marginBottom: "10px",
            marginTop: "30px",
          }}
        >
          <span style={{ fontSize: "48px" }}>🏠</span>
          <h2 style={{ marginTop: "8px" }}>EasyHome</h2>
        </div>
      )}

      {/* ROLE SWITCHER */}
      <div className="role-switcher">
        <button
          className={role === "customer" ? "role-btn active" : "role-btn"}
          onClick={() => {
            setRole("customer");
            reset();
          }}
        >
          👤 Customer
        </button>
        <button
          className={role === "worker" ? "role-btn active" : "role-btn"}
          onClick={() => {
            setRole("worker");
            reset();
          }}
        >
          🔧 Worker
        </button>
      </div>

      <h2 style={{ marginTop: "16px" }}>
        {mode === "login" ? "Welcome Back 👋" : "Create Account"}
      </h2>
      <p style={{ color: "#888", fontSize: "13px", marginBottom: "10px" }}>
        {role === "customer"
          ? mode === "login"
            ? "Login with email & password"
            : "Register — OTP will verify your email"
          : mode === "login"
            ? "Login as Worker"
            : "Apply as Worker — Admin will approve"}
      </p>

      {/* ── CUSTOMER LOGIN ── */}
      {role === "customer" && mode === "login" && (
        <>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p style={{ color: "red", fontSize: "13px" }}>❌ {error}</p>
          )}
          <button
            className="btn primary"
            onClick={handleCustomerLogin}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </>
      )}

      {/* ── CUSTOMER REGISTER ── */}
      {role === "customer" && mode === "register" && regStep === 1 && (
        <>
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div
            style={{
              background: "#f0f8ff",
              borderRadius: "10px",
              padding: "10px 14px",
              marginTop: "8px",
            }}
          >
            <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
              🔐 An OTP will be sent to verify your email
            </p>
          </div>
          {error && (
            <p style={{ color: "red", fontSize: "13px" }}>❌ {error}</p>
          )}
          <button
            className="btn primary"
            onClick={handleSendRegisterOtp}
            disabled={loading}
          >
            {loading ? "Sending OTP..." : "Send OTP to Verify 📧"}
          </button>
        </>
      )}

      {/* ── WORKER LOGIN ── */}
      {role === "worker" && mode === "login" && (
        <>
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p style={{ color: "red", fontSize: "13px" }}>❌ {error}</p>
          )}
          <button
            className="btn primary"
            onClick={handleWorkerLogin}
            disabled={loading}
          >
            {loading ? "Please wait..." : "Login"}
          </button>
        </>
      )}

      {/* ── WORKER REGISTER ── */}
      {role === "worker" && mode === "register" && (
        <>
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Select Your Service</option>
            <option>Plumber</option>
            <option>Electrician</option>
            <option>Tutor</option>
            <option>Cleaner</option>
            <option>AC Repair</option>
            <option>Carpenter</option>
          </select>
          <input
            placeholder="Your Area / Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            type="number"
            placeholder="Price Per Work (₹ min 200)"
            min={200}
            value={price}
            onChange={(e) => setPrice(Math.max(200, Number(e.target.value)))}
          />
          <div
            style={{
              background: "#fff8f0",
              border: "1px solid #ffd0a0",
              borderRadius: "10px",
              padding: "10px 14px",
              marginTop: "8px",
            }}
          >
            <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>
              ⚠️ Your account needs <strong>admin approval</strong> before
              login. You'll get an email once approved.
            </p>
          </div>
          {error && (
            <p style={{ color: "red", fontSize: "13px" }}>❌ {error}</p>
          )}
          <button
            className="btn primary"
            onClick={handleWorkerRegister}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Application 📝"}
          </button>
        </>
      )}

      <p
        className="toggle-auth"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          reset();
        }}
      >
        {mode === "login"
          ? "Don't have an account? Register"
          : "Already have an account? Login"}
      </p>
    </div>
  );
}
