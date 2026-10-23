import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Crown,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate, formatDateTime, inr, isActiveUntil, maskPhone, planLabel } from "../lib/format";
import { Avatar, Button, Modal } from "../components/ui";
import {
  AdminPage,
  ConfirmModal,
  EmptyBlock,
  KeyValue,
  LoadingBlock,
  PageError,
  Panel,
  PersonCell,
  SearchField,
  SegTabs,
  StatCard,
  StatusPill,
  TimeCell,
} from "./adminKit";

const ROLE_TABS = [
  { id: "all", label: "Everyone" },
  { id: "customer", label: "Customers" },
  { id: "worker", label: "Workers" },
  { id: "disabled", label: "Disabled" },
];

export default function AdminUsers() {
  const { refreshShell } = useOutletContext();
  const toast = useToast();
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const [disableTarget, setDisableTarget] = useState(null);
  const [busy, setBusy] = useState("");

  const usersState = useAsync(() => api.get("/admin/users"), []);
  const users = usersState.data?.users || [];

  const counts = useMemo(
    () => ({
      all: users.length,
      customer: users.filter((user) => user.role === "customer").length,
      worker: users.filter((user) => user.role === "worker").length,
      disabled: users.filter((user) => user.disabled).length,
    }),
    [users],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (role === "disabled" && !user.disabled) return false;
      if (role !== "all" && role !== "disabled" && user.role !== role) return false;
      if (!term) return true;
      return [user.name, user.email, user.phone, user.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [users, role, query]);

  const toggleDisabled = async () => {
    if (!disableTarget) return;
    const next = !disableTarget.disabled;
    setBusy(disableTarget.id);
    try {
      await api.patch(`/admin/users/${disableTarget.id}`, { disabled: next });
      toast.success(
        next
          ? "Account disabled. The user can no longer sign in."
          : "Account re-enabled. The user can sign in again.",
      );
      setDisableTarget(null);
      await Promise.allSettled([usersState.run(), refreshShell()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const subscribed = users.filter(
    (user) => user.subscription?.status === "active" && isActiveUntil(user.subscription?.endAt),
  ).length;

  return (
    <AdminPage
      eyebrow="People"
      title="Users"
      subtitle="Customers and worker accounts, access status and membership state."
      actions={
        <>
          <span className="adm-count-chip">{filtered.length} shown</span>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={usersState.loading}
            onClick={() => usersState.run().catch(() => {})}
          >
            Refresh
          </Button>
        </>
      }
    >
      <section className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Total accounts"
          value={counts.all}
          hint="Most recent 150 accounts"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Customers"
          value={counts.customer}
          hint="Demand side"
          icon={UserCheck}
          tone="yellow"
        />
        <StatCard
          label="Workers"
          value={counts.worker}
          hint="Approved, pending and suspended"
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Disabled"
          value={counts.disabled}
          hint={`${subscribed} active memberships`}
          icon={Ban}
          tone={counts.disabled ? "red" : "plain"}
        />
      </section>

      <div className="adm-toolbar">
        <SegTabs
          items={ROLE_TABS.map((tab) => ({ ...tab, count: counts[tab.id] }))}
          value={role}
          onChange={setRole}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, phone or UID…"
          onClear={() => setQuery("")}
        />
      </div>

      <PageError error={usersState.error} onRetry={() => usersState.run().catch(() => {})} />

      {usersState.loading && !usersState.data ? (
        <LoadingBlock label="Loading people…" />
      ) : (
        <Panel flush>
          {filtered.length ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Membership</th>
                    <th>Joined</th>
                    <th>Access</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const premium =
                      user.subscription?.status === "active" &&
                      isActiveUntil(user.subscription?.endAt);
                    return (
                      <tr key={user.id}>
                        <td>
                          <PersonCell
                            name={user.name}
                            email={user.email}
                            photoPath={user.photoPath}
                          />
                        </td>
                        <td>
                          <StatusPill status={user.role} />
                        </td>
                        <td>
                          <span className="adm-table__muted">
                            {user.phone ? maskPhone(user.phone) : "No phone"}
                          </span>
                        </td>
                        <td>
                          {premium ? (
                            <span className="adm-member">
                              <Crown size={13} />
                              {planLabel(user.subscription?.plan)}
                            </span>
                          ) : (
                            <span className="adm-table__muted">Free</span>
                          )}
                        </td>
                        <td>
                          <TimeCell value={user.createdAt} />
                        </td>
                        <td>
                          {user.disabled ? (
                            <StatusPill status="rejected" label="Disabled" />
                          ) : (
                            <StatusPill status="active" label="Can sign in" />
                          )}
                        </td>
                        <td>
                          <div className="adm-row-actions">
                            <button type="button" onClick={() => setDetail(user)}>
                              Details
                            </button>
                            <button
                              type="button"
                              className={user.disabled ? "is-positive" : "is-danger"}
                              onClick={() => setDisableTarget(user)}
                            >
                              {user.disabled ? "Enable" : "Disable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock
              icon={Users}
              title={query ? "No matching accounts" : "No accounts in this segment"}
              body={
                query
                  ? "Try a partial name, email or phone number."
                  : "New sign-ups will appear here automatically."
              }
            />
          )}
        </Panel>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name || "Account details"}
        subtitle={detail?.email}
        size="md"
      >
        {detail ? (
          <div className="stack">
            <div className="adm-profile-head">
              <Avatar name={detail.name} path={detail.photoPath} size={64} ring={detail.isPremium} />
              <div className="grow">
                <h2>{detail.name || "Unnamed account"}</h2>
                <p>{detail.email}</p>
                <div className="adm-inline-badges">
                  <StatusPill status={detail.role} />
                  {detail.disabled ? (
                    <StatusPill status="rejected" label="Disabled" />
                  ) : (
                    <StatusPill status="active" label="Active" />
                  )}
                  {detail.subscription?.status === "active" ? (
                    <StatusPill status="active" label={planLabel(detail.subscription.plan)} />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="adm-kv-grid">
              <KeyValue
                label="Account ID"
                value={<span className="adm-mono">{detail.id}</span>}
              />
              <KeyValue label="Phone" value={detail.phone || "—"} />
              <KeyValue label="Role" value={detail.role || "customer"} />
              <KeyValue label="City" value={detail.city || "—"} />
              <KeyValue
                label="Membership"
                value={planLabel(detail.subscription?.plan) || "Free"}
              />
              <KeyValue
                label="Membership ends"
                value={
                  detail.subscription?.endAt ? formatDate(detail.subscription.endAt) : "—"
                }
              />
              <KeyValue
                label="Amount paid"
                value={
                  detail.subscription?.amount ? inr(detail.subscription.amount) : "—"
                }
              />
              <KeyValue label="Joined" value={formatDateTime(detail.createdAt)} />
            </div>

            {detail.addresses?.length ? (
              <div>
                <h3 className="adm-subhead">Saved addresses</h3>
                <div className="adm-address-list">
                  {detail.addresses.map((address, index) => (
                    <div className="adm-address" key={address.id || index}>
                      <MapPin size={15} />
                      <div>
                        <strong>{address.label || `Address ${index + 1}`}</strong>
                        <span>
                          {[address.line, address.area, address.pincode]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="adm-inline-actions">
              <a
                href={`mailto:${detail.email}`}
                className="adm-link-button"
              >
                <Mail size={15} /> Email
              </a>
              {detail.phone ? (
                <a href={`tel:${detail.phone}`} className="adm-link-button">
                  <Phone size={15} /> Call
                </a>
              ) : null}
              <button
                type="button"
                className={`adm-link-button ${detail.disabled ? "" : "is-danger"}`}
                onClick={() => {
                  setDisableTarget(detail);
                  setDetail(null);
                }}
              >
                {detail.disabled ? <CheckCircle2 size={15} /> : <Ban size={15} />}
                {detail.disabled ? "Enable account" : "Disable account"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={Boolean(disableTarget)}
        onClose={() => setDisableTarget(null)}
        title={disableTarget?.disabled ? "Enable this account?" : "Disable this account?"}
        subtitle={disableTarget ? `${disableTarget.name} · ${disableTarget.email}` : ""}
        confirmLabel={disableTarget?.disabled ? "Enable account" : "Disable account"}
        loading={busy === disableTarget?.id}
        tone={disableTarget?.disabled ? "safe" : "danger"}
        onConfirm={toggleDisabled}
      >
        <p className="small muted">
          {disableTarget?.disabled
            ? "The user will be able to sign in and use EasyHome again immediately."
            : "The user will be signed out of Firebase Auth and blocked from signing in. Worker profiles are hidden from customers. Existing data is preserved."}
        </p>
      </ConfirmModal>
    </AdminPage>
  );
}
