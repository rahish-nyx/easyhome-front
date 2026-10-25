import { useMemo, useState } from "react";
import {
  BellRing,
  Check,
  Link2,
  Megaphone,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { timeAgo } from "../lib/format";
import { Avatar, Button, Input, Textarea } from "../components/ui";
import {
  AdminPage,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  SearchField,
  StatusPill,
} from "./adminKit";

const AUDIENCES = [
  {
    id: "all",
    label: "Everyone",
    hint: "All customers and workers",
    icon: Users,
  },
  {
    id: "customers",
    label: "Customers",
    hint: "Customer accounts only",
    icon: UserRound,
  },
  {
    id: "workers",
    label: "Workers",
    hint: "Approved professionals",
    icon: Wrench,
  },
  {
    id: "specific",
    label: "Specific people",
    hint: "Pick recipients one by one",
    icon: ShieldCheck,
  },
];

export default function AdminBroadcast() {
  const toast = useToast();
  const [audience, setAudience] = useState("all");
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  const usersState = useAsync(() => api.get("/admin/users?limit=1000"), []);
  const users = usersState.data?.users || [];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (!term) return true;
      return [user.name, user.email, user.phone, user.id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [users, query]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selected.includes(user.id)),
    [users, selected],
  );

  const counts = useMemo(() => {
    const audience = users.filter((user) => user.role !== "admin");
    return {
      all: audience.length,
      customers: audience.filter((user) => (user.role || "customer") === "customer").length,
      workers: audience.filter((user) => user.role === "worker").length,
    };
  }, [users]);

  const toggleRecipient = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const selectVisible = () => {
    setSelected((current) => [...new Set([...current, ...filtered.map((user) => user.id)])]);
  };

  const clearSelected = () => setSelected([]);

  const send = async () => {
    if (title.trim().length < 2) {
      toast.error("Add a notification title.");
      return;
    }
    if (body.trim().length < 2) {
      toast.error("Add a notification message.");
      return;
    }
    if (audience === "specific" && !selected.length) {
      toast.error("Select at least one recipient.");
      return;
    }

    setSending(true);
    try {
      const result = await api.post("/admin/notifications/broadcast", {
        audience,
        userIds: audience === "specific" ? selected : [],
        title: title.trim(),
        body: body.trim(),
        link: link.trim(),
      });
      toast.success(`Notification sent to ${result.sent} ${result.sent === 1 ? "person" : "people"}.`);
      setTitle("");
      setBody("");
      setLink("");
      setSelected([]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const recipientCount =
    audience === "specific"
      ? selected.length
      : audience === "customers"
        ? counts.customers
        : audience === "workers"
          ? counts.workers
          : counts.all;

  return (
    <AdminPage
      eyebrow="Notifications"
      title="Broadcast"
      subtitle="Send one announcement to everyone, a whole audience, or hand-picked people."
      actions={
        <>
          <span className="adm-count-chip">{recipientCount} recipients</span>
          <Button
            icon={Send}
            loading={sending}
            onClick={send}
            disabled={!title.trim() || !body.trim()}
          >
            Send broadcast
          </Button>
        </>
      }
    >
      <PageError
        error={usersState.error}
        onRetry={() => usersState.run().catch(() => {})}
      />

      <div className="adm-broadcast">
        <Panel
          title="1. Choose an audience"
          subtitle="Audience is resolved when you press send."
        >
          <div className="adm-audience-grid">
            {AUDIENCES.map((option) => {
              const Icon = option.icon;
              const count =
                option.id === "all"
                  ? counts.all
                  : option.id === "customers"
                    ? counts.customers
                    : option.id === "workers"
                      ? counts.workers
                      : selected.length;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`adm-audience${audience === option.id ? " is-active" : ""}`}
                  onClick={() => setAudience(option.id)}
                >
                  <span className="adm-audience__icon">
                    <Icon size={19} />
                  </span>
                  <span className="adm-audience__copy">
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                  <span className="adm-audience__count">{count}</span>
                  {audience === option.id ? (
                    <span className="adm-audience__check">
                      <Check size={12} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {audience === "specific" ? (
            <div className="adm-recipient-picker">
              <div className="adm-recipient-picker__bar">
                <SearchField
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by name, email or phone…"
                  onClear={() => setQuery("")}
                />
                <Button size="sm" variant="outline" onClick={selectVisible}>
                  Select shown
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelected} disabled={!selected.length}>
                  Clear
                </Button>
              </div>

              {usersState.loading && !usersState.data ? (
                <LoadingBlock label="Loading people…" />
              ) : filtered.length ? (
                <div className="adm-recipient-list">
                  {filtered.map((user) => {
                    const checked = selected.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`adm-recipient${checked ? " is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(user.id)}
                        />
                        <span className="adm-recipient__check">
                          {checked ? <Check size={12} /> : null}
                        </span>
                        <Avatar name={user.name || user.email} src={user.avatarUrl} size={34} />
                        <span className="adm-recipient__copy">
                          <strong>{user.name || "Unnamed user"}</strong>
                          <small>{user.email || user.phone || user.id}</small>
                        </span>
                        <StatusPill status={user.role || "customer"} />
                      </label>
                    );
                  })}
                </div>
              ) : (
                <EmptyBlock
                  icon={UserRound}
                  title="No matching people"
                  body="Try a different search term."
                />
              )}

              {selectedUsers.length ? (
                <p className="adm-recipient-picker__summary">
                  Selected: {selectedUsers.map((user) => user.name || user.email).join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="adm-broadcast__note">
              <Megaphone size={15} />
              {audience === "all"
                ? "Every customer account and every worker account will receive this notification."
                : audience === "customers"
                  ? "Only customer accounts will receive this notification."
                  : "Only worker accounts will receive this notification."}
            </p>
          )}
        </Panel>

        <div className="adm-broadcast__grid">
          <Panel title="2. Write the notification" subtitle="Keep it short, specific and useful.">
            <div className="adm-broadcast__form">
              <label>
                <span>Title</span>
                <Input
                  value={title}
                  maxLength={90}
                  placeholder="e.g. Monsoon service update"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label>
                <span>Message</span>
                <Textarea
                  value={body}
                  rows={5}
                  maxLength={400}
                  placeholder="Tell customers and workers what changed and what they should do next."
                  onChange={(event) => setBody(event.target.value)}
                />
                <small>{body.length}/400</small>
              </label>
              <label>
                <span>
                  <Link2 size={13} /> Optional in-app link
                </span>
                <Input
                  value={link}
                  maxLength={200}
                  placeholder="/bookings or /profile"
                  onChange={(event) => setLink(event.target.value)}
                />
              </label>
            </div>
          </Panel>

          <Panel title="Preview" subtitle="This is how the bell notification will look.">
            <div className="adm-broadcast-preview">
              <span className="adm-broadcast-preview__icon">
                <BellRing size={19} />
              </span>
              <div>
                <strong>{title.trim() || "Your notification title"}</strong>
                <p>{body.trim() || "Your message will appear here for every selected recipient."}</p>
                <small>{timeAgo(new Date())}</small>
              </div>
            </div>
            <div className="adm-broadcast__summary">
              <span>
                <Users size={15} />
                {recipientCount} {recipientCount === 1 ? "recipient" : "recipients"}
              </span>
              <span>
                <Megaphone size={15} />
                In-app notification
              </span>
            </div>
            <Button
              className="adm-broadcast__send"
              icon={Send}
              loading={sending}
              onClick={send}
              disabled={!title.trim() || !body.trim()}
            >
              Send to {recipientCount} {recipientCount === 1 ? "person" : "people"}
            </Button>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
