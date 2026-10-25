import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCatalogue } from "../context/CatalogueContext";
import { useLocation } from "../context/LocationContext";
import { useToast } from "../context/ToastContext";
import { SERVICE_META } from "../lib/constants";
import { usePageMeta } from "../lib/usePageMeta";
import { Button, Field, Input, PageLoader, Select } from "../components/ui";
import logo from "../assets/logo.png";

const FIREBASE_ERRORS = {
  "auth/invalid-email": "That email address does not look right.",
  "auth/user-not-found": "No account with that email. Try creating one.",
  "auth/wrong-password": "Incorrect password. Try again or reset it.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "That email is already registered. Sign in instead.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
  "auth/popup-blocked": "Your browser blocked the Google popup. Allow popups and retry.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase yet.",
};

function friendly(error) {
  return FIREBASE_ERRORS[error?.code] || error?.message || "Something went wrong. Try again.";
}

export default function Auth() {
  usePageMeta("Sign in", "Sign in or create your EasyHome account to book verified home services.");

  const [params, setParams] = useSearchParams();
  const nextParam = params.get("next") || "";
  const next = nextParam.startsWith("/") ? nextParam : "";
  const rawRole = params.get("role");
  const roleParam = rawRole === "worker" ? "worker" : rawRole === "customer" ? "customer" : "";
  const modeParam = params.get("mode") === "signup" ? "signup" : "signin";

  const {
    fbUser,
    profile,
    loading,
    signIn,
    signUp,
    googleSignIn,
    resetPassword,
    resendVerification,
    refreshClaims,
    logout,
    emailVerified,
  } = useAuth();
  const { services } = useCatalogue();
  const { city, openPicker } = useLocation();
  const toast = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState(modeParam);
  const [role, setRole] = useState(roleParam);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    serviceKey: services[0]?.key || "cleaning",
    area: city?.name || "",
    pricePerWork: "",
  });

  useEffect(() => {
    setRole(roleParam);
  }, [roleParam]);

  useEffect(() => {
    setMode(modeParam);
  }, [modeParam]);

  useEffect(() => {
    if (services.length && !form.serviceKey) {
      setForm((prev) => ({ ...prev, serviceKey: services[0].key }));
    }
  }, [services, form.serviceKey]);

  useEffect(() => {
    if (!form.area && city?.name) setForm((prev) => ({ ...prev, area: city.name }));
  }, [city?.name, form.area]);

  const goNext = (targetRole = role) => {
    if (targetRole === "worker") {
      navigate("/worker", { replace: true });
      return;
    }
    const safeNext =
      next && !next.startsWith("/worker") && !next.startsWith("/admin") ? next : "";
    navigate(safeNext || "/", { replace: true });
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const result = await signIn(form.email.trim(), form.password);
      const actualRole = result?.role || role;
      if (actualRole !== role) {
        // Strict role isolation: reject the cross-role attempt and end the session.
        try {
          await logout();
        } catch {
          /* ignore logout failures */
        }
        setError(
          actualRole === "worker"
            ? "No customer account exists for this email. Use the Professional sign-in instead."
            : "No professional account exists for this email. Use the Customer sign-in instead.",
        );
        return;
      }
      toast.success("Welcome back.");
      goNext(actualRole);
    } catch (signInError) {
      setError(friendly(signInError));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError("");
    if (form.name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) {
      setError("Enter a valid 10-digit Indian mobile number, or leave it blank.");
      return;
    }
    if (role === "worker" && (!form.serviceKey || !city?.name)) {
      setError("Choose your state, city, local area and trade to apply as a worker.");
      return;
    }
    if (!terms) {
      setError("Accept the terms and privacy policy to continue.");
      return;
    }

    setBusy(true);
    try {
      const workerFields =
        role === "worker"
          ? {
              service:
                services.find((item) => item.key === form.serviceKey)?.name ||
                SERVICE_META[form.serviceKey]?.name ||
                form.serviceKey,
              serviceKey: form.serviceKey,
              area:
                [city?.areaName, city?.name].filter(Boolean).join(", ") ||
                form.area.trim(),
              areaName: city?.areaName || form.area.trim(),
              state: city?.state || "",
              pricePerWork: Number(form.pricePerWork) || undefined,
              city: city?.name || form.area.trim(),
              lat: city?.lat || null,
              lng: city?.lng || null,
            }
          : {};
      await signUp({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone || undefined,
        role,
        worker: workerFields,
      });
      setJustSignedUp(true);
      toast.success(
        role === "worker"
          ? "Application created. Verify your email, then we will review your trade details."
          : "Account created. Verify your email to unlock bookings.",
      );
    } catch (signUpError) {
      setError(friendly(signUpError));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleBusy(true);
    try {
      const result = await googleSignIn();
      const actualRole = result?.role || role;
      if (actualRole !== role) {
        // Strict role isolation: reject the cross-role attempt and end the session.
        try {
          await logout();
        } catch {
          /* ignore logout failures */
        }
        setError(
          actualRole === "worker"
            ? "This Google account is a professional account. Use the Professional sign-in instead."
            : "This Google account is a customer account. Use the Customer sign-in instead.",
        );
        return;
      }
      toast.success("Signed in with Google.");
      goNext(actualRole);
    } catch (googleError) {
      setError(friendly(googleError));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.email.trim()) {
      setError("Enter the email on your account.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(form.email.trim());
      toast.success("Password reset email sent. Check your inbox.");
      setMode("signin");
    } catch (resetError) {
      setError(friendly(resetError));
    } finally {
      setBusy(false);
    }
  };

  const checkVerified = async () => {
    if (!fbUser) return;
    setVerifying(true);
    try {
      await fbUser.reload();
      await refreshClaims();
      if (fbUser.emailVerified) {
        toast.success("Email verified. You are all set.");
        setJustSignedUp(false);
        const actualRole = profile?.role === "worker" ? "worker" : role;
        goNext(actualRole);
      } else {
        toast.info("Not verified yet. Open the link in your email first.");
      }
    } catch (verifyError) {
      toast.error(friendly(verifyError));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <PageLoader label="Preparing sign in…" />;

  // Universal guest entry point: force an explicit role selection before
  // showing any auth form. This keeps customer and professional flows strictly
  // isolated from the very first tap.
  if (!fbUser && !role) {
    return (
      <AuthShell>
        <RoleSelectionScreen
          next={next}
          onPick={(picked) => {
            const search = new URLSearchParams(params);
            search.set("role", picked);
            if (params.get("mode") === "signup") search.set("mode", "signup");
            setParams(search, { replace: true });
          }}
        />
      </AuthShell>
    );
  }

  if (fbUser && !justSignedUp) {
    return (
      <AuthShell role={profile?.role === "worker" ? "worker" : role}>
        <div className="auth-card">
          <div className="auth-card__head">
            <h2>You are signed in</h2>
            <p>
              {profile?.name || fbUser.displayName || fbUser.email}
              {profile?.role === "worker" ? " · EasyHome Pro" : ""}
            </p>
          </div>
          <div className="auth-note" style={{ marginTop: 0 }}>
            {emailVerified ? (
              <>
                <CheckCircle2 size={15} style={{ display: "inline", marginRight: 6 }} />
                Your email is verified.
              </>
            ) : (
              <>
                Your email is not verified yet. Verify it to create bookings and receive job
                updates.
              </>
            )}
          </div>
          <div className="stack" style={{ marginTop: 16 }}>
            <Button
              size="lg"
              className="btn--block"
              onClick={() => goNext(profile?.role === "worker" ? "worker" : "customer")}
              icon={ArrowRight}
            >
              Continue to EasyHome
            </Button>
            {!emailVerified ? (
              <Button variant="outline" className="btn--block" loading={verifying} onClick={checkVerified}>
                I have verified my email
              </Button>
            ) : null}
            <Button
              variant="ghost"
              className="btn--block"
              onClick={async () => {
                await logout();
                setMode("signin");
              }}
            >
              Use a different account
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (justSignedUp) {
    return (
      <AuthShell role={role}>
        <div className="auth-card">
          <div className="verify-card">
            <span className="verify-card__icon">
              <Mail size={28} />
            </span>
            <h2>Verify your email</h2>
            <p>
              We sent a verification link to <strong>{fbUser?.email || form.email}</strong>. Open
              it to activate bookings{role === "worker" ? " and your worker application" : ""}.
            </p>
            <div className="stack">
              <Button
                size="lg"
                className="btn--block"
                loading={verifying}
                onClick={checkVerified}
                icon={CheckCircle2}
              >
                I have verified my email
              </Button>
              <Button
                variant="outline"
                className="btn--block"
                onClick={async () => {
                  try {
                    await resendVerification();
                    toast.success("Verification email sent again.");
                  } catch (resendError) {
                    toast.error(friendly(resendError));
                  }
                }}
              >
                Resend verification email
              </Button>
              <Button
                variant="ghost"
                className="btn--block"
                onClick={() => {
                  setJustSignedUp(false);
                  goNext(role);
                }}
              >
                Skip for now
              </Button>
            </div>
            <div className="auth-note">
              Check spam or promotions. The sender is Firebase Authentication on behalf of
              EasyHome.
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell role={role}>
      <div className="auth-card">
        <div className="auth-card__head">
          <h2>
            {mode === "reset"
              ? "Reset your password"
              : mode === "signup"
                ? role === "worker"
                  ? "Join as a professional"
                  : "Create your account"
                : role === "worker"
                  ? "Professional sign in"
                  : "Welcome back"}
          </h2>
          <p>
            {mode === "reset"
              ? "We will email you a secure reset link."
              : mode === "signup"
                ? role === "worker"
                  ? "Apply once. Get verified. Receive local jobs."
                  : "Book verified pros in under a minute."
                : role === "worker"
                  ? "Sign in to manage jobs, availability and payouts."
                  : "Sign in to manage bookings, addresses and membership."}
          </p>
        </div>

        {mode !== "reset" ? (
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "signin" ? "is-active" : ""}
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "is-active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="inline-error" style={{ marginBottom: 14 }}>
            <span>{error}</span>
          </div>
        ) : null}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="stack">
            <Field label="Email" htmlFor="auth-email">
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field label="Password" htmlFor="auth-password">
              <div className="input-group">
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Your password"
                  required
                  style={{ paddingLeft: 14, paddingRight: 46 }}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--sm input-group__suffix"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div className="row row--between">
              <button
                type="button"
                className="btn btn--link"
                style={{ fontSize: 12.5 }}
                onClick={() => {
                  setMode("reset");
                  setError("");
                }}
              >
                Forgot password?
              </button>
              <Link to="/auth?role=worker" className="tiny" style={{ color: "var(--blue)" }}>
                Join as a pro
              </Link>
            </div>
            <Button type="submit" size="lg" className="btn--block" loading={busy}>
              Sign in
            </Button>
          </form>
        ) : mode === "signup" ? (
          <form onSubmit={handleSignUp} className="stack">
            <div className="auth-grid">
              <Field label="Full name" htmlFor="signup-name" required>
                <Input
                  id="signup-name"
                  autoComplete="name"
                  value={form.name}
                  maxLength={80}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Raees Khan"
                  required
                />
              </Field>
              <Field label="Mobile number" htmlFor="signup-phone" hint="Shared only with your assigned pro.">
                <Input
                  id="signup-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  placeholder="9876543210"
                />
              </Field>
              <Field label="Email" htmlFor="signup-email" required className="span-2">
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field label="Password" htmlFor="signup-password" hint="At least 8 characters." required className="span-2">
                <div className="input-group">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Create a strong password"
                    required
                    style={{ paddingLeft: 14, paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm input-group__suffix"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              {role === "worker" ? (
                <>
                  <Field label="Your trade" htmlFor="signup-service" required>
                    <Select
                      id="signup-service"
                      value={form.serviceKey}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, serviceKey: event.target.value }))
                      }
                    >
                      {services.map((service) => (
                        <option key={service.key} value={service.key}>
                          {service.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Starting price (₹)" htmlFor="signup-price">
                    <Input
                      id="signup-price"
                      type="number"
                      min={0}
                      max={100000}
                      value={form.pricePerWork}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, pricePerWork: event.target.value }))
                      }
                      placeholder="299"
                    />
                  </Field>
                  <Field
                    label="Service area"
                    htmlFor="signup-area"
                    hint="Set this from the location picker so state, city and area stay in sync."
                    required
                    className="span-2"
                  >
                    <div className="auth-location" id="signup-area">
                      <MapPin size={17} />
                      <span>
                        {city?.name
                          ? [city.areaName, city.name, city.state].filter(Boolean).join(", ")
                          : "Choose your state, city and local area"}
                      </span>
                      <button type="button" onClick={openPicker}>
                        {city?.name ? "Change" : "Choose"}
                      </button>
                    </div>
                  </Field>
                </>
              ) : null}
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={terms}
                onChange={(event) => setTerms(event.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link to="/legal/terms" style={{ color: "var(--blue)" }}>
                  terms of service
                </Link>{" "}
                and{" "}
                <Link to="/legal/privacy" style={{ color: "var(--blue)" }}>
                  privacy policy
                </Link>
                .
              </span>
            </label>

            <Button type="submit" size="lg" className="btn--block" loading={busy}>
              {role === "worker" ? "Submit application" : "Create account"}
            </Button>

            {role === "worker" ? (
              <p className="tiny muted" style={{ textAlign: "center" }}>
                <ShieldCheck size={12} style={{ display: "inline", marginRight: 4 }} />
                Applications are reviewed by the EasyHome team. You can upload an ID after
                signing in.
              </p>
            ) : null}
          </form>
        ) : (
          <form onSubmit={handleReset} className="stack">
            <Field label="Account email" htmlFor="reset-email">
              <Input
                id="reset-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="btn--block" loading={busy}>
              Send reset link
            </Button>
            <button
              type="button"
              className="btn btn--ghost btn--block"
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              <ArrowLeft size={15} /> Back to sign in
            </button>
          </form>
        )}

        {mode !== "reset" ? (
          <>
            <div className="auth-divider">or continue with</div>
            <Button
              variant="outline"
              size="lg"
              className="btn--block"
              loading={googleBusy}
              onClick={handleGoogle}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "conic-gradient(#ea4335 0 25%, #fbbc05 25% 50%, #34a853 50% 75%, #4285f4 75% 100%)",
                  display: "inline-block",
                }}
              />
              Google
            </Button>
            <p className="auth-foot">
              {mode === "signin" ? (
                <>
                  New to EasyHome?{" "}
                  <button type="button" onClick={() => setMode("signup")}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => setMode("signin")}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        ) : null}

        <p className="auth-note" style={{ textAlign: "center" }}>
          <Sparkles size={12} style={{ display: "inline", marginRight: 4 }} />
          Firebase secures your sign-in. EasyHome never sees your password.
        </p>
      </div>
    </AuthShell>
  );
}

