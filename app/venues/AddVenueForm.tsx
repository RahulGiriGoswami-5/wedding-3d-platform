"use client";

import { useEffect, useRef, useState } from "react";

const ACCEPTED_EXTENSIONS = ["glb", "fbx", "obj"];
const MAX_MODEL_SIZE = 100 * 1024 * 1024;

export type VenueFormInitial = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
  modelUrl: string | null;
};

type VenueFormProps = {
  initialVenue: VenueFormInitial | null;
  onClose: () => void;
  onVenueSaved: () => void | Promise<void>;
};

type FormState = {
  name: string;
  location: string;
  capacity: string;
  type: string;
  price: string;
  availability: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  location: "",
  capacity: "",
  type: "",
  price: "",
  availability: true,
};

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export default function AddVenueForm({
  initialVenue,
  onClose,
  onVenueSaved,
}: VenueFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedModelFile, setSelectedModelFile] = useState<File | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editingVenue = initialVenue !== null;

  useEffect(() => {
    if (initialVenue) {
      setForm({
        name: initialVenue.name,
        location: initialVenue.location,
        capacity: String(initialVenue.capacity),
        type: initialVenue.type,
        price: String(initialVenue.price),
        availability: initialVenue.availability,
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setSelectedModelFile(null);
    setFormError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [initialVenue]);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleModelFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedModelFile(null);
      return;
    }

    const extension = getExtension(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setFormError("Please select a .glb, .fbx, or .obj 3D model file.");
      event.target.value = "";
      setSelectedModelFile(null);
      return;
    }

    if (file.size > MAX_MODEL_SIZE) {
      setFormError("The 3D model must be 100 MB or smaller.");
      event.target.value = "";
      setSelectedModelFile(null);
      return;
    }

    setFormError("");
    setSelectedModelFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.location.trim() || !form.type.trim()) {
      setFormError("Please complete all required venue details.");
      return;
    }

    if (!form.capacity || Number(form.capacity) <= 0) {
      setFormError("Capacity must be greater than 0.");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      setFormError("Price must be 0 or greater.");
      return;
    }

    try {
      setSaving(true);

      const requestData = new FormData();

      if (initialVenue) {
        requestData.append("id", String(initialVenue.id));
        requestData.append("modelUrl", initialVenue.modelUrl ?? "");
      }

      requestData.append("name", form.name.trim());
      requestData.append("location", form.location.trim());
      requestData.append("capacity", form.capacity);
      requestData.append("type", form.type.trim());
      requestData.append("price", form.price);
      requestData.append("availability", String(form.availability));

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

      await onVenueSaved();
    } catch (error) {
      console.error("Failed to save venue:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to save venue."
      );
    } finally {
      setSaving(false);
    }
  }

  const currentModelExtension = initialVenue?.modelUrl
    ? getExtension(initialVenue.modelUrl).toUpperCase()
    : null;

  return (
    <>
      <div className="modal-header">
        <div>
          <span className="section-eyebrow">
            {editingVenue ? "UPDATE VENUE" : "NEW VENUE"}
          </span>
          <h2>{editingVenue ? "Edit Venue" : "Add New Venue"}</h2>
          <p>Enter the venue details and optionally attach a 3D model.</p>
        </div>

        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={saving}
          aria-label="Close venue form"
        >
          ×
        </button>
      </div>

      <form className="venue-form" onSubmit={handleSubmit}>
        {formError && (
          <div className="form-error" role="alert">
            ⚠ {formError}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="venue-name">Venue Name *</label>
          <input
            id="venue-name"
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="e.g. Grand Palace"
            required
            disabled={saving}
          />
        </div>

        <div className="form-group">
          <label htmlFor="venue-location">Location *</label>
          <input
            id="venue-location"
            type="text"
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            placeholder="e.g. Delhi"
            required
            disabled={saving}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="venue-capacity">Capacity *</label>
            <input
              id="venue-capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(event) =>
                updateField("capacity", event.target.value)
              }
              placeholder="500"
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="venue-price">Price (₹) *</label>
            <input
              id="venue-price"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="100000"
              required
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="venue-type">Venue Type *</label>
          <select
            id="venue-type"
            value={form.type}
            onChange={(event) => updateField("type", event.target.value)}
            required
            disabled={saving}
          >
            <option value="">Select venue type...</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Garden">Garden</option>
            <option value="Beach">Beach</option>
            <option value="Rooftop">Rooftop</option>
            <option value="Banquet Hall">Banquet Hall</option>
            <option value="Farmhouse">Farmhouse</option>
          </select>
        </div>

        <div className="form-group model-upload-group">
          <label htmlFor="venue-model">Upload 3D Venue Model</label>

          <div className="upload-box">
            <input
              ref={fileInputRef}
              id="venue-model"
              type="file"
              accept=".glb,.fbx,.obj,model/gltf-binary,model/fbx,text/plain"
              onChange={handleModelFileChange}
              disabled={saving}
            />

            <div className="upload-copy">
              <strong>
                {selectedModelFile
                  ? selectedModelFile.name
                  : "Choose a 3D model file"}
              </strong>
              <span>
                Supported formats: <b>.GLB</b>, <b>.FBX</b>, and <b>.OBJ</b>
              </span>
            </div>
          </div>

          {selectedModelFile ? (
            <p className="model-status success">
              ✓ {selectedModelFile.name} selected (
              {(selectedModelFile.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          ) : editingVenue && initialVenue?.modelUrl ? (
            <p className="model-status">
              Current {currentModelExtension ?? "3D"} model will remain unless
              you select a replacement.
            </p>
          ) : (
            <p className="model-status">
              The selected model will be connected to this venue and loaded in
              the 3D workspace.
            </p>
          )}
        </div>

        <label className="availability-toggle">
          <input
            type="checkbox"
            checked={form.availability}
            onChange={(event) =>
              updateField("availability", event.target.checked)
            }
            disabled={saving}
          />
          <span>
            <strong>Available for booking</strong>
            <small>Show this venue as available to clients.</small>
          </span>
        </label>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button type="submit" className="btn-save" disabled={saving}>
            {saving
              ? "Saving..."
              : editingVenue
              ? "Update Venue"
              : "Add Venue"}
          </button>
        </div>
      </form>
    </>
  );
}
