import { useState } from "react";
import {
  Home,
  Search,
  Plus,
  Wrench,
  MessageCircle,
  User
} from "lucide-react";

export default function BottomNav({ setPage, role, onSearchClick }) {
  const [active, setActive] = useState("home");
  const [homeTaps, setHomeTaps] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  function handleHomeTap() {
    const now = Date.now();

    if (now - lastTap < 600) {
      const newCount = homeTaps + 1;
      setHomeTaps(newCount);

      if (newCount >= 4) {
        setPage("admin");
        setHomeTaps(0);
        return;
      }
    } else {
      setHomeTaps(1);
    }

    setLastTap(now);
    setPage("home");
    setActive("home");
  }

  function handleNav(page) {
    setPage(page);
    setActive(page);
  }

  function handleSearch() {
    // Go to home first, then trigger search focus
    setPage("home");
    setActive("search");
    // Small delay so home page mounts before we try to focus
    setTimeout(() => {
      if (onSearchClick) {
        onSearchClick();
      } else {
        // Fallback: try to find and focus the search input directly
        const searchInput = document.querySelector(".hero-search input, input[placeholder*='Search'], input[placeholder*='search']");
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 100);
  }

  return (
    <div className="bottom-nav">
      <div
        className={`nav-btn ${active === "home" ? "active" : ""}`}
        onClick={handleHomeTap}
      >
        <Home size={22} />
        <span>Home</span>
      </div>

      <div
        className={`nav-btn ${active === "search" ? "active" : ""}`}
        onClick={handleSearch}
      >
        <Search size={22} />
        <span>Search</span>
      </div>

      <div
        className="nav-btn add-btn"
        onClick={() => handleNav(role === "worker" ? "worker" : "booking")}
      >
        {role === "worker" ? (
          <Wrench size={26} />
        ) : (
          <Plus size={28} />
        )}
      </div>

      <div
        className={`nav-btn ${active === "chat" ? "active" : ""}`}
        onClick={() => handleNav("chat")}
      >
        <MessageCircle size={22} />
        <span>Chat</span>
      </div>

      <div
        className={`nav-btn ${active === "profile" ? "active" : ""}`}
        onClick={() => handleNav("profile")}
      >
        <User size={22} />
        <span>Profile</span>
      </div>
    </div>
  );
}