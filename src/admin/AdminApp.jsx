import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  Layers,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessagesSquare,
  Navigation,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/admin.css";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { ADMIN_NAV } from "../lib/constants";
import { formatDate } from "../lib/format";
import { Avatar, Button, PageLoader } from "../components/ui";
import { usePageMeta } from "../lib/usePageMeta";

const ICONS = {
  "layout-dashboard": LayoutDashboard,
  "shield-check": ShieldCheck,
  users: Users,
  "calendar-check": CalendarCheck,
  layers: Layers,
  wallet: Wallet,
  megaphone: Megaphone,
  "messages-square": MessagesSquare,
  settings: Settings,
  navigation: Navigation,
  "map-pin": MapPin,
};

export default function AdminApp() {
  const { fbUser, profile, isAdmin, loading, logout, refreshClaims } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [refreshingClaims, setRefreshingClaims] = useState(false);

  const overviewState = useAsync(() => api.get("/admin/overview"), [isAdmin], {
    immediate: isAdmin,
  });
  const stats = overviewState.data?.stats;

  useEffect(() => {
    document.body.classList.add("adm-mode");
    return () => document.body.classList.remove("adm-mode");
  }, []);

  useEffect(() => {
    setDrawer(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const timer = setInterval(() => {
      overviewState.run().catch(() => {});
    }, 90000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const meta = useMemo(() => {
    const path = location.pathname.replace(/\/$/, "");
    return (
      ADMIN_NAV.find((item) => (item.end ? path === item.to : path.startsWith(item.to))) ||
      ADMIN_NAV[0]
    );
  }, [location.pathname]);

  usePageMeta(`${meta.label} · EasyHome Admin`, "EasyHome operations console.");

  if (loading) return <PageLoader label="Loading operations console…" />;

  if (!fbUser) {
    return <Navigate to={`/auth?next=${encodeURIComponent("/admin")}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <div className="admin-gate__card">
          <span className="admin-gate__mark">
            <ShieldAlert size={26} />
          </span>
          <p className="adm-eyebrow">Restricted area</p>
          <h1>Admin access required</h1>
          <p>
            You are signed in as <strong>{fbUser.email}</strong>, but this account does not have
            admin claims yet. If access was just granted, refresh your claims.
          </p>
          <div className="admin-gate__actions">
            <Button
              loading={refreshingClaims}
              icon={RefreshCw}
              onClick={async () => {
                setRefreshingClaims(true);
                try {
                  await refreshClaims();
                  toast.success("Claims refreshed.");
                } catch (error) {
                  toast.error(error.message);
                } finally {
                  setRefreshingClaims(false);
                }
              }}
            >
              Refresh access
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to EasyHome
            </Button>
            <Button variant="ghost" icon={LogOut} onClick={logout}>
              Sign out
            </Button>
          </div>
          {!overviewState.error ? null : (
            <p className="admin-gate__note">
              Admin API: {overviewState.error.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  const counts = {
    approvals: stats?.pendingWorkers || 0,
    revenue: (stats?.pendingSubscriptions || 0) + (stats?.pendingCommissionCount || 0),
    chats: stats?.unreadChats || 0,
  };

  const navBadge = (to) => {
    if (to === "/admin/approvals") return counts.approvals;
    if (to === "/admin/revenue") return counts.revenue;
    if (to === "/admin/chats") return counts.chats;
    return 0;
  };

  const sidebar = (
    <>
      <div className="adm-brand">
        <span className="adm-brand__mark">
          <img src={logo} alt="" />
        </span>
        <span className="adm-brand__copy">
          <strong>
            Easy<span>Home</span>
          </strong>
          <small>Operations console</small>
        </span>
        <button
          type="button"
          className="adm-drawer-close"
          onClick={() => setDrawer(false)}
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="adm-nav" aria-label="Admin navigation">
        <p className="adm-nav__label">Workspace</p>
        {ADMIN_NAV.slice(0, 5).map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const badge = navBadge(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {badge ? <em>{badge > 99 ? "99+" : badge}</em> : null}
            </NavLink>
          );
        })}

        <p className="adm-nav__label">Growth &amp; support</p>
        {ADMIN_NAV.slice(5).map((item) => {
          const Icon = ICONS[item.icon] || Settings;
          const badge = navBadge(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {badge ? <em>{badge > 99 ? "99+" : badge}</em> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="adm-sidebar__foot">
        <Link to="/" className="adm-open-app">
          <ExternalLink size={15} /> Open customer app
        </Link>
        <div className="adm-signed">
          <Avatar name={profile?.name || fbUser.email} path={profile?.photoPath} size={36} />
          <div>
            <strong>{profile?.name || "Administrator"}</strong>
            <span>{fbUser.email}</span>
          </div>
          <button type="button" onClick={logout} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-shell">
      <aside className="adm-sidebar">{sidebar}</aside>

      {drawer ? (
        <div className="adm-drawer" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button
            type="button"
            className="adm-drawer__scrim"
            onClick={() => setDrawer(false)}
            aria-label="Close navigation"
          />
          <div className="adm-drawer__panel">{sidebar}</div>
        </div>
      ) : null}

      <div className="admin-main">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-burger"
            onClick={() => setDrawer(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="adm-crumb">
            <span>EasyHome</span>
            <ChevronRight size={13} />
            <strong>{meta.label}</strong>
          </div>

          <div className="adm-topbar__right">
            <span className="adm-system">
              <i /> Systems live
            </span>
            <span className="adm-topbar__date">{formatDate(new Date())}</span>
            <Link to="/admin/chats" className="adm-topbar__icon" aria-label="Support inbox">
              <MessagesSquare size={18} />
              {counts.chats ? <em>{counts.chats > 9 ? "9+" : counts.chats}</em> : null}
            </Link>
            <Link to="/admin/approvals" className="adm-topbar__chip">
              <Sparkles size={14} />
              {counts.approvals ? `${counts.approvals} to review` : "All clear"}
            </Link>
            <Avatar
              name={profile?.name || fbUser.email}
              path={profile?.photoPath}
              size={34}
            />
          </div>
        </header>

        {overviewState.error ? (
          <div className="adm-api-warning">
            <ShieldAlert size={16} />
            <span>
              Overview refresh failed: {overviewState.error.message}. Other sections may still
              work.
            </span>
            <button type="button" onClick={() => overviewState.run().catch(() => {})}>
              Retry
            </button>
          </div>
        ) : null}

        <main className="adm-content">
          <Suspense fallback={<PageLoader label="Loading section…" />}>
            <Outlet
              context={{
                overview: overviewState.data,
                overviewLoading: overviewState.loading,
                overviewError: overviewState.error,
                stats,
                refreshShell: overviewState.run,
              }}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
