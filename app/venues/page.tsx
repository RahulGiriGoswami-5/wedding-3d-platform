"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
  modelUrl?: string | null;
  layoutData?: string | null;
};

type VenueFormData = {
  name: string;
  location: string;
  type: string;
  capacity: string;
  price: string;
  availability: boolean;
};

const initialFormData: VenueFormData = {
  name: "",
  location: "",
  type: "Banquet Hall",
  capacity: "",
  price: "",
  availability: true,
};

export default function VenuesPage() {
  const router = useRouter();

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] =
    useState<VenueFormData>(initialFormData);

  const [submitting, setSubmitting] = useState(false);

  async function fetchVenues() {
    try {
      setLoading(true);

      const response = await fetch("/api/venues");

      if (!response.ok) {
        throw new Error("Failed to fetch venues");
      }

      const data = await response.json();

      setVenues(data);
    } catch (error) {
      console.error("Failed to fetch venues:", error);
      alert("Failed to load venues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVenues();
  }, []);

  function handleInputChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) {
    const { name, value, type } = event.target;

    if (type === "checkbox") {
      const checked = (
        event.target as HTMLInputElement
      ).checked;

      setFormData((previous) => ({
        ...previous,
        [name]: checked,
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleAddVenue(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.location.trim() ||
      !formData.capacity ||
      !formData.price
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "/api/venues",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: formData.name.trim(),

            location:
              formData.location.trim(),

            type: formData.type,

            capacity: Number(
              formData.capacity
            ),

            price: Number(
              formData.price
            ),

            availability:
              formData.availability,
          }),
        }
      );

      if (!response.ok) {
        const errorData =
          await response.json();

        throw new Error(
          errorData.error ||
            "Failed to add venue"
        );
      }

      setShowModal(false);

      setFormData(initialFormData);

      await fetchVenues();
    } catch (error) {
      console.error(
        "Failed to add venue:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to add venue."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteVenue(
    venueId: number
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this venue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        "/api/venues",
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            id: venueId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to delete venue"
        );
      }

      const selectedVenue =
        localStorage.getItem(
          "selectedVenue"
        );

      if (selectedVenue) {
        const parsedVenue =
          JSON.parse(selectedVenue);

        if (parsedVenue.id === venueId) {
          localStorage.removeItem(
            "selectedVenue"
          );
        }
      }

      await fetchVenues();
    } catch (error) {
      console.error(
        "Failed to delete venue:",
        error
      );

      alert("Failed to delete venue.");
    }
  }

 function handleChooseVenue(
  venue: Venue
) {
  /*
   * Save the selected venue locally
   * as an additional backup.
   */
  localStorage.setItem(
    "selectedVenue",
    JSON.stringify(venue)
  );

  localStorage.setItem(
    "selectedVenueId",
    String(venue.id)
  );

  /*
   * Open the Designer WITH
   * the venue ID in the URL.
   */
  router.push(
    `/?venueId=${venue.id}`
  );
}

  const totalVenues = venues.length;

  const availableVenues =
    venues.filter(
      (venue) =>
        venue.availability
    ).length;

  const maximumCapacity =
    venues.length > 0
      ? Math.max(
          ...venues.map(
            (venue) =>
              venue.capacity
          )
        )
      : 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "#f5f7fb",
        color: "#1e293b",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height: "86px",
          background: "#ffffff",
          borderBottom:
            "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding:
            "0 32px",
          boxShadow:
            "0 2px 8px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background:
                "#1d4ed8",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              fontWeight: "bold",
              fontSize: "24px",
            }}
          >
            W
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "21px",
                fontWeight: 700,
              }}
            >
              Wedding Planner
            </h1>

            <p
              style={{
                margin:
                  "3px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              3D Venue Designer
            </p>
          </div>
        </div>

        <nav
          style={{
            display: "flex",
            gap: "32px",
            alignItems: "center",
          }}
        >
          <button
            onClick={() =>
              router.push("/")
            }
            style={navButtonStyle}
          >
            Designer
          </button>

          <button
            style={{
              ...navButtonStyle,
              color: "#2563eb",
              fontWeight: 700,
            }}
          >
            Venues
          </button>

          <button
            onClick={() =>
              router.push(
                "/inventory"
              )
            }
            style={navButtonStyle}
          >
            Inventory
          </button>

          <button
            onClick={() =>
              router.push(
                "/themes"
              )
            }
            style={navButtonStyle}
          >
            Themes
          </button>

          <button
            onClick={() =>
              router.push(
                "/designs"
              )
            }
            style={navButtonStyle}
          >
            Saved Designs
          </button>
        </nav>

        <button
          onClick={() =>
            setShowModal(true)
          }
          style={{
            background:
              "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding:
              "13px 22px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Add Venue
        </button>
      </header>

      <div
        style={{
          padding:
            "32px 24px 60px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* PAGE TITLE */}

        <section
          style={{
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              color: "#2563eb",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              marginBottom: "8px",
            }}
          >
            WEDDING VENUE MANAGEMENT
          </p>

          <h2
            style={{
              margin: 0,
              fontSize: "38px",
              color: "#172033",
            }}
          >
            Discover Your Perfect Venue
          </h2>

          <p
            style={{
              fontSize: "18px",
              color: "#475569",
              marginTop: "10px",
            }}
          >
            Browse, manage and organize
            your wedding venues.
          </p>
        </section>

        {/* STATISTICS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: "24px",
            marginBottom: "48px",
          }}
        >
          <StatCard
            title="Total Venues"
            value={totalVenues}
            color="#1d4ed8"
          />

          <StatCard
            title="Available Venues"
            value={availableVenues}
            color="#16a34a"
          />

          <StatCard
            title="Maximum Capacity"
            value={maximumCapacity}
            color="#2563eb"
          />
        </section>

        {/* AVAILABLE VENUES */}

        <section>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom: "28px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "36px",
                }}
              >
                Available Venues
              </h2>

              <p
                style={{
                  color: "#475569",
                  fontSize: "18px",
                }}
              >
                Manage all your wedding
                venues in one place.
              </p>
            </div>

            <button
              onClick={fetchVenues}
              style={{
                background:
                  "#ffffff",
                color: "#334155",
                border:
                  "1px solid #cbd5e1",
                borderRadius:
                  "10px",
                padding:
                  "12px 24px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <p
              style={{
                color: "#64748b",
                fontSize: "18px",
              }}
            >
              Loading venues...
            </p>
          ) : venues.length === 0 ? (
            <div
              style={{
                background:
                  "#ffffff",
                padding: "50px",
                textAlign:
                  "center",
                borderRadius:
                  "16px",
                border:
                  "1px solid #e2e8f0",
              }}
            >
              <h3>
                No venues found
              </h3>

              <p
                style={{
                  color: "#64748b",
                }}
              >
                Add your first venue to
                start designing.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(380px, 1fr))",
                gap: "28px",
              }}
            >
              {venues.map(
                (venue) => (
                  <VenueCard
                    key={venue.id}
                    venue={venue}
                    onChoose={
                      handleChooseVenue
                    }
                    onDelete={
                      handleDeleteVenue
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        {/* INFORMATION */}

        <section
          style={{
            marginTop: "34px",
            background:
              "#eff6ff",
            border:
              "1px solid #bfdbfe",
            borderRadius: "14px",
            padding: "22px",
          }}
        >
          <h3
            style={{
              margin:
                "0 0 8px",
              color: "#1e3a8a",
            }}
          >
            ⓘ How it works
          </h3>

          <p
            style={{
              margin: 0,
              color: "#475569",
              fontSize: "16px",
            }}
          >
            Click{" "}
            <strong>
              "Choose Venue"
            </strong>{" "}
            to open the 3D designer and
            start creating your amazing
            venue layout.
          </p>
        </section>
      </div>

      {/* ADD VENUE MODAL */}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              background:
                "#ffffff",
              borderRadius:
                "18px",
              boxShadow:
                "0 25px 70px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding:
                  "28px 30px",
                borderBottom:
                  "1px solid #e2e8f0",
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color:
                      "#172033",
                  }}
                >
                  Add New Venue
                </h2>

                <p
                  style={{
                    color:
                      "#64748b",
                    marginBottom: 0,
                  }}
                >
                  Enter the details of your
                  wedding venue.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  fontSize: "28px",
                  color:
                    "#475569",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleAddVenue
              }
              style={{
                padding:
                  "30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "18px",
                }}
              >
                <FormField
                  label="Venue Name"
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Example: Royal Palace"
                />

                <FormField
                  label="Location"
                  name="location"
                  value={
                    formData.location
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Example: Delhi, India"
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div>
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Venue Type
                    </label>

                    <select
                      name="type"
                      value={
                        formData.type
                      }
                      onChange={
                        handleInputChange
                      }
                      style={
                        inputStyle
                      }
                    >
                      <option>
                        Banquet Hall
                      </option>

                      <option>
                        Garden
                      </option>

                      <option>
                        Hotel
                      </option>

                      <option>
                        Resort
                      </option>

                      <option>
                        Farmhouse
                      </option>
                    </select>
                  </div>

                  <FormField
                    label="Capacity"
                    name="capacity"
                    value={
                      formData.capacity
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="500"
                    type="number"
                  />
                </div>

                <FormField
                  label="Price (₹)"
                  name="price"
                  value={
                    formData.price
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="100000"
                  type="number"
                />

                <label
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    color:
                      "#334155",
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    name="availability"
                    checked={
                      formData.availability
                    }
                    onChange={
                      handleInputChange
                    }
                    style={{
                      width: "20px",
                      height: "20px",
                    }}
                  />

                  Venue is currently
                  available
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "14px",
                  marginTop: "30px",
                  paddingTop: "24px",
                  borderTop:
                    "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  style={{
                    padding:
                      "12px 24px",
                    background:
                      "#ffffff",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius:
                      "8px",
                    color:
                      "#334155",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  style={{
                    padding:
                      "12px 26px",
                    background:
                      "#2563eb",
                    border: "none",
                    borderRadius:
                      "8px",
                    color:
                      "#ffffff",
                    fontWeight: 700,
                    cursor:
                      submitting
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {submitting
                    ? "Adding..."
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

/* -------------------------------
   VENUE CARD
-------------------------------- */

function VenueCard({
  venue,
  onChoose,
  onDelete,
}: {
  venue: Venue;

  onChoose: (
    venue: Venue
  ) => void;

  onDelete: (
    id: number
  ) => void;
}) {
  return (
    <article
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        overflow: "hidden",
        border:
          "1px solid #e2e8f0",
        boxShadow:
          "0 6px 18px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        style={{
          height: "155px",
          background:
            "linear-gradient(135deg, #2563eb, #4f46e5)",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          fontSize: "58px",
        }}
      >
        🏛️
      </div>

      <div
        style={{
          padding: "28px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#1e293b",
            }}
          >
            {venue.name}
          </h3>

          <span
            style={{
              background:
                venue.availability
                  ? "#dcfce7"
                  : "#fee2e2",

              color:
                venue.availability
                  ? "#166534"
                  : "#b91c1c",

              padding:
                "7px 13px",

              borderRadius:
                "20px",

              fontWeight: 700,

              fontSize:
                "14px",
            }}
          >
            {venue.availability
              ? "● Available"
              : "● Unavailable"}
          </span>
        </div>

        <p
          style={{
            color: "#64748b",
            marginTop: "10px",
          }}
        >
          📍 {venue.location}
        </p>

        <hr
          style={{
            border: 0,
            borderTop:
              "1px solid #e2e8f0",
            margin:
              "24px 0",
          }}
        />

        <VenueDetail
          label="Type"
          value={venue.type}
        />

        <VenueDetail
          label="Capacity"
          value={`${venue.capacity} guests`}
        />

        <VenueDetail
          label="Price"
          value={`₹${venue.price.toLocaleString(
            "en-IN"
          )}`}
          highlight
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1.2fr 1fr",
            gap: "12px",
            marginTop: "28px",
          }}
        >
          {/* IMPORTANT: CHOOSE VENUE BUTTON */}

          <button
            onClick={() =>
              onChoose(venue)
            }
            disabled={
              !venue.availability
            }
            style={{
              padding:
                "14px 12px",

              border: "none",

              borderRadius:
                "9px",

              background:
                venue.availability
                  ? "#2563eb"
                  : "#94a3b8",

              color:
                "#ffffff",

              fontWeight: 700,

              fontSize:
                "16px",

              cursor:
                venue.availability
                  ? "pointer"
                  : "not-allowed",

              boxShadow:
                venue.availability
                  ? "0 4px 10px rgba(37,99,235,0.25)"
                  : "none",
            }}
          >
            ↗ Choose Venue
          </button>

          <button
            onClick={() =>
              onDelete(venue.id)
            }
            style={{
              padding:
                "14px 12px",

              border:
                "1px solid #fecaca",

              borderRadius:
                "9px",

              background:
                "#ffffff",

              color:
                "#dc2626",

              fontWeight: 700,

              fontSize:
                "16px",

              cursor:
                "pointer",
            }}
          >
            🗑 Delete
          </button>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------
   SMALL COMPONENTS
-------------------------------- */

function VenueDetail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        marginBottom: "16px",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: "16px",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color: highlight
            ? "#2563eb"
            : "#334155",
          fontSize: "16px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border:
          "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "26px 30px",
        boxShadow:
          "0 4px 12px rgba(15,23,42,0.05)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: "16px",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin:
            "12px 0 0",
          fontSize: "34px",
          color,
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<
      HTMLInputElement
    >
  ) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label
        style={labelStyle}
      >
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

/* -------------------------------
   STYLES
-------------------------------- */

const navButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#334155",
  fontSize: "16px",
  cursor: "pointer",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#334155",
  fontWeight: 700,
  fontSize: "15px",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "13px 14px",
  border:
    "1px solid #cbd5e1",
  borderRadius: "8px",
  fontSize: "16px",
  color: "#1e293b",
  background: "#ffffff",
};