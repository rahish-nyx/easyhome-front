import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://easyhome-back.onrender.com";
let socket;

export default function ChatPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    loadMessages();
    setupSocket();
    return () => socket?.disconnect();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function setupSocket() {
    socket = io(API);
    socket.on("connect", () => {
      const id =
        localStorage.getItem("workerId") || localStorage.getItem("customerId");
      if (user.role === "worker") socket.emit("register_worker", id);
      else socket.emit("register_customer", id);
    });
    socket.on("new_admin_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
  }

  function loadMessages() {
    fetch(`${API}/chat`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  async function sendMessage() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: "clamp(58px,7vw,70px)",
        display: "flex",
        flexDirection: "column",
        /* NO maxWidth — fills entire screen */
        width: "100%",
        background: "white",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg,#ff7a18,#ff3c00)",
          padding: "clamp(12px,2vw,20px) clamp(16px,3vw,32px)",
          color: "white",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(255,69,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(10px,2vw,18px)",
          }}
        >
          <div
            style={{
              width: "clamp(38px,5vw,54px)",
              height: "clamp(38px,5vw,54px)",
              background: "rgba(255,255,255,0.3)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "clamp(18px,2.5vw,26px)",
              flexShrink: 0,
            }}
          >
            🛡️
          </div>
          <div>
            <p
              style={{
                fontWeight: "800",
                fontSize: "clamp(14px,1.8vw,20px)",
                margin: 0,
              }}
            >
              EasyHome Support
            </p>
            <p
              style={{
                fontSize: "clamp(10px,1.2vw,14px)",
                opacity: 0.85,
                margin: 0,
              }}
            >
              Admin · Usually replies quickly
            </p>
          </div>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "clamp(12px,2.5vw,24px) clamp(14px,3vw,32px)",
          background: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(8px,1.5vw,14px)",
        }}
      >
        {loading && (
          <p
            style={{
              textAlign: "center",
              color: "#aaa",
              marginTop: "20px",
              fontSize: "clamp(13px,1.5vw,16px)",
            }}
          >
            Loading...
          </p>
        )}

        {!loading && messages.length === 0 && (
          <div
            style={{ textAlign: "center", marginTop: "clamp(40px,8vw,80px)" }}
          >
            <span style={{ fontSize: "clamp(44px,7vw,72px)" }}>💬</span>
            <p
              style={{
                color: "#aaa",
                marginTop: "12px",
                fontSize: "clamp(13px,1.5vw,17px)",
              }}
            >
              No messages yet. Say hi to support!
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderRole !== "admin";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "clamp(260px,55vw,680px)",
                  background: isMe
                    ? "linear-gradient(135deg,#ff7a18,#ff3c00)"
                    : "white",
                  color: isMe ? "white" : "#333",
                  padding: "clamp(9px,1.5vw,14px) clamp(12px,2vw,20px)",
                  borderRadius: isMe
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  fontSize: "clamp(13px,1.4vw,16px)",
                }}
              >
                {!isMe && (
                  <p
                    style={{
                      fontSize: "clamp(10px,1vw,12px)",
                      color: "#ff7a18",
                      fontWeight: "bold",
                      marginBottom: "4px",
                      marginTop: 0,
                    }}
                  >
                    🛡️ Support
                  </p>
                )}
                <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.message}</p>
                <p
                  style={{
                    fontSize: "clamp(10px,1vw,12px)",
                    opacity: 0.7,
                    marginTop: "4px",
                    textAlign: "right",
                    marginBottom: 0,
                  }}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* INPUT BOX */}
      <div
        style={{
          padding: "clamp(10px,1.8vw,18px) clamp(14px,3vw,32px)",
          background: "white",
          borderTop: "1px solid #eee",
          display: "flex",
          gap: "clamp(8px,1.5vw,14px)",
          alignItems: "center",
          flexShrink: 0,
          boxShadow: "0 -2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "clamp(10px,1.5vw,15px) clamp(14px,2vw,22px)",
            borderRadius: "50px",
            border: "1.5px solid #eee",
            outline: "none",
            fontSize: "clamp(13px,1.4vw,16px)",
            background: "#f9f9f9",
            transition: "border-color 0.2s, box-shadow 0.2s",
            margin: 0,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#ff7a18";
            e.target.style.boxShadow = "0 0 0 3px rgba(255,122,24,0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#eee";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          style={{
            width: "clamp(40px,5vw,56px)",
            height: "clamp(40px,5vw,56px)",
            background: text.trim()
              ? "linear-gradient(135deg,#ff7a18,#ff3c00)"
              : "#eee",
            border: "none",
            borderRadius: "50%",
            cursor: text.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "clamp(16px,2vw,22px)",
            flexShrink: 0,
            transition: "all 0.2s",
            boxShadow: text.trim() ? "0 4px 14px rgba(255,69,0,0.3)" : "none",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
