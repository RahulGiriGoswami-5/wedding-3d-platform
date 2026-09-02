"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./venues.css";

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
  modelUrl: string | null;
  layoutData: string | null;
};

type VenueForm = {
  name: string;
  location: string;
  capacity: string;
  type: string;
  price: string;
  availability: boolean;
  modelUrl: string;
};

const emptyForm: VenueForm = {
  name: "",
  location: "",
  capacity: "",
  type: "",
  price: "",
  availability: true,
  modelUrl: "",
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
  const [form, setForm] = useState<VenueForm>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadVenues = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/venues");
      if (!response.ok) throw new Error("Failed to load venues");
      setVenues(await response.json());
    } catch (err) {
      console.error(err);
      setError("Failed to load venues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openAddModal() {
    setEditingVenue(null);
    setForm(emptyForm);
    setSelectedModelFile(null);
    resetFileInput();
    setShowModal(true);
  }

  function openEditModal(venue: Venue) {
    setEditingVenue(venue);
    setForm({
      name: venue.name,
      location: venue.location,
      capacity: String(venue.capacity),
      type: venue.type,
      price: String(venue.price),
      availability: venue.availability,
      modelUrl: venue.modelUrl ?? "",
    });
    setSelectedModelFile(null);
    resetFileInput();
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingVenue(null);
    setForm(emptyForm);
    setSelectedModelFile(null);
    resetFileInput();
  }

  function handleModelFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setSelectedModelFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".glb")) {
      alert("Please select a valid .glb 3D model file.");
      e.target.value = "";
      setSelectedModelFile(null);
      return;
    }

    setSelectedModelFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) return alert("Venue name is required");
    if (!form.location.trim()) return alert("Location is required");
    if (!form.capacity || Number(form.capacity) <= 0) {
      return alert("Capacity must be greater than 0");
    }
    if (!form.type.trim()) return alert("Venue type is required");
    if (form.price === "" || Number(form.price) < 0) {
      return alert("Price must be 0 or greater");
    }

    try {
      setSaving(true);
      setError("");

      const requestData = new FormData();

      if (editingVenue) {
        requestData.append("id", String(editingVenue.id));
      }

      requestData.append("name", form.name.trim());
      requestData.append("location", form.location.trim());
      requestData.append("capacity", form.capacity);
      requestData.append("type", form.type.trim());
      requestData.append("price", form.price);
      requestData.append("availability", String(form.availability));
      requestData.append("modelUrl", form.modelUrl.trim());

      if (selectedModelFile) {
        requestData.append("model", selectedModelFile);
      }

      const response = await fetch("/api/venues", {
        method: editingVenue ? "PUT" : "POST",
        body: requestData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save venue");
      }

      closeModal();
      await loadVenues();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save venue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      setDeletingId(id);
      setError("");

      const response = await fetch("/api/venues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete venue");
      }

      await loadVenues();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to delete venue");
    } finally {
      setDeletingId(null);
    }
  }

  function openEditor(id: number) {
    window.location.href = `/?venueId=${id}`;
  }

  return (
    <main className="venues-page">
      <header className="venues-header">
        <div className="header-text">
          <h1>Venues</h1>
          <p>Manage your wedding & event venues</p>
        </div>

        <button className="add-venue-btn" onClick={openAddModal}>
          + Add Venue
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading venues...</p>
        </div>
      ) : venues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏛️</div>
          <h2>No venues yet</h2>
          <p>Add your first wedding venue to get started.</p>
          <button onClick={openAddModal}>+ Add Your First Venue</button>
        </div>
      ) : (
        <div className="venue-grid">
          {venues.map((venue) => (
            <article className="venue-card" key={venue.id}>
              <div className="venue-card-header">
                <span className="venue-type-badge">{venue.type}</span>
                <span className={`status-badge ${venue.availability ? "available" : "unavailable"}`}>
                  {venue.availability ? "✓ Available" : "✗ Unavailable"}
                </span>
              </div>

              <h2 className="venue-name">{venue.name}</h2>

              <div className="venue-info">
                <div className="info-item">
                  <span className="info-label">📍 Location</span>
                  <span className="info-value">{venue.location}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">👥 Capacity</span>
                  <span className="info-value">{venue.capacity} guests</span>
                </div>
                <div className="info-item">
                  <span className="info-label">💰 Price</span>
                  <span className="info-value">₹{venue.price.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #eee" }}>
                <div style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: venue.modelUrl ? "#15803d" : "#777",
                }}>
                  {venue.modelUrl ? "✓ 3D Model Connected" : "○ No 3D Model"}
                </div>

                {venue.layoutData && (
                  <div style={{
                    marginTop: "6px",
                    fontSize: "13px",
                    color: "#15803d",
                    fontWeight: 600,
                  }}>
                    ✓ 3D Layout Saved
                  </div>
                )}
              </div>

              <div className="venue-actions">
                <button className="edit-btn" onClick={() => openEditModal(venue)}>
                  ✏️ Edit
                </button>

                <button
                  className="delete-btn"
                  onClick={() => {
                    if (window.confirm(`Delete "${venue.name}"?`)) {
                      handleDelete(venue.id);
                    }
                  }}
                  disabled={deletingId === venue.id}
                >
                  {deletingId === venue.id ? "Deleting..." : "🗑️ Delete"}
                </button>

                <button
                  onClick={() => openEditor(venue.id)}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "1px solid #171717",
                    background: "#171717",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🏛️ Open 3D Editor
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVenue ? "Edit Venue" : "Add New Venue"}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form className="venue-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Venue Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Grand Palace"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Delhi"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    placeholder="500"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="100000"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Venue Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                >
                  <option value="">Select type...</option>
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Garden">Garden</option>
                  <option value="Beach">Beach</option>
                  <option value="Rooftop">Rooftop</option>
                  <option value="Banquet Hall">Banquet Hall</option>
                  <option value="Farmhouse">Farmhouse</option>
                </select>
              </div>

              <div className="form-group">
                <label>Upload 3D Venue Model</label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,model/gltf-binary"
                  onChange={handleModelFileChange}
                  disabled={saving}
                />

                {selectedModelFile ? (
                  <small style={{
                    display: "block",
                    marginTop: "8px",
                    color: "#15803d",
                    fontWeight: 600,
                  }}>
                    ✓ Selected: {selectedModelFile.name}
                  </small>
                ) : editingVenue && form.modelUrl ? (
                  <small style={{
                    display: "block",
                    marginTop: "8px",
                    color: "#64748b",
                  }}>
                    Current model will be kept unless you select a new .glb file.
                  </small>
                ) : (
                  <small style={{
                    display: "block",
                    marginTop: "8px",
                    color: "#64748b",
                  }}>
                    Select a .glb file. It will be uploaded and connected to this venue automatically.
                  </small>
                )}
              </div>

              <div className="form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={form.availability}
                    onChange={(e) => setForm({
                      ...form,
                      availability: e.target.checked,
                    })}
                  />
                  Available for booking
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-save"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingVenue
                    ? "Update Venue"
                    : "Add Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
