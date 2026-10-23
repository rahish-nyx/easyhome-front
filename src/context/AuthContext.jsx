import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db, firebaseReady } from "../firebase";
import { api, bindAuth } from "../lib/api";
import { isActiveUntil } from "../lib/format";

const AuthContext = createContext(null);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }) {
  const [fbUser, setFbUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [worker, setWorker] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(firebaseReady);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState(null);

  const unsubs = useRef([]);
  const listenersUid = useRef(null);
  const signupInProgress = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    bindAuth(() => auth?.currentUser);
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const clearListeners = useCallback(() => {
    unsubs.current.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        /* already closed */
      }
    });
    unsubs.current = [];
    listenersUid.current = null;
  }, []);

  const refreshClaims = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) {
      setIsAdmin(false);
      return false;
    }
    try {
      await user.getIdToken(true);
      const result = await user.getIdTokenResult();
      const admin = result.claims.admin === true;
      setIsAdmin(admin);
      return admin;
    } catch {
      return false;
    }
  }, []);

  const attach = useCallback(
    (user) => {
      clearListeners();
      listenersUid.current = user.uid;
      if (!db) return;

      unsubs.current.push(
        onSnapshot(
          doc(db, "users", user.uid),
          (snapshot) => {
            if (!mounted.current) return;
            setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
            setNeedsProfile(!snapshot.exists());
          },
          (snapshotError) => {
            if (mounted.current) setError(snapshotError.message);
          },
        ),
      );

      unsubs.current.push(
        onSnapshot(
          doc(db, "workers", user.uid),
          (snapshot) => {
            if (!mounted.current) return;
            setWorker(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
          },
          () => {},
        ),
      );
    },
    [clearListeners],
  );

  useEffect(() => {
    if (!firebaseReady || !auth || !db) {
      setLoading(false);
      return undefined;
    }

    const bootstrapTimer = window.setTimeout(() => {
      if (!mounted.current) return;
      setLoading(false);
      setError(
        (current) =>
          current ||
          "Firebase Authentication could not initialize. Check the project configuration.",
      );
    }, 8000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        window.clearTimeout(bootstrapTimer);
        if (!mounted.current) return;

        if (!user) {
          clearListeners();
          setFbUser(null);
          setProfile(null);
          setWorker(null);
          setIsAdmin(false);
          setNeedsProfile(false);
          setLoading(false);
          return;
        }

        setFbUser(user);

        if (listenersUid.current === user.uid) {
          refreshClaims().catch(() => {});
          return;
        }

        setLoading(true);
        setError(null);
        attach(user);

        try {
          let snapshot = await getDoc(doc(db, "users", user.uid));

          if (!snapshot.exists()) {
            // A sign-up may be creating the profile right now. Wait for it
            // instead of racing it with a default customer profile.
            for (let i = 0; i < 24 && signupInProgress.current; i += 1) {
              await sleep(250);
            }
            for (let i = 0; i < 8 && !snapshot.exists(); i += 1) {
              await sleep(200);
              snapshot = await getDoc(doc(db, "users", user.uid));
            }

            if (!snapshot.exists() && !signupInProgress.current) {
              await api.post("/auth/session", {
                name: user.displayName || "",
                role: "customer",
              });
            }
          }

          await refreshClaims();
        } catch (authError) {
          if (mounted.current) {
            setError(authError.message || "Could not load your account.");
          }
        } finally {
          if (mounted.current) setLoading(false);
        }
      },
      (authError) => {
        window.clearTimeout(bootstrapTimer);
        if (!mounted.current) return;
        setError(
          authError?.message ||
            "Firebase Authentication could not initialize. Check the project configuration.",
        );
        setLoading(false);
      },
    );

    return () => {
      window.clearTimeout(bootstrapTimer);
      unsubscribe();
      clearListeners();
    };
  }, [attach, clearListeners, refreshClaims]);

  const signUp = useCallback(
    async ({ email, password, name, phone, role = "customer", worker: workerFields = {} }) => {
      if (!auth) throw new Error("Firebase is not configured.");
      signupInProgress.current = true;
      setError(null);
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(credential.user, { displayName: name });

        await api.post("/auth/session", {
          name,
          phone,
          role,
          ...workerFields,
        });

        setFbUser(credential.user);
        attach(credential.user);
        await sendEmailVerification(credential.user).catch(() => {});
        await refreshClaims();
        return credential.user;
      } finally {
        signupInProgress.current = false;
      }
    },
    [attach, refreshClaims],
  );

  const signIn = useCallback(async (email, password) => {
    if (!auth) throw new Error("Firebase is not configured.");
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await refreshClaims();
    return credential.user;
  }, [refreshClaims]);

  const googleSignIn = useCallback(async () => {
    if (!auth || !db) throw new Error("Firebase is not configured.");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const credential = await signInWithPopup(auth, provider);

    const snapshot = await getDoc(doc(db, "users", credential.user.uid));
    if (!snapshot.exists()) {
      await api.post("/auth/session", {
        name: credential.user.displayName || "",
        role: "customer",
      });
    }
    await refreshClaims();
    return credential.user;
  }, [refreshClaims]);

  const logout = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
    clearListeners();
    setProfile(null);
    setWorker(null);
    setFbUser(null);
    setIsAdmin(false);
  }, [clearListeners]);

  const resendVerification = useCallback(async () => {
    if (!auth?.currentUser) throw new Error("Sign in first.");
    await sendEmailVerification(auth.currentUser);
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!auth) throw new Error("Firebase is not configured.");
    await sendPasswordResetEmail(auth, email);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth?.currentUser || !db) return null;
    const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
    const next = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    setProfile(next);
    return next;
  }, []);

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
      needsProfile,
      signUp,
      signIn,
      googleSignIn,
      logout,
      resendVerification,
      resetPassword,
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
      needsProfile,
      signUp,
      signIn,
      googleSignIn,
      logout,
      resendVerification,
      resetPassword,
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
