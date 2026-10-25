import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Inbox,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { formatDateTime, timeAgo } from "../lib/format";
import { Avatar, Button } from "../components/ui";
import {
  AdminPage,
  ConfirmModal,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  SearchField,
  StatusPill,
} from "./adminKit";

export default function AdminChats() {
  const toast = useToast();
  const [uid, setUid] = useState("");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [handlingCall, setHandlingCall] = useState("");
  const scrollRef = useRef(null);
  const lastMessageId = useRef("");

  const threadsState = useAsync(() => api.get("/admin/chats"), []);
  const callsState = useAsync(() => api.get("/admin/call-requests"), []);
  const messagesState = useAsync(
    () => (uid ? api.get(`/admin/chats/${uid}`) : Promise.resolve(null)),
    [uid],
  );

  const threads = threadsState.data?.threads || [];
  const callRequests = callsState.data?.requests || [];
  const thread = messagesState.data?.thread;
  const messages = messagesState.data?.messages || [];

  const selectedThread = thread || threads.find((item) => item.id === uid) || null;

  useEffect(() => {
    if (!uid && threads.length) setUid(threads[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      threadsState.run().catch(() => {});
      callsState.run().catch(() => {});
      if (uid) messagesState.run().catch(() => {});
    }, 12000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    const latest = messages.length ? messages[messages.length - 1].id : "";
    if (!latest || latest === lastMessageId.current) return;
    lastMessageId.current = latest;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((item) =>
      [item.name, item.email, item.lastMessage, item.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [threads, query]);

  const send = async () => {
    if (!uid || !text.trim()) return;
    setSending(true);
    try {
      await api.post(`/admin/chats/${uid}`, { text: text.trim() });
      setText("");
      await Promise.allSettled([messagesState.run(), threadsState.run()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
    }
  };

  const endChat = async () => {
    if (!uid) return;
    setEnding(true);
    try {
      await api.post(`/admin/chats/${uid}/end`, {});
      toast.success("Chat ended. Every message in the session was deleted.");
      setConfirmEnd(false);
      setUid("");
      lastMessageId.current = "";
      await Promise.allSettled([threadsState.run(), messagesState.run()]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEnding(false);
    }
  };

  const handleCall = async (request, action) => {
    setHandlingCall(`${request.id}:${action}`);
    try {
      await api.patch(`/admin/call-requests/${request.id}`, { action });
      toast.success(action === "done" ? "Call request marked done." : "Call request dismissed.");
      await callsState.run();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setHandlingCall("");
    }
  };

  const unreadTotal = threads.reduce(
    (sum, item) => sum + (Number(item.unreadForAdmin) || 0),
    0,
  );

  return (
    <AdminPage
      eyebrow="Customer care"
      title="Support inbox"
      subtitle="Real conversations with customers and workers. Replies arrive as in-app notifications."
      actions={
        <>
          <span className="adm-count-chip">
            {threads.length} thread{threads.length === 1 ? "" : "s"}
            {unreadTotal ? ` · ${unreadTotal} unread` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={threadsState.loading}
            onClick={() => {
              threadsState.run().catch(() => {});
              messagesState.run().catch(() => {});
            }}
          >
            Refresh
          </Button>
        </>
      }
    >
      <PageError
        error={threadsState.error}
        onRetry={() => threadsState.run().catch(() => {})}
      />

      {callRequests.length ? (
        <Panel
          title="Call requests"
          subtitle="Registered numbers from live support. Call them back, then mark the request done."
          action={<span className="adm-count-chip">{callRequests.length} pending</span>}
        >
          <div className="adm-call-requests">
            {callRequests.map((request) => (
              <div key={request.id} className="adm-call-request">
                <span className="adm-call-request__icon">
                  <Phone size={16} />
                </span>
                <div className="grow">
                  <strong>{request.name || "EasyHome user"}</strong>
                  <p>
                    <a href={`tel:${request.phone}`}>{request.phone}</a>
                    <span> · {request.role === "worker" ? "Professional" : "Customer"}</span>
                    <span> · {timeAgo(request.createdAt)}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Check}
                  loading={handlingCall === `${request.id}:done`}
                  onClick={() => handleCall(request, "done")}
                >
                  Done
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={XCircle}
                  loading={handlingCall === `${request.id}:cancel`}
                  onClick={() => handleCall(request, "cancel")}
                >
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {threadsState.loading && !threadsState.data ? (
        <LoadingBlock label="Loading conversations…" />
      ) : (
        <div className={`adm-chat-shell${uid ? " has-selected" : ""}`}>
          <aside className="adm-chat__list">
            <div className="adm-chat__list-head">
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Search conversations…"
                onClear={() => setQuery("")}
              />
            </div>
            {filteredThreads.length ? (
              <div className="adm-chat__threads">
                {filteredThreads.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`adm-chat-thread${
                      item.id === uid ? " is-active" : ""
                    }`}
                    onClick={() => {
                      setUid(item.id);
                      lastMessageId.current = "";
                    }}
                  >
                    <Avatar name={item.name} path={item.photoPath} size={40} />
                    <span className="grow">
                      <span className="adm-chat-thread__top">
                        <strong>{item.name || "User"}</strong>
                        <small>{timeAgo(item.lastAt)}</small>
                      </span>
                      <span className="adm-chat-thread__bottom">
                        <span>{item.lastMessage || "No messages yet"}</span>
                        {Number(item.unreadForAdmin) > 0 ? (
                          <em>{item.unreadForAdmin}</em>
                        ) : null}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={Inbox}
                title={query ? "No matching conversations" : "Inbox is empty"}
                body={
                  query
                    ? "Try another name or message."
                    : "Messages from customers and workers will appear here."
                }
              />
            )}
          </aside>

          <section className="adm-chat__pane">
            {uid && selectedThread ? (
              <>
                <header className="adm-chat__head">
                  <button
                    type="button"
                    className="adm-chat__back"
                    onClick={() => setUid("")}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <Avatar name={selectedThread.name} path={selectedThread.photoPath} size={40} />
                  <div className="grow">
                    <strong>{selectedThread.name || "User"}</strong>
                    <span>
                      {selectedThread.email || "No email"} ·{" "}
                      <StatusPill status={selectedThread.role || "customer"} />
                    </span>
                  </div>
                  {selectedThread.role === "worker" ? (
                    <span className="adm-chat__role">
                      <ShieldCheck size={14} /> Worker
                    </span>
                  ) : (
                    <span className="adm-chat__role">
                      <UserRound size={14} /> Customer
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    icon={XCircle}
                    onClick={() => setConfirmEnd(true)}
                  >
                    End chat
                  </Button>
                </header>

                <div className="adm-chat__messages" ref={scrollRef}>
                  {messagesState.loading && !messages.length ? (
                    <LoadingBlock label="Loading messages…" />
                  ) : messages.length ? (
                    messages.map((message) => {
                      const mine = message.senderRole === "admin";
                      return (
                        <div
                          key={message.id}
                          className={`adm-msg${mine ? " is-admin" : ""}`}
                        >
                          {!mine ? (
                            <Avatar
                              name={message.senderName}
                              size={28}
                              className="adm-msg__avatar"
                            />
                          ) : null}
                          <div className="adm-msg__body">
                            <div className="adm-msg__bubble">{message.text}</div>
                            <span className="adm-msg__meta">
                              {mine ? "EasyHome Support" : message.senderName || "User"} ·{" "}
                              {formatDateTime(message.createdAt)}
                              {mine ? <CheckCheck size={12} /> : null}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyBlock
                      icon={MessageSquare}
                      title="No messages yet"
                      body="Start the conversation with a friendly reply."
                    />
                  )}
                </div>

                <footer className="adm-chat__compose">
                  <textarea
                    rows={1}
                    value={text}
                    maxLength={1000}
                    placeholder="Write a reply…"
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                  />
                  <Button
                    icon={Send}
                    loading={sending}
                    disabled={!text.trim()}
                    onClick={send}
                  >
                    Send
                  </Button>
                </footer>
              </>
            ) : (
              <div className="adm-chat__placeholder">
                <span>
                  <MessageSquare size={26} />
                </span>
                <h2>Select a conversation</h2>
                <p>Pick a thread on the left to read and reply.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmModal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this support session?"
        subtitle="Every message in this chat will be permanently deleted for the customer and the admin team."
        confirmLabel="End and delete"
        loading={ending}
        onConfirm={endChat}
      >
        <p className="small muted">
          The next message from this user starts a brand-new support session. Call requests stay
          in the call-request list until they are handled.
        </p>
      </ConfirmModal>
    </AdminPage>
  );
}
