"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type?: string;
  price: number;
  availability: boolean;
  matchScore?: number;
  matchReasons?: string[];
};

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  modelUrl: string;
  imageUrl: string | null;
  width: number;
  depth: number;
  height: number;
  quantity: number;
  availableQuantity: number;
  price: number;
  matchScore?: number;
  matchReasons?: string[];
};

type MatchResult = {
  success?: boolean;
  recommendations?: {
    venues?: Venue[];
    inventory?: InventoryItem[];
  };
  summary?: {
    totalVenues?: number;
    matchedVenues?: number;
    totalInventoryItems?: number;
    matchedInventoryItems?: number;
  };
};

function formatCurrency(value: number) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function MatchPage() {
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [seating, setSeating] = useState("");
  const [decoration, setDecoration] = useState("");
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const syncTheme = (value?: string | null) => {
      setDarkMode((value ?? window.localStorage.getItem("wedding-planner-theme")) === "dark");
    };
    syncTheme();
    const onThemeChange = (event: Event) => {
      syncTheme((event as CustomEvent<string>).detail);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "wedding-planner-theme") syncTheme(event.newValue);
    };
    window.addEventListener("wedding-planner-theme-change", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wedding-planner-theme-change", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const venues = result?.recommendations?.venues ?? [];
  const inventoryItems = result?.recommendations?.inventory ?? [];

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? null,
    [venues, selectedVenueId]
  );

  const selectedInventory = useMemo(
    () => inventoryItems.filter((item) => selectedInventoryIds.includes(item.id)),
    [inventoryItems, selectedInventoryIds]
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setSelectedVenueId(null);
    setSelectedInventoryIds([]);
    setLoading(true);

    try {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          eventDate,
          location,
          guests: Number(guests),
          budget: Number(budget),
          seating,
          decoration,
          requirements,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to generate recommendations."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate recommendations."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleInventory(id: number) {
    setSelectedInventoryIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    );
  }

  function openDesigner() {
    if (!selectedVenue) {
      setError("Please select a recommended venue before opening the Designer.");
      return;
    }

    try {
      /*
         Phase 5 matched-design handoff.

         Store the exact venue, selected inventory and client requirements
         for a one-time transfer into the 3D Designer.
      */
      const matchedDesign = {
        version: 1,
        venueId: selectedVenue.id,
        inventory: selectedInventory,
        clientRequirements: {
          eventType,
          eventDate,
          location,
          guests: Number(guests),
          budget: Number(budget),
          seating,
          decoration,
          requirements,
        },
      };

      localStorage.setItem(
        "matched-design",
        JSON.stringify(matchedDesign)
      );

      window.location.href =
        `/?venueId=${encodeURIComponent(
          String(selectedVenue.id)
        )}&matchedDesign=1`;
    } catch (err) {
      console.error("Unable to prepare matched design:", err);
      setError("Unable to prepare the selected design. Please try again.");
    }
  }

  return (
    <main className={`match-page${darkMode ? " dark-mode" : ""}`}>

      <header className="planner-navbar">
        <div className="planner-navbar-inner">
          <Link href="/" className="planner-brand" aria-label="Wedding Planner home">
            <span className="planner-brand-mark">W</span>
            <span>
              <span className="planner-brand-title">Wedding Planner</span>
              <span className="planner-brand-subtitle">3D Venue Designer</span>
            </span>
          </Link>
          <nav className="planner-navigation" aria-label="Main navigation">
            <Link href="/" className="planner-nav-link">Designer</Link>
            <Link href="/venues" className="planner-nav-link">Venues</Link>
            <Link href="/inventory" className="planner-nav-link">Inventory</Link>
            <Link href="/match" className="planner-nav-link planner-nav-active">Find Matches</Link>
            <Link href="/themes" className="planner-nav-link">Themes</Link>
            <Link href="/designs" className="planner-nav-link">Saved Designs</Link>
          </nav>
        </div>
      </header>

      

      <section className="page-heading">
        <p className="eyebrow">DEMAND MATCHING</p>
        <h1>Wedding Event Matcher</h1>
        <p className="subtitle">
          Turn client requirements into venue and inventory recommendations.
        </p>
      </section>

      <div className="match-layout">
        <aside className="requirements-card">
          <div className="section-heading">
            <div className="step-number">1</div>
            <div>
              <h2>Event Requirements</h2>
              <p>Tell us what the client needs.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Event Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option>Wedding</option><option>Reception</option><option>Engagement</option>
                <option>Mehndi</option><option>Sangeet</option><option>Haldi</option>
                <option>Birthday</option><option>Corporate Event</option>
              </select>
            </div>

            <div className="form-group">
              <label>Event Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Preferred Location</label>
              <input type="text" placeholder="Enter preferred location" value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>

            <div className="two-column">
              <div className="form-group">
                <label>Guest Count</label>
                <input type="number" min="1" placeholder="100" value={guests} onChange={(e) => setGuests(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Budget (₹)</label>
                <input type="number" min="1" placeholder="100000" value={budget} onChange={(e) => setBudget(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Seating Arrangement</label>
              <select value={seating} onChange={(e) => setSeating(e.target.value)}>
                <option value="">Select seating preference</option>
                <option>Round Table Seating</option><option>Banquet Seating</option>
                <option>Traditional Seating</option><option>Theatre Style</option>
                <option>U-Shape Seating</option><option>Classroom Style</option>
                <option>Lounge Seating</option><option>Mixed Seating</option>
              </select>
            </div>

            <div className="form-group">
              <label>Decoration Style</label>
              <select value={decoration} onChange={(e) => setDecoration(e.target.value)}>
                <option value="">Select decoration style</option>
                <option>Traditional</option><option>Royal</option><option>Elegant</option>
                <option>Modern</option><option>Minimalist</option><option>Floral</option>
                <option>Luxury</option><option>Rustic</option><option>Bohemian</option>
                <option>Vintage</option><option>Garden Theme</option><option>Classic</option>
              </select>
            </div>

            <div className="form-group">
              <label>Additional Requirements</label>
              <select value={requirements} onChange={(e) => setRequirements(e.target.value)}>
                <option value="">Select additional requirements</option>
                <option>Stage Setup</option><option>Floral Decoration</option>
                <option>Premium Lighting</option><option>DJ Setup</option><option>Dance Floor</option>
                <option>Sound System</option><option>Photography Setup</option>
                <option>Food & Catering Area</option><option>VIP Seating</option>
                <option>Bridal Lounge</option><option>Entrance Decoration</option>
              </select>
            </div>

            <button type="submit" className="match-button" disabled={loading}>
              {loading ? "Finding Matches..." : "Find Best Matches"}
            </button>
          </form>

          <div className="info-box">
            <strong>How it works</strong>
            <p>We score venues and inventory against the client requirements. Select your preferred recommendations and open them directly in the 3D Designer.</p>
          </div>
        </aside>

        <section className="results-area">
          {!result && !error && (
            <div className="empty-results">
              <div className="empty-icon">✦</div>
              <h2>Ready to find the perfect match?</h2>
              <p>Enter the event requirements to receive smart recommendations from your existing venue and inventory database.</p>
            </div>
          )}

          {error && (
            <div className="error-card">
              <h3>Something went wrong</h3><p>{error}</p>
              <button onClick={() => setError("")} className="try-again-button">Dismiss</button>
            </div>
          )}

          {result && (
            <>
              <section className="result-section">
                <div className="result-title">
                  <div><span className="small-step">2</span><div><h2>Choose a Venue</h2><p>Select one venue to open in the 3D Designer.</p></div></div>
                  <span className="result-count">{venues.length} Found</span>
                </div>

                {venues.length === 0 ? <div className="no-result">No suitable venues were found.</div> : (
                  <div className="venue-list">
                    {venues.map((venue) => {
                      const selected = selectedVenueId === venue.id;
                      return <button type="button" className={`venue-card ${selected ? "selected" : ""}`} key={venue.id} onClick={() => setSelectedVenueId(venue.id)}>
                        <div className="venue-image"><span>{venue.name.charAt(0).toUpperCase()}</span></div>
                        <div className="venue-details">
                          <div className="venue-name-row"><h3>{venue.name}</h3><span className="score">{venue.matchScore ?? 0}% Match</span></div>
                          <p className="venue-location">📍 {venue.location}</p>
                          <div className="venue-info"><span>👥 {venue.capacity} Guests</span><span>{formatCurrency(venue.price)}</span></div>
                          <div className="availability">● {venue.availability ? "Available" : "Not Available"}</div>
                        </div>
                        <span className="select-indicator">{selected ? "✓ Selected" : "Select"}</span>
                      </button>;
                    })}
                  </div>
                )}
              </section>

              <section className="result-section inventory-section">
                <div className="result-title">
                  <div><span className="small-step">3</span><div><h2>Select Recommended Inventory</h2><p>Choose the items you want to take into the design.</p></div></div>
                  <span className="result-count">{selectedInventoryIds.length} Selected</span>
                </div>

                {inventoryItems.length === 0 ? <div className="no-result">No suitable inventory items were found.</div> : (
                  <div className="inventory-grid">
                    {inventoryItems.map((item) => {
                      const selected = selectedInventoryIds.includes(item.id);
                      return <button type="button" className={`inventory-card ${selected ? "selected" : ""}`} key={item.id} onClick={() => toggleInventory(item.id)}>
                        <span className="check-mark">{selected ? "✓" : "+"}</span>
                        <div className="inventory-icon">{item.name.charAt(0).toUpperCase()}</div>
                        <h3>{item.name}</h3><p>{item.category}</p>
                        <div className="inventory-bottom"><span>{formatCurrency(item.price)}</span><span>{item.availableQuantity} available</span>{item.matchScore !== undefined && <span>{item.matchScore}% match</span>}</div>
                      </button>;
                    })}
                  </div>
                )}
              </section>

              <section className="design-action-card">
                <div>
                  <p className="eyebrow">STEP 4 · CREATE DESIGN</p>
                  <h2>{selectedVenue ? selectedVenue.name : "Select a venue to continue"}</h2>
                  <p>{selectedInventory.length} inventory item{selectedInventory.length === 1 ? "" : "s"} selected for the new design.</p>
                </div>
                <button type="button" className="designer-button" onClick={openDesigner} disabled={!selectedVenue}>
                  Open in 3D Designer →
                </button>
              </section>

              <section className="summary-card">
                <div><h3>Match Summary</h3><p>We found {venues.length} suitable venue{venues.length !== 1 ? "s" : ""} and {inventoryItems.length} recommended inventory item{inventoryItems.length !== 1 ? "s" : ""}.</p></div>
                <div className="summary-stats"><div><strong>{venues.length}</strong><span>Venues</span></div><div><strong>{inventoryItems.length}</strong><span>Inventory</span></div><div><strong>{selectedInventory.length}</strong><span>Selected</span></div></div>
              </section>
            </>
          )}
        </section>
      </div>

      <style>{`
        /* Shared Wedding Planner navigation - enhanced */
        .planner-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid #dbe3ef;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(15,23,42,.06);
        }
        .planner-navbar-inner {
          width: min(1680px, 100%);
          min-height: 92px;
          margin: 0 auto;
          padding: 10px 26px;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr) 260px;
          align-items: center;
          gap: 18px;
          box-sizing: border-box;
        }
        .planner-navbar-inner::after {
          content: "";
          min-width: 0;
        }
        .planner-brand {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #243247;
          text-decoration: none;
          width: max-content;
          max-width: 100%;
        }
        .planner-brand-mark {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background: linear-gradient(135deg,#2f66c8,#1d4fa8);
          color: #fff;
          font-size: 24px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(37,99,235,.22);
        }
        .planner-brand-title {
          display: block;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: .02em;
          line-height: 1.15;
          white-space: nowrap;
        }
        .planner-brand-subtitle {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .planner-navigation {
          min-height: 60px;
          width: min(100%, 980px);
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          box-sizing: border-box;
          border: 1px solid #d7dee9;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(248,250,252,.96), rgba(241,245,249,.9));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 4px 12px rgba(15,23,42,.035);
        }
        .planner-nav-link {
          padding: 10px 14px;
          border-radius: 10px;
          color: #3d4a5c;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
          transition: background .18s ease, color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .planner-nav-link:hover {
          background: #e8eef8;
          color: #2453a2;
          transform: translateY(-1px);
        }
        .planner-nav-active {
          background: linear-gradient(180deg,#dce8f9,#d5e2f5);
          color: #2453a2;
          box-shadow: 0 2px 8px rgba(30,64,175,.10), inset 0 1px 0 rgba(255,255,255,.75);
        }
        @media (max-width: 1180px) {
          .planner-navbar-inner {
            grid-template-columns: 240px minmax(0, 1fr);
            padding: 12px 18px;
          }
          .planner-navbar-inner::after { display: none; }
          .planner-navigation { width: 100%; }
          .planner-nav-link { padding: 10px 11px; }
        }
        @media (max-width: 900px) {
          .planner-navbar-inner {
            display: flex;
            min-height: auto;
            flex-wrap: wrap;
            gap: 10px;
          }
          .planner-navigation {
            order: 2;
            flex-basis: 100%;
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .planner-navigation::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 620px) {
          .planner-navbar-inner { padding: 10px 12px; }
          .planner-brand-mark { width: 42px; height: 42px; font-size: 20px; border-radius: 10px; }
          .planner-brand-title { font-size: 17px; }
          .planner-brand-subtitle { font-size: 10px; }
          .planner-navigation { min-height: 52px; border-radius: 13px; }
          .planner-nav-link { padding: 9px 11px; font-size: 13px; }
        }

        * {
          box-sizing: border-box;
        }

        .match-page {
          min-height: 100vh;
          padding: 0 0 32px;
          color: #1e293b;
          font-family: Arial, Helvetica, sans-serif;
          background-color: #f8fafc;
          background-image:
            radial-gradient(
              circle at 1px 1px,
              rgba(100, 116, 139, 0.18) 1px,
              transparent 1.2px
            );
          background-size: 20px 20px;
        }

        .top-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          min-height: 62px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
          backdrop-filter: blur(12px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #173b6d;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .brand-mark {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #2563eb;
          color: #ffffff;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }

        .main-navigation {
          display: flex;
          align-items: center;
          gap: 5px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: none;
        }

        .main-navigation::-webkit-scrollbar {
          display: none;
        }

        .top-nav-link {
          flex: 0 0 auto;
          padding: 8px 11px;
          border-radius: 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .top-nav-link:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .top-nav-link.active-nav {
          background: #eaf2ff;
          color: #2563eb;
        }

        .page-heading {
          max-width: 1500px;
          margin: 0 auto;
          padding: 28px 24px 18px;
        }

        .eyebrow {
          margin: 0 0 6px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        h1 {
          margin: 0;
          color: #173b6d;
          font-size: 28px;
          letter-spacing: -0.02em;
        }

        .subtitle {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .match-button,
        .designer-button,
        .try-again-button {
          border: 0;
          background: #2563eb;
          color: #ffffff;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .match-button:hover:not(:disabled),
        .designer-button:hover:not(:disabled),
        .try-again-button:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .match-layout {
          max-width: 1500px;
          margin: 0 auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .requirements-card {
          position: sticky;
          top: 80px;
          padding: 18px;
        }

        .requirements-card,
        .result-section,
        .summary-card,
        .empty-results,
        .error-card,
        .design-action-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .section-heading,
        .result-title > div:first-child {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .section-heading {
          margin-bottom: 18px;
        }

        .step-number,
        .small-step {
          flex: 0 0 auto;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
        }

        .section-heading h2,
        .result-title h2 {
          margin: 0;
          color: #1e3a5f;
          font-size: 17px;
        }

        .section-heading p,
        .result-title p {
          margin: 4px 0 0;
          color: #718096;
          font-size: 12px;
        }

        .form-group {
          margin-bottom: 13px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
        }

        input,
        select {
          width: 100%;
          padding: 9px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          color: #1e293b;
          font-size: 13px;
          outline: none;
        }

        input:focus,
        select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .match-button {
          width: 100%;
          padding: 12px;
        }

        .match-button:disabled,
        .designer-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .info-box {
          margin-top: 18px;
          padding: 13px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 9px;
        }

        .info-box strong {
          color: #1d4ed8;
          font-size: 12px;
        }

        .info-box p {
          margin-bottom: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .results-area {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-results,
        .error-card {
          min-height: 380px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 30px;
        }

        .empty-results h2 {
          color: #1e3a5f;
          font-size: 19px;
        }

        .empty-results p {
          max-width: 500px;
          color: #718096;
          font-size: 13px;
          line-height: 1.6;
        }

        .error-card {
          min-height: 240px;
        }

        .error-card h3 {
          color: #b42318;
        }

        .error-card p {
          color: #64748b;
        }

        .result-section {
          padding: 18px;
        }

        .result-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .result-count {
          padding: 6px 10px;
          border-radius: 999px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .venue-list {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .venue-card {
          width: 100%;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          color: inherit;
          text-align: left;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .venue-card:hover {
          border-color: #93c5fd;
          transform: translateY(-1px);
        }

        .venue-card.selected {
          border: 2px solid #2563eb;
          background: #f8fbff;
        }

        .venue-image {
          width: 70px;
          min-width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
        }

        .venue-image span {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          font-size: 16px;
          font-weight: 800;
        }

        .venue-details {
          flex: 1;
          min-width: 0;
        }

        .venue-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .venue-name-row h3 {
          margin: 0;
          color: #263f5c;
          font-size: 15px;
        }

        .score {
          padding: 4px 7px;
          border-radius: 6px;
          background: #e0f4e7;
          color: #237644;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .venue-location {
          margin: 7px 0;
          color: #718096;
          font-size: 12px;
        }

        .venue-info {
          display: flex;
          gap: 18px;
          color: #506985;
          font-size: 12px;
        }

        .availability {
          margin-top: 8px;
          color: #23804b;
          font-size: 11px;
          font-weight: 700;
        }

        .select-indicator {
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
        }

        .inventory-card {
          position: relative;
          padding: 14px;
          color: inherit;
          text-align: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .inventory-card:hover {
          border-color: #93c5fd;
          transform: translateY(-2px);
        }

        .inventory-card.selected {
          border: 2px solid #2563eb;
          background: #f8fbff;
        }

        .check-mark {
          position: absolute;
          top: 9px;
          right: 9px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eff6ff;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
        }

        .inventory-card.selected .check-mark {
          background: #2563eb;
          color: #ffffff;
        }

        .inventory-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 20px;
          font-weight: 800;
        }

        .inventory-card h3 {
          margin: 0;
          color: #263f5c;
          font-size: 14px;
        }

        .inventory-card p {
          min-height: 18px;
          color: #718096;
          font-size: 11px;
        }

        .inventory-bottom {
          display: flex;
          flex-direction: column;
          gap: 5px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 700;
        }

        .design-action-card {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: linear-gradient(135deg, #ffffff, #eff6ff);
        }

        .design-action-card h2 {
          margin: 0 0 6px;
          color: #1e3a5f;
          font-size: 18px;
        }

        .design-action-card > div > p:last-child {
          margin: 0;
          color: #64748b;
          font-size: 12px;
        }

        .designer-button {
          padding: 12px 16px;
          white-space: nowrap;
        }

        .summary-card {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .summary-card h3 {
          margin: 0 0 6px;
          color: #1e3a5f;
          font-size: 16px;
        }

        .summary-card p {
          margin: 0;
          color: #718096;
          font-size: 12px;
        }

        .summary-stats {
          display: flex;
          gap: 22px;
          text-align: center;
        }

        .summary-stats div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-stats strong {
          color: #2563eb;
          font-size: 20px;
        }

        .summary-stats span {
          color: #718096;
          font-size: 10px;
        }

        .no-result {
          padding: 24px;
          color: #718096;
          text-align: center;
          background: #f8fafc;
          border-radius: 9px;
          font-size: 12px;
        }

        @media (max-width: 1000px) {
          .top-header {
            padding: 9px 16px;
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .main-navigation {
            width: 100%;
          }

          .match-layout {
            grid-template-columns: 1fr;
          }

          .requirements-card {
            position: static;
          }
        }

        @media (max-width: 700px) {
          .page-heading,
          .match-layout {
            padding-left: 14px;
            padding-right: 14px;
          }

          .two-column {
            grid-template-columns: 1fr;
          }

          .result-title,
          .design-action-card,
          .summary-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .summary-stats {
            width: 100%;
            justify-content: space-between;
          }

          .venue-card {
            align-items: flex-start;
          }

          .venue-image {
            width: 60px;
            min-width: 60px;
            height: 60px;
          }

          .venue-info {
            flex-direction: column;
            gap: 5px;
          }

          .select-indicator {
            display: none;
          }
        }

        @media (max-width: 450px) {
          .brand-text {
            display: none;
          }

          .venue-card {
            gap: 10px;
          }

          .venue-name-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .inventory-grid {
            grid-template-columns: 1fr;
          }
        }

        /* =====================================================
           DARK MODE + SHARED NAVIGATION
           ===================================================== */
        .planner-navbar-inner {
          width: 100%;
          max-width: none;
          grid-template-columns: minmax(260px, 1fr) auto minmax(260px, 1fr);
        }

        .planner-navbar-inner::after {
          display: none;
        }

        .planner-brand {
          justify-self: start;
        }

        .planner-navigation {
          justify-self: center;
          width: max-content;
          max-width: 100%;
        }

        .planner-theme-toggle {
          justify-self: end;
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: linear-gradient(180deg, #ffffff, #f1f5f9);
          color: #334155;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          transition: transform .18s ease, background .18s ease, border-color .18s ease;
        }

        .planner-theme-toggle:hover {
          transform: translateY(-1px);
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .dark-mode {
          color: #e5edf8;
          background-color: #121a28 !important;
          background-image:
            radial-gradient(
              circle at 1px 1px,
              rgba(203, 213, 225, 0.38) 1px,
              transparent 1.25px
            ) !important;
          background-size: 20px 20px !important;
        }

        .dark-mode .planner-navbar {
          background: rgba(28, 39, 57, 0.97);
          border-bottom-color: #334155;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        }

        .dark-mode .planner-brand,
        .dark-mode .planner-brand-title {
          color: #f8fafc;
        }

        .dark-mode .planner-brand-subtitle {
          color: #aebed1;
        }

        .dark-mode .planner-navigation {
          border-color: #40516a;
          background: linear-gradient(180deg, #26344a, #202c3f);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
        }

        .dark-mode .planner-nav-link {
          color: #cbd5e1;
        }

        .dark-mode .planner-nav-link:hover {
          color: #ffffff;
          background: #34445d;
        }

        .dark-mode .planner-nav-active {
          color: #ffffff;
          background: linear-gradient(180deg, #42689c, #31527f);
          box-shadow: 0 4px 12px rgba(0,0,0,.18);
        }

        .dark-mode .planner-theme-toggle {
          color: #fbbf24;
          border-color: #40516a;
          background: linear-gradient(180deg, #26344a, #202c3f);
          box-shadow: 0 6px 18px rgba(0, 0, 0, .18);
        }

        .dark-mode .planner-theme-toggle:hover {
          background: #30415a;
          border-color: #64748b;
        }

        /* Match page cards and controls */
        .dark-mode .requirements-card,
        .dark-mode .result-section,
        .dark-mode .summary-card,
        .dark-mode .empty-results,
        .dark-mode .error-card,
        .dark-mode .design-action-card,
        .dark-mode .venue-card,
        .dark-mode .inventory-card {
          background: #202c3f !important;
          border-color: #40516a !important;
          color: #e5edf8 !important;
          box-shadow: 0 10px 28px rgba(0,0,0,.18);
        }

        .dark-mode .venue-card.selected,
        .dark-mode .inventory-card.selected {
          background: #263a57 !important;
          border-color: #4f8df7 !important;
        }

        .dark-mode .info-box,
        .dark-mode .result-count,
        .dark-mode .empty-icon {
          background: #263a57 !important;
          border-color: #40516a !important;
        }

        .dark-mode input,
        .dark-mode textarea,
        .dark-mode select {
          background: #182334 !important;
          border-color: #40516a !important;
          color: #e5edf8 !important;
        }

        .dark-mode option {
          background: #182334;
          color: #e5edf8;
        }

        .dark-mode .page-heading h1,
        .dark-mode h1,
        .dark-mode h2,
        .dark-mode h3,
        .dark-mode .section-heading h2,
        .dark-mode .result-title h2,
        .dark-mode .venue-name-row h3,
        .dark-mode .empty-results h2,
        .dark-mode .themeContent h3,
        .dark-mode .designTitleRow h3 {
          color: #f8fafc !important;
        }

        .dark-mode p,
        .dark-mode .subtitle,
        .dark-mode .section-heading p,
        .dark-mode .result-title p,
        .dark-mode .venue-location,
        .dark-mode .venue-info,
        .dark-mode .inventory-bottom,
        .dark-mode .empty-results p,
        .dark-mode .info-box p,
        .dark-mode .themeContent p,
        .dark-mode .message {
          color: #aebed1 !important;
        }

        .dark-mode label,
        .dark-mode .infoLabel,
        .dark-mode .designId {
          color: #cbd5e1 !important;
        }

        /* Themes page cards */
        .dark-mode .formCard,
        .dark-mode .themesSection,
        .dark-mode .themeCard,
        .dark-mode .emptyState {
          background: #202c3f !important;
          border-color: #40516a !important;
          color: #e5edf8 !important;
          box-shadow: 0 10px 28px rgba(0,0,0,.18);
        }

        .dark-mode .secondaryButton {
          background: #2b3a50 !important;
          color: #e5edf8 !important;
          border-color: #40516a !important;
        }

        .dark-mode .styleTag {
          background: #263a57 !important;
          color: #bfdbfe !important;
        }

        .dark-mode .colorInfo {
          color: #cbd5e1 !important;
        }

        /* Saved designs cards and modal */
        .dark-mode .hero,
        .dark-mode .designCard,
        .dark-mode .emptyState,
        .dark-mode .stateCard,
        .dark-mode .modal,
        .dark-mode .infoBox {
          background: #202c3f !important;
          border-color: #40516a !important;
          color: #e5edf8 !important;
          box-shadow: 0 10px 28px rgba(0,0,0,.18);
        }

        .dark-mode .designPreview,
        .dark-mode .previewTop,
        .dark-mode .previewText,
        .dark-mode .infoGrid > div,
        .dark-mode .modalDetails {
          background-color: #182334 !important;
          border-color: #40516a !important;
        }

        .dark-mode .refreshButton,
        .dark-mode .secondaryButton,
        .dark-mode .actionButton.secondaryButton,
        .dark-mode .cancelButton,
        .dark-mode .closeButton,
        .dark-mode .editIconButton {
          background: #26344a !important;
          color: #e5edf8 !important;
          border-color: #40516a !important;
        }

        .dark-mode .modalOverlay {
          background: rgba(3, 7, 18, 0.72) !important;
        }

        @media (max-width: 1180px) {
          .planner-navbar-inner {
            grid-template-columns: minmax(220px, 1fr) minmax(0, 1fr) 72px;
          }

          .planner-navigation {
            width: 100%;
          }

          .planner-theme-toggle {
            width: 52px;
            height: 52px;
          }
        }

        @media (max-width: 900px) {
          .planner-navbar-inner {
            display: grid;
            grid-template-columns: 1fr auto;
          }

          .planner-navigation {
            grid-column: 1 / -1;
            grid-row: 2;
            justify-self: stretch;
            width: 100%;
          }

          .planner-theme-toggle {
            grid-column: 2;
            grid-row: 1;
          }
        }

      `}</style>
    </main>
  );
}
