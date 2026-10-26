import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { firebaseReady } from "./firebase";
import { AuthProvider } from "./context/AuthContext";
import { CatalogueProvider } from "./context/CatalogueContext";
import { LocationProvider } from "./context/LocationContext";
import { ToastProvider } from "./context/ToastContext";
import { CustomerLayout } from "./components/layout";
import { ProtectedRoute, SetupScreen } from "./components/common";
import { ErrorBoundary, PageLoader } from "./components/ui";
import Home from "./pages/Home";
import Services from "./pages/Services";
import SearchPage from "./pages/Search";
import Booking from "./pages/Booking";
import Bookings from "./pages/Bookings";
import Tracking from "./pages/Tracking";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";
import Refer from "./pages/Refer";
import Chat from "./pages/Chat";
import WorkerPublic from "./pages/WorkerPublic";
import Auth from "./pages/Auth";
import Legal from "./pages/Legal";
import Faq from "./pages/Faq";
import { NotFound, Offline } from "./pages/Fallback";
import AdminReferrals from "./admin/AdminReferrals";
import { captureReferral } from "./lib/referral";
const WorkerApp = lazy(() => import("./worker/WorkerApp"));
const WorkerSupport = lazy(() => import("./worker/WorkerSupport"));
const AdminApp = lazy(() => import("./admin/AdminApp"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminApprovals = lazy(() => import("./admin/AdminApprovals"));
const AdminUsers = lazy(() => import("./admin/AdminUsers"));
const AdminBookings = lazy(() => import("./admin/AdminBookings"));
const AdminTracking = lazy(() => import("./admin/AdminTracking"));
const AdminZones = lazy(() => import("./admin/AdminZones"));
const AdminCatalog = lazy(() => import("./admin/AdminCatalog"));
const AdminRevenue = lazy(() => import("./admin/AdminRevenue"));
const AdminPromos = lazy(() => import("./admin/AdminPromos"));
const AdminFooterLinks = lazy(() => import("./admin/AdminFooterLinks"));
const AdminBroadcast = lazy(() => import("./admin/AdminBroadcast"));
const AdminChats = lazy(() => import("./admin/AdminChats"));
const AdminSettings = lazy(() => import("./admin/AdminSettings"));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function ReferralCapture() {
  const { search } = useLocation();

  useEffect(() => {
    captureReferral(search);
  }, [search]);

  return null;
}

function Protect({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function ProtectCustomer({ children }) {
  return <ProtectedRoute role="customer">{children}</ProtectedRoute>;
}

export default function App() {
  if (!firebaseReady) {
    return (
      <ToastProvider>
        <SetupScreen />
      </ToastProvider>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CatalogueProvider>
              <LocationProvider>
                <ScrollToTop />
                <ReferralCapture />
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Navigate to="/auth" replace />} />
                  <Route path="/offline" element={<Offline />} />

                  <Route
                    path="/worker"
                    element={
                      <Suspense fallback={<PageLoader label="Opening worker console…" />}>
                        <WorkerApp />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/worker/support"
                    element={
                      <Suspense fallback={<PageLoader label="Opening support…" />}>
                        <WorkerSupport />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/worker/*"
                    element={<Navigate to="/worker" replace />}
                  />

                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<PageLoader label="Opening operations console…" />}>
                        <AdminApp />
                      </Suspense>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="approvals" element={<AdminApprovals />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="bookings" element={<AdminBookings />} />
                    <Route path="tracking" element={<AdminTracking />} />
                    <Route path="zones" element={<AdminZones />} />
                    <Route path="catalog" element={<AdminCatalog />} />
                    <Route path="revenue" element={<AdminRevenue />} />
                    <Route path="promos" element={<AdminPromos />} />
                    <Route path="footer" element={<AdminFooterLinks />} />
                    <Route path="broadcast" element={<AdminBroadcast />} />
                    <Route path="chats" element={<AdminChats />} />
                    <Route path="referrals" element={<AdminReferrals />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route
                      path="*"
                      element={<Navigate to="/admin" replace />}
                    />
                  </Route>

                  <Route element={<CustomerLayout />}>
                    <Route index element={<Home />} />
                    <Route path="services" element={<Services />} />
                    <Route path="services/:key" element={<Services />} />
                    <Route path="search" element={<SearchPage />} />
                    <Route
                      path="book"
                      element={
                        <ProtectCustomer>
                          <Booking />
                        </ProtectCustomer>
                      }
                    />
                    <Route
                      path="bookings"
                      element={
                        <ProtectCustomer>
                          <Bookings />
                        </ProtectCustomer>
                      }
                    />
                    <Route
                      path="bookings/:id/track"
                      element={
                        <ProtectCustomer>
                          <Tracking />
                        </ProtectCustomer>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <ProtectCustomer>
                          <Profile />
                        </ProtectCustomer>
                      }
                    />
                    <Route
                      path="subscription"
                      element={
                        <ProtectCustomer>
                          <Subscription />
                        </ProtectCustomer>
                      }
                    />
                    <Route path="refer" element={<Refer />} />
                    <Route
                      path="chat"
                      element={
                        <Protect>
                          <Chat />
                        </Protect>
                      }
                    />
                    <Route path="workers/:id" element={<WorkerPublic />} />
                    <Route path="faq" element={<Faq />} />
                    <Route path="legal/:slug" element={<Legal />} />
                    <Route
                      path="become-a-worker"
                      element={<Navigate to="/auth?role=worker" replace />}
                    />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </LocationProvider>
            </CatalogueProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
