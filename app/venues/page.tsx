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
  width: number;
  depth: number;
  boundaryData?: string | null;
};

type VenueFormState = {
  name: string;
  location: string;
  capacity: string;
  type: string;
  price: string;
  width: string;
  depth: string;
  boundaryData: string;
  availability: boolean;
};

const EMPTY_FORM: VenueFormState = {
  name: "",
  location: "",
  capacity: "",
  type: "",
  price: "",
  width: "12",
  depth: "12",
  boundaryData: "",
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
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

export default function VenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<VenueFormState>(EMPTY_FORM);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await fetch("/api/venues", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      // The venue page must never crash merely because the database is empty
      // or an old/deleted venue record makes the API temporarily unavailable.
      if (!response.ok) {
        setVenues([]);
        setPageError("Could not refresh venues right now. Please try again.");
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setVenues([]);
        setPageError("The venues service returned an invalid response. Please try again.");
        return;
      }

      const data: unknown = await response.json();

      // An empty database is valid. Only arrays are accepted as venue lists.
      setVenues(Array.isArray(data) ? (data as Venue[]) : []);
    } catch {
      // Do not throw or call console.error here. In Next.js development mode,
      // console errors can trigger the full-screen error overlay. If the API is
      // temporarily unavailable, keep the page usable and show an empty list.
      setVenues([]);
      setPageError("Could not connect to the venues service. Please try again.");
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
    const width = Number(form.width);
    const depth = Number(form.depth);

    if (!Number.isFinite(capacity) || capacity <= 0) {
      setFormError("Please enter a valid capacity greater than 0.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setFormError("Please enter a valid price.");
      return;
    }

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(depth) || depth <= 0) {
      setFormError("Please enter valid venue width and depth in metres.");
      return;
    }

    if (form.boundaryData.trim()) {
      try {
        const boundary = JSON.parse(form.boundaryData);
        if (!Array.isArray(boundary) || boundary.length < 3) throw new Error();
      } catch {
        setFormError('Boundary points must be valid JSON with at least 3 points, for example [{"x":-5,"z":-4},{"x":5,"z":-4},{"x":0,"z":4}].');
        return;
      }
    }

    try {
      setSubmitting(true);

      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("location", form.location.trim());
      body.append("capacity", String(capacity));
      body.append("type", form.type.trim());
      body.append("price", String(price));
      body.append("width", String(width));
      body.append("depth", String(depth));
      body.append("boundaryData", form.boundaryData.trim());
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

      {pageError && (
        <div className="page-error" role="alert">
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="state-card">
          <div className="spinner" />
          <h2>Loading venues...</h2>
          <p>Please wait while your venue list is loaded.</p>
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

              <div className="form-row">
                <label>
                  <span>REAL WIDTH (METRES) *</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.width}
                    onChange={(event) => updateField("width", event.target.value)}
                    required
                  />
                </label>
                <label>
                  <span>REAL DEPTH (METRES) *</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.depth}
                    onChange={(event) => updateField("depth", event.target.value)}
                    required
                  />
                </label>
              </div>

              <label>
                <span>IRREGULAR FLOOR BOUNDARY (OPTIONAL JSON)</span>
                <textarea
                  value={form.boundaryData}
                  onChange={(event) => updateField("boundaryData", event.target.value)}
                  placeholder={'[{"x":-5,"z":-4},{"x":5,"z":-4},{"x":6,"z":1},{"x":2,"z":4},{"x":-5,"z":3}]'}
                  rows={4}
                />
                <small>Leave empty for a rectangular floor. Points are in real metres and must describe the usable floor boundary.</small>
              </label>

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
        .venues-page { min-height: 100vh; background: #f5f7fb; color: #223047; padding: 40px 54px 70px; font-family: Arial, Helvetica, sans-serif; }
        .venues-header { display: flex; justify-content: space-between; gap: 30px; align-items: flex-end; margin-bottom: 22px; }
        .eyebrow { display: block; color: #60719b; font-size: 11px; font-weight: 800; letter-spacing: .14em; margin-bottom: 7px; }
        h1 { margin: 0; font-size: 38px; letter-spacing: -.03em; }
        .venues-header p { margin: 10px 0 0; color: #68778d; font-size: 16px; }
        .primary-button, .editor-button { border: 0; border-radius: 10px; background: #315bb6; color: white; font-weight: 700; cursor: pointer; padding: 14px 22px; box-shadow: 0 8px 20px rgba(49,91,182,.2); transition: .2s; }
        .primary-button:hover, .editor-button:hover { transform: translateY(-1px); background: #294d9a; }
        button:disabled { cursor: not-allowed; opacity: .65; transform: none !important; }
        .summary-row { display: flex; align-items: center; justify-content: space-between; margin: 18px 0 22px; color: #75839a; font-size: 14px; }
        .refresh-button { border: 1px solid #d9e0ec; border-radius: 8px; background: white; color: #53637b; padding: 9px 13px; cursor: pointer; font-weight: 700; }
        .venues-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; max-width: 1500px; }
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
        @media (max-width: 720px) { .venues-page { padding: 28px 20px 50px; } .venues-header { align-items: stretch; flex-direction: column; } .venues-header .primary-button { width: 100%; } .form-row { grid-template-columns: 1fr; } .modal-header, .venue-form { padding-left: 22px; padding-right: 22px; } .card-actions { flex-direction: column; } .card-actions button { width: 100%; } }
      `}</style>
    </main>
  );
}