function AuthShell({ children, role = "customer" }) {
  const worker = role === "worker";
  return (
    <div className={`auth-page ${worker ? "auth-page--worker" : ""}`}>
      <aside className="auth-brand">
        <Link to="/" className="auth-brand__logo">
          <span>
            <img src={logo} alt="" />
          </span>
          EasyHome
        </Link>

        <div>
          <p className="eyebrow" style={{ color: "rgba(10,10,10,.55)" }}>
            {worker ? "Work with EasyHome" : "Home services, sorted"}
          </p>
          <h1>{worker ? "Local work, booked and paid." : "Good help, one tap away."}</h1>
          <p>
            {worker
              ? "Get verified, set your rates and receive nearby jobs. Agree the price before you travel and keep every payout in one place."
              : "Verified professionals for every corner of your home. Agree the price first, pay after the job, and keep every visit in one place."}
          </p>
          <div className="auth-brand__chips">
            {worker ? (
              <>
                <span className="auth-brand__chip">
                  <BadgeCheck size={13} /> Verified local jobs
                </span>
                <span className="auth-brand__chip">
                  <Wallet size={13} /> Clear payouts
                </span>
                <span className="auth-brand__chip">
                  <ShieldCheck size={13} /> You set your rates
                </span>
              </>
            ) : (
              <>
                <span className="auth-brand__chip">
                  <BadgeCheck size={13} /> ID-verified pros
                </span>
                <span className="auth-brand__chip">
                  <Wallet size={13} /> Pay after service
                </span>
                <span className="auth-brand__chip">
                  <ShieldCheck size={13} /> Private contact
                </span>
              </>
            )}
          </div>
        </div>

        <p className="auth-brand__foot">
          © {new Date().getFullYear()} EasyHome ·{" "}
          {worker ? "Built for local professionals" : "Made for Indian homes"}
        </p>
      </aside>

      <main className="auth-panel">{children}</main>
    </div>
  );
}

