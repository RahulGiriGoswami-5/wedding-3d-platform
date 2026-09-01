"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
  modelUrl?: string | null;
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [type, setType] = useState("Banquet Hall");
  const [price, setPrice] = useState("");
  const [availability, setAvailability] = useState(true);

  async function loadVenues() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/venues", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load venues");
      }

      const data = await response.json();

      setVenues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Could not load venues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVenues();
  }, []);

  function resetForm() {
    setName("");
    setLocation("");
    setCapacity("");
    setType("Banquet Hall");
    setPrice("");
    setAvailability(true);
  }

  async function addVenue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const response = await fetch("/api/venues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          location,
          capacity: Number(capacity),
          type,
          price: Number(price),
          availability,
          modelUrl: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add venue");
      }

      setShowForm(false);
      resetForm();
      await loadVenues();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to add venue"
      );
    }
  }

  async function deleteVenue(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this venue?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/venues", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete venue");
      }

      await loadVenues();
    } catch (err) {
      console.error(err);
      alert("Failed to delete venue");
    }
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <main className="min-h-screen bg-slate-50">

      {/* NAVBAR */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-xl font-bold text-white">
              W
            </div>

            <div>
              <h1 className="font-bold text-slate-900">
                Wedding Planner
              </h1>

              <p className="text-xs text-slate-500">
                3D Venue Designer
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-medium text-slate-600 hover:text-blue-600"
            >
              Designer
            </Link>

            <Link
              href="/venues"
              className="font-semibold text-blue-600"
            >
              Venues
            </Link>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            + Add Venue
          </button>

        </div>
      </nav>

      {/* HEADER */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-6 py-16">

          <p className="mb-3 font-semibold uppercase tracking-wider text-blue-600">
            Wedding Venue Management
          </p>

          <h2 className="text-4xl font-bold text-slate-900">
            Discover Your Perfect Wedding Venue
          </h2>

          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Browse, manage and organize venues for your wedding events.
            Compare capacity, location and pricing to find the ideal venue.
          </p>

          <div className="mt-7">
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Add New Venue
            </button>
          </div>

        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-10 md:grid-cols-3">

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Venues
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {venues.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Available Venues
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {venues.filter((venue) => venue.availability).length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Maximum Capacity
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {venues.length > 0
              ? Math.max(...venues.map((venue) => venue.capacity))
              : 0}
          </p>
        </div>

      </section>

      {/* VENUES */}
      <section className="mx-auto max-w-7xl px-6 pb-16">

        <div className="mb-8 flex items-center justify-between">

          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Available Venues
            </h2>

            <p className="mt-2 text-slate-600">
              Manage all your wedding venues in one place.
            </p>
          </div>

          <button
            onClick={loadVenues}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>

        </div>

        {loading && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-lg text-slate-600">
              Loading venues...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && venues.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">

            <div className="text-5xl">🏛️</div>

            <h3 className="mt-5 text-xl font-bold">
              No venues found
            </h3>

            <p className="mt-2 text-slate-500">
              Add your first wedding venue to get started.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              + Add Your First Venue
            </button>

          </div>
        )}

        {!loading && venues.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {venues.map((venue) => (
              <div
                key={venue.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >

                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-5xl">
                  🏛️
                </div>

                <div className="p-6">

                  <div className="flex items-start justify-between gap-3">

                    <div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {venue.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        📍 {venue.location}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        venue.availability
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {venue.availability
                        ? "Available"
                        : "Unavailable"}
                    </span>

                  </div>

                  <div className="mt-6 space-y-3 border-t pt-5">

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Type
                      </span>

                      <span className="font-medium">
                        {venue.type}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Capacity
                      </span>

                      <span className="font-medium">
                        {venue.capacity} guests
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Price
                      </span>

                      <span className="font-bold text-blue-600">
                        {formatPrice(venue.price)}
                      </span>
                    </div>

                  </div>

                  <button
                    onClick={() => deleteVenue(venue.id)}
                    className="mt-6 w-full rounded-lg border border-red-200 py-2.5 font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete Venue
                  </button>

                </div>
              </div>
            ))}

          </div>
        )}

      </section>

      {/* ADD VENUE MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b p-6">

              <div>
                <h2 className="text-2xl font-bold">
                  Add New Venue
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the details of your wedding venue.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-2xl text-slate-500 hover:text-slate-900"
              >
                ×
              </button>

            </div>

            <form onSubmit={addVenue} className="p-6">

              <div className="space-y-5">

                <div>
                  <label className="mb-2 block font-medium">
                    Venue Name
                  </label>

                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Example: Royal Palace"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    Location
                  </label>

                  <input
                    required
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Example: Delhi, India"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block font-medium">
                      Venue Type
                    </label>

                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    >
                      <option>Banquet Hall</option>
                      <option>Hotel</option>
                      <option>Resort</option>
                      <option>Garden</option>
                      <option>Farmhouse</option>
                      <option>Beach Venue</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Capacity
                    </label>

                    <input
                      required
                      min="1"
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="500"
                      className="w-full rounded-lg border border-slate-300 px-4 py-3"
                    />
                  </div>

                </div>

                <div>
                  <label className="mb-2 block font-medium">
                    Price (₹)
                  </label>

                  <input
                    required
                    min="0"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="100000"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                  />
                </div>

                <label className="flex items-center gap-3">

                  <input
                    type="checkbox"
                    checked={availability}
                    onChange={(e) =>
                      setAvailability(e.target.checked)
                    }
                    className="h-5 w-5"
                  />

                  <span className="font-medium">
                    Venue is currently available
                  </span>

                </label>

              </div>

              <div className="mt-8 flex justify-end gap-4 border-t pt-6">

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-slate-300 px-5 py-3 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Add Venue
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </main>
  );
}