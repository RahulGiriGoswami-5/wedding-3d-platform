"use client";

import { FormEvent, useState } from "react";

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  price: number;
  availability: boolean;
  modelUrl: string | null;
  layoutData: string | null;
  matchScore: number;
  matchReasons: string[];
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
  matchScore: number;
  matchReasons: string[];
};

type MatchResult = {
  success: boolean;
  error?: string;

  summary?: {
    totalVenues: number;
    matchedVenues: number;
    totalInventoryItems: number;
    matchedInventoryItems: number;
  };

  recommendations?: {
    venues: Venue[];
    inventory: InventoryItem[];
  };
};

export default function MatchPage() {
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [seating, setSeating] = useState("");
  const [decoration, setDecoration] = useState("");
  const [requirements, setRequirements] = useState("");

  const [result, setResult] =
    useState<MatchResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/match",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

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
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to generate recommendations."
        );

        return;
      }

      setResult(data);
    } catch (error) {
      console.error(
        "Match request error:",
        error
      );

      setError(
        "Unable to connect to the matching engine."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <h1>
        Wedding Event Matcher
      </h1>

      <p>
        Enter your event requirements and
        we will recommend suitable venues
        and inventory items.
      </p>

      {/* REQUIREMENT FORM */}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: "15px",
          marginTop: "30px",
          marginBottom: "40px",
        }}
      >
        <input
          type="text"
          placeholder="Event Type"
          value={eventType}
          onChange={(event) =>
            setEventType(
              event.target.value
            )
          }
          required
        />

        <input
          type="date"
          value={eventDate}
          onChange={(event) =>
            setEventDate(
              event.target.value
            )
          }
        />

        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(event) =>
            setLocation(
              event.target.value
            )
          }
          required
        />

        <input
          type="number"
          placeholder="Number of Guests"
          value={guests}
          onChange={(event) =>
            setGuests(
              event.target.value
            )
          }
          min="1"
          required
        />

        <input
          type="number"
          placeholder="Budget"
          value={budget}
          onChange={(event) =>
            setBudget(
              event.target.value
            )
          }
          min="1"
          required
        />

        <input
          type="text"
          placeholder="Seating Requirements"
          value={seating}
          onChange={(event) =>
            setSeating(
              event.target.value
            )
          }
        />

        <input
          type="text"
          placeholder="Decoration Requirements"
          value={decoration}
          onChange={(event) =>
            setDecoration(
              event.target.value
            )
          }
        />

        <textarea
          placeholder="Additional Requirements"
          value={requirements}
          onChange={(event) =>
            setRequirements(
              event.target.value
            )
          }
          rows={5}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {loading
            ? "Finding Matches..."
            : "Find Best Matches"}
        </button>
      </form>

      {/* ERROR */}

      {error && (
        <div>
          <h3>Error</h3>

          <p>{error}</p>
        </div>
      )}

      {/* RESULTS */}

      {result?.success && (
        <section>
          <h2>
            Your Recommendations
          </h2>

          {/* SUMMARY */}

          {result.summary && (
            <div
              style={{
                marginBottom: "30px",
              }}
            >
              <p>
                Found{" "}
                <strong>
                  {
                    result.summary
                      .matchedVenues
                  }
                </strong>{" "}
                matching venues.
              </p>

              <p>
                Found{" "}
                <strong>
                  {
                    result.summary
                      .matchedInventoryItems
                  }
                </strong>{" "}
                matching inventory items.
              </p>
            </div>
          )}

          {/* VENUES */}

          <h2>
            Recommended Venues
          </h2>

          {result.recommendations
            ?.venues.length === 0 && (
            <p>
              No suitable venues were found.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "50px",
            }}
          >
            {result.recommendations?.venues.map(
              (venue) => (
                <div
                  key={venue.id}
                  style={{
                    border:
                      "1px solid #ccc",
                    padding: "20px",
                    borderRadius:
                      "10px",
                  }}
                >
                  <h3>
                    {venue.name}
                  </h3>

                  <p>
                    <strong>
                      Location:
                    </strong>{" "}
                    {venue.location}
                  </p>

                  <p>
                    <strong>
                      Capacity:
                    </strong>{" "}
                    {venue.capacity}
                  </p>

                  <p>
                    <strong>
                      Price:
                    </strong>{" "}
                    ₹{venue.price}
                  </p>

                  <p>
                    <strong>
                      Match Score:
                    </strong>{" "}
                    {venue.matchScore}
                  </p>

                  <h4>
                    Why this venue?
                  </h4>

                  <ul>
                    {venue.matchReasons.map(
                      (
                        reason,
                        index
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {reason}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )
            )}
          </div>

          {/* INVENTORY */}

          <h2>
            Recommended Inventory
          </h2>

          {result.recommendations
            ?.inventory.length === 0 && (
            <p>
              No matching inventory items
              were found.
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {result.recommendations?.inventory.map(
              (item) => (
                <div
                  key={item.id}
                  style={{
                    border:
                      "1px solid #ccc",
                    padding: "20px",
                    borderRadius:
                      "10px",
                  }}
                >
                  <h3>
                    {item.name}
                  </h3>

                  <p>
                    <strong>
                      Category:
                    </strong>{" "}
                    {item.category}
                  </p>

                  <p>
                    <strong>
                      Available:
                    </strong>{" "}
                    {
                      item.availableQuantity
                    }
                  </p>

                  <p>
                    <strong>
                      Price:
                    </strong>{" "}
                    ₹{item.price}
                  </p>

                  <p>
                    <strong>
                      Match Score:
                    </strong>{" "}
                    {item.matchScore}
                  </p>

                  <h4>
                    Why this item?
                  </h4>

                  <ul>
                    {item.matchReasons.map(
                      (
                        reason,
                        index
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {reason}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}