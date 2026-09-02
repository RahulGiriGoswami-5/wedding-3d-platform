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
      setMessage("");

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
          "Failed to load saved designs."
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

      setDesigns(
        Array.isArray(designsData)
          ? designsData
          : []
      );

      setVenues(
        Array.isArray(venuesData)
          ? venuesData
          : []
      );

      setThemes(
        Array.isArray(themesData)
          ? themesData
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load designs:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load saved designs."
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
        item =>
          item.id === venueId
      );

    return venue
      ? venue.name
      : `Venue #${venueId}`;
  }

  function getVenueLocation(
    venueId: number
  ) {
    const venue =
      venues.find(
        item =>
          item.id === venueId
      );

    return venue
      ? venue.location
      : "";
  }

  function getThemeName(
    themeId: number | null
  ) {
    if (themeId === null) {
      return "No theme";
    }

    const theme =
      themes.find(
        item =>
          item.id === themeId
      );

    return theme
      ? theme.name
      : `Theme #${themeId}`;
  }

  function formatDate(
    dateValue: string
  ) {
    const date =
      new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  async function deleteDesign(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this saved design?"
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
            "Failed to delete design."
        );
      }

      setDesigns(
        current =>
          current.filter(
            design =>
              design.id !== id
          )
      );

      setMessage(
        "Design deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete design error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete design."
      );
    }
  }

  async function duplicateDesign(
    design: SavedDesign
  ) {
    try {
      setMessage("");

      const response =
        await fetch(
          "/api/designs",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                `Copy of ${design.name}`,

              venueId:
                design.venueId,

              themeId:
                design.themeId,

              layoutData:
                design.layoutData,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to duplicate design."
        );
      }

      setDesigns(
        current => [
          data,
          ...current,
        ]
      );

      setMessage(
        "Design duplicated successfully."
      );
    } catch (error) {
      console.error(
        "Duplicate design error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to duplicate design."
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

          <h1>
            Saved Designs
          </h1>

          <p className="subtitle">
            Manage, duplicate and reopen
            your wedding designs.
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

          <button
            onClick={loadData}
            type="button"
          >
            Refresh
          </button>
        </nav>
      </header>

      {message && (
        <div className="message">
          {message}

          <button
            onClick={() =>
              setMessage("")
            }
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <section className="designsSection">
        <div className="sectionHeading">
          <div>
            <h2>
              Your Saved Designs
            </h2>

            <p>
              Reopen a saved layout and
              continue editing it.
            </p>
          </div>

          <span className="designCount">
            {designs.length}{" "}
            {designs.length === 1
              ? "design"
              : "designs"}
          </span>
        </div>

        {loading ? (
          <div className="emptyState">
            Loading saved designs...
          </div>
        ) : designs.length === 0 ? (
          <div className="emptyState">
            <div className="emptyIcon">
              3D
            </div>

            <h3>
              No saved designs yet
            </h3>

            <p>
              Create a design in the
              3D Designer and save it
              to see it here.
            </p>

            <Link
              className="createButton"
              href="/"
            >
              Open 3D Designer
            </Link>
          </div>
        ) : (
          <div className="designGrid">
            {designs.map(
              design => (
                <article
                  className="designCard"
                  key={design.id}
                >
                  <div className="designPreview">
                    <div className="previewBadge">
                      3D
                    </div>

                    <span>
                      Saved Design
                    </span>
                  </div>

                  <div className="designContent">
                    <h3>
                      {design.name}
                    </h3>

                    <div className="infoRow">
                      <span>
                        Venue
                      </span>

                      <strong>
                        {getVenueName(
                          design.venueId
                        )}
                      </strong>
                    </div>

                    {getVenueLocation(
                      design.venueId
                    ) && (
                      <div className="location">
                        📍{" "}
                        {getVenueLocation(
                          design.venueId
                        )}
                      </div>
                    )}

                    <div className="infoRow">
                      <span>
                        Theme
                      </span>

                      <strong>
                        {getThemeName(
                          design.themeId
                        )}
                      </strong>
                    </div>

                    <p className="date">
                      Saved on{" "}
                      {formatDate(
                        design.createdAt
                      )}
                    </p>

                    <div className="cardButtons">
                      <Link
                        className="openButton"
                        href={
                          design.themeId !== null
                            ? `/?venueId=${design.venueId}&designId=${design.id}&themeId=${design.themeId}`
                            : `/?venueId=${design.venueId}&designId=${design.id}`
                        }
                      >
                        Open Design
                      </Link>

                      <button
                        className="duplicateButton"
                        onClick={() =>
                          duplicateDesign(
                            design
                          )
                        }
                        type="button"
                      >
                        Duplicate
                      </button>

                      <button
                        className="deleteButton"
                        onClick={() =>
                          deleteDesign(
                            design.id
                          )
                        }
                        type="button"
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
          padding: 32px;
          background:
            linear-gradient(
              135deg,
              #f8fafc,
              #eef2ff
            );
          color: #182230;
        }

        .header {
          max-width: 1400px;
          margin: 0 auto 32px;
          display: flex;
          justify-content:
            space-between;
          align-items:
            flex-start;
          gap: 24px;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        h1 {
          margin: 0;
          font-size: 36px;
          color: #172033;
        }

        .subtitle {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 16px;
        }

        .navigation {
          display: flex;
          flex-wrap: wrap;
          justify-content:
            flex-end;
          gap: 10px;
        }

        .navigation a,
        .navigation button {
          padding: 11px 16px;
          border-radius: 9px;
          border:
            1px solid #d8e0ec;
          background: #ffffff;
          color: #334155;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          font-size: 14px;
        }

        .navigation a:hover,
        .navigation button:hover {
          background: #eff6ff;
          border-color: #2563eb;
          color: #2563eb;
        }

        .message {
          max-width: 1400px;
          margin: 0 auto 20px;
          padding: 14px 18px;
          border-radius: 10px;
          background: #ecfdf5;
          border:
            1px solid #a7f3d0;
          color: #065f46;
          font-weight: 600;
          display: flex;
          justify-content:
            space-between;
          align-items: center;
        }

        .message button {
          border: none;
          background: transparent;
          color: #065f46;
          font-size: 22px;
          cursor: pointer;
        }

        .designsSection {
          max-width: 1400px;
          margin: 0 auto;
        }

        .sectionHeading {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .sectionHeading h2 {
          margin: 0;
          font-size: 26px;
          color: #172033;
        }

        .sectionHeading p {
          margin: 7px 0 0;
          color: #64748b;
        }

        .designCount {
          padding: 8px 14px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 700;
        }

        .designGrid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fill,
              minmax(300px, 1fr)
            );
          gap: 22px;
        }

        .designCard {
          overflow: hidden;
          background: #ffffff;
          border:
            1px solid #dbe3ef;
          border-radius: 16px;
          box-shadow:
            0 8px 24px
            rgba(
              15,
              23,
              42,
              0.08
            );
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .designCard:hover {
          transform:
            translateY(-4px);
          box-shadow:
            0 14px 32px
            rgba(
              15,
              23,
              42,
              0.12
            );
        }

        .designPreview {
          height: 150px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #4f46e5
            );
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: white;
        }

        .previewBadge {
          width: 62px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background:
            rgba(
              255,
              255,
              255,
              0.2
            );
          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.3
            );
          font-size: 22px;
          font-weight: 900;
        }

        .designPreview span {
          font-size: 14px;
          font-weight: 700;
        }

        .designContent {
          padding: 22px;
        }

        .designContent h3 {
          margin: 0 0 20px;
          color: #172033;
          font-size: 21px;
        }

        .infoRow {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 15px;
          padding: 10px 0;
          border-bottom:
            1px solid #eef2f7;
        }

        .infoRow span {
          color: #64748b;
          font-size: 14px;
        }

        .infoRow strong {
          color: #243047;
          text-align: right;
        }

        .location {
          margin: 9px 0;
          color: #64748b;
          font-size: 14px;
        }

        .date {
          margin: 16px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .cardButtons {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
          margin-top: 20px;
        }

        .cardButtons a,
        .cardButtons button {
          padding: 11px 8px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
        }

        .openButton {
          background: #2563eb;
          color: white;
        }

        .duplicateButton {
          background: #475569;
          color: white;
        }

        .deleteButton {
          background: #fff1f2;
          color: #dc2626;
          border:
            1px solid #fecaca !important;
        }

        .openButton:hover {
          background: #1d4ed8;
        }

        .duplicateButton:hover {
          background: #334155;
        }

        .deleteButton:hover {
          background: #fee2e2;
        }

        .emptyState {
          padding: 70px 20px;
          text-align: center;
          background: white;
          border:
            2px dashed #cbd5e1;
          border-radius: 16px;
          color: #64748b;
        }

        .emptyIcon {
          width: 70px;
          height: 70px;
          margin: 0 auto 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #dbeafe;
          color: #2563eb;
          font-size: 22px;
          font-weight: 900;
        }

        .emptyState h3 {
          margin: 0 0 10px;
          color: #334155;
        }

        .emptyState p {
          margin-bottom: 25px;
        }

        .createButton {
          display: inline-block;
          padding: 12px 18px;
          border-radius: 8px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-weight: 700;
        }

        @media (
          max-width: 800px
        ) {
          .page {
            padding: 20px;
          }

          .header,
          .sectionHeading {
            flex-direction: column;
            align-items:
              flex-start;
          }

          .navigation {
            justify-content:
              flex-start;
          }
        }

        @media (
          max-width: 500px
        ) {
          .page {
            padding: 15px;
          }

          h1 {
            font-size: 28px;
          }

          .cardButtons {
            grid-template-columns:
              1fr;
          }

          .navigation {
            width: 100%;
          }

          .navigation a,
          .navigation button {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}