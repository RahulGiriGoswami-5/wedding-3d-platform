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
      <header className="topbar">
        <a href="/" className="brand" aria-label="Wedding Planner home">
          <div className="brand-icon">W</div>
          <div className="brand-copy">
            <div className="brand-title">Wedding Planner</div>
            <div className="brand-subtitle">3D Venue Designer</div>
          </div>
        </a>

        <nav className="main-navigation" aria-label="Main navigation">
          <a href="/" className="top-nav-link">Designer</a>
          <a href="/venues" className="top-nav-link active" aria-current="page">Venues</a>
          <a href="/inventory" className="top-nav-link">Inventory</a>
          <a href="/match" className="top-nav-link">Find Matches</a>
          <a href="/themes" className="top-nav-link">Themes</a>
          <a href="/designs" className="top-nav-link">Saved Designs</a>
        </nav>
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
          background-image: radial-gradient(circle, rgba(79, 103, 148, 0.22) 1px, transparent 1.2px);
          background-size: 24px 24px;
        }

        .topbar {
          min-height: 108px;
          margin: 0 -60px 36px;
          padding: 14px 60px;
          display: grid;
          grid-template-columns: minmax(230px, 1fr) minmax(640px, 1.85fr) minmax(230px, 1fr);
          align-items: center;
          gap: 28px;
          background: rgba(255, 255, 255, 0.94);
          border-bottom: 1px solid #dfe5ee;
          box-shadow: 0 8px 24px rgba(38, 55, 86, 0.05);
          backdrop-filter: blur(14px);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 13px;
          width: fit-content;
          text-decoration: none;
          color: inherit;
          white-space: nowrap;
        }

        .brand-icon {
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          flex: 0 0 58px;
          border-radius: 14px;
          color: #ffffff;
          background: linear-gradient(135deg, #3f70c9, #294f9d);
          box-shadow: 0 10px 22px rgba(49, 91, 182, 0.22);
          font-size: 26px;
          font-weight: 900;
        }

        .brand-copy {
          display: grid;
          gap: 3px;
        }

        .brand-title {
          color: #27364a;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .brand-subtitle {
          color: #738097;
          font-size: 12px;
          font-weight: 700;
        }

        .main-navigation {
          width: 100%;
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 7px;
          box-sizing: border-box;
          border: 1px solid #d7deea;
          border-radius: 18px;
          background: linear-gradient(180deg, #f8fafc, #eef2f7);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .top-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 11px;
          color: #425066;
          text-decoration: none;
          font-size: 15px;
          font-weight: 750;
          white-space: nowrap;
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .top-nav-link:hover {
          color: #2d58ad;
          background: #e9effa;
        }

        .top-nav-link.active {
          color: #294f9d;
          background: #dfe8f8;
          box-shadow: 0 4px 12px rgba(52, 80, 135, 0.12);
        }

        .topbar::after {
          content: "";
          min-width: 0;
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
        @media (max-width: 1100px) {
          .topbar {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 16px 30px;
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
      `}</style>
    </main>
  );
}
