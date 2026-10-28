import { useEffect, useRef, useState } from "react";
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
import {
  captureReferral,
  clearReferralCode,
  pendingReferralCode,
  storeReferralCode,
} from "../lib/referral";
import { usePageMeta } from "../lib/usePageMeta";
import { Button, Field, Input, PageLoader, Select } from "../components/ui";
import logo from "../assets/logo.png";

const AUTH_ERRORS = {
  AUTH_INVALID: "Incorrect email or password.",
  EMAIL_IN_USE: "That email is already registered. Sign in instead.",
  ACCOUNT_DISABLED: "This account has been disabled. Contact EasyHome support.",
  EMAIL_NOT_VERIFIED: "Verify your email address before continuing.",
  WORKER_DETAILS_REQUIRED: "Choose your trade and service area to apply.",
  WORKER_NOT_APPROVED: "Your worker application is still under review.",
  GOOGLE_NOT_CONFIGURED: "Google sign-in is not configured for this deployment yet.",
  GOOGLE_EMAIL_NOT_VERIFIED: "Verify your Google email address before continuing.",
  GOOGLE_TOKEN_INVALID: "Google sign-in could not be verified. Try again.",
  VERIFICATION_INVALID: "This verification link is invalid or has already been used.",
  VERIFICATION_EXPIRED: "This verification link has expired. Request a new one.",
  RESET_INVALID: "This reset link is invalid or has already been used.",
  RESET_EXPIRED: "This reset link has expired. Request a new one.",
  TIMEOUT: "The request took too long. Check your connection and try again.",
  NETWORK: "Network error. Check your connection and try again.",
};

function friendly(error) {
  return AUTH_ERRORS[error?.code] || error?.message || "Something went wrong. Try again.";
}

export default function Auth() {
  usePageMeta("Sign in", "Sign in or create your EasyHome account to book verified home services.");

  const [params, setParams] = useSearchParams();
  const nextParam = params.get("next") || "";
  const next = nextParam.startsWith("/") ? nextParam : "";
  const rawRole = params.get("role");
  const roleParam = rawRole === "worker" ? "worker" : rawRole === "customer" ? "customer" : "";
  const role = roleParam || "customer";
  const verifyToken = params.get("verify") || "";
  const resetToken = params.get("reset") || "";
  const requestedMode = resetToken ? "new-password" : params.get("mode");
  const mode = ["signup", "reset", "new-password"].includes(requestedMode)
    ? requestedMode
    : "signin";
  const setMode = (nextMode) => {
    const nextParams = new URLSearchParams(params);
    if (nextMode === "signin") nextParams.delete("mode");
    else nextParams.set("mode", nextMode);
    setParams(nextParams, { replace: true });
  };
  const pickRole = (picked) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("role", picked);
    setParams(nextParams, { replace: true });
  };

  const {
    fbUser,
    profile,
    loading,
    signIn,
    signUp,
    googleSignIn,
    resetPassword,
    resetPasswordWithToken,
    resendVerification,
    verifyEmail,
    refreshProfile,
    logout,
    emailVerified,
  } = useAuth();
  const { services } = useCatalogue();
  const { city, openPicker } = useLocation();
  const toast = useToast();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const handledLink = useRef("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    referralCode: pendingReferralCode(),
    serviceKey: services[0]?.key || "",
    area: city?.name || "",
    pricePerWork: "",
  });
  const serviceKey = form.serviceKey || services[0]?.key || "";

  // Capture ?ref=CODE from invite links and prefill the referral field. This
  // works for both customer and professional invites.
  useEffect(() => {
    const code = captureReferral(window.location.search);
    if (code) {
      setForm((prev) => (prev.referralCode ? prev : { ...prev, referralCode: code }));
    }
  }, []);

  // Email links land on /auth?verify=TOKEN or /auth?reset=TOKEN.
  useEffect(() => {
    if (!verifyToken || handledLink.current === verifyToken) return undefined;
    handledLink.current = verifyToken;
    let active = true;
    setVerifying(true);
    verifyEmail(verifyToken)
      .then(() => {
        if (!active) return;
        toast.success("Email verified. You are all set.");
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.delete("verify");
        setParams(nextParams, { replace: true });
      })
      .catch((verifyError) => {
        if (active) toast.error(friendly(verifyError));
      })
      .finally(() => {
        if (active) setVerifying(false);
      });
    return () => {
      active = false;
    };
  }, [verifyToken, verifyEmail, setParams, toast]);

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
        await logout().catch(() => {});
        setError(
          actualRole === "worker"
            ? "This is a professional account. Use professional sign-in to continue."
            : "This is a customer account. Use customer sign-in to continue.",
        );
        setBusy(false);
        return;
      }
      toast.success("Welcome back.");
      if (!result?.user?.emailVerified) {
        setJustSignedUp(true);
        toast.info("Verify your email to unlock bookings.");
        return;
      }
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
    if (role === "worker" && (!serviceKey || !city?.name)) {
      setError("Choose your state, city, local area and trade to apply as a worker.");
      return;
    }
    if (!terms) {
      setError("Accept the terms and privacy policy to continue.");
      return;
    }
    const referralCode = form.referralCode.trim().toUpperCase();
    if (referralCode && !/^[A-Z0-9]{6,12}$/.test(referralCode)) {
      setError("Referral codes are 6-12 letters or numbers. Check the code and try again.");
      return;
    }
    if (referralCode) storeReferralCode(referralCode);
    else clearReferralCode();

    setBusy(true);
    try {
      const workerFields =
        role === "worker"
          ? {
              service:
                services.find((item) => item.key === serviceKey)?.name ||
                SERVICE_META[serviceKey]?.name ||
                serviceKey,
              serviceKey,
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
        referralCode,
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
    if (role === "customer") {
      const referralCode = form.referralCode.trim().toUpperCase();
      if (referralCode) storeReferralCode(referralCode);
      else clearReferralCode();
    }
    setGoogleBusy(true);
    try {
      const workerFields =
        role === "worker"
          ? {
              service:
                services.find((item) => item.key === serviceKey)?.name ||
                SERVICE_META[serviceKey]?.name ||
                serviceKey,
              serviceKey,
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
      const result = await googleSignIn({
        role,
        referralCode: form.referralCode.trim().toUpperCase(),
        worker: workerFields,
      });
      const actualRole = result?.role || role;
      if (actualRole !== role) {
        await logout().catch(() => {});
        setError(
          actualRole === "worker"
            ? "This is a professional account. Use professional sign-in to continue."
            : "This is a customer account. Use customer sign-in to continue.",
        );
        setGoogleBusy(false);
        return;
      }
      toast.success("Signed in with Google.");
      if (!result?.user?.emailVerified) {
        setJustSignedUp(true);
        return;
      }
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

  const handleSetPassword = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (form.password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await resetPasswordWithToken(resetToken, form.password);
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.delete("reset");
      setParams(nextParams, { replace: true });
      toast.success("Password updated. You are signed in.");
      setJustSignedUp(!result?.user?.emailVerified);
      if (result?.user?.emailVerified) goNext(result.role || role);
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
      const nextProfile = await refreshProfile();
      if (nextProfile?.emailVerified) {
        toast.success("Email verified. You are all set.");
        setJustSignedUp(false);
        const actualRole = nextProfile.role === "worker" ? "worker" : role;
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

  if (fbUser && !justSignedUp && !resetToken) {
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
              Check spam or promotions. Verification emails are sent by EasyHome.
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (!roleParam) {
    return (
      <AuthShell>
        <RoleSelectionScreen onPick={pickRole} next={next} />
      </AuthShell>
    );
  }

  return (
    <AuthShell role={role}>
      <div className="auth-card">
        <div className="auth-card__head">
          <h2>
            {mode === "new-password"
              ? "Choose a new password"
              : mode === "reset"
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
            {mode === "new-password"
              ? "Set a strong password to secure your EasyHome account."
              : mode === "reset"
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

        {mode === "signin" || mode === "signup" ? (
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
              <Field
                label="Referral code (optional)"
                htmlFor="signup-referral"
                hint={
                  role === "worker"
                    ? "Enter a fellow professional's code. Same-role referrals only; rewards require admin approval."
                    : "Enter a friend's code to link their referral. Only new customer accounts are eligible."
                }
                className="span-2"
              >
                <Input
                  id="signup-referral"
                  value={form.referralCode}
                  maxLength={12}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      referralCode: event.target.value
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toUpperCase(),
                    }))
                  }
                  placeholder="A1B2C3D4"
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
                      value={serviceKey}
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
        ) : mode === "new-password" ? (
          <form onSubmit={handleSetPassword} className="stack">
            <Field label="New password" htmlFor="new-password" hint="At least 8 characters." required>
              <div className="input-group">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="input-group__btn"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" htmlFor="confirm-password" required>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="btn--block" loading={busy}>
              Update password and sign in
            </Button>
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

        {mode === "signin" || mode === "signup" ? (
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
          EasyHome secures your sign-in with encrypted passwords and email verification.
        </p>
      </div>
    </AuthShell>
  );
}

function RoleSelectionScreen({ onPick, next }) {
  return (
    <div className="auth-card auth-role-select">
      <div className="auth-card__head">
        <h2>Choose your account type</h2>
        <p>
          Pick how you want to use EasyHome. Customer and professional accounts stay completely
          separate.
        </p>
      </div>

      <div className="auth-role-select__grid">
        <button
          type="button"
          className="auth-role-select__card"
          onClick={() => onPick("customer")}
        >
          <span className="auth-role-select__icon">
            <UserRound size={26} />
          </span>
          <strong>Sign in / Register as Customer</strong>
          <small>Book home services, track visits, chat and pay after the job.</small>
          <span className="auth-role-select__cta">
            Continue as customer <ArrowRight size={15} />
          </span>
        </button>

        <button
          type="button"
          className="auth-role-select__card auth-role-select__card--worker"
          onClick={() => onPick("worker")}
        >
          <span className="auth-role-select__icon">
            <BriefcaseBusiness size={26} />
          </span>
          <strong>Sign in / Register as Professional / Worker</strong>
          <small>Receive local jobs, manage your availability and payouts.</small>
          <span className="auth-role-select__cta">
            Continue as professional <ArrowRight size={15} />
          </span>
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
