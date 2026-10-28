import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, clearToken, getToken, setToken } from "../lib/api";
import { isActiveUntil } from "../lib/format";
import { clearReferralCode, pendingReferralCode } from "../lib/referral";
import { clearLiveCache } from "../hooks/useLive";
import { requestGoogleAccessToken } from "../lib/google";

const AuthContext = createContext(null);

function userFromSession(payload) {
  const claims = payload?.claims || {};
  const profile = payload?.profile || null;
  const uid = claims.uid || profile?.id || "";
  if (!uid) return null;
  return {
    uid,
    email: claims.email || profile?.email || "",
    emailVerified:
      claims.emailVerified === true || profile?.emailVerified === true,
    displayName: claims.name || profile?.name || "",
    photoURL: claims.picture || profile?.photoPath || "",
    role: claims.role || profile?.role || "customer",
    admin: claims.admin === true || payload?.isAdmin === true,
    async getIdToken() {
      return getToken();
    },
  };
}

export function AuthProvider({ children }) {
  const [fbUser, setFbUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [worker, setWorker] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applySession = useCallback((payload) => {
    if (payload?.token) setToken(payload.token);
    const nextProfile = payload?.profile || null;
    const nextWorker = payload?.worker || null;
    const admin = payload?.isAdmin === true || payload?.claims?.admin === true;
    const nextUser = userFromSession(payload);
    setProfile(nextProfile);
    setWorker(nextWorker);
    setIsAdmin(admin);
    setFbUser(nextUser);
    return {
      user: nextUser,
      profile: nextProfile,
      worker: nextWorker,
      role: nextProfile?.role === "worker" || nextWorker ? "worker" : "customer",
    };
  }, []);

  const resetSession = useCallback(() => {
    clearToken();
    clearLiveCache();
    setFbUser(null);
    setProfile(null);
    setWorker(null);
    setIsAdmin(false);
  }, []);

  const loadMe = useCallback(async () => {
    const payload = await api.get("/auth/me");
    return applySession(payload);
  }, [applySession]);

  useEffect(() => {
    let active = true;
    const token = getToken();
    if (!token) {
      setLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (active) {
        setError(
          (current) =>
            current || "Your account is taking longer than usual to load.",
        );
        setLoading(false);
      }
    }, 10000);

    loadMe()
      .catch((authError) => {
        if (!active) return;
        if (authError?.status === 401 || authError?.status === 403) {
          resetSession();
        } else {
          setError(authError.message || "Could not load your account.");
        }
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadMe, resetSession]);

  const signUp = useCallback(
    async ({
      email,
      password,
      name,
      phone,
      role = "customer",
      referralCode,
      worker: workerFields = {},
    }) => {
      setError(null);
      const payload = await api.post("/auth/register", {
        email,
        password,
        name,
        phone,
        role,
        city: workerFields.city || "",
        referralCode: referralCode || pendingReferralCode() || "",
        ...workerFields,
      });
      clearReferralCode();
      const session = applySession(payload);
      return {
        ...session,
        verificationUrl: payload.verificationUrl,
        verificationSent: payload.verificationSent,
      };
    },
    [applySession],
  );

  const signIn = useCallback(
    async (email, password) => {
      setError(null);
      const payload = await api.post("/auth/login", { email, password });
      return applySession(payload);
    },
    [applySession],
  );

  const googleSignIn = useCallback(
    async ({ role, referralCode, worker: workerFields = {} } = {}) => {
      setError(null);
      const accessToken = await requestGoogleAccessToken();
      const payload = await api.post("/auth/google", {
        accessToken,
        role: role === "worker" ? "worker" : "customer",
        referralCode: referralCode || pendingReferralCode() || "",
        ...workerFields,
      });
      if (payload.created) clearReferralCode();
      return applySession(payload);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* The token is stateless; clearing it locally is enough. */
    }
    resetSession();
  }, [resetSession]);

  const resendVerification = useCallback(async () => {
    return api.post("/auth/resend-verification");
  }, []);

  const resetPassword = useCallback(async (email) => {
    return api.post("/auth/forgot-password", { email });
  }, []);

  const resetPasswordWithToken = useCallback(
    async (token, password) => {
      const payload = await api.post("/auth/reset-password", { token, password });
      return applySession(payload);
    },
    [applySession],
  );

  const verifyEmail = useCallback(
    async (token) => {
      const payload = await api.post("/auth/verify-email", { token });
      return applySession(payload);
    },
    [applySession],
  );

  const refreshClaims = useCallback(async () => {
    if (!getToken()) {
      setIsAdmin(false);
      return false;
    }
    const session = await loadMe();
    return Boolean(session.user?.admin);
  }, [loadMe]);

  const refreshProfile = useCallback(async () => {
    if (!getToken()) return null;
    const session = await loadMe();
    return session.profile;
  }, [loadMe]);

  const role = profile?.role || (worker ? "worker" : "customer");
  const isWorker = role === "worker";
  const workerApproved = worker?.status === "approved";
  const premiumUntil = isWorker ? worker?.premiumUntil : profile?.subscription?.endAt;
  const isPremium = isActiveUntil(premiumUntil);

  const value = useMemo(
    () => ({
      fbUser,
      user: fbUser,
      profile,
      worker,
      role,
      isWorker,
      workerApproved,
      isAdmin,
      isPremium,
      premiumUntil,
      emailVerified: fbUser?.emailVerified === true,
      loading,
      error,
      needsProfile: false,
      signUp,
      signIn,
      googleSignIn,
      logout,
      resendVerification,
      resetPassword,
      resetPasswordWithToken,
      verifyEmail,
      refreshClaims,
      refreshProfile,
    }),
    [
      fbUser,
      profile,
      worker,
      role,
      isWorker,
      workerApproved,
      isAdmin,
      isPremium,
      premiumUntil,
      loading,
      error,
      signUp,
      signIn,
      googleSignIn,
      logout,
      resendVerification,
      resetPassword,
      resetPasswordWithToken,
      verifyEmail,
      refreshClaims,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
