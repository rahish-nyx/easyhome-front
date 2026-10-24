import { useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  History,
  IndianRupee,
  KeyRound,
  Lock,
  Mail,
  Megaphone,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDateTime, timeAgo } from "../lib/format";
import { Avatar, Button, Field, Input, Modal, Textarea } from "../components/ui";
import {
  AdminPage,
  ConfirmModal,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  SegTabs,
  StatusPill,
  Toggle,
} from "./adminKit";

const EMPTY_SETTINGS = {
  commissionPct: 10,
  subscriptionPrice: 199,
  supportPhone: "",
  maintenanceMode: false,
  customerBenefits: "",
  workerBenefits: "",
};

const ACTION_LABELS = {
  "user.update": "User updated",
  "worker.approve": "Worker approved",
  "worker.reject": "Worker rejected",
  "worker.suspend": "Worker suspended",
  "worker.reinstate": "Worker reinstated",
  "worker.kyc.verified": "Worker ID verified",
  "worker.kyc.rejected": "Worker ID rejected",
  "booking.cancel": "Booking cancelled",
  "booking.markPaid": "Booking marked paid",
  "admin.add": "Admin added",
  "admin.remove": "Admin removed",
};

export default function AdminSettings() {
  const toast = useToast();
  const { fbUser } = useAuth();
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: "",
    body: "",
    active: true,
    push: false,
  });
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [adminModal, setAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [adminSaving, setAdminSaving] = useState(false);
  const [removeAdmin, setRemoveAdmin] = useState(null);
  const [removing, setRemoving] = useState(false);

  const settingsState = useAsync(() => api.get("/admin/settings"), []);
  const adminsState = useAsync(() => api.get("/admin/admins"), []);
  const auditState = useAsync(() => api.get("/admin/audit"), []);

  const admins = adminsState.data?.admins || [];
  const audit = auditState.data?.audit || [];

  useEffect(() => {
    if (!settingsState.data) return;
    const fresh = settingsState.data.settings || {};
    setForm({
      commissionPct: fresh.commissionPct ?? 10,
      subscriptionPrice: fresh.subscriptionPrice ?? 199,
      supportPhone: fresh.supportPhone || "",
      maintenanceMode: Boolean(fresh.maintenanceMode),
      customerBenefits: (fresh.customerBenefits || []).join("\n"),
      workerBenefits: (fresh.workerBenefits || []).join("\n"),
    });
    setAnnouncement((prev) => ({
      ...prev,
      title: fresh.announcement?.title || "",
      body: fresh.announcement?.body || "",
      active: fresh.announcement?.active !== false,
    }));
  }, [settingsState.data]);

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const splitLines = (value) =>
    String(value || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const saveSettings = async () => {
    if (Number(form.commissionPct) < 0 || Number(form.commissionPct) > 40) {
      toast.error("Commission must be between 0 and 40%.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        commissionPct: Number(form.commissionPct) || 0,
        subscriptionPrice: Number(form.subscriptionPrice) || 0,
        supportPhone: form.supportPhone.trim(),
        maintenanceMode: Boolean(form.maintenanceMode),
        customerBenefits: splitLines(form.customerBenefits),
        workerBenefits: splitLines(form.workerBenefits),
      };

      await api.patch("/admin/settings", payload);

      toast.success("Business settings saved.");
      await settingsState.run();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const sendAnnouncement = async () => {
    if (announcement.title.trim().length < 2) {
      toast.error("Add an announcement title.");
      return;
    }
    setAnnouncementSaving(true);
    try {
      const result = await api.post("/admin/settings/announcement", {
        title: announcement.title.trim(),
        body: announcement.body.trim(),
        active: announcement.active,
        push: announcement.push,
      });
      toast.success(
        result.notified
          ? `Announcement sent to ${result.notified} user${result.notified === 1 ? "" : "s"}.`
          : "Announcement saved.",
      );
      setAnnouncement((prev) => ({ ...prev, push: false }));
      await settingsState.run();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const addAdmin = async () => {
    if (!adminForm.email.trim()) {
      toast.error("Email is required.");
      return;
    }
    setAdminSaving(true);
    try {
      await api.post("/admin/admins", {
        email: adminForm.email.trim().toLowerCase(),
        name: adminForm.name.trim() || "EasyHome Admin",
        ...(adminForm.password ? { password: adminForm.password } : {}),
      });
      toast.success("Admin access granted.");
      setAdminModal(false);
      setAdminForm({ name: "", email: "", password: "" });
      await adminsState.run();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const removeAdminAccess = async () => {
    if (!removeAdmin) return;
    setRemoving(true);
    try {
      await api.del(`/admin/admins/${removeAdmin.id}`);
      toast.success("Admin access removed.");
      setRemoveAdmin(null);
      await adminsState.run();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AdminPage
      eyebrow="Configuration"
      title="Settings & team"
      subtitle="Business rules, membership content, announcements and who can operate the console."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          loading={settingsState.loading}
          onClick={() =>
            Promise.allSettled([
              settingsState.run(),
              adminsState.run(),
              auditState.run(),
            ]).finally(() => {})
          }
        >
          Refresh
        </Button>
      }
    >
      <div className="adm-toolbar">
        <SegTabs
          items={[
            { id: "general", label: "Business rules" },
            { id: "announcement", label: "Announcement" },
            { id: "team", label: "Admin team", count: admins.length },
            { id: "audit", label: "Audit log", count: audit.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <PageError
        error={settingsState.error}
        onRetry={() => settingsState.run().catch(() => {})}
      />

      {settingsState.loading && !settingsState.data ? (
        <LoadingBlock label="Loading settings…" />
      ) : tab === "general" ? (
        <div className="adm-settings-grid">
          <div className="adm-settings-main">
            <Panel title="Pricing & commission" subtitle="Applied to new bookings and payouts">
              <div className="adm-form-grid">
                <Field
                  label="Commission (%)"
                  htmlFor="set-commission"
                  hint="Charged on completed non-Pro jobs."
                >
                  <Input
                    id="set-commission"
                    type="number"
                    min={0}
                    max={40}
                    step="0.5"
                    value={form.commissionPct}
                    onChange={set("commissionPct")}
                  />
                </Field>
                <Field
                  label="Membership price (₹ / month)"
                  htmlFor="set-price"
                  hint="Used to calculate monthly, quarterly and yearly plans."
                >
                  <Input
                    id="set-price"
                    type="number"
                    min={0}
                    max={100000}
                    value={form.subscriptionPrice}
                    onChange={set("subscriptionPrice")}
                  />
                </Field>
                <Field
                  label="Support phone"
                  htmlFor="set-phone"
                  hint="Shown in the app footer and help screens."
                  className="adm-span-2"
                >
                  <Input
                    id="set-phone"
                    value={form.supportPhone}
                    maxLength={20}
                    onChange={set("supportPhone")}
                    placeholder="+91 98765 43210"
                  />
                </Field>
              </div>

              <div className="adm-settings-divider" />
              <Toggle
                checked={Boolean(form.maintenanceMode)}
                onChange={(next) => setForm((prev) => ({ ...prev, maintenanceMode: next }))}
                label="Maintenance mode"
                hint="Shows a maintenance notice to customers while you ship changes. Admin access stays available."
              />

              <div className="adm-settings-actions">
                <Button loading={saving} onClick={saveSettings}>
                  Save business rules
                </Button>
              </div>
            </Panel>

            <Panel
              title="Membership benefits"
              subtitle="One benefit per line. These appear on the subscription page."
            >
              <div className="adm-form-grid">
                <Field
                  label="Customer benefits"
                  htmlFor="set-customer-benefits"
                  hint="Up to 8 lines."
                >
                  <Textarea
                    id="set-customer-benefits"
                    rows={6}
                    value={form.customerBenefits}
                    onChange={set("customerBenefits")}
                    placeholder={"Priority booking\nVerified pros only\nMember-only prices"}
                  />
                </Field>
                <Field
                  label="Worker benefits"
                  htmlFor="set-worker-benefits"
                  hint="Up to 8 lines."
                >
                  <Textarea
                    id="set-worker-benefits"
                    rows={6}
                    value={form.workerBenefits}
                    onChange={set("workerBenefits")}
                    placeholder={"0% commission\nPriority job feed\nPro badge"}
                  />
                </Field>
              </div>

              <div className="adm-settings-actions">
                <Button loading={saving} onClick={saveSettings}>
                  Save membership content
                </Button>
              </div>
            </Panel>
          </div>

          <aside className="adm-settings-side">
            <Panel title="Pricing preview" subtitle="What customers will see">
              <div className="adm-price-preview">
                <span className="adm-price-preview__eyebrow">EasyHome Pro</span>
                <strong>
                  <IndianRupee size={20} />
                  {Number(form.subscriptionPrice || 0).toLocaleString("en-IN")}
                </strong>
                <span>per month, billed monthly</span>
                <ul>
                  {splitLines(form.customerBenefits).slice(0, 4).map((benefit) => (
                    <li key={benefit}>
                      <CheckCircle2 size={13} /> {benefit}
                    </li>
                  ))}
                  {!splitLines(form.customerBenefits).length ? (
                    <li className="adm-muted">Add benefits to preview them.</li>
                  ) : null}
                </ul>
              </div>
              <div className="adm-fineprint">
                <Wallet size={13} /> Worker commission is{" "}
                {Number(form.commissionPct || 0)}% unless they hold Pro.
              </div>
            </Panel>

            <Panel title="System status" subtitle="Environment at a glance">
              <div className="adm-system-list">
                <div>
                  <span>API</span>
                  <StatusPill status="active" label="Connected" />
                </div>
                <div>
                  <span>Maintenance</span>
                  {form.maintenanceMode ? (
                    <StatusPill status="rejected" label="On" />
                  ) : (
                    <StatusPill status="active" label="Off" />
                  )}
                </div>
                <div>
                  <span>Payment mode</span>
                  <StatusPill status="active" label="Razorpay · auto" />
                </div>
                <div>
                  <span>Support phone</span>
                  <strong>{form.supportPhone || "Not set"}</strong>
                </div>
              </div>
            </Panel>
          </aside>
        </div>
      ) : null}

      {tab === "announcement" ? (
        <div className="adm-settings-grid">
          <Panel title="Announcement" subtitle="Shown as an in-app banner and optional notification">
            <div className="adm-form-grid">
              <Field
                label="Title"
                htmlFor="announce-title"
                required
                className="adm-span-2"
              >
                <Input
                  id="announce-title"
                  value={announcement.title}
                  maxLength={80}
                  onChange={(event) =>
                    setAnnouncement((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Rainy day? Book a deep clean today."
                />
              </Field>
              <Field
                label="Message"
                htmlFor="announce-body"
                className="adm-span-2"
                hint="Short, useful and non-spammy."
              >
                <Textarea
                  id="announce-body"
                  rows={3}
                  maxLength={300}
                  value={announcement.body}
                  onChange={(event) =>
                    setAnnouncement((prev) => ({ ...prev, body: event.target.value }))
                  }
                  placeholder="Same-day slots available in your area. Verified pros, upfront prices."
                />
              </Field>
            </div>

            <Toggle
              checked={announcement.active}
              onChange={(next) => setAnnouncement((prev) => ({ ...prev, active: next }))}
              label="Show in the app"
              hint="The announcement appears on the customer home page."
            />

            <Toggle
              checked={announcement.push}
              onChange={(next) => setAnnouncement((prev) => ({ ...prev, push: next }))}
              label="Send as notification"
              hint="Creates an in-app notification for up to 500 accounts when saved."
            />

            <div className="adm-settings-actions">
              <Button
                icon={BellRing}
                loading={announcementSaving}
                onClick={sendAnnouncement}
              >
                {announcement.push ? "Save & notify" : "Save announcement"}
              </Button>
            </div>
          </Panel>

          <aside className="adm-settings-side">
            <Panel title="Live preview" subtitle="Customer home banner">
              <div className="adm-announcement-preview">
                <span>
                  <Megaphone size={15} /> Announcement
                </span>
                <strong>{announcement.title || "Your announcement title"}</strong>
                <p>{announcement.body || "The supporting message appears here."}</p>
              </div>
              {!announcement.active ? (
                <p className="adm-fineprint">This announcement is currently hidden.</p>
              ) : null}
            </Panel>
          </aside>
        </div>
      ) : null}

      {tab === "team" ? (
        <Panel
          title="Admin accounts"
          subtitle="Admins can access every user, worker, booking and payment record."
          action={
            <Button size="sm" icon={UserPlus} onClick={() => setAdminModal(true)}>
              Add admin
            </Button>
          }
          flush
        >
          <PageError
            error={adminsState.error}
            onRetry={() => adminsState.run().catch(() => {})}
          />
          {admins.length ? (
            <div className="adm-admin-list">
              {admins.map((admin) => (
                <div className="adm-admin-row" key={admin.id}>
                  <Avatar name={admin.name} size={40} ring />
                  <div className="grow">
                    <strong>{admin.name || "Administrator"}</strong>
                    <span>
                      {admin.email} · added {formatDateTime(admin.createdAt)}
                    </span>
                  </div>
                  {admin.id === fbUser?.uid || admin.uid === fbUser?.uid ? (
                    <StatusPill status="admin" label="You" />
                  ) : (
                    <button
                      type="button"
                      className="adm-text-action is-danger"
                      onClick={() => setRemoveAdmin(admin)}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock icon={Users} title="No admin records found" />
          )}
          <div className="adm-security-note">
            <Lock size={15} />
            <p>
              Admin access is enforced with Firebase custom claims and a matching Firestore
              record. Adding an admin grants both; removing one revokes both. You cannot remove
              your own access.
            </p>
          </div>
        </Panel>
      ) : null}

      {tab === "audit" ? (
        <Panel
          title="Audit log"
          subtitle="The last 100 sensitive actions taken in this console."
          flush
        >
          <PageError
            error={auditState.error}
            onRetry={() => auditState.run().catch(() => {})}
          />
          {audit.length ? (
            <div className="adm-audit-list">
              {audit.map((entry) => (
                <div className="adm-audit-row" key={entry.id}>
                  <span className="adm-audit-row__icon">
                    <History size={16} />
                  </span>
                  <div className="grow">
                    <strong>{ACTION_LABELS[entry.action] || entry.action}</strong>
                    <span>
                      {entry.actorId ? `Actor ${entry.actorId.slice(0, 10)}…` : "System"} ·{" "}
                      {timeAgo(entry.createdAt)}
                    </span>
                    {entry.details && Object.keys(entry.details).length ? (
                      <code>{JSON.stringify(entry.details)}</code>
                    ) : null}
                  </div>
                  <small>{formatDateTime(entry.createdAt)}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={History}
              title="No audit entries yet"
              body="Sensitive decisions will be recorded here automatically."
            />
          )}
        </Panel>
      ) : null}

      <Modal
        open={adminModal}
        onClose={() => setAdminModal(false)}
        title="Add an admin"
        subtitle="Grant full access to the operations console."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdminModal(false)}>
              Cancel
            </Button>
            <Button loading={adminSaving} onClick={addAdmin} icon={UserPlus}>
              Grant access
            </Button>
          </>
        }
      >
        <div className="stack">
          <Field label="Email" htmlFor="admin-email" required>
            <Input
              id="admin-email"
              type="email"
              value={adminForm.email}
              onChange={(event) =>
                setAdminForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="name@example.com"
            />
          </Field>
          <Field label="Display name" htmlFor="admin-name">
            <Input
              id="admin-name"
              value={adminForm.name}
              onChange={(event) =>
                setAdminForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Operations lead"
            />
          </Field>
          <Field
            label="Temporary password"
            htmlFor="admin-password"
            hint="Only needed when the email does not already have a Firebase account. Minimum 8 characters."
          >
            <Input
              id="admin-password"
              type="password"
              autoComplete="new-password"
              value={adminForm.password}
              onChange={(event) =>
                setAdminForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="••••••••"
            />
          </Field>
          <p className="tiny muted">
            The new admin will need to sign out and back in (or refresh claims) before the admin
            flag appears.
          </p>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(removeAdmin)}
        onClose={() => setRemoveAdmin(null)}
        title="Remove admin access?"
        subtitle={removeAdmin?.email}
        confirmLabel="Remove access"
        loading={removing}
        onConfirm={removeAdminAccess}
      >
        <p className="small muted">
          {removeAdmin?.name || "This admin"} will immediately lose access to the operations
          console. Their normal EasyHome account is not deleted.
        </p>
      </ConfirmModal>
    </AdminPage>
  );
}
