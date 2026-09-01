"use client";

import { useState } from "react";

type AddVenueFormProps = {
  onVenueAdded: () => void;
};

export default function AddVenueForm({
  onVenueAdded,
}: AddVenueFormProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

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
          availability: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create venue");
      }

      setName("");
      setLocation("");
      setCapacity("");
      setType("");
      setPrice("");

      onVenueAdded();
    } catch (error) {
      console.error("Failed to add venue:", error);
      alert("Failed to add venue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-venue-form">
      <input
        type="text"
        placeholder="Venue name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="Capacity"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        required
      />

      <input
        type="text"
        placeholder="Type (Indoor, Outdoor, etc.)"
        value={type}
        onChange={(e) => setType(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add Venue"}
      </button>
    </form>
  );
}