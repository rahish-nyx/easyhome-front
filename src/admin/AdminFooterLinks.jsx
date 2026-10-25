import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { Button, Field, Input, Modal, Select } from "../components/ui";
import {
  AdminPage,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  StatusPill,
} from "./adminKit";

const GROUPS = [
  { id: "services", label: "Services" },
  { id: "legal", label: "Legal" },
  { id: "professionals", label: "For professionals" },
];

const EMPTY_LINK = { label: "", href: "", group: "services", active: true, order: 0 };

export default function AdminFooterLinks() {
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState("");
  const state = useAsync(async () => {
    const data = await api.get("/admin/footer-links");
    return data.links || [];
  }, []);
  const links = useMemo(() => state.data || [], [state.data]);
  const sorted = useMemo(
    () => [...links].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [links],
  );
  const refresh = () => state.run().catch(() => {});

  const save = async (form) => {
    setBusy("save");
    try {
      const payload = {
        label: form.label.trim(),
        href: form.href.trim(),
        group: form.group,
        active: Boolean(form.active),
        order: Number(form.order) || 0,
      };
      if (form.id) {
        await api.patch(`/admin/footer-links/${form.id}`, payload);
        toast.success("Footer link updated.");
      } else {
        await api.post("/admin/footer-links", payload);
        toast.success("Footer link added.");
      }
      setDraft(null);
      await refresh();
    } catch (error) {
      toast.error(error.message);
      throw error;
    } finally {
      setBusy("");
    }
  };

  const toggle = async (item) => {
    setBusy(`toggle:${item.id}`);
    try {
      await api.patch(`/admin/footer-links/${item.id}`, { active: !item.active });
      toast.success(item.active ? "Footer link hidden." : "Footer link published.");
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const move = async (item, direction) => {
    const groupLinks = sorted.filter((link) => link.group === item.group);
    const index = groupLinks.findIndex((link) => link.id === item.id);
    const neighbor = groupLinks[index + direction];
    if (!neighbor) return;
    setBusy(`move:${item.id}`);
    try {
      await Promise.all([
        api.patch(`/admin/footer-links/${item.id}`, { order: Number(neighbor.order) || 0 }),
        api.patch(`/admin/footer-links/${neighbor.id}`, { order: Number(item.order) || 0 }),
      ]);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(`delete:${deleteTarget.id}`);
    try {
      await api.del(`/admin/footer-links/${deleteTarget.id}`);
      toast.success("Footer link removed from the public site.");
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
      eyebrow="Public site"
      title="Footer links"
      subtitle="Manage the links shown in the customer and worker footers. Changes publish to the site after refresh."
      actions={
        <>
          <Button variant="outline" icon={RefreshCw} loading={state.loading} onClick={refresh}>
            Refresh
          </Button>
          <Button
            icon={Plus}
            onClick={() => setDraft({ ...EMPTY_LINK, order: sorted.length })}
          >
            Add link
          </Button>
        </>
      }
    >
      <PageError error={state.error} onRetry={refresh} />
      {state.loading && !state.data ? (
        <LoadingBlock label="Loading footer links…" />
      ) : sorted.length ? (
        <div className="adm-stack">
          {GROUPS.map((group) => {
            const groupLinks = sorted.filter((link) =>
              group.id === "legal"
                ? ["company", "legal", "support"].includes(link.group)
                : link.group === group.id,
            );
            if (!groupLinks.length) return null;
            return (
              <Panel key={group.id} title={group.label} subtitle="Displayed in this footer section">
                <div className="adm-footer-links">
                  {groupLinks.map((item, index) => (
                    <article className="adm-footer-link" key={item.id}>
                      <span className="adm-footer-link__order">{index + 1}</span>
                      <div className="grow">
                        <div className="adm-approval__title">
                          <strong>{item.label}</strong>
                          <StatusPill
                            status={item.active ? "active" : "expired"}
                            label={item.active ? "Published" : "Hidden"}
                          />
                        </div>
                        <a href={item.href} target="_blank" rel="noreferrer">
                          {item.href} <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="adm-footer-link__actions">
                        <button
                          type="button"
                          className="adm-icon-action"
                          aria-label={`Move ${item.label} up`}
                          disabled={index === 0 || Boolean(busy)}
                          onClick={() => move(item, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="adm-icon-action"
                          aria-label={`Move ${item.label} down`}
                          disabled={index === groupLinks.length - 1 || Boolean(busy)}
                          onClick={() => move(item, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="adm-icon-action"
                          aria-label={`Edit ${item.label}`}
                          onClick={() => setDraft({ ...item })}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="adm-text-action"
                          disabled={busy === `toggle:${item.id}`}
                          onClick={() => toggle(item)}
                        >
                          {item.active ? "Hide" : "Publish"}
                        </button>
                        <button
                          type="button"
                          className="adm-icon-action is-danger"
                          aria-label={`Remove ${item.label}`}
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel flush>
          <EmptyBlock
            icon={Link2}
            title="No footer links configured"
            body="Add a link to start managing the public website footer."
            action={<Button icon={Plus} onClick={() => setDraft({ ...EMPTY_LINK })}>Add first link</Button>}
          />
        </Panel>
      )}

      {draft && (
        <FooterLinkModal
          key={draft.id || "new"}
          draft={draft}
          loading={busy === "save"}
          onClose={() => setDraft(null)}
          onSave={save}
        />
      )}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove this footer link?"
        subtitle={deleteTarget?.label}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              className="adm-danger-btn"
              loading={busy === `delete:${deleteTarget?.id}`}
              onClick={remove}
            >
              Remove link
            </Button>
          </>
        }
      >
        <p className="small muted">
          This safely hides the link from the public site. You can restore it later from the hidden links list.
        </p>
      </Modal>
    </AdminPage>
  );
}

function FooterLinkModal({ draft, loading, onClose, onSave }) {
  const [form, setForm] = useState(draft || EMPTY_LINK);
  const [error, setError] = useState("");

  if (!draft) return null;

  const submit = () => {
    const label = String(form.label || "").trim();
    const href = String(form.href || "").trim();
    if (label.length < 2) {
      setError("Enter a link label of at least 2 characters.");
      return;
    }
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) {
      setError("Use a site path beginning with / (for example, /faq).");
      return;
    }
    setError("");
    onSave(form).catch((saveError) => setError(saveError.message));
  };

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      title={draft.id ? "Edit footer link" : "Add footer link"}
      subtitle="Footer destinations must be internal routes."
      size="sm"
      footer={
        <>
          <Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={submit}>{draft.id ? "Save changes" : "Add link"}</Button>
        </>
      }
    >
      <div className="adm-form-grid">
        <Field label="Link label" htmlFor="footer-link-label" required className="adm-span-2">
          <Input
            id="footer-link-label"
            value={form.label || ""}
            maxLength={50}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />
        </Field>
        <Field label="Destination" htmlFor="footer-link-href" required className="adm-span-2">
          <Input
            id="footer-link-href"
            value={form.href || ""}
            maxLength={200}
            placeholder="/legal/terms"
            onChange={(event) => setForm((prev) => ({ ...prev, href: event.target.value }))}
          />
        </Field>
        <Field label="Footer section" htmlFor="footer-link-group">
          <Select
            id="footer-link-group"
            value={form.group || "company"}
            onChange={(event) => setForm((prev) => ({ ...prev, group: event.target.value }))}
          >
            {GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
          </Select>
        </Field>
        <Field label="Display order" htmlFor="footer-link-order">
          <Input
            id="footer-link-order"
            type="number"
            min={0}
            max={999}
            value={form.order ?? 0}
            onChange={(event) => setForm((prev) => ({ ...prev, order: event.target.value }))}
          />
        </Field>
        <p className="adm-form-error adm-span-2" role="alert">{error}</p>
      </div>
    </Modal>
  );
}
