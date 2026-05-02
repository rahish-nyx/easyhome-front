import { useEffect } from "react";
import logo from "../assets/logo.png"; 

const LOGO_CSS = `
@keyframes logo-float {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.eh-logo-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.eh-logo-img {
  height: 42px;
  object-fit: contain;
  /* animation: logo-float 3s ease-in-out infinite; */
  transition: transform 0.3s ease;
}

.eh-logo-wrap:hover .eh-logo-img {
  transform: scale(1.08);
}

.eh-logo-text {
  font-weight: 800;
  font-size: 20px;
  color: #1a1a1a;
}

.eh-logo-text span {
  color: #ff4500;
}

.eh-logo-sub {
  font-size: 10px;
  color: #ff7a18;
  font-weight: 600;
}
`;

let injected = false;

function injectStyles() {
  if (injected) return;
  injected = true;

  const style = document.createElement("style");
  style.innerHTML = LOGO_CSS;
  document.head.appendChild(style);
}

export default function EasyHomeLogo({ variant = "default", onClick }) {
  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <div className="eh-logo-wrap" onClick={onClick}>
      {/* 🔥 Your real logo */}
      <img src={logo} alt="EasyHome Logo" className="eh-logo-img" />

      {/* Optional text (remove if not needed) */}
      {variant !== "imageOnly" && (
        <div>
          <div className="eh-logo-text">
            Easy<span>Home</span>
          </div>
          {variant !== "compact" && (
            <div className="eh-logo-sub">Home Services</div>
          )}
        </div>
      )}
    </div>
  );
}
