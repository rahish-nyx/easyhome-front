import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setShow(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShow(false);
      setInstalled(true);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
      setPrompt(null);
    }
  }

  if (!show || installed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "72px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "460px",
        background: "white",
        borderRadius: "18px",
        padding: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        zIndex: 9999,
        animation: "slideUp 0.3s ease",
        border: "1px solid #ffd0a0",
      }}
    >
      {/* ICON */}
      <div
        style={{
          width: "48px",
          height: "48px",
          background: "linear-gradient(135deg, #ff7a18, #ff3c00)",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          flexShrink: 0,
        }}
      >
        🏠
      </div>

      {/* TEXT */}
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>
          Install EasyHome App
        </p>
        <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>
          Add to home screen for faster access
        </p>
      </div>

      {/* BUTTONS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <button
          onClick={handleInstall}
          style={{
            background: "linear-gradient(135deg, #ff7a18, #ff3c00)",
            border: "none",
            padding: "7px 14px",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "12px",
            color: "white",
            fontWeight: "bold",
          }}
        >
          Install
        </button>
        <button
          onClick={() => setShow(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "11px",
            color: "#aaa",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
