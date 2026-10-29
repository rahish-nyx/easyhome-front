import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { invalidateCatalogueCache } from "../context/CatalogueContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { serviceGroup } from "../lib/serviceGroups";
import { Button, Field, Input, Modal, Select } from "../components/ui";
import {
  AdminPage,
  LoadingBlock,
  PageError,
  Panel,
  StatusPill,
} from "./adminKit";

const GROUPS = [
  { id: "services", label: "Services" },
  { id: "legal", label: "Legal" },
  { id: "professionals", label: "For professionals" },
  { id: "social", label: "Social media" },
];

const SOCIAL_ICONS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "x", label: "X / Twitter" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "telegram", label: "Telegram" },
  { id: "website", label: "Website" },
];

const EMPTY_LINK = {
  label: "",
  href: "",
  group: "services",
  icon: "",
  active: true,
  order: 0,
};

export default function AdminFooterLinks() {
  const toast = useToast();
  const [draft, setDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState("");
  const state = useAsync(async () => {
    const data = await api.get("/admin/footer-links");
    return data.links || [];
  }, []);
  const serviceState = useAsync(async () => {
    const data = await api.get("/admin/services");
    return data.services || [];
  }, []);
  const links = useMemo(() => state.data || [], [state.data]);
  const services = useMemo(
    () => (serviceState.data || []).filter((service) => service?.key),
    [serviceState.data],
  );
  const sorted = useMemo(
    () => [...links].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [links],
  );
  const refresh = () => {
    // Footer edits invalidate the public bootstrap cache on the server. Clear
    // the browser copy too so a normal reload shows the change immediately.
    invalidateCatalogueCache();
    return state.run().catch(() => {});
  };

  const groupKeys = (groupId) =>
    groupId === "legal" ? ["company", "legal", "support"] : [groupId];

  const nextOrder = (groupId) =>
    links
      .filter((link) => groupKeys(groupId).includes(link.group))
      .reduce((highest, link) => Math.max(highest, Number(link.order) || 0), 0) + 1;

  const openAdd = (groupId = "services") => {
    setDraft({
      ...EMPTY_LINK,
      group: groupId,
      icon: groupId === "social" ? "instagram" : "",
      order: nextOrder(groupId),
    });
  };

  const save = async (form) => {
    setBusy("save");
    try {
      const payload = {
        label: form.label.trim(),
        href: form.href.trim(),
        group: form.group,
        icon: form.group === "social" ? String(form.icon || "").trim() : "",
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
    const groupLinks = sorted.filter((link) =>
      groupKeys(item.group).includes(link.group),
    );
    const index = groupLinks.findIndex((link) => link.id === item.id);
    const nextIndex = index + direction;
    const neighbor = groupLinks[nextIndex];
    if (!neighbor) return;
    const reordered = [...groupLinks];
    reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    setBusy(`move:${item.id}`);
    try {
      await Promise.all(
        reordered.map((link, position) =>
          api.patch(`/admin/footer-links/${link.id}`, { order: position + 1 }),
        ),
      );
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
      toast.success("Footer link deleted.");
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
      subtitle="Manage the links shown in the customer and worker footers. In the Services section you can add any EasyHome service or remove links you no longer want."
      actions={
        <>
          <Button variant="outline" icon={RefreshCw} loading={state.loading} onClick={refresh}>
            Refresh
          </Button>
          <Button
            icon={Plus}
            onClick={() => openAdd("services")}
          >
            Add link
          </Button>
        </>
      }
    >
      <PageError error={state.error} onRetry={refresh} />
      {state.loading && !state.data ? (
        <LoadingBlock label="Loading footer links…" />
      ) : (
        <div className="adm-stack">
          {GROUPS.map((group) => {
            const groupLinks = sorted.filter((link) =>
              groupKeys(group.id).includes(link.group),
            );
            return (
              <Panel
                key={group.id}
                title={group.label}
                subtitle="Displayed in this footer section"
                action={
                  <Button
                    variant="outline"
                    icon={Plus}
                    onClick={() => openAdd(group.id)}
                  >
                    Add link
                  </Button>
                }
              >
                {groupLinks.length ? (
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
                            {item.group === "social" ? (
                              <span className="adm-footer-link__icon">
                                {item.icon || "website"}
                              </span>
                            ) : null}
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
                            className="adm-text-action is-danger"
                            aria-label={`Delete ${item.label}`}
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>
                    No links in this section yet. Use “Add link” to publish the
                    first one.
                  </p>
                )}
              </Panel>
            );
          })}
        </div>
      )}

      {draft && (
        <FooterLinkModal
          key={draft.id || "new"}
          draft={draft}
          loading={busy === "save"}
          services={services}
          servicesLoading={serviceState.loading}
          servicesError={serviceState.error}
          existingServiceHrefs={links
            .filter((link) => link.group === "services" && link.id !== draft.id)
            .map((link) => link.href)}
          onClose={() => setDraft(null)}
          onSave={save}
        />
      )}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this footer link?"
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
              Delete link
            </Button>
          </>
        }
      >
        <p className="small muted">
          This permanently removes the link from the customer and worker
          footers. Use Hide instead if you may publish it again later.
        </p>
      </Modal>
    </AdminPage>
  );
}

function FooterLinkModal({
  draft,
  loading,
  services = [],
  servicesLoading = false,
  servicesError = null,
  existingServiceHrefs = [],
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(draft || EMPTY_LINK);
  const [error, setError] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");

  const takenServiceHrefs = useMemo(
    () => new Set(existingServiceHrefs),
    [existingServiceHrefs],
  );
  const filteredServices = useMemo(() => {
    const term = serviceQuery.trim().toLowerCase();
    return services
      .filter((service) => {
        if (!term) return true;
        return `${service.name || ""} ${service.key || ""} ${serviceGroup(service.key)}`
          .toLowerCase()
          .includes(term);
      })
      .sort(
        (a, b) =>
          serviceGroup(a.key).localeCompare(serviceGroup(b.key)) ||
          String(a.name || "").localeCompare(String(b.name || "")),
      );
  }, [services, serviceQuery]);

  if (!draft) return null;

  const chooseService = (service) => {
    setForm((prev) => ({
      ...prev,
      label: service.name || prev.label,
      href: `/services/${service.key}`,
      group: "services",
    }));
    setError("");
  };

  const submit = () => {
    const label = String(form.label || "").trim();
    const href = String(form.href || "").trim();
    if (label.length < 2) {
      setError("Enter a link label of at least 2 characters.");
      return;
    }
    const isExternal = /^https:\/\//i.test(href);
    if (form.group === "social") {
      if (!isExternal) {
        setError("Social links must be a full https:// URL (for example, https://instagram.com/easyhome).");
        return;
      }
    } else if (
      !href.startsWith("/") ||
      href.startsWith("//") ||
      href.includes("\\")
    ) {
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
      subtitle={
        form.group === "social"
          ? "Social links open in a new tab and can show an icon."
          : form.group === "services"
            ? "Pick any EasyHome service below — its label and destination fill automatically."
            : "Footer destinations must be internal EasyHome routes."
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" disabled={loading} onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={submit}>{draft.id ? "Save changes" : "Add link"}</Button>
        </>
      }
    >
      <div className="adm-form-grid">
        <Field label="Footer section" htmlFor="footer-link-group" className="adm-span-2">
          <Select
            id="footer-link-group"
            value={form.group || "services"}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                group: event.target.value,
                icon:
                  event.target.value === "social"
                    ? prev.icon || "instagram"
                    : "",
              }))
            }
          >
            {GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
          </Select>
        </Field>

        {form.group === "services" ? (
          <Field
            label="Choose an EasyHome service"
            htmlFor="footer-service-search"
            className="adm-span-2"
            hint={
              servicesError
                ? servicesError.message
                : `${services.length || "All"} services available. Selecting one fills the label and destination.`
            }
          >
            <div className="adm-service-picker">
              <div className="adm-service-picker__search">
                <Search size={15} aria-hidden="true" />
                <Input
                  id="footer-service-search"
                  value={serviceQuery}
                  placeholder="Search by service name or category…"
                  onChange={(event) => setServiceQuery(event.target.value)}
                />
              </div>
              <div
                className="adm-service-picker__list"
                role="listbox"
                aria-label="EasyHome services"
              >
                {servicesLoading ? (
                  <p className="small muted">Loading services…</p>
                ) : servicesError ? (
                  <p className="small muted">
                    Could not load the service catalogue. You can still type a label and
                    destination below.
                  </p>
                ) : filteredServices.length ? (
                  filteredServices.map((service) => {
                    const href = `/services/${service.key}`;
                    const selected = form.href === href;
                    const taken = takenServiceHrefs.has(href);
                    return (
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`adm-service-picker__option${selected ? " is-selected" : ""}`}
                        disabled={taken}
                        key={service.key}
                        onClick={() => chooseService(service)}
                      >
                        <span>
                          <strong>{service.name}</strong>
                          <small>
                            {serviceGroup(service.key)} · {href}
                          </small>
                        </span>
                        {taken ? (
                          <em className="adm-service-picker__tag">Added</em>
                        ) : selected ? (
                          <Check size={15} aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="small muted">
                    No services match “{serviceQuery}”. Clear the search to see all services.
                  </p>
                )}
              </div>
            </div>
          </Field>
        ) : null}

        {form.group === "social" ? (
          <Field
            label="Social icon"
            htmlFor="footer-link-icon"
            hint="Shown next to the label in the footer."
            className="adm-span-2"
          >
            <Select
              id="footer-link-icon"
              value={form.icon || "website"}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, icon: event.target.value }))
              }
            >
              {SOCIAL_ICONS.map((icon) => (
                <option key={icon.id} value={icon.id}>
                  {icon.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Link label" htmlFor="footer-link-label" required className="adm-span-2">
          <Input
            id="footer-link-label"
            value={form.label || ""}
            maxLength={50}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />
        </Field>
        <Field
          label="Destination"
          htmlFor="footer-link-href"
          required
          className="adm-span-2"
          hint={
            form.group === "services"
              ? "Filled from the selected service. You can still override it with another EasyHome route."
              : undefined
          }
        >
          <Input
            id="footer-link-href"
            value={form.href || ""}
            maxLength={200}
            placeholder={
              form.group === "social"
                ? "https://instagram.com/easyhome"
                : form.group === "services"
                  ? "/services/home-cleaning"
                  : "/legal/terms"
            }
            onChange={(event) => setForm((prev) => ({ ...prev, href: event.target.value }))}
          />
        </Field>
        <Field label="Display order" htmlFor="footer-link-order" className="adm-span-2">
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
