"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";



type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
  modelUrl: string | null;
  layoutData?: string | null;
};

type VenueFormState = {
  name: string;
  location: string;
  capacity: string;
  type: string;
  price: string;
  availability: boolean;
};

const EMPTY_FORM: VenueFormState = {
  name: "",
  location: "",
  capacity: "",
  type: "",
  price: "",
  availability: true,
};

const ACCEPTED_MODEL_TYPES = [".glb", ".fbx", ".obj"];
const MAX_MODEL_SIZE = 100 * 1024 * 1024;

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function getApiError(data: unknown, fallback: string) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error?: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<VenueFormState>(EMPTY_FORM);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await fetch("/api/venues", {
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to load venues."));
      }

      // An empty database is valid and must never be treated as an error.
      setVenues(Array.isArray(data) ? (data as Venue[]) : []);
    } catch (error) {
      console.error("Failed to fetch venues:", error);
      setVenues([]);
      setPageError(
        error instanceof Error ? error.message : "Failed to load venues."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVenues();
  }, [loadVenues]);

  const venueCountLabel = useMemo(
    () => `${venues.length} ${venues.length === 1 ? "venue" : "venues"}`,
    [venues.length]
  );

  function openAddModal() {
    setForm(EMPTY_FORM);
    setModelFile(null);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;
    setShowModal(false);
    setFormError("");
  }

  function updateField<K extends keyof VenueFormState>(
    key: K,
    value: VenueFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleFileChange(file: File | null) {
    setFormError("");

    if (!file) {
      setModelFile(null);
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;

    if (!ACCEPTED_MODEL_TYPES.includes(extension)) {
      setModelFile(null);
      setFormError("Please select a .glb, .fbx or .obj 3D model.");
      return;
    }

    if (file.size > MAX_MODEL_SIZE) {
      setModelFile(null);
      setFormError("The 3D model must be smaller than 100 MB.");
      return;
    }

    setModelFile(file);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const capacity = Number(form.capacity);
    const price = Number(form.price);

    if (!Number.isFinite(capacity) || capacity <= 0) {
      setFormError("Please enter a valid capacity greater than 0.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setFormError("Please enter a valid price.");
      return;
    }

    try {
      setSubmitting(true);

      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("location", form.location.trim());
      body.append("capacity", String(capacity));
      body.append("type", form.type.trim());
      body.append("price", String(price));
      body.append("availability", String(form.availability));

      if (modelFile) {
        body.append("model", modelFile);
      }

      const response = await fetch("/api/venues", {
        method: "POST",
        body,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to create venue."));
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setModelFile(null);
      await loadVenues();
    } catch (error) {
      console.error("Failed to create venue:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create venue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteVenue(id: number, name: string) {
    const confirmed = window.confirm(
      `Delete "${name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      const response = await fetch("/api/venues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to delete venue."));
      }

      setVenues((current) => current.filter((venue) => venue.id !== id));
    } catch (error) {
      console.error("Failed to delete venue:", error);
      window.alert(
        error instanceof Error ? error.message : "Failed to delete venue."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openEditor(venue: Venue) {
    router.push(`/?venueId=${encodeURIComponent(String(venue.id))}`);
  }

  return (
    <main className="venues-page">
      <header className="planner-navbar">
        <div className="planner-navbar-inner">
          <a href="/" className="planner-brand" aria-label="Wedding Planner home">
            <span className="planner-brand-mark">W</span>
            <span>
              <span className="planner-brand-title">Wedding Planner</span>
              <span className="planner-brand-subtitle">3D Venue Designer</span>
            </span>
          </a>
          <nav className="planner-navigation" aria-label="Main navigation">
            <a href="/" className="planner-nav-link">Designer</a>
            <a href="/venues" className="planner-nav-link planner-nav-active" aria-current="page">Venues</a>
            <a href="/inventory" className="planner-nav-link">Inventory</a>
            <a href="/match" className="planner-nav-link">Find Matches</a>
            <a href="/themes" className="planner-nav-link">Themes</a>
            <a href="/designs" className="planner-nav-link">Saved Designs</a>
          </nav>
        </div>
      </header>

      <section className="venues-header">
        <div>
          <span className="eyebrow">VENUE MANAGEMENT</span>
          <h1>Venues</h1>
          <p>Manage your wedding and event venues, 3D models and layouts.</p>
        </div>

        <button className="primary-button" onClick={openAddModal} type="button">
          <span>＋</span> Add Venue
        </button>
      </section>

      <div className="summary-row">
        <span>{venueCountLabel}</span>
        <button
          type="button"
          className="refresh-button"
          onClick={() => void loadVenues()}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="state-card">
          <div className="spinner" />
          <h2>Loading venues...</h2>
          <p>Please wait while your venue list is loaded.</p>
        </div>
      ) : pageError ? (
        <div className="state-card error-card">
          <div className="state-icon">!</div>
          <h2>Unable to load venues</h2>
          <p>{pageError}</p>
          <button className="primary-button" type="button" onClick={() => void loadVenues()}>
            Try Again
          </button>
        </div>
      ) : venues.length === 0 ? (
        <div className="state-card empty-card">
          <div className="empty-icon">⌑</div>
          <h2>No venues yet</h2>
          <p>Create your first venue and optionally connect a GLB, FBX or OBJ model.</p>
          <button className="primary-button" type="button" onClick={openAddModal}>
            ＋ Add Your First Venue
          </button>
        </div>
      ) : (
        <section className="venues-grid">
          {venues.map((venue) => (
            <article className="venue-card" key={venue.id}>
              <div className="card-topline">
                <span className="venue-type">{venue.type}</span>
                <span className={venue.availability ? "status available" : "status unavailable"}>
                  {venue.availability ? "✓ Available" : "Unavailable"}
                </span>
              </div>

              <h2>{venue.name}</h2>

              <div className="venue-details">
                <div><span>⌖</span><p>Location</p><strong>{venue.location}</strong></div>
                <div><span>♟</span><p>Capacity</p><strong>{venue.capacity} guests</strong></div>
                <div><span>₹</span><p>Price</p><strong>{formatPrice(venue.price)}</strong></div>
              </div>

              <div className="model-status">
                <div>
                  <span className={venue.modelUrl ? "model-dot connected" : "model-dot"} />
                  <span>{venue.modelUrl ? "3D Model Connected" : "No 3D Model"}</span>
                </div>
                <div className={venue.layoutData ? "layout-saved" : "layout-not-saved"}>
                  {venue.layoutData ? "✓ 3D Layout Saved" : "○ No saved layout"}
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="delete-button"
                  type="button"
                  onClick={() => void deleteVenue(venue.id, venue.name)}
                  disabled={deletingId === venue.id}
                >
                  {deletingId === venue.id ? "Deleting..." : "Delete"}
                </button>
                <button className="editor-button" type="button" onClick={() => openEditor(venue)}>
                  Open 3D Editor →
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {showModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section
            className="venue-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-venue-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">NEW VENUE</span>
                <h2 id="add-venue-title">Add New Venue</h2>
                <p>Create the venue and optionally attach its editable 3D model.</p>
              </div>
              <button className="close-button" type="button" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <form className="venue-form" onSubmit={handleSubmit}>
              <label>
                <span>VENUE NAME *</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="e.g. Grand Palace"
                  required
                />
              </label>

              <label>
                <span>LOCATION *</span>
                <input
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder="e.g. Delhi"
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <span>CAPACITY *</span>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) => updateField("capacity", event.target.value)}
                    placeholder="500"
                    required
                  />
                </label>
                <label>
                  <span>PRICE (₹) *</span>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => updateField("price", event.target.value)}
                    placeholder="100000"
                    required
                  />
                </label>
              </div>

              <label>
                <span>VENUE TYPE *</span>
                <select
                  value={form.type}
                  onChange={(event) => updateField("type", event.target.value)}
                  required
                >
                  <option value="">Select venue type...</option>
                  <option value="Banquet Hall">Banquet Hall</option>
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Garden">Garden</option>
                  <option value="Beach">Beach</option>
                  <option value="Rooftop">Rooftop</option>
                  <option value="Resort">Resort</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <div className="upload-section">
                <span className="upload-title">UPLOAD 3D VENUE MODEL <em>(OPTIONAL)</em></span>
                <input
                  id="venue-model-file"
                  type="file"
                  accept=".glb,.fbx,.obj,model/gltf-binary,application/octet-stream"
                  onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                />
                <label htmlFor="venue-model-file" className="file-picker">
                  <span className="file-icon">⬆</span>
                  <span>
                    <strong>{modelFile ? modelFile.name : "Choose 3D model"}</strong>
                    <small>{modelFile ? `${(modelFile.size / (1024 * 1024)).toFixed(2)} MB` : "GLB, FBX or OBJ · Maximum 100 MB"}</small>
                  </span>
                </label>
                <p className="upload-help">
                  The selected model will be connected to this venue and opened in the 3D workspace. ZIP files are intentionally not supported.
                </p>
              </div>

              <label className="availability-row">
                <input
                  type="checkbox"
                  checked={form.availability}
                  onChange={(event) => updateField("availability", event.target.checked)}
                />
                <span>
                  <strong>Available for booking</strong>
                  <small>The venue will be shown as available.</small>
                </span>
              </label>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Adding Venue..." : "Add Venue"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <style jsx>{`
        .venues-page {
          min-height: 100vh;
          color: #223047;
          padding: 0 60px 70px;
          font-family: Arial, Helvetica, sans-serif;
          background-color: #f7f9fc;
          background-image: radial-gradient(circle, rgba(79, 103, 148, 0.38) 1px, transparent 1.25px);
          background-size: 24px 24px;
        }

        /* Full-width navigation that remains aligned to the viewport edges. */
        .planner-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: calc(100% + 120px);
          max-width: none;
          margin: 0 0 0 -60px;
          padding: 0;
          box-sizing: border-box;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid #dbe3ef;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(15,23,42,.06);
        }
        .planner-navbar-inner {
          width: 100%;
          min-height: 92px;
          margin: 0;
          padding: 10px 28px;
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
          align-items: center;
          gap: 18px;
          box-sizing: border-box;
        }
        .planner-navbar-inner::after {
          display: none;
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
          overflow: visible;
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
          min-width: 0;
          min-height: 60px;
          width: 100%;
          max-width: none;
          margin: 0;
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
            grid-template-columns: 250px minmax(0, 1fr);
            padding: 12px 22px;
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


        
        /* Icon-only theme button kept at the extreme right of the browser window. */
        .theme-toggle {
          width: 56px;
          height: 56px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 56px;
          margin: 0;
          padding: 0;
          border: 1px solid #d4ddea;
          border-radius: 16px;
          background: linear-gradient(180deg, #f8fafc, #eef3f9);
          color: #2f5cad;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(38, 55, 86, 0.08);
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }

        .theme-toggle:hover {
          transform: translateY(-50%) scale(1.04);
          background: #eef3fb;
          border-color: #b9c9e3;
        }

        .theme-toggle:focus-visible {
          outline: 3px solid rgba(49, 91, 182, 0.24);
          outline-offset: 3px;
        }

        .topbar .theme-toggle {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
        }

.venues-header {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          align-items: flex-end;
          margin-bottom: 22px;
          max-width: 1500px;
          margin-left: auto;
          margin-right: auto;
        }
        .eyebrow { display: block; color: #60719b; font-size: 11px; font-weight: 800; letter-spacing: .14em; margin-bottom: 7px; }
        h1 { margin: 0; font-size: 38px; letter-spacing: -.03em; }
        .venues-header p { margin: 10px 0 0; color: #68778d; font-size: 16px; }
        .primary-button, .editor-button { border: 0; border-radius: 10px; background: #315bb6; color: white; font-weight: 700; cursor: pointer; padding: 14px 22px; box-shadow: 0 8px 20px rgba(49,91,182,.2); transition: .2s; }
        .primary-button:hover, .editor-button:hover { transform: translateY(-1px); background: #294d9a; }
        button:disabled { cursor: not-allowed; opacity: .65; transform: none !important; }
        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1500px;
          margin: 18px auto 22px;
          color: #75839a;
          font-size: 14px;
        }
        .refresh-button { border: 1px solid #d9e0ec; border-radius: 8px; background: white; color: #53637b; padding: 9px 13px; cursor: pointer; font-weight: 700; }
        .venues-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 360px));
          gap: 22px;
          max-width: 1500px;
          margin: 0 auto;
          justify-content: start;
        }
        .venue-card { background: white; border: 1px solid #dfe5ef; border-radius: 18px; padding: 28px; box-shadow: 0 10px 30px rgba(38,55,86,.06); transition: .2s; }
        .venue-card:hover { transform: translateY(-3px); box-shadow: 0 16px 35px rgba(38,55,86,.1); }
        .card-topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .venue-type { background: #edf1ff; color: #5361a8; border-radius: 999px; padding: 7px 13px; text-transform: uppercase; font-size: 12px; font-weight: 800; }
        .status { border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 800; }
        .available { background: #e9f7ee; color: #267047; }
        .unavailable { background: #fff0ee; color: #ad4a41; }
        .venue-card h2 { font-size: 23px; margin: 22px 0; text-transform: none; }
        .venue-details { display: grid; gap: 14px; }
        .venue-details > div { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 8px; }
        .venue-details span { color: #6a58a5; }
        .venue-details p { margin: 0; color: #758196; font-size: 14px; }
        .venue-details strong { font-size: 14px; color: #2d3a4d; }
        .model-status { border-top: 1px solid #edf0f4; border-bottom: 1px solid #edf0f4; margin: 24px 0 18px; padding: 16px 0; display: grid; gap: 9px; color: #5c687a; font-size: 14px; font-weight: 700; }
        .model-status > div { display: flex; align-items: center; gap: 7px; }
        .model-dot { width: 8px; height: 8px; border-radius: 50%; border: 1px solid #aeb8c8; display: inline-block; }
        .model-dot.connected { background: #2ca567; border-color: #2ca567; }
        .layout-saved { color: #28714c; }
        .layout-not-saved { color: #778397; }
        .card-actions { display: flex; gap: 12px; align-items: center; }
        .delete-button { background: white; color: #b44c46; border: 1px solid #efc7c2; border-radius: 10px; padding: 13px 16px; font-weight: 700; cursor: pointer; }
        .editor-button { flex: 1; text-align: center; padding: 13px 16px; }
        .state-card { min-height: 330px; border: 1px solid #dfe5ef; border-radius: 18px; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 30px; box-shadow: 0 10px 30px rgba(38,55,86,.05); }
        .state-card h2 { margin: 15px 0 7px; font-size: 24px; }
        .state-card p { max-width: 500px; color: #6e7b90; line-height: 1.6; margin: 0 0 20px; }
        .spinner { width: 34px; height: 34px; border: 3px solid #dfe5f4; border-top-color: #315bb6; border-radius: 50%; animation: spin .8s linear infinite; }
        .state-icon, .empty-icon { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 50%; background: #eef2ff; color: #315bb6; font-size: 28px; font-weight: 800; }
        .error-card .state-icon { background: #fff0ef; color: #c75148; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(20,30,47,.55); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 24px; }
        .venue-modal { width: min(700px, 100%); max-height: calc(100vh - 48px); overflow-y: auto; background: #fff; border-radius: 20px; box-shadow: 0 28px 80px rgba(0,0,0,.25); }
        .modal-header { display: flex; justify-content: space-between; gap: 20px; padding: 30px 34px 24px; border-bottom: 1px solid #e8edf4; }
        .modal-header h2 { margin: 0; font-size: 28px; }
        .modal-header p { color: #6d7b91; margin: 8px 0 0; }
        .close-button { width: 40px; height: 40px; border: 0; border-radius: 10px; background: #f2f5f9; color: #60708a; font-size: 28px; line-height: 1; cursor: pointer; }
        .venue-form { padding: 28px 34px 34px; display: grid; gap: 19px; }
        .venue-form label { display: grid; gap: 8px; color: #4d5a6d; font-weight: 800; font-size: 13px; letter-spacing: .04em; }
        .venue-form input, .venue-form select { width: 100%; box-sizing: border-box; border: 1px solid #cfd8e6; border-radius: 10px; min-height: 50px; padding: 0 15px; color: #26354b; background: #fff; outline: none; font-size: 15px; font-weight: 500; }
        .venue-form input:focus, .venue-form select:focus { border-color: #315bb6; box-shadow: 0 0 0 3px rgba(49,91,182,.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .upload-section { display: grid; gap: 10px; }
        .upload-title { color: #4d5a6d; font-size: 13px; font-weight: 800; letter-spacing: .04em; }
        .upload-title em { color: #8b96a7; font-style: normal; font-weight: 600; }
        #venue-model-file { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
        .file-picker { min-height: 82px; display: flex !important; grid-template-columns: none !important; flex-direction: row; align-items: center; gap: 14px !important; border: 1px dashed #9cabc3; border-radius: 12px; padding: 14px 17px; background: #f9fbfe; cursor: pointer; letter-spacing: normal !important; }
        .file-picker:hover { border-color: #315bb6; background: #f4f7ff; }
        .file-picker span:last-child { display: grid; gap: 4px; }
        .file-picker strong { color: #33435b; font-size: 14px; overflow-wrap: anywhere; }
        .file-picker small { color: #7c899c; font-size: 12px; font-weight: 500; }
        .file-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 9px; background: #e8eeff; color: #315bb6; }
        .upload-help { margin: 0; color: #78869a; font-size: 12px; line-height: 1.5; }
        .availability-row { display: flex !important; grid-template-columns: none !important; flex-direction: row; align-items: center; gap: 12px !important; letter-spacing: normal !important; cursor: pointer; }
        .availability-row input { width: 20px; min-height: 20px; accent-color: #315bb6; }
        .availability-row span { display: grid; gap: 4px; }
        .availability-row strong { font-size: 15px; color: #344258; }
        .availability-row small { font-size: 12px; color: #7d899b; font-weight: 500; }
        .form-error { border: 1px solid #f1c8c4; background: #fff3f2; color: #ad4841; border-radius: 10px; padding: 13px 15px; font-size: 14px; line-height: 1.45; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 5px; }
        .secondary-button { border: 1px solid #d5dde8; background: white; color: #526177; border-radius: 10px; padding: 13px 21px; font-weight: 700; cursor: pointer; }

        /* Dark mode: keep the venue page visually consistent with the other sections. */
        :global(html[data-theme="dark"]) .venues-page {
          color: #e7edf8;
          background-color: #151e2d;
          background-image: radial-gradient(
            circle,
            rgba(173, 196, 235, 0.42) 1px,
            transparent 1.35px
          );
          background-size: 24px 24px;
        }

        /* Dark-mode navigation. These selectors match the actual navbar classes above,
           so the complete Venues navbar switches with html[data-theme]. */
        :global(html[data-theme="dark"]) .planner-navbar {
          background: rgba(20, 29, 43, 0.97);
          border-bottom-color: #33445e;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        }

        :global(html[data-theme="dark"]) .planner-brand {
          color: #eef4ff;
        }

        :global(html[data-theme="dark"]) .planner-brand-title {
          color: #eef4ff;
        }

        :global(html[data-theme="dark"]) .planner-brand-subtitle {
          color: #aab8cc;
        }

        :global(html[data-theme="dark"]) .planner-navigation {
          border-color: #3b4d69;
          background: linear-gradient(180deg, rgba(38, 50, 72, 0.98), rgba(29, 40, 58, 0.98));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 12px rgba(0, 0, 0, 0.16);
        }

        :global(html[data-theme="dark"]) .planner-nav-link {
          color: #c7d2e4;
        }

        :global(html[data-theme="dark"]) .planner-nav-link:hover {
          color: #ffffff;
          background: #30415d;
        }

        :global(html[data-theme="dark"]) .planner-nav-active {
          color: #ffffff;
          background: linear-gradient(180deg, #3569bd, #2856a5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        :global(html[data-theme="dark"]) .theme-toggle {
          background: #1f2b3f !important;
          border-color: #3b4d69 !important;
          color: #f8c45d !important;
          box-shadow: none !important;
        }

        :global(html[data-theme="dark"]) .eyebrow {
          color: #8fa7d0;
        }

        :global(html[data-theme="dark"]) h1,
        :global(html[data-theme="dark"]) .venue-card h2,
        :global(html[data-theme="dark"]) .state-card h2,
        :global(html[data-theme="dark"]) .modal-header h2 {
          color: #eef4ff;
        }

        :global(html[data-theme="dark"]) .venues-header p,
        :global(html[data-theme="dark"]) .summary-row {
          color: #aebcd0;
        }

        :global(html[data-theme="dark"]) .refresh-button,
        :global(html[data-theme="dark"]) .delete-button,
        :global(html[data-theme="dark"]) .secondary-button {
          background: #1d2839;
          color: #d8e2f0;
          border-color: #3a4a63;
        }

        :global(html[data-theme="dark"]) .refresh-button:hover,
        :global(html[data-theme="dark"]) .secondary-button:hover {
          background: #26354b;
        }

        :global(html[data-theme="dark"]) .venue-card,
        :global(html[data-theme="dark"]) .state-card {
          background: #202c3e;
          border-color: #3a4a63;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
        }

        :global(html[data-theme="dark"]) .venue-card:hover {
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.32);
        }

        :global(html[data-theme="dark"]) .venue-type {
          background: #2a3852;
          color: #aebfe8;
        }

        :global(html[data-theme="dark"]) .available {
          background: #213f37;
          color: #8ed9b2;
        }

        :global(html[data-theme="dark"]) .unavailable {
          background: #472d31;
          color: #f0a9a2;
        }

        :global(html[data-theme="dark"]) .venue-details p,
        :global(html[data-theme="dark"]) .model-status,
        :global(html[data-theme="dark"]) .layout-not-saved,
        :global(html[data-theme="dark"]) .state-card p {
          color: #aebbd0;
        }

        :global(html[data-theme="dark"]) .venue-details strong {
          color: #edf3fd;
        }

        :global(html[data-theme="dark"]) .model-status {
          border-top-color: #3a4a63;
          border-bottom-color: #3a4a63;
        }

        :global(html[data-theme="dark"]) .delete-button {
          color: #f1aaa3;
          border-color: #72474a;
        }

        :global(html[data-theme="dark"]) .state-icon,
        :global(html[data-theme="dark"]) .empty-icon {
          background: #293958;
          color: #9fc1ff;
        }

        :global(html[data-theme="dark"]) .error-card .state-icon {
          background: #4a2d31;
          color: #ffaaa1;
        }

        :global(html[data-theme="dark"]) .venue-modal {
          background: #202c3e;
          color: #e7edf8;
          border: 1px solid #3a4a63;
        }

        :global(html[data-theme="dark"]) .modal-header {
          border-bottom-color: #3a4a63;
        }

        :global(html[data-theme="dark"]) .modal-header p,
        :global(html[data-theme="dark"]) .venue-form label,
        :global(html[data-theme="dark"]) .upload-title {
          color: #b8c5d8;
        }

        :global(html[data-theme="dark"]) .close-button {
          background: #2a3850;
          color: #d6e0ee;
        }

        :global(html[data-theme="dark"]) .venue-form input,
        :global(html[data-theme="dark"]) .venue-form select {
          background: #182334;
          color: #e8eef8;
          border-color: #3a4a63;
        }

        :global(html[data-theme="dark"]) .venue-form input::placeholder {
          color: #75849b;
        }

        :global(html[data-theme="dark"]) .venue-form input:focus,
        :global(html[data-theme="dark"]) .venue-form select:focus {
          border-color: #5d89d7;
          box-shadow: 0 0 0 3px rgba(93, 137, 215, 0.16);
        }

        :global(html[data-theme="dark"]) .file-picker {
          background: #1a2638;
          border-color: #536783;
        }

        :global(html[data-theme="dark"]) .file-picker:hover {
          background: #202f45;
          border-color: #5d89d7;
        }

        :global(html[data-theme="dark"]) .file-picker strong {
          color: #e8eef8;
        }

        :global(html[data-theme="dark"]) .file-picker small,
        :global(html[data-theme="dark"]) .upload-help,
        :global(html[data-theme="dark"]) .availability-row small {
          color: #97a7bd;
        }

        :global(html[data-theme="dark"]) .file-icon {
          background: #293a5a;
          color: #a9c6ff;
        }

        :global(html[data-theme="dark"]) .availability-row strong {
          color: #e8eef8;
        }

        :global(html[data-theme="dark"]) .form-error {
          background: #42282c;
          border-color: #6d4448;
          color: #ffb2aa;
        }

        @media (max-width: 1100px) {
          .topbar {
            left: 0;
            width: 100%;
            transform: none;
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 16px 30px;
          }

          .topbar .theme-toggle {
            position: static;
            justify-self: center;
            align-self: center;
            transform: none;
          }

          .topbar .theme-toggle:hover {
            transform: scale(1.04);
          }

          .topbar::after {
            display: none;
          }

          .brand {
            justify-self: center;
          }

          .main-navigation {
            overflow-x: auto;
            justify-content: flex-start;
            scrollbar-width: none;
          }

          .main-navigation::-webkit-scrollbar {
            display: none;
          }

          .venues-page {
            padding-left: 30px;
            padding-right: 30px;
          }

          .topbar {
            margin-left: -30px;
            margin-right: -30px;
          }
        }

        @media (max-width: 720px) {
          .venues-page {
            padding: 0 20px 50px;
          }

          .topbar {
            min-height: auto;
            margin: 0 -20px 28px;
            padding: 14px 20px;
          }

          .brand-icon {
            width: 50px;
            height: 50px;
            flex-basis: 50px;
            border-radius: 12px;
            font-size: 22px;
          }

          .brand-title {
            font-size: 19px;
          }

          .main-navigation {
            border-radius: 14px;
            padding: 6px;
          }

          .top-nav-link {
            min-height: 38px;
            padding: 0 13px;
            font-size: 14px;
          }

          .venues-header {
            align-items: stretch;
            flex-direction: column;
          }

          .venues-header .primary-button {
            width: 100%;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .modal-header,
          .venue-form {
            padding-left: 22px;
            padding-right: 22px;
          }

          .card-actions {
            flex-direction: column;
          }

          .card-actions button {
            width: 100%;
          }

          .venues-grid {
            grid-template-columns: 1fr;
          }
        }


        /* ================================================================
           FINAL MOBILE LANDSCAPE LAYOUT — PRIMARY TARGET: 844 × 390
           This override intentionally mirrors the compact two-row navbar
           proportions used by app/page.tsx while preserving every venue
           management feature.
           ================================================================ */
        @media screen and (orientation: landscape) and (max-width: 950px) and (max-height: 520px) {
          .venues-page {
            min-height: 100svh;
            padding: 0 12px 18px;
            background-size: 20px 20px;
          }

          .planner-navbar {
            position: sticky;
            top: 0;
            width: calc(100% + 24px);
            margin-left: -12px;
            margin-bottom: 8px;
            z-index: 1000;
          }

          .planner-navbar-inner {
            min-height: 96px;
            padding: 6px 10px 7px;
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: 43px 42px;
            gap: 4px;
            align-items: center;
          }

          .planner-brand {
            height: 43px;
            gap: 9px;
            padding-left: 2px;
          }

          .planner-brand-mark {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            font-size: 18px;
          }

          .planner-brand-title {
            font-size: 16px;
            line-height: 1;
          }

          .planner-brand-subtitle {
            display: none;
          }

          .planner-navigation {
            order: 0;
            min-height: 42px;
            height: 42px;
            padding: 3px;
            gap: 2px;
            border-radius: 13px;
            justify-content: center;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            scrollbar-width: none;
          }

          .planner-navigation::-webkit-scrollbar {
            display: none;
          }

          .planner-nav-link {
            flex: 0 0 auto;
            padding: 8px 14px;
            font-size: 12px;
            border-radius: 9px;
          }

          .venues-header {
            max-width: none;
            margin: 0 0 8px;
            gap: 10px;
            align-items: center;
          }

          .eyebrow {
            margin-bottom: 2px;
            font-size: 9px;
          }

          h1 {
            font-size: 25px;
            line-height: 1;
          }

          .venues-header p {
            margin-top: 4px;
            font-size: 11px;
            line-height: 1.25;
          }

          .primary-button,
          .editor-button {
            padding: 9px 13px;
            border-radius: 8px;
            font-size: 12px;
            box-shadow: 0 5px 12px rgba(49,91,182,.16);
          }

          .summary-row {
            max-width: none;
            margin: 6px 0 8px;
            font-size: 11px;
          }

          .refresh-button {
            padding: 6px 9px;
            border-radius: 7px;
            font-size: 11px;
          }

          .venues-grid {
            max-width: none;
            grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
            gap: 10px;
          }

          .venue-card {
            border-radius: 12px;
            padding: 13px;
          }

          .card-topline {
            gap: 7px;
          }

          .venue-type,
          .status {
            padding: 5px 8px;
            font-size: 9px;
          }

          .venue-card h2 {
            margin: 10px 0;
            font-size: 17px;
          }

          .venue-details {
            gap: 7px;
          }

          .venue-details > div {
            grid-template-columns: 17px 1fr auto;
            gap: 5px;
          }

          .venue-details p,
          .venue-details strong {
            font-size: 10px;
          }

          .model-status {
            margin: 10px 0;
            padding: 9px 0;
            gap: 5px;
            font-size: 10px;
          }

          .model-dot {
            width: 6px;
            height: 6px;
          }

          .card-actions {
            gap: 7px;
          }

          .delete-button,
          .editor-button {
            min-height: 34px;
            padding: 8px 10px;
            font-size: 11px;
          }

          .state-card {
            min-height: 180px;
            padding: 18px;
            border-radius: 12px;
          }

          .state-card h2 {
            margin: 8px 0 5px;
            font-size: 18px;
          }

          .state-card p {
            margin-bottom: 12px;
            font-size: 12px;
            line-height: 1.4;
          }

          .modal-backdrop {
            padding: 8px;
          }

          .venue-modal {
            width: min(680px, 100%);
            max-height: calc(100svh - 16px);
            border-radius: 13px;
          }

          .modal-header {
            padding: 13px 17px 11px;
          }

          .modal-header h2 {
            font-size: 20px;
          }

          .modal-header p {
            margin-top: 4px;
            font-size: 11px;
          }

          .close-button {
            width: 32px;
            height: 32px;
            font-size: 23px;
          }

          .venue-form {
            padding: 13px 17px 17px;
            gap: 11px;
          }

          .venue-form label,
          .upload-title {
            gap: 5px;
            font-size: 10px;
          }

          .venue-form input,
          .venue-form select {
            min-height: 38px;
            padding: 0 10px;
            border-radius: 8px;
            font-size: 12px;
          }

          .form-row {
            gap: 10px;
          }

          .file-picker {
            min-height: 56px;
            padding: 8px 10px;
            gap: 9px !important;
          }

          .file-icon {
            width: 29px;
            height: 29px;
          }

          .file-picker strong,
          .file-picker small,
          .upload-help,
          .availability-row strong,
          .availability-row small,
          .form-error {
            font-size: 10px;
          }

          .availability-row {
            gap: 8px !important;
          }

          .availability-row input {
            width: 16px;
            min-height: 16px;
          }

          .modal-actions {
            gap: 8px;
          }

          .secondary-button {
            padding: 9px 13px;
            border-radius: 8px;
            font-size: 11px;
          }
        }

        /* FINAL 844 × 390 REFINEMENT
           Keeps the complete venue card visible without making the page feel crowded. */
        @media screen and (orientation: landscape) and (min-width: 800px) and (max-width: 900px) and (min-height: 360px) and (max-height: 430px) {
          .venues-page {
            padding: 0 10px 8px;
            background-image: radial-gradient(circle, rgba(79, 103, 148, 0.18) 0.7px, transparent 0.95px);
            background-size: 18px 18px;
          }

          .planner-navbar {
            width: calc(100% + 20px);
            margin-left: -10px;
            margin-bottom: 5px;
          }

          .planner-navbar-inner {
            min-height: 76px;
            padding: 4px 10px 5px;
            grid-template-rows: 34px 32px;
            gap: 3px;
          }

          .planner-brand {
            height: 34px;
            gap: 8px;
            padding-left: 2px;
          }

          .planner-brand-mark {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            font-size: 15px;
          }

          .planner-brand-title {
            font-size: 14px;
          }

          .planner-navigation {
            min-height: 32px;
            height: 32px;
            padding: 2px;
            gap: 1px;
            border-radius: 10px;
          }

          .planner-nav-link {
            padding: 5px 11px;
            font-size: 10px;
            border-radius: 7px;
          }

          .venues-header {
            margin: 0 0 4px;
            gap: 8px;
          }

          .eyebrow {
            margin-bottom: 1px;
            font-size: 8px;
            letter-spacing: 1.4px;
          }

          h1 {
            font-size: 18px;
            line-height: 1;
          }

          .venues-header p {
            margin-top: 2px;
            font-size: 9px;
            line-height: 1.15;
          }

          .primary-button {
            min-height: 32px;
            padding: 7px 11px;
            border-radius: 7px;
            font-size: 10px;
          }

          .summary-row {
            margin: 3px 0 4px;
            font-size: 9px;
          }

          .refresh-button {
            padding: 5px 8px;
            border-radius: 6px;
            font-size: 9px;
          }

          .venues-grid {
            grid-template-columns: minmax(235px, 270px);
            gap: 8px;
          }

          .venue-card {
            padding: 9px 10px;
            border-radius: 10px;
          }

          .card-topline {
            gap: 6px;
          }

          .venue-type,
          .status {
            padding: 4px 7px;
            font-size: 8px;
          }

          .venue-card h2 {
            margin: 7px 0;
            font-size: 15px;
            line-height: 1.1;
          }

          .venue-details {
            gap: 5px;
          }

          .venue-details > div {
            grid-template-columns: 15px 1fr auto;
            gap: 4px;
          }

          .venue-details p,
          .venue-details strong {
            font-size: 9px;
          }

          .model-status {
            margin: 7px 0;
            padding: 6px 0;
            gap: 4px;
            font-size: 9px;
          }

          .card-actions {
            gap: 6px;
          }

          .delete-button,
          .editor-button {
            min-height: 29px;
            padding: 6px 9px;
            font-size: 9px;
            border-radius: 7px;
          }

          /* Keep the venue tile even narrower and aligned to the left
             on the 844 × 390 target layout. */
          .venues-grid {
            width: 250px;
            max-width: 100%;
            grid-template-columns: 250px;
            margin-left: 0;
            margin-right: auto;
            justify-content: start;
          }

          .venues-header h1 {
            font-size: 18px;
          }

          :global(html[data-theme="dark"]) .venues-page {
            background-image: radial-gradient(circle, rgba(173, 196, 235, 0.18) 0.7px, transparent 0.95px);
            background-size: 18px 18px;
          }
        }

      `}</style>
    </main>
  );
}


