import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Headphones,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLiveQuery } from "../hooks/useLive";
import { qChatMessages } from "../lib/queries";
import { api } from "../lib/api";
import { clockTime } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { Button, Input, Modal, Spinner } from "../components/ui";

const QUICK_REPLIES = [
  "I need help with a booking",
  "A pro has not arrived yet",
  "Can I reschedule?",
  "Question about membership",
  "Payment or refund help",
];

export default function Chat({ backTo = "/", embedded = false }) {
  usePageMeta("Support", "Chat with the EasyHome support team about bookings, payments and membership.");

  const { fbUser, isPremium } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bodyRef = useRef(null);

  const query = useMemo(
    () => (fbUser ? qChatMessages(fbUser.uid) : null),
    [fbUser],
  );
  const { data: messages, loading, error } = useLiveQuery(query);

  useEffect(() => {
    if (!fbUser?.uid) return undefined;
    api.patch("/chat/read").catch(() => {});
    const mark = () => {
      if (document.visibilityState === "visible") api.patch("/chat/read").catch(() => {});
    };
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [fbUser?.uid]);

  useEffect(() => {
    if (!messages.length) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
    if (!loaded) setLoaded(true);
  }, [messages, loaded]);

  const send = async (value) => {
    const message = String(value ?? text).trim();
    if (!message) return;
    if (message.length > 1000) {
      toast.error("Keep messages under 1000 characters.");
      return;
    }
    setSending(true);
    try {
      await api.post("/chat", { text: message });
      setText("");
    } catch (sendError) {
      toast.error(sendError.message);
    } finally {
      setSending(false);
    }
  };

  const requestCall = async () => {
    setRequesting(true);
    try {
      await api.post("/chat/request-call", {});
      toast.success("Call request sent. Our team will use your registered number.");
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setRequesting(false);
    }
  };

  const endChat = async () => {
    setEnding(true);
    try {
      await api.post("/chat/end", {});
      setText("");
      setLoaded(false);
      setConfirmEnd(false);
      toast.success("Chat ended. All messages were deleted.");
    } catch (endError) {
      toast.error(endError.message);
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className={`page page--narrow${embedded ? "" : " page--chat"}`}>
      <Link to={backTo} className="btn btn--ghost btn--sm" style={{ marginBottom: 12, paddingLeft: 0 }}>
        <ArrowLeft size={15} /> Back
      </Link>

      <div className="chat-shell">
        <header className="chat-head">
          <span className="chat-head__avatar">
            <Headphones size={19} />
          </span>
          <div className="grow">
            <strong style={{ fontSize: 14 }}>EasyHome Support</strong>
            <p className="tiny muted">
              <span className="online-dot" style={{ display: "inline-block", marginRight: 5 }} />
              {isPremium
                ? "Priority support · your chats are answered first"
                : "Usually replies in a few minutes"}
            </p>
          </div>
          <div className="chat-head__actions">
            <Button
              size="sm"
              variant="outline"
              icon={PhoneCall}
              loading={requesting}
              onClick={requestCall}
            >
              Request a call
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={XCircle}
              onClick={() => setConfirmEnd(true)}
            >
              End chat
            </Button>
            {isPremium ? (
              <span className="badge badge--yellow chat-head__secure">
                <Zap size={11} /> Priority
              </span>
            ) : (
              <span className="badge badge--green chat-head__secure">
                <ShieldCheck size={11} /> Secure
              </span>
            )}
          </div>
        </header>

        <div className="chat-body" ref={bodyRef}>
          {loading && !messages.length ? (
            <div style={{ display: "grid", placeItems: "center", padding: 30 }}>
              <Spinner />
            </div>
          ) : null}

          {!loading && !messages.length ? (
            <div className="empty" style={{ margin: "auto" }}>
              <span className="empty__icon">
                <Sparkles size={24} />
              </span>
              <h3 style={{ fontSize: 17 }}>Start a conversation</h3>
              <p>
                Tell us what you need. Include your booking reference if it is about an existing
                job — it helps us find the right context.
              </p>
              <div className="row row--wrap" style={{ justifyContent: "center", marginTop: 8 }}>
                {QUICK_REPLIES.slice(0, 3).map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    className="badge badge--outline chat-suggestion"
                    style={{ cursor: "pointer", background: "#fff" }}
                    onClick={() => send(reply)}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="inline-error">
              <span>{error.message}</span>
            </div>
          ) : null}

          {messages.map((message) => {
            const mine = message.senderRole !== "admin";
            return (
              <div key={message.id} className={`chat-msg${mine ? " chat-msg--mine" : ""}`}>
                {message.text}
                <span className="chat-msg__time">
                  {message.senderRole === "admin" ? "Support · " : ""}
                  {clockTime(message.createdAt)}
                </span>
              </div>
            );
          })}
        </div>

        <div>
          <div className="chat-quick">
            {QUICK_REPLIES.map((reply) => (
              <button key={reply} type="button" onClick={() => setText(reply)}>
                {reply}
              </button>
            ))}
          </div>
          <form
            className="chat-compose"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <Input
              value={text}
              maxLength={1000}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write a message…"
              aria-label="Message support"
            />
            <Button type="submit" loading={sending} disabled={!text.trim()} icon={Send}>
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <p className="tiny muted chat-footnote">
            <Clock3 size={11} style={{ display: "inline", marginRight: 4 }} />
            Never share OTPs, passwords or card details. Messages are deleted when either side
            ends the chat.
          </p>
        </div>
      </div>

      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this support chat?"
        subtitle="Every message in this session will be permanently deleted for you and the admin team."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmEnd(false)}>
              Keep chatting
            </Button>
            <Button
              className="btn--danger"
              loading={ending}
              icon={XCircle}
              onClick={endChat}
            >
              End and delete
            </Button>
          </>
        }
      />
    </div>
  );
}