function RoleSelectionScreen({ onPick, next }) {
  return (
    <div className="auth-card auth-role-select">
      <div className="auth-card__head">
        <h2>Choose your account type</h2>
        <p>
          Pick how you want to use EasyHome. Customer and professional accounts
          stay completely separate.
        </p>
      </div>

      <div className="auth-role-select__grid">
        <button type="button" className="auth-role-select__card" onClick={() => onPick("customer")}>
          <span className="auth-role-select__icon">
            <UserRound size={26} />
          </span>
          <strong>Sign in / Register as Customer</strong>
          <small>
            Book home services, track visits, chat and pay after the job.
          </small>
          <span className="auth-role-select__cta">Continue as customer <ArrowRight size={15} /></span>
        </button>

        <button type="button" className="auth-role-select__card auth-role-select__card--worker" onClick={() => onPick("worker")}>
          <span className="auth-role-select__icon">
            <BriefcaseBusiness size={26} />
          </span>
          <strong>Sign in / Register as Professional / Worker</strong>
          <small>
            Receive local jobs, manage your availability and payouts.
          </small>
          <span className="auth-role-select__cta">Continue as professional <ArrowRight size={15} /></span>
        </button>
      </div>

      {next ? (
        <p className="auth-note" style={{ textAlign: "center", marginTop: 14 }}>
          After signing in you will return to the page you came from.
        </p>
      ) : null}
    </div>
  );
}
