"use client";

import { FormEvent, useState } from "react";

type MatchResult = {
  venues?: any[];
  inventory?: any[];
  inventoryItems?: any[];
};

const seatingOptions = [
  "Round Table Seating",
  "Banquet Seating",
  "Traditional Seating",
  "Theatre Style",
  "U-Shape Seating",
  "Classroom Style",
  "Lounge Seating",
  "Mixed Seating",
  "Dining Tables",
  "Chairs",
  "Sofas",
];

const decorationOptions = [
  "Traditional",
  "Royal",
  "Elegant",
  "Modern",
  "Minimalist",
  "Floral",
  "Luxury",
  "Rustic",
  "Bohemian",
  "Vintage",
  "Garden Theme",
  "Classic",
  "Contemporary",
];

const requirementOptions = [
  "Stage Setup",
  "Floral Decoration",
  "Premium Lighting",
  "DJ Setup",
  "Dance Floor",
  "Sound System",
  "Photography Setup",
  "Food & Catering Area",
  "VIP Seating",
  "Bridal Lounge",
  "Entrance Decoration",
  "LED Screen",
  "Projector",
  "Generator Backup",
  "Parking Area",
];

export default function MatchPage() {
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [budget, setBudget] = useState("");

  const [seating, setSeating] = useState<string[]>([]);
  const [decoration, setDecoration] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);

  const [selectedSeating, setSelectedSeating] = useState("");
  const [selectedDecoration, setSelectedDecoration] = useState("");
  const [selectedRequirement, setSelectedRequirement] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);

  function addSeating() {
    if (!selectedSeating) return;

    if (!seating.includes(selectedSeating)) {
      setSeating([...seating, selectedSeating]);
    }

    setSelectedSeating("");
  }

  function removeSeating(item: string) {
    setSeating(seating.filter((seat) => seat !== item));
  }

  function addDecoration() {
    if (!selectedDecoration) return;

    if (!decoration.includes(selectedDecoration)) {
      setDecoration([...decoration, selectedDecoration]);
    }

    setSelectedDecoration("");
  }

  function removeDecoration(item: string) {
    setDecoration(
      decoration.filter((decorationItem) => decorationItem !== item)
    );
  }

  function addRequirement() {
    if (!selectedRequirement) return;

    if (!requirements.includes(selectedRequirement)) {
      setRequirements([...requirements, selectedRequirement]);
    }

    setSelectedRequirement("");
  }

  function removeRequirement(item: string) {
    setRequirements(
      requirements.filter((requirement) => requirement !== item)
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setResult(null);

    if (!eventDate) {
      setError("Please select an event date.");
      return;
    }

    if (!location.trim()) {
      setError("Please enter a preferred location.");
      return;
    }

    if (!guests || Number(guests) <= 0) {
      setError("Please enter a valid guest count.");
      return;
    }

    if (!budget || Number(budget) < 0) {
      setError("Please enter a valid budget.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/match", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          eventType,
          eventDate,
          location: location.trim(),
          guests: Number(guests),
          budget: Number(budget),

          seating: seating.join(", "),
          decoration: decoration.join(", "),
          requirements: requirements.join(", "),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to generate recommendations."
        );
      }

      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to generate recommendations.");
      }
    } finally {
      setLoading(false);
    }
  }

  const venues = result?.venues || [];

  const inventoryItems =
    result?.inventoryItems || result?.inventory || [];

  return (
    <main className="match-page">

      {/* HEADER */}

      <div className="top-header">

        <div>
          <h1>Wedding Event Matcher</h1>

          <p>
            Tell us about your event and receive personalized venue
            and inventory recommendations.
          </p>
        </div>

        <div className="header-badge">
          <span className="badge-dot"></span>
          Smart Matching
        </div>

      </div>


      <div className="match-layout">

        {/* REQUIREMENTS FORM */}

        <section className="requirements-card">

          <div className="section-heading">

            <div className="step-number">
              1
            </div>

            <div>
              <h2>Your Requirements</h2>

              <p>
                Enter the details of your event.
              </p>
            </div>

          </div>


          <form onSubmit={handleSubmit}>

            {/* EVENT TYPE */}

            <div className="form-group">

              <label>
                Event Type
              </label>

              <select
                value={eventType}
                onChange={(e) =>
                  setEventType(e.target.value)
                }
              >

                <option>Wedding</option>
                <option>Reception</option>
                <option>Engagement</option>
                <option>Mehndi</option>
                <option>Sangeet</option>
                <option>Haldi</option>
                <option>Birthday</option>
                <option>Corporate Event</option>

              </select>

            </div>


            {/* EVENT DATE */}

            <div className="form-group">

              <label>
                Event Date
              </label>

              <input
                type="date"
                value={eventDate}
                onChange={(e) =>
                  setEventDate(e.target.value)
                }
                required
              />

            </div>


            {/* LOCATION */}

            <div className="form-group">

              <label>
                Preferred Location
              </label>

              <input
                type="text"
                placeholder="For example: Delhi"
                value={location}
                onChange={(e) =>
                  setLocation(e.target.value)
                }
                required
              />

            </div>


            {/* GUESTS AND BUDGET */}

            <div className="two-column">

              <div className="form-group">

                <label>
                  Guest Count
                </label>

                <input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={guests}
                  onChange={(e) =>
                    setGuests(e.target.value)
                  }
                  required
                />

              </div>


              <div className="form-group">

                <label>
                  Budget (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="100000"
                  value={budget}
                  onChange={(e) =>
                    setBudget(e.target.value)
                  }
                  required
                />

              </div>

            </div>


            {/* SEATING */}

            <div className="form-group multi-choice-group">

              <label>
                Seating and Furniture Requirements
              </label>

              <p className="field-help">
                Add everything you need. For example, tables,
                chairs and sofas can all be selected together.
              </p>


              <div className="add-choice-row">

                <select
                  value={selectedSeating}
                  onChange={(e) =>
                    setSelectedSeating(e.target.value)
                  }
                >

                  <option value="">
                    Select a seating or furniture option
                  </option>

                  {seatingOptions.map((option) => (

                    <option
                      key={option}
                      value={option}
                      disabled={seating.includes(option)}
                    >
                      {option}
                    </option>

                  ))}

                </select>


                <button
                  type="button"
                  className="add-button"
                  onClick={addSeating}
                  disabled={!selectedSeating}
                >
                  + Add
                </button>

              </div>


              {seating.length > 0 && (

                <div className="selected-list">

                  {seating.map((item) => (

                    <div
                      className="selected-item"
                      key={item}
                    >

                      <span>
                        {item}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeSeating(item)
                        }
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>


            {/* DECORATION */}

            <div className="form-group multi-choice-group">

              <label>
                Decoration Preferences
              </label>

              <p className="field-help">
                You can combine multiple decoration styles for
                your event.
              </p>


              <div className="add-choice-row">

                <select
                  value={selectedDecoration}
                  onChange={(e) =>
                    setSelectedDecoration(e.target.value)
                  }
                >

                  <option value="">
                    Select a decoration style
                  </option>

                  {decorationOptions.map((option) => (

                    <option
                      key={option}
                      value={option}
                      disabled={decoration.includes(option)}
                    >
                      {option}
                    </option>

                  ))}

                </select>


                <button
                  type="button"
                  className="add-button"
                  onClick={addDecoration}
                  disabled={!selectedDecoration}
                >
                  + Add
                </button>

              </div>


              {decoration.length > 0 && (

                <div className="selected-list">

                  {decoration.map((item) => (

                    <div
                      className="selected-item"
                      key={item}
                    >

                      <span>
                        {item}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeDecoration(item)
                        }
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>


            {/* ADDITIONAL REQUIREMENTS */}

            <div className="form-group multi-choice-group">

              <label>
                Additional Requirements
              </label>

              <p className="field-help">
                Select all the facilities and services required
                for your event.
              </p>


              <div className="add-choice-row">

                <select
                  value={selectedRequirement}
                  onChange={(e) =>
                    setSelectedRequirement(e.target.value)
                  }
                >

                  <option value="">
                    Select an additional requirement
                  </option>

                  {requirementOptions.map((option) => (

                    <option
                      key={option}
                      value={option}
                      disabled={requirements.includes(option)}
                    >
                      {option}
                    </option>

                  ))}

                </select>


                <button
                  type="button"
                  className="add-button"
                  onClick={addRequirement}
                  disabled={!selectedRequirement}
                >
                  + Add
                </button>

              </div>


              {requirements.length > 0 && (

                <div className="selected-list">

                  {requirements.map((item) => (

                    <div
                      className="selected-item"
                      key={item}
                    >

                      <span>
                        {item}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeRequirement(item)
                        }
                        aria-label={`Remove ${item}`}
                      >
                        ×
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              className="match-button"
              disabled={loading}
            >

              {loading
                ? "Finding Your Best Matches..."
                : "Find Best Matches"}

            </button>

          </form>


          <div className="info-box">

            <strong>
              How it works
            </strong>

            <p>
              Our matching engine compares your event requirements
              with available venues and inventory items to recommend
              the most suitable options.
            </p>

          </div>

        </section>


        {/* RESULTS */}

        <section className="results-area">

          {!result && !error && (

            <div className="empty-results">

              <div className="empty-icon">
                ✦
              </div>

              <h2>
                Ready to Find Your Perfect Match?
              </h2>

              <p>
                Fill in your event requirements and we will
                recommend suitable venues, furniture and other
                inventory items.
              </p>

            </div>

          )}


          {/* ERROR */}

          {error && (

            <div className="error-card">

              <div className="error-icon">
                !
              </div>

              <h3>
                Unable to Generate Recommendations
              </h3>

              <p>
                {error}
              </p>

              <button
                onClick={() =>
                  setError("")
                }
                className="try-again-button"
              >
                Try Again
              </button>

            </div>

          )}


          {/* RESULTS */}

          {result && (

            <>

              {/* VENUES */}

              <div className="result-section">

                <div className="result-title">

                  <div>

                    <span className="small-step">
                      2
                    </span>

                    <h2>
                      Recommended Venues
                    </h2>

                  </div>


                  <span className="result-count">
                    {venues.length} Found
                  </span>

                </div>


                {venues.length === 0 ? (

                  <div className="no-result">
                    No suitable venues were found based on your
                    current requirements.
                  </div>

                ) : (

                  <div className="venue-list">

                    {venues.map((venue, index) => (

                      <div
                        className="venue-card"
                        key={venue.id || index}
                      >

                        <div className="venue-image">

                          <span>
                            {venue.name
                              ?.charAt(0)
                              ?.toUpperCase() || "V"}
                          </span>

                        </div>


                        <div className="venue-details">

                          <div className="venue-name-row">

                            <h3>
                              {venue.name}
                            </h3>


                            {venue.matchScore !== undefined && (

                              <span className="score">
                                {venue.matchScore}% Match
                              </span>

                            )}

                          </div>


                          <p className="venue-location">
                            📍 {venue.location}
                          </p>


                          <div className="venue-info">

                            <span>
                              👥 {venue.capacity} Guests
                            </span>

                            <span>
                              ₹{" "}
                              {Number(
                                venue.price
                              ).toLocaleString("en-IN")}
                            </span>

                          </div>


                          <div
                            className={
                              venue.availability
                                ? "availability available"
                                : "availability unavailable"
                            }
                          >
                            {venue.availability
                              ? "● Available"
                              : "● Not Available"}
                          </div>

                        </div>

                      </div>

                    ))}

                  </div>

                )}

              </div>


              {/* INVENTORY */}

              <div className="result-section">

                <div className="result-title">

                  <div>

                    <span className="small-step">
                      3
                    </span>

                    <h2>
                      Recommended Inventory
                    </h2>

                  </div>


                  <span className="result-count">
                    {inventoryItems.length} Found
                  </span>

                </div>


                {inventoryItems.length === 0 ? (

                  <div className="no-result">
                    No suitable inventory items were found based on
                    your requirements.
                  </div>

                ) : (

                  <div className="inventory-grid">

                    {inventoryItems.map((item, index) => (

                      <div
                        className="inventory-card"
                        key={item.id || index}
                      >

                        <div className="inventory-icon">

                          {item.name
                            ?.charAt(0)
                            ?.toUpperCase() || "I"}

                        </div>


                        <h3>
                          {item.name}
                        </h3>

                        <p>
                          {item.category}
                        </p>


                        <div className="inventory-bottom">

                          <span>

                            ₹{" "}

                            {Number(
                              item.price
                            ).toLocaleString("en-IN")}

                          </span>


                          {item.availableQuantity !==
                            undefined && (

                            <span>
                              {item.availableQuantity} available
                            </span>

                          )}

                        </div>

                      </div>

                    ))}

                  </div>

                )}

              </div>


              {/* SUMMARY */}

              <div className="summary-card">

                <div>

                  <h3>
                    Match Summary
                  </h3>

                  <p>

                    We found {venues.length} suitable venue
                    {venues.length !== 1 ? "s" : ""} and{" "}

                    {inventoryItems.length} inventory item
                    {inventoryItems.length !== 1 ? "s" : ""}.

                  </p>

                </div>


                <div className="summary-stats">

                  <div>

                    <strong>
                      {venues.length}
                    </strong>

                    <span>
                      Venues
                    </span>

                  </div>


                  <div>

                    <strong>
                      {inventoryItems.length}
                    </strong>

                    <span>
                      Inventory
                    </span>

                  </div>

                </div>

              </div>

            </>

          )}

        </section>

      </div>


      <style jsx>{`

        .match-page {
          min-height: 100vh;
          background: #f4f7fb;
          color: #1f2937;
          padding: 40px;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }


        /* HEADER */

        .top-header {
          max-width: 1500px;
          margin: 0 auto 30px;

          display: flex;
          justify-content: space-between;
          align-items: center;

          padding: 5px 5px;
        }

        .top-header h1 {
          margin: 0;
          color: #1e4f91;
          font-size: 32px;
        }

        .top-header p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 16px;
        }

        .header-badge {
          display: flex;
          align-items: center;

          background: #edf5ff;
          color: #2167b5;

          border: 1px solid #bcd7f2;

          padding: 12px 18px;

          border-radius: 10px;

          font-size: 14px;
          font-weight: bold;
        }

        .badge-dot {
          width: 8px;
          height: 8px;

          background: #2878c8;

          border-radius: 50%;

          margin-right: 8px;
        }


        /* MAIN LAYOUT */

        .match-layout {
          max-width: 1500px;
          margin: auto;

          display: grid;

          grid-template-columns:
            400px
            minmax(0, 1fr);

          gap: 25px;

          align-items: start;
        }


        /* CARDS */

        .requirements-card,
        .result-section,
        .summary-card,
        .empty-results,
        .error-card {
          background: white;

          border:
            1px solid
            #d7e2ee;

          border-radius: 16px;

          box-shadow:
            0 8px 30px
            rgba(30, 70, 120, 0.08);
        }

        .requirements-card {
          padding: 26px;
        }


        /* FORM HEADING */

        .section-heading {
          display: flex;
          align-items: center;

          gap: 14px;

          margin-bottom: 26px;
        }

        .step-number,
        .small-step {
          background: #2167b5;

          color: white;

          width: 34px;
          height: 34px;

          border-radius: 50%;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          font-weight: bold;

          flex-shrink: 0;
        }

        .section-heading h2 {
          margin: 0;

          color: #183d6b;

          font-size: 21px;
        }

        .section-heading p {
          margin: 5px 0 0;

          color: #718096;

          font-size: 13px;
        }


        /* FORM */

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;

          margin-bottom: 8px;

          color: #334e68;

          font-size: 13px;

          font-weight: bold;
        }

        .field-help {
          margin:
            -2px
            0
            10px;

          color: #718096;

          font-size: 12px;

          line-height: 1.5;
        }

        input,
        select {
          width: 100%;

          box-sizing: border-box;

          padding: 13px;

          border-radius: 9px;

          border:
            1px solid
            #c8d6e5;

          background: white;

          color: #1e293b;

          font-size: 14px;

          outline: none;

          transition:
            border 0.2s,
            box-shadow 0.2s;
        }

        input:focus,
        select:focus {
          border-color: #2878c8;

          box-shadow:
            0 0 0 3px
            rgba(
              40,
              120,
              200,
              0.12
            );
        }

        .two-column {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 12px;
        }


        /* MULTIPLE CHOICE */

        .multi-choice-group {
          padding: 15px;

          border:
            1px solid
            #dce6f0;

          border-radius: 12px;

          background: #fbfdff;
        }

        .add-choice-row {
          display: flex;

          gap: 10px;

          align-items: stretch;
        }

        .add-choice-row select {
          flex: 1;

          min-width: 0;
        }

        .add-button {
          border: none;

          background: #eaf3fc;

          color: #2167b5;

          border:
            1px solid
            #b9d4ee;

          border-radius: 9px;

          padding:
            0
            15px;

          font-weight: bold;

          cursor: pointer;

          white-space: nowrap;

          transition: 0.2s;
        }

        .add-button:hover:not(:disabled) {
          background: #2167b5;

          color: white;
        }

        .add-button:disabled {
          opacity: 0.5;

          cursor: not-allowed;
        }


        /* SELECTED ITEMS */

        .selected-list {
          display: flex;

          flex-wrap: wrap;

          gap: 8px;

          margin-top: 14px;
        }

        .selected-item {
          display: flex;

          align-items: center;

          gap: 8px;

          background: #eaf3fc;

          border:
            1px solid
            #c4dcef;

          color: #1e5fa8;

          padding:
            7px
            9px
            7px
            12px;

          border-radius: 20px;

          font-size: 12px;

          font-weight: 600;
        }

        .selected-item button {
          width: 20px;
          height: 20px;

          border: none;

          border-radius: 50%;

          background: #2167b5;

          color: white;

          cursor: pointer;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 16px;

          line-height: 1;

          padding-bottom: 2px;
        }

        .selected-item button:hover {
          background: #164f91;
        }


        /* SUBMIT BUTTON */

        .match-button {
          width: 100%;

          border: none;

          padding: 15px;

          border-radius: 10px;

          background: #2167b5;

          color: white;

          font-weight: bold;

          font-size: 15px;

          cursor: pointer;

          transition:
            transform 0.2s,
            background 0.2s,
            box-shadow 0.2s;

          margin-top: 4px;
        }

        .match-button:hover:not(:disabled) {
          background: #164f91;

          transform:
            translateY(-1px);

          box-shadow:
            0 8px 18px
            rgba(
              33,
              103,
              181,
              0.25
            );
        }

        .match-button:disabled {
          opacity: 0.65;

          cursor: not-allowed;
        }


        /* INFO BOX */

        .info-box {
          margin-top: 25px;

          padding: 18px;

          background: #eef6ff;

          border:
            1px solid
            #cfe1f2;

          border-radius: 12px;
        }

        .info-box strong {
          color: #1d4f84;
        }

        .info-box p {
          color: #64748b;

          font-size: 13px;

          line-height: 1.6;

          margin-bottom: 0;
        }


        /* RESULTS */

        .results-area {
          display: flex;

          flex-direction: column;

          gap: 22px;

          min-width: 0;
        }


        /* EMPTY */

        .empty-results {
          min-height: 520px;

          display: flex;

          flex-direction: column;

          align-items: center;
          justify-content: center;

          text-align: center;

          padding: 40px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;

          border-radius: 20px;

          background: #e8f2fc;

          color: #2878c8;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 40px;

          margin-bottom: 20px;
        }

        .empty-results h2 {
          color: #183d6b;

          margin-bottom: 10px;
        }

        .empty-results p {
          color: #718096;

          max-width: 450px;

          line-height: 1.6;
        }


        /* RESULT SECTION */

        .result-section {
          padding: 25px;
        }

        .result-title {
          display: flex;

          justify-content: space-between;
          align-items: center;

          gap: 15px;

          margin-bottom: 20px;
        }

        .result-title > div {
          display: flex;

          align-items: center;

          gap: 12px;
        }

        .result-title h2 {
          margin: 0;

          color: #183d6b;

          font-size: 21px;
        }

        .result-count {
          background: #eaf3fc;

          color: #2467aa;

          padding:
            7px
            12px;

          border-radius: 20px;

          font-size: 13px;

          font-weight: bold;

          white-space: nowrap;
        }


        /* VENUES */

        .venue-list {
          display: flex;

          flex-direction: column;

          gap: 15px;
        }

        .venue-card {
          border:
            1px solid
            #dbe5ef;

          border-radius: 13px;

          padding: 15px;

          display: flex;

          gap: 18px;

          transition:
            transform 0.2s,
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .venue-card:hover {
          border-color: #78aee2;

          transform:
            translateY(-2px);

          box-shadow:
            0 8px 20px
            rgba(
              30,
              70,
              120,
              0.08
            );
        }

        .venue-image {
          width: 120px;
          min-width: 120px;

          height: 110px;

          border-radius: 10px;

          background:
            linear-gradient(
              135deg,
              #d9ebfb,
              #91bce7
            );

          display: flex;

          align-items: center;
          justify-content: center;
        }

        .venue-image span {
          width: 55px;
          height: 55px;

          border-radius: 50%;

          background: #2167b5;

          color: white;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 24px;

          font-weight: bold;
        }

        .venue-details {
          flex: 1;

          min-width: 0;
        }

        .venue-name-row {
          display: flex;

          align-items: center;

          gap: 12px;

          justify-content: space-between;
        }

        .venue-name-row h3 {
          margin: 0;

          color: #263f5c;
        }

        .score {
          background: #e0f4e7;

          color: #237644;

          padding:
            5px
            9px;

          border-radius: 6px;

          font-size: 12px;

          font-weight: bold;

          white-space: nowrap;
        }

        .venue-location {
          color: #718096;

          font-size: 14px;

          margin: 10px 0;
        }

        .venue-info {
          display: flex;

          flex-wrap: wrap;

          gap: 20px;

          color: #506985;

          font-size: 14px;
        }

        .availability {
          margin-top: 12px;

          font-size: 13px;

          font-weight: bold;
        }

        .available {
          color: #23804b;
        }

        .unavailable {
          color: #c0392b;
        }


        /* INVENTORY */

        .inventory-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(180px, 1fr)
            );

          gap: 15px;
        }

        .inventory-card {
          border:
            1px solid
            #dce5ee;

          border-radius: 12px;

          padding: 20px;

          text-align: center;

          transition:
            transform 0.2s,
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .inventory-card:hover {
          border-color: #78aee2;

          transform:
            translateY(-3px);

          box-shadow:
            0 8px 18px
            rgba(
              30,
              70,
              120,
              0.08
            );
        }

        .inventory-icon {
          width: 60px;
          height: 60px;

          border-radius: 12px;

          background: #e9f3fd;

          color: #2167b5;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 24px;

          font-weight: bold;

          margin:
            0
            auto
            14px;
        }

        .inventory-card h3 {
          margin: 0;

          font-size: 15px;

          color: #263f5c;
        }

        .inventory-card p {
          color: #718096;

          font-size: 13px;
        }

        .inventory-bottom {
          display: flex;

          flex-direction: column;

          gap: 6px;

          color: #2467aa;

          font-size: 12px;

          font-weight: bold;
        }


        /* SUMMARY */

        .summary-card {
          padding: 25px;

          display: flex;

          justify-content: space-between;
          align-items: center;

          gap: 25px;
        }

        .summary-card h3 {
          margin: 0 0 8px;

          color: #183d6b;
        }

        .summary-card p {
          color: #718096;

          margin: 0;

          line-height: 1.5;
        }

        .summary-stats {
          display: flex;

          gap: 35px;

          text-align: center;

          flex-shrink: 0;
        }

        .summary-stats div {
          display: flex;

          flex-direction: column;

          gap: 5px;
        }

        .summary-stats strong {
          color: #2167b5;

          font-size: 25px;
        }

        .summary-stats span {
          color: #718096;

          font-size: 12px;
        }


        /* ERROR */

        .error-card {
          padding: 45px;

          text-align: center;
        }

        .error-icon {
          width: 55px;
          height: 55px;

          margin:
            0
            auto
            15px;

          border-radius: 50%;

          background: #feecec;

          color: #c0392b;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 28px;

          font-weight: bold;
        }

        .error-card h3 {
          color: #c0392b;

          margin-bottom: 10px;
        }

        .error-card p {
          color: #718096;
        }

        .try-again-button {
          background: #2167b5;

          color: white;

          border: none;

          padding:
            12px
            25px;

          border-radius: 8px;

          cursor: pointer;

          font-weight: bold;
        }

        .try-again-button:hover {
          background: #164f91;
        }


        /* NO RESULT */

        .no-result {
          padding: 30px;

          background: #f5f8fc;

          border:
            1px dashed
            #cbd8e6;

          border-radius: 10px;

          text-align: center;

          color: #718096;
        }


        /* TABLET */

        @media (max-width: 1000px) {

          .match-layout {
            grid-template-columns: 1fr;
          }

          .top-header {
            flex-direction: column;

            align-items: flex-start;

            gap: 15px;
          }

        }


        /* MOBILE */

        @media (max-width: 650px) {

          .match-page {
            padding: 20px;
          }

          .two-column {
            grid-template-columns: 1fr;
          }

          .add-choice-row {
            flex-direction: column;
          }

          .add-button {
            min-height: 44px;
          }

          .venue-card {
            flex-direction: column;
          }

          .venue-image {
            width: 100%;
          }

          .summary-card {
            flex-direction: column;

            align-items: flex-start;
          }

          .summary-stats {
            width: 100%;

            justify-content: space-around;
          }

          .venue-name-row {
            align-items: flex-start;

            flex-direction: column;
          }

        }

      `}</style>

    </main>
  );
}