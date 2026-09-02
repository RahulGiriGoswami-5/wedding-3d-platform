"use client";

import { FormEvent, useMemo, useState } from "react";

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
    <main className="match-page">
      <header className="top-header">
        <div>
          <p className="eyebrow">PHASE 5 · DEMAND MATCHING</p>
          <h1>Wedding Event Matcher</h1>
          <p className="subtitle">
            Turn client requirements into venue and inventory recommendations.
          </p>
        </div>
        <a className="nav-button" href="/">
          ← Back to Designer
        </a>
      </header>

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

      <style jsx>{`
        * { box-sizing: border-box; }
        .match-page { min-height: 100vh; background: #f5f8fc; color: #1e293b; padding: 40px; font-family: Arial, Helvetica, sans-serif; }
        .top-header { max-width: 1500px; margin: 0 auto 30px; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
        .eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
        h1 { margin: 0; color: #123a6d; font-size: 34px; }.subtitle { margin: 8px 0 0; color: #64748b; }
        .nav-button,.designer-button,.match-button,.try-again-button { border: 0; background: #2167b5; color: #fff; border-radius: 10px; padding: 13px 18px; font-weight: 700; cursor: pointer; text-decoration: none; transition: .2s; }
        .nav-button:hover,.designer-button:hover,.match-button:hover,.try-again-button:hover { background: #164f91; transform: translateY(-1px); }
        .match-layout { max-width: 1500px; margin: auto; display: grid; grid-template-columns: 370px 1fr; gap: 25px; align-items: start; }
        .requirements-card,.result-section,.summary-card,.empty-results,.error-card,.design-action-card { background: #fff; border: 1px solid #d9e3f0; border-radius: 16px; box-shadow: 0 8px 30px rgba(30,70,120,.08); }
        .requirements-card { padding: 25px; }.section-heading,.result-title>div:first-child { display: flex; align-items: center; gap: 14px; }.section-heading { margin-bottom: 25px; }
        .step-number,.small-step { flex: 0 0 auto; background: #2167b5; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; }
        .section-heading h2,.result-title h2 { margin: 0; color: #163c69; }.section-heading p,.result-title p { margin: 4px 0 0; color: #718096; font-size: 13px; }
        .form-group { margin-bottom: 18px; } label { display:block; margin-bottom:8px; color:#35506f; font-size:13px; font-weight:700; }
        input,select { width:100%; padding:13px; border-radius:9px; border:1px solid #cbd8e6; background:#fff; color:#1e293b; font-size:14px; outline:none; }
        input:focus,select:focus { border-color:#2878c8; box-shadow:0 0 0 3px rgba(40,120,200,.12); }.two-column { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .match-button { width:100%; padding:15px; }.match-button:disabled,.designer-button:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        .info-box { margin-top:25px; padding:18px; background:#eef5fc; border:1px solid #cfe0f2; border-radius:10px; }.info-box strong { color:#1d4f84; }.info-box p { color:#64748b; font-size:13px; line-height:1.6; margin-bottom:0; }
        .results-area { display:flex; flex-direction:column; gap:22px; }.empty-results,.error-card { min-height:420px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px; }
        .empty-icon { width:80px; height:80px; border-radius:20px; background:#e7f1fc; color:#2878c8; display:flex; align-items:center; justify-content:center; font-size:40px; }.empty-results h2 { color:#163c69; }.empty-results p { color:#718096; max-width:500px; line-height:1.6; }
        .error-card { min-height:260px; }.error-card h3 { color:#b42318; }.error-card p { color:#64748b; }.result-section { padding:25px; }.result-title { display:flex; justify-content:space-between; align-items:center; gap:15px; margin-bottom:20px; }
        .result-count { background:#eaf3fc; color:#2467aa; padding:7px 12px; border-radius:20px; font-size:13px; font-weight:700; white-space:nowrap; }.venue-list { display:flex; flex-direction:column; gap:14px; }
        .venue-card { width:100%; text-align:left; background:#fff; border:1px solid #dbe5ef; border-radius:12px; padding:15px; display:flex; align-items:center; gap:18px; cursor:pointer; transition:.2s; color:inherit; }.venue-card:hover { border-color:#78aee2; transform:translateY(-2px); }.venue-card.selected { border:2px solid #2167b5; background:#f7fbff; }
        .venue-image { width:95px; min-width:95px; height:95px; border-radius:10px; background:linear-gradient(135deg,#d9ebfb,#91bce7); display:flex; align-items:center; justify-content:center; }.venue-image span { width:52px; height:52px; border-radius:50%; background:#2167b5; color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; }
        .venue-details { flex:1; min-width:0; }.venue-name-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }.venue-name-row h3 { margin:0; color:#263f5c; }.score { background:#e0f4e7; color:#237644; padding:5px 9px; border-radius:6px; font-size:12px; font-weight:700; white-space:nowrap; }.venue-location { color:#718096; font-size:14px; margin:10px 0; }.venue-info { display:flex; gap:25px; color:#506985; font-size:14px; }.availability { margin-top:12px; color:#23804b; font-size:13px; font-weight:700; }.select-indicator { color:#2167b5; font-size:13px; font-weight:800; white-space:nowrap; }
        .inventory-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:15px; }.inventory-card { position:relative; background:#fff; border:1px solid #dce5ee; border-radius:12px; padding:18px; text-align:center; cursor:pointer; color:inherit; transition:.2s; }.inventory-card:hover { border-color:#78aee2; transform:translateY(-3px); }.inventory-card.selected { border:2px solid #2167b5; background:#f7fbff; }.check-mark { position:absolute; right:10px; top:10px; width:25px; height:25px; border-radius:50%; background:#e9f3fd; color:#2167b5; display:flex; align-items:center; justify-content:center; font-weight:800; }.inventory-card.selected .check-mark { background:#2167b5; color:#fff; }
        .inventory-icon { width:60px; height:60px; border-radius:12px; background:#e9f3fd; color:#2167b5; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; margin:0 auto 14px; }.inventory-card h3 { margin:0; font-size:15px; color:#263f5c; }.inventory-card p { color:#718096; font-size:13px; min-height:20px; }.inventory-bottom { display:flex; flex-direction:column; gap:6px; color:#2467aa; font-size:12px; font-weight:700; }
        .design-action-card { padding:26px; display:flex; justify-content:space-between; align-items:center; gap:25px; background:linear-gradient(135deg,#f8fbff,#eef6ff); }.design-action-card h2 { margin:0 0 7px; color:#163c69; }.design-action-card>div>p:last-child { margin:0; color:#64748b; }.designer-button { padding:15px 22px; white-space:nowrap; }
        .summary-card { padding:25px; display:flex; justify-content:space-between; align-items:center; gap:20px; }.summary-card h3 { margin:0 0 8px; color:#163c69; }.summary-card p { color:#718096; margin:0; }.summary-stats { display:flex; gap:30px; text-align:center; }.summary-stats div { display:flex; flex-direction:column; gap:5px; }.summary-stats strong { color:#2167b5; font-size:24px; }.summary-stats span { color:#718096; font-size:12px; }.no-result { padding:30px; background:#f5f8fc; border-radius:10px; text-align:center; color:#718096; }
        @media(max-width:1000px){.match-layout{grid-template-columns:1fr}.top-header{flex-direction:column;align-items:flex-start}.requirements-card{position:static}} @media(max-width:700px){.match-page{padding:20px}.two-column{grid-template-columns:1fr}.result-title,.design-action-card,.summary-card{flex-direction:column;align-items:flex-start}.summary-stats{width:100%;justify-content:space-between}.venue-card{align-items:flex-start}.venue-image{width:70px;min-width:70px;height:70px}.venue-info{flex-direction:column;gap:6px}.select-indicator{display:none}} @media(max-width:450px){.venue-card{gap:10px}.venue-name-row{flex-direction:column;align-items:flex-start}.inventory-grid{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
