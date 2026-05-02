import { useRef } from "react";

export default function Hero({ onSearch, searchQuery, searchInputRef }) {
  function handleChange(e) {
    if (onSearch) onSearch(e.target.value);
  }

  function handleKey(e) {
    if (e.key === "Escape") onSearch?.("");
  }

  return (
    <div className="hero">
      <h1>
        Find <span>a skilled person</span> in your area
      </h1>
      <div className="search-box">
        <input
          ref={searchInputRef}
          placeholder="Plumber, Tutor, Electrician..."
          value={searchQuery || ""}
          onChange={handleChange}
          onKeyDown={handleKey}
        />
        <button onClick={() => onSearch?.("")}>
          {searchQuery ? "✕" : "🔍"}
        </button>
      </div>
    </div>
  );
}
