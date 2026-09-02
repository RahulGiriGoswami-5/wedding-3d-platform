"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SavedDesign = {
  id: number;
  name: string;
  venueId: number;
  themeId: number | null;
  layoutData: string;
  createdAt: string;
  updatedAt: string;
};

type Venue = {
  id: number;
  name: string;
  location: string;
};

type Theme = {
  id: number;
  name: string;
  primaryColor: string;
  secondaryColor: string;
};

export default function DesignsPage() {
  const [designs, setDesigns] =
    useState<SavedDesign[]>([]);

  const [venues, setVenues] =
    useState<Venue[]>([]);

  const [themes, setThemes] =
    useState<Theme[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [
        designsResponse,
        venuesResponse,
        themesResponse,
      ] = await Promise.all([
        fetch("/api/designs"),
        fetch("/api/venues"),
        fetch("/api/themes"),
      ]);

      if (!designsResponse.ok) {
        throw new Error(
          "Failed to load saved designs"
        );
      }

      const designsData =
        await designsResponse.json();

      const venuesData =
        venuesResponse.ok
          ? await venuesResponse.json()
          : [];

      const themesData =
        themesResponse.ok
          ? await themesResponse.json()
          : [];

      setDesigns(designsData);
      setVenues(venuesData);
      setThemes(themesData);
    } catch (error) {
      console.error(
        "Failed to load designs:",
        error
      );

      setMessage(
        "Unable to load saved designs."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function getVenueName(
    venueId: number
  ) {
    const venue =
      venues.find(
        (item) =>
          item.id === venueId
      );

    return venue
      ? venue.name
      : `Venue #${venueId}`;
  }

  function getThemeName(
    themeId: number | null
  ) {
    if (themeId === null) {
      return "No theme";
    }

    const theme =
      themes.find(
        (item) =>
          item.id === themeId
      );

    return theme
      ? theme.name
      : `Theme #${themeId}`;
  }

  async function deleteDesign(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Delete this saved design?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/designs",
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete design"
        );
      }

      setDesigns((current) =>
        current.filter(
          (design) =>
            design.id !== id
        )
      );

      setMessage(
        "Design deleted successfully."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete design."
      );
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">
            WEDDING 3D PLATFORM
          </p>

          <h1>Saved Designs</h1>

          <p className="subtitle">
            Manage your saved wedding
            designs and layouts.
          </p>
        </div>

        <nav className="navigation">
          <Link href="/">
            3D Designer
          </Link>

          <Link href="/venues">
            Venues
          </Link>

          <Link href="/inventory">
            Inventory
          </Link>

          <Link href="/themes">
            Themes
          </Link>
        </nav>
      </header>

      {message && (
        <p className="message">
          {message}
        </p>
      )}

      <section className="designsSection">
        <div className="sectionHeading">
          <h2>Your Saved Designs</h2>

          <span>
            {designs.length} design
            {designs.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {loading ? (
          <div className="emptyState">
            Loading saved designs...
          </div>
        ) : designs.length === 0 ? (
          <div className="emptyState">
            No saved designs yet.
            <br />
            Create a design in the
            3D Designer first.
          </div>
        ) : (
          <div className="designGrid">
            {designs.map(
              (design) => (
                <article
                  className="designCard"
                  key={design.id}
                >
                  <div className="designPreview">
                    <span>
                      3D
                    </span>
                  </div>

                  <div className="designContent">
                    <h3>
                      {design.name}
                    </h3>

                    <p>
                      <strong>
                        Venue:
                      </strong>{" "}
                      {getVenueName(
                        design.venueId
                      )}
                    </p>

                    <p>
                      <strong>
                        Theme:
                      </strong>{" "}
                      {getThemeName(
                        design.themeId
                      )}
                    </p>

                    <p className="date">
                      Saved:{" "}
                      {new Date(
                        design.createdAt
                      ).toLocaleDateString()}
                    </p>

                    <div className="cardButtons">
                      <Link
                        href={`/?venueId=${design.venueId}`}
                      >
                        Open Design
                      </Link>

                      <button
                        className="deleteButton"
                        onClick={() =>
                          deleteDesign(
                            design.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f4f7fb;
          color: #182230;
          padding: 32px;
        }

        .header {
          max-width: 1400px;
          margin: 0 auto 32px;
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
        }

        .eyebrow {
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 32px;
        }

        .subtitle {
          color: #64748b;
          margin-top: 10px;
        }

        .navigation {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .navigation a {
          background: white;
          border: 1px solid #dbe3ef;
          padding: 10px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: #334155;
          font-weight: 600;
        }

        .message {
          max-width: 1400px;
          margin: 0 auto 20px;
          padding: 12px;
          background: white;
          border-radius: 8px;
        }

        .designsSection {
          max-width: 1400px;
          margin: 0 auto;
        }

        .sectionHeading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .sectionHeading h2 {
          margin: 0;
        }

        .sectionHeading span {
          color: #64748b;
        }

        .designGrid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(280px, 1fr)
            );
          gap: 20px;
        }

        .designCard {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .designPreview {
          height: 140px;
          background: linear-gradient(
            135deg,
            #dbeafe,
            #ede9fe
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 800;
          color: #475569;
        }

        .designContent {
          padding: 20px;
        }

        .designContent h3 {
          margin-top: 0;
          margin-bottom: 16px;
        }

        .designContent p {
          color: #64748b;
          margin: 8px 0;
        }

        .date {
          font-size: 13px;
        }

        .cardButtons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .cardButtons a,
        .cardButtons button {
          flex: 1;
          padding: 10px;
          border-radius: 7px;
          border: none;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          background: #2563eb;
          color: white;
          font-weight: 600;
        }

        .cardButtons .deleteButton {
          background: #dc2626;
        }

        .emptyState {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 60px 20px;
          text-align: center;
          color: #64748b;
        }

        @media (
          max-width: 700px
        ) {
          .page {
            padding: 20px;
          }

          .header {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}