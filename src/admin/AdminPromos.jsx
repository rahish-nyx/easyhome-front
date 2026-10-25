import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarRange,
  Eye,
  ImageOff,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDate, toDate } from "../lib/format";
import { mediaUrl } from "../lib/media";
import { Button, Field, Input, Modal, Select, Textarea } from "../components/ui";
import { ImageUpload } from "../components/common";
import {
  AdminPage,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  StatCard,
  StatusPill,
  Toggle,
} from "./adminKit";

const THEMES = [
  { id: "yellow", label: "Yellow / black" },
  { id: "dark", label: "Midnight" },
  { id: "blue", label: "Electric blue" },
  { id: "orange", label: "Sunset orange" },
];

const PLACEMENTS = [
  { id: "customer_home", label: "Customer home page" },
  { id: "worker_dashboard", label: "Worker dashboard" },
];

const EMPTY_PROMO = {
  title: "",
  subtitle: "",
  ctaText: "Book now",
  ctaLink: "/",
  placement: "customer_home",
  theme: "yellow",
  active: true,
  order: 0,
  startsAt: "",
  endsAt: "",
};

function toLocalInput(value) {
  const date = toDate(value);
  if (!date) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export default function AdminPromos() {
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [file, setFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState("");

  const promosState = useAsync(() => api.get("/admin/promos"), []);
  const promos = promosState.data?.promos || [];

  const sorted = useMemo(
    () => [...promos].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [promos],
  );

  const active = promos.filter((promo) => promo.active).length;
  const customerPromos = sorted.filter(
    (promo) => promo.active && promo.placement !== "worker_dashboard",
  );
  const workerPromos = sorted.filter(
    (promo) => promo.active && promo.placement === "worker_dashboard",
  );

  const refresh = () => promosState.run().catch(() => {});

  const toggle = async (promo) => {
    setBusy(`toggle:${promo.id}`);
    try {
      await api.patch(`/admin/promos/${promo.id}`, { active: !promo.active });
      toast.success(
        promo.active
          ? "Promo hidden."
          : `Promo is live on the ${promo.placement === "worker_dashboard" ? "worker dashboard" : "customer home page"}.`,
      );
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const move = async (promo, direction) => {
    const index = sorted.findIndex((item) => item.id === promo.id);
    const swap = sorted[index + direction];
    if (!swap) return;
    setBusy(`move:${promo.id}`);
    try {
      await Promise.all([
        api.patch(`/admin/promos/${promo.id}`, { order: Number(swap.order) || 0 }),
        api.patch(`/admin/promos/${swap.id}`, { order: Number(promo.order) || 0 }),
      ]);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const save = async (form) => {
    setBusy("save");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "startsAt" || key === "endsAt") {
          data.append(key, fromLocalInput(value));
        } else {
          data.append(key, String(value));
        }
      });
      if (file) data.append("image", file);
      if (form.id) {
        await api.uploadPatch(`/admin/promos/${form.id}`, data);
        toast.success("Promo updated.");
      } else {
        await api.upload("/admin/promos", data);
        toast.success(
          `Promo published to the ${form.placement === "worker_dashboard" ? "worker dashboard" : "customer home page"}.`,
        );
      }
      setDraft(null);
      setFile(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(`delete:${deleteTarget.id}`);
    try {
      await api.del(`/admin/promos/${deleteTarget.id}`);
      toast.success("Promo deleted.");
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminPage
      eyebrow="Growth"
      title="Promo banners"
      subtitle="Publish and schedule campaigns for the customer storefront or worker dashboard."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={promosState.loading}
            onClick={refresh}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => {
              setFile(null);
              setDraft({ ...EMPTY_PROMO, order: sorted.length });
            }}
          >
            New promo
          </Button>
        </>
      }
    >
      <section className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Campaigns"
          value={promos.length}
          hint="All promo banners"
          icon={Megaphone}
          tone="yellow"
        />
        <StatCard
          label="Live"
          value={active}
          hint="Visible in the selected placement"
          icon={Sparkles}
          tone="green"
        />
        <StatCard
          label="Hidden"
          value={promos.length - active}
          hint="Drafts or paused campaigns"
          icon={Eye}
          tone={promos.length - active ? "purple" : "plain"}
        />
        <StatCard
          label="Scheduled windows"
          value={promos.filter((promo) => promo.startsAt || promo.endsAt).length}
          hint="With start or end dates"
          icon={CalendarRange}
          tone="blue"
        />
      </section>

      {customerPromos.length ? (
        <Panel
          title="Customer home preview"
          subtitle="Active promotions configured for customer home"
        >
          <div className="adm-promo-preview">
            {customerPromos.map((promo) => (
                <div
                  key={promo.id}
                  className={`adm-promo-preview__card is-${promo.theme || "yellow"}`}
                >
                  {promo.imagePath ? (
                    <img src={mediaUrl(promo.imagePath)} alt="" />
                  ) : (
                    <span className="adm-promo-preview__glow" />
                  )}
                  <div>
                    <strong>{promo.title}</strong>
                    <span>{promo.subtitle || "Tap to book a service today."}</span>
                    <em>{promo.ctaText || "Book now"}</em>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      ) : null}
      {workerPromos.length ? (
        <Panel
          title="Worker dashboard preview"
          subtitle="Promotions appear below the worker earnings summary"
        >
          <div className="adm-promo-preview">
            {workerPromos.map((promo) => (
              <div
                key={promo.id}
                className={`adm-promo-preview__card is-${promo.theme || "blue"}`}
              >
                {promo.imagePath ? (
                  <img src={mediaUrl(promo.imagePath)} alt="" />
                ) : (
                  <span className="adm-promo-preview__glow" />
                )}
                <div>
                  <strong>{promo.title}</strong>
                  <span>{promo.subtitle || "Promotion for EasyHome professionals."}</span>
                  <em>{promo.ctaText || "Learn more"}</em>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <PageError error={promosState.error} onRetry={refresh} />

      {promosState.loading && !promosState.data ? (
        <LoadingBlock label="Loading promo campaigns…" />
      ) : (
        <Panel flush>
          {sorted.length ? (
            <div className="adm-promo-list">
              {sorted.map((promo, index) => (
                <article className="adm-promo-row" key={promo.id}>
                  <span className="adm-promo-row__order">{index + 1}</span>
                  <div className={`adm-promo-row__thumb is-${promo.theme || "yellow"}`}>
                    {promo.imagePath ? (
                      <img src={mediaUrl(promo.imagePath)} alt="" />
                    ) : (
                      <ImageOff size={18} />
                    )}
                  </div>
                  <div className="grow">
                    <div className="adm-approval__title">
                      <strong>{promo.title}</strong>
                      <StatusPill
                        status={promo.active ? "active" : "expired"}
                        label={promo.active ? "Live" : "Hidden"}
                      />
                    </div>
                    <p>
                      {promo.subtitle || "No subtitle"} · CTA “{promo.ctaText}” →{" "}
                      {promo.ctaLink}
                    </p>
                    <small className="adm-note-inline">
                      {promo.placement === "worker_dashboard"
                        ? "Worker dashboard · "
                        : "Customer home · "}
                      {promo.startsAt || promo.endsAt
                        ? `${promo.startsAt ? formatDate(promo.startsAt) : "Now"} – ${
                            promo.endsAt ? formatDate(promo.endsAt) : "No end"
                          }`
                        : "Always on"}
                    </small>
                  </div>
                  <div className="adm-promo-row__actions">
                    <button
                      type="button"
                      className="adm-icon-action"
                      onClick={() => move(promo, -1)}
                      disabled={index === 0 || Boolean(busy)}
                      aria-label="Move promo up"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icon-action"
                      onClick={() => move(promo, 1)}
                      disabled={index === sorted.length - 1 || Boolean(busy)}
                      aria-label="Move promo down"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icon-action"
                      onClick={() => {
                        setFile(null);
                        setDraft({
                          ...promo,
                          placement: promo.placement || "customer_home",
                          startsAt: toLocalInput(promo.startsAt),
                          endsAt: toLocalInput(promo.endsAt),
                        });
                      }}
                      aria-label="Edit promo"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-icon-action is-danger"
                      onClick={() => setDeleteTarget(promo)}
                      aria-label="Delete promo"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="adm-text-action"
                      onClick={() => toggle(promo)}
                      disabled={busy === `toggle:${promo.id}`}
                    >
                      {promo.active ? "Hide" : "Publish"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock
              icon={Megaphone}
              title="No promo banners yet"
              body="Create a campaign to welcome customers with an offer or seasonal message."
              action={
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    setFile(null);
                    setDraft({ ...EMPTY_PROMO });
                  }}
                >
                  Create promo
                </Button>
              }
            />
          )}
        </Panel>
      )}

      <PromoModal
        draft={draft}
        file={file}
        onFile={setFile}
        loading={busy === "save"}
        onClose={() => {
          setDraft(null);
          setFile(null);
        }}
        onSave={save}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this promo?"
        subtitle={deleteTarget?.title}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="adm-danger-btn"
              loading={busy === `delete:${deleteTarget?.id}`}
              onClick={remove}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <p className="small muted">
          The banner is removed immediately. This cannot be undone — hide it instead if you only
          want to pause the campaign.
        </p>
      </Modal>
    </AdminPage>
  );
}

function PromoModal({ draft, file, onFile, onClose, onSave, loading }) {
  const [form, setForm] = useState(draft || EMPTY_PROMO);

  useEffect(() => {
    setForm(draft || EMPTY_PROMO);
  }, [draft]);

  const set = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  if (!draft) return null;

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft.id ? "Edit promo" : "New promo"}
      subtitle="Choose where this promotion appears."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              if (!form.title.trim()) return;
              onSave({
                ...form,
                title: form.title.trim(),
                subtitle: form.subtitle.trim(),
                ctaText: form.ctaText.trim(),
                ctaLink: form.ctaLink.trim(),
              }).catch(() => {});
            }}
          >
            {draft.id ? "Save promo" : "Publish promo"}
          </Button>
        </>
      }
    >
      <div className={`adm-promo-form-preview is-${form.theme || "yellow"}`}>
        {file || draft.imagePath ? (
          <img
            src={file ? URL.createObjectURL(file) : mediaUrl(draft.imagePath)}
            alt="Promo preview"
          />
        ) : null}
        <div>
          <strong>{form.title || "Your headline"}</strong>
          <span>{form.subtitle || "A short supporting line."}</span>
          <em>{form.ctaText || "Book now"}</em>
        </div>
      </div>

      <div className="adm-form-grid">
        <Field label="Headline" htmlFor="promo-title" required className="adm-span-2">
          <Input
            id="promo-title"
            value={form.title}
            maxLength={80}
            onChange={set("title")}
            placeholder="Monsoon home refresh — 20% off"
          />
        </Field>
        <Field
          label="Supporting line"
          htmlFor="promo-subtitle"
          hint={`${String(form.subtitle || "").length}/140`}
          className="adm-span-2"
        >
          <Input
            id="promo-subtitle"
            value={form.subtitle}
            maxLength={140}
            onChange={set("subtitle")}
            placeholder="Verified pros. Upfront prices. Same-day slots."
          />
        </Field>
        <Field label="Button label" htmlFor="promo-cta">
          <Input
            id="promo-cta"
            value={form.ctaText}
            maxLength={30}
            onChange={set("ctaText")}
          />
        </Field>
        <Field label="Button link" htmlFor="promo-link" hint="Internal path, e.g. /services/cleaning">
          <Input
            id="promo-link"
            value={form.ctaLink}
            maxLength={200}
            onChange={set("ctaLink")}
          />
        </Field>
        <Field label="Theme" htmlFor="promo-theme">
          <Select id="promo-theme" value={form.theme} onChange={set("theme")}>
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Placement" htmlFor="promo-placement">
          <Select
            id="promo-placement"
            value={form.placement || "customer_home"}
            onChange={set("placement")}
          >
            {PLACEMENTS.map((placement) => (
              <option key={placement.id} value={placement.id}>
                {placement.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Order" htmlFor="promo-order" hint="Lower numbers appear first.">
          <Input
            id="promo-order"
            type="number"
            min={0}
            max={99}
            value={form.order}
            onChange={set("order")}
          />
        </Field>
        <Field label="Starts at" htmlFor="promo-start" hint="Optional campaign window.">
          <Input
            id="promo-start"
            type="datetime-local"
            value={form.startsAt || ""}
            onChange={set("startsAt")}
          />
        </Field>
        <Field label="Ends at" htmlFor="promo-end" hint="Optional. Banner hides after this.">
          <Input
            id="promo-end"
            type="datetime-local"
            value={form.endsAt || ""}
            onChange={set("endsAt")}
          />
        </Field>
        <div className="adm-span-2">
          <ImageUpload
            value={file}
            onChange={onFile}
            existingUrl={draft.imagePath ? mediaUrl(draft.imagePath) : ""}
            label="Promo artwork (optional)"
            hint="Wide image, at least 1200×600. JPG, PNG or WEBP up to 5 MB."
          />
        </div>
        <Field
          label="Notes for the team (not shown to customers)"
          htmlFor="promo-notes"
          className="adm-span-2"
        >
          <Textarea
            id="promo-notes"
            rows={2}
            value={form.teamNote || ""}
            onChange={set("teamNote")}
            placeholder="Optional internal note."
          />
        </Field>
      </div>

      <Toggle
        checked={Boolean(form.active)}
        onChange={(next) => setForm((prev) => ({ ...prev, active: next }))}
        label="Publish immediately"
        hint="Unpublished promos stay in the manager but not on the storefront."
      />
    </Modal>
  );
}
