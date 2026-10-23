import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CircleAlert,
  Clock3,
  Crown,
  IndianRupee,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { inr, timeAgo } from "../lib/format";
import { Avatar, Button } from "../components/ui";
import {
  AdminPage,
  EmptyBlock,
  KeyValue,
  LoadingBlock,
  PageError,
  Panel,
  PersonCell,
  RevenueChart,
  StatCard,
  StatusPill,
  TimeCell,
} from "./adminKit";

export default function AdminDashboard() {
  const {
    overview,
    overviewLoading,
    overviewError,
    refreshShell,
  } = useOutletContext();
  const { profile } = useAuth();
  const toast = useToast();

  const stats = overview?.stats;
  const months = overview?.charts?.months || [];
  const bookings = stats?.bookings || {};
  const totalBookings =
    (bookings.pending || 0) +
    (bookings.accepted || 0) +
    (bookings.ongoing || 0) +
    (bookings.completed || 0) +
    (bookings.cancelled || 0);

  const refresh = async () => {
    try {
      await refreshShell();
      toast.success("Dashboard refreshed.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (overviewLoading && !overview) {
    return (
      <AdminPage eyebrow="Command center" title="Overview">
        <LoadingBlock label="Loading operations snapshot…" />
      </AdminPage>
    );
  }

  if (overviewError && !overview) {
    return (
      <AdminPage eyebrow="Command center" title="Overview">
        <PageError error={overviewError} onRetry={refresh} />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow="Command center"
      title={`${greeting}, ${String(profile?.name || "Admin").split(" ")[0]}.`}
      subtitle="Live marketplace health, revenue and the queues that need a human decision."
      actions={
        <>
          <span className="adm-live-chip">
            <i /> Live data
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={overviewLoading}
            onClick={refresh}
          >
            Refresh
          </Button>
        </>
      }
    >
      <section className="adm-stat-grid">
        <StatCard
          label="Revenue · 30 days"
          value={inr(stats?.revenue30d)}
          hint="Paid jobs in the last 30 days"
          icon={TrendingUp}
          tone="yellow"
          to="/admin/revenue"
        />
        <StatCard
          label="Bookings today"
          value={stats?.bookingsToday || 0}
          hint={`${totalBookings} total bookings`}
          icon={CalendarCheck}
          tone="blue"
          to="/admin/bookings"
        />
        <StatCard
          label="Worker approvals"
          value={stats?.pendingWorkers || 0}
          hint={stats?.pendingWorkers ? "Waiting for review" : "Queue is clear"}
          icon={ShieldCheck}
          tone={stats?.pendingWorkers ? "red" : "green"}
          to="/admin/approvals"
        />
        <StatCard
          label="Membership approvals"
          value={stats?.pendingSubscriptions || 0}
          hint={`${stats?.activeSubscriptions || 0} active members`}
          icon={Crown}
          tone="purple"
          to="/admin/revenue"
        />
        <StatCard
          label="Commission to verify"
          value={inr(stats?.pendingCommissions)}
          hint={`${stats?.pendingCommissionCount || 0} payment submissions`}
          icon={Wallet}
          tone="green"
          to="/admin/revenue"
        />
        <StatCard
          label="Unread support"
          value={stats?.unreadChats || 0}
          hint="Customer & worker messages"
          icon={MessagesSquare}
          tone={stats?.unreadChats ? "red" : "plain"}
          to="/admin/chats"
        />
        <StatCard
          label="Active workers"
          value={stats?.workers || 0}
          hint={`${stats?.customers || 0} customers`}
          icon={UserCheck}
          tone="blue"
          to="/admin/approvals"
        />
        <StatCard
          label="Live jobs"
          value={(bookings.accepted || 0) + (bookings.ongoing || 0)}
          hint={`${bookings.pending || 0} waiting for a pro`}
          icon={Sparkles}
          tone="yellow"
          to="/admin/bookings"
        />
      </section>

      <div className="adm-grid-2">
        <Panel
          title="Revenue momentum"
          subtitle="Memberships + commission, last six months"
          action={<Link to="/admin/revenue" className="adm-view-link">Revenue <ArrowRight size={13} /></Link>}
        >
          <RevenueChart months={months} height={220} />
          <div className="adm-chart-foot">
            <div>
              <span>This month</span>
              <strong>{inr(months[months.length - 1]?.amount)}</strong>
            </div>
            <div>
              <span>Memberships</span>
              <strong>{inr(months[months.length - 1]?.subscriptions)}</strong>
            </div>
            <div>
              <span>Commission</span>
              <strong>{inr(months[months.length - 1]?.commissions)}</strong>
            </div>
          </div>
        </Panel>

        <Panel
          title="Booking pipeline"
          subtitle="Where every job currently sits"
          action={<Link to="/admin/bookings" className="adm-view-link">Manage <ArrowRight size={13} /></Link>}
        >
          <div className="adm-pipeline">
            {[
              { id: "pending", label: "Finding a pro", value: bookings.pending || 0, tone: "yellow" },
              { id: "accepted", label: "Assigned", value: bookings.accepted || 0, tone: "blue" },
              { id: "ongoing", label: "In progress", value: bookings.ongoing || 0, tone: "purple" },
              { id: "completed", label: "Completed", value: bookings.completed || 0, tone: "green" },
              { id: "cancelled", label: "Cancelled", value: bookings.cancelled || 0, tone: "red" },
            ].map((row) => {
              const percent = totalBookings
                ? Math.max(2, Math.round((row.value / totalBookings) * 100))
                : 2;
              return (
                <div className="adm-pipeline__row" key={row.id}>
                  <div className="adm-pipeline__top">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="adm-pipeline__track">
                    <i className={`is-${row.tone}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="adm-pipeline__total">
            <span>Total bookings</span>
            <strong>{totalBookings}</strong>
          </div>
        </Panel>
      </div>

      <div className="adm-grid-2 adm-grid-2--wide">
        <Panel
          title="Verification queue"
          subtitle="Worker applications waiting for a review"
          action={
            <Link to="/admin/approvals" className="adm-view-link">
              Open queue <ArrowRight size={13} />
            </Link>
          }
          flush
        >
          {overview?.pendingWorkerList?.length ? (
            <div className="adm-queue">
              {overview.pendingWorkerList.map((worker) => (
                <Link
                  key={worker.id}
                  to={`/admin/approvals?worker=${worker.id}`}
                  className="adm-queue__row"
                >
                  <Avatar name={worker.name} path={worker.photoPath} size={38} />
                  <div className="grow">
                    <strong>{worker.name || "Unnamed worker"}</strong>
                    <span>
                      {worker.service || "Trade"} · {worker.area || "Area"} ·{" "}
                      {timeAgo(worker.createdAt)}
                    </span>
                  </div>
                  <StatusPill status={worker.status} />
                  <StatusPill status={worker.kycStatus} />
                  <ArrowRight size={15} className="adm-queue__arrow" />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={ShieldCheck}
              title="No pending applications"
              body="New worker applications will appear here for verification."
            />
          )}
        </Panel>

        <Panel
          title="Recent bookings"
          subtitle="Newest jobs across the marketplace"
          action={
            <Link to="/admin/bookings" className="adm-view-link">
              All bookings <ArrowRight size={13} />
            </Link>
          }
          flush
        >
          {overview?.recentBookings?.length ? (
            <div className="adm-feed">
              {overview.recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/admin/bookings?booking=${booking.id}`}
                  className="adm-feed__row"
                >
                  <span className="adm-feed__icon">
                    <CalendarCheck size={17} />
                  </span>
                  <div className="grow">
                    <strong>{booking.service}</strong>
                    <span>
                      {booking.customerName || "Customer"} · {booking.area}
                    </span>
                  </div>
                  <div className="adm-feed__meta">
                    <strong>{inr(booking.pricing?.finalPrice || booking.budget)}</strong>
                    <TimeCell value={booking.createdAt} />
                  </div>
                  <StatusPill status={booking.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyBlock icon={CalendarCheck} title="No bookings yet" body="New jobs show up here." />
          )}
        </Panel>
      </div>

      <div className="adm-grid-2">
        <Panel title="Newest customers" subtitle="Latest accounts created">
          {overview?.recentUsers?.length ? (
            <div className="adm-people">
              {overview.recentUsers.map((user) => (
                <div className="adm-people__row" key={user.id}>
                  <PersonCell
                    name={user.name}
                    email={user.email}
                    photoPath={user.photoPath}
                    size={34}
                  />
                  <StatusPill status={user.role} />
                  <TimeCell value={user.createdAt} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock icon={Users} title="No accounts yet" />
          )}
        </Panel>

        <Panel title="Operations checklist" subtitle="Keep the marketplace healthy">
          <div className="adm-checklist">
            <Link to="/admin/approvals" className="adm-checklist__item">
              <span className={stats?.pendingWorkers ? "is-warn" : "is-ok"}>
                {stats?.pendingWorkers ? <CircleAlert size={17} /> : <ShieldCheck size={17} />}
              </span>
              <div>
                <strong>Verify worker applications</strong>
                <small>
                  {stats?.pendingWorkers
                    ? `${stats.pendingWorkers} waiting — reviews unlock new supply.`
                    : "Queue clear. Great work."}
                </small>
              </div>
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/revenue" className="adm-checklist__item">
              <span className={stats?.pendingSubscriptions ? "is-warn" : "is-ok"}>
                <Crown size={17} />
              </span>
              <div>
                <strong>Approve membership payments</strong>
                <small>
                  {stats?.pendingSubscriptions
                    ? `${stats.pendingSubscriptions} pending activation.`
                    : "No memberships waiting."}
                </small>
              </div>
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/revenue" className="adm-checklist__item">
              <span className={stats?.pendingCommissionCount ? "is-warn" : "is-ok"}>
                <IndianRupee size={17} />
              </span>
              <div>
                <strong>Reconcile commissions</strong>
                <small>
                  {stats?.pendingCommissionCount
                    ? `${stats.pendingCommissionCount} worker payments to check.`
                    : "All commission payments reconciled."}
                </small>
              </div>
              <ArrowRight size={15} />
            </Link>
            <Link to="/admin/chats" className="adm-checklist__item">
              <span className={stats?.unreadChats ? "is-warn" : "is-ok"}>
                <Clock3 size={17} />
              </span>
              <div>
                <strong>Answer support messages</strong>
                <small>
                  {stats?.unreadChats
                    ? `${stats.unreadChats} unread threads need a reply.`
                    : "Inbox is clear."}
                </small>
              </div>
              <ArrowRight size={15} />
            </Link>
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}
