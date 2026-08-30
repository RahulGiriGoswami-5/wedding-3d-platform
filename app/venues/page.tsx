"use client";

import { useEffect, useState, useCallback } from 'react';
import './venues.css';

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
};

type FormData = {
  name: string;
  location: string;
  capacity: number | '';
  type: string;
  price: number | '';
  availability: boolean;
};

type FormErrors = {
  name: string;
  location: string;
  capacity: string;
  type: string;
  price: string;
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialFormData: FormData = {
    name: '',
    location: '',
    capacity: '',
    type: '',
    price: '',
    availability: true,
  };
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const initialFormErrors: FormErrors = {
    name: '',
    location: '',
    capacity: '',
    type: '',
    price: '',
  };
  const [formErrors, setFormErrors] = useState<FormErrors>(initialFormErrors);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/venues');
      if (!response.ok) throw new Error('Failed to fetch venues');
      const data = await response.json();
      setVenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading venues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { ...initialFormErrors };

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
      isValid = false;
    }
    if (!formData.type.trim()) {
      newErrors.type = 'Type is required';
      isValid = false;
    }
    if (formData.capacity === '' || Number(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be greater than 0';
      isValid = false;
    }
    if (formData.price === '' || Number(formData.price) < 0) {
      newErrors.price = 'Price must be 0 or greater';
      isValid = false;
    }

    setFormErrors(newErrors);
    return isValid;
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors(initialFormErrors);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (venue: Venue) => {
    resetForm();
    setFormData({
      name: venue.name,
      location: venue.location,
      capacity: venue.capacity,
      type: venue.type,
      price: venue.price,
      availability: venue.availability,
    });
    setEditingVenue(venue);
  };

  const closeModal = () => {
    resetForm();
    setShowAddModal(false);
    setEditingVenue(null);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const isEdit = !!editingVenue;
    setSavingId(isEdit ? editingVenue.id : -1);
    setError(null);

    try {
      const url = '/api/venues';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        capacity: Number(formData.capacity),
        type: formData.type,
        price: Number(formData.price),
        availability: formData.availability,
      };
      const body = isEdit ? { ...payload, id: editingVenue.id } : payload;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'add'} venue`);
      }

      await loadVenues();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setSavingId(id);
    setError(null);
    try {
      const response = await fetch('/api/venues', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete venue');

      await loadVenues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting');
    } finally {
      setSavingId(null);
      setDeletingId(null);
    }
  };

  const confirmDelete = (id: number) => {
    setDeletingId(id);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  return (
    <main className="venues-page">
      <div className="venues-header">
        <div className="header-text">
          <h1>Venues</h1>
          <p>Manage your wedding & event venues</p>
        </div>
        <button className="add-venue-btn" onClick={openAddModal}>
          <span className="btn-icon">+</span> Add Venue
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading venues...</p>
        </div>
      )}

      {!loading && venues.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏛️</div>
          <h2>No venues yet</h2>
          <p>Add your first wedding venue to get started</p>
          <button onClick={openAddModal}>+ Add Your First Venue</button>
        </div>
      )}

      {!loading && venues.length > 0 && (
        <div className="venue-grid">
          {venues.map((venue) => (
            <div className="venue-card" key={venue.id}>
              <div className="venue-card-header">
                <div className="venue-type-badge">{venue.type}</div>
                <span className={`status-badge ${venue.availability ? 'available' : 'unavailable'}`}>
                  {venue.availability ? '✓ Available' : '✗ Unavailable'}
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
                  <span className="info-value">₹{venue.price.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="venue-actions">
                {deletingId === venue.id ? (
                  <div className="delete-confirm">
                    <span>Delete this venue?</span>
                    <div className="confirm-buttons">
                      <button
                        className="confirm-yes"
                        onClick={() => handleDelete(venue.id)}
                        disabled={savingId === venue.id}
                      >
                        {savingId === venue.id ? 'Deleting...' : 'Yes'}
                      </button>
                      <button className="confirm-no" onClick={cancelDelete} disabled={savingId === venue.id}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="edit-btn" onClick={() => openEditModal(venue)} disabled={savingId !== null}>
                      ✏️ Edit
                    </button>
                    <button className="delete-btn" onClick={() => confirmDelete(venue.id)} disabled={savingId !== null}>
                      🗑️ Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAddModal || editingVenue) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="venue-form"
            >
              <div className="form-group">
                <label>Venue Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. The Grand Ballroom"
                />
                {formErrors.name && <span className="form-error">{formErrors.name}</span>}
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Mumbai, Maharashtra"
                />
                {formErrors.location && <span className="form-error">{formErrors.location}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Capacity *</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="100"
                    min="1"
                  />
                  {formErrors.capacity && <span className="form-error">{formErrors.capacity}</span>}
                </div>
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="50000"
                    min="0"
                  />
                  {formErrors.price && <span className="form-error">{formErrors.price}</span>}
                </div>
              </div>
              <div className="form-group">
                <label>Venue Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="">Select type...</option>
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Beach">Beach</option>
                  <option value="Garden">Garden</option>
                  <option value="Rooftop">Rooftop</option>
                  <option value="Banquet Hall">Banquet Hall</option>
                  <option value="Farmhouse">Farmhouse</option>
                  <option value="Heritage">Heritage</option>
                </select>
                {formErrors.type && <span className="form-error">{formErrors.type}</span>}
              </div>
              <div className="form-group form-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.checked })}
                  />
                  <span>Available for booking</span>
                </label>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={closeModal} disabled={savingId !== null}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={savingId !== null}>
                  {savingId !== null ? 'Saving...' : editingVenue ? 'Update Venue' : 'Add Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}