import { useRef, useState } from "react";
import { searchPlaces } from "../utils/geocode";

export default function SearchBox({ onSelect }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [results, setResults] = useState([]);
  const reqId = useRef(0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim() || status === "loading") return;
    const myId = ++reqId.current;
    setStatus("loading");
    try {
      const found = await searchPlaces(query);
      if (myId !== reqId.current) return; // a newer search replaced this one
      setResults(found);
      setStatus("done");
    } catch {
      if (myId !== reqId.current) return;
      setResults([]);
      setStatus("error");
    }
  }

  function handlePick(r) {
    onSelect(r);
    setResults([]);
    setStatus("idle");
    setQuery("");
  }

  return (
    <section className="drawer-section">
      <label className="field-label" htmlFor="place-search">Search address or place</label>
      <form className="search-row" onSubmit={handleSubmit}>
        <input
          id="place-search"
          className="field-input"
          type="search"
          placeholder="e.g. SM Megamall, Shaw Blvd"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setResults([]); setStatus("idle"); }
          }}
          autoComplete="off"
        />
        <button type="submit" className="btn" disabled={!query.trim() || status === "loading"}>
          {status === "loading" ? "…" : "Search"}
        </button>
      </form>

      {status === "error" && (
        <p className="empty-note">Search failed. Check your connection and try again.</p>
      )}
      {status === "done" && results.length === 0 && (
        <p className="empty-note">No matches inside Metro Manila.</p>
      )}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="search-result" onClick={() => handlePick(r)}>
                <span className="search-result-name">{r.name}</span>
                <span className="search-result-detail">{r.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}