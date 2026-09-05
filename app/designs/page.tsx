"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type MessageType = "success" | "error";

export default function DesignsPage() {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("success");

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [duplicatingId, setDuplicatingId] =
    useState<number | null>(null);

  const [editingDesign, setEditingDesign] =
    useState<SavedDesign | null>(null);

  const [editName, setEditName] =
    useState("");

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [darkMode, setDarkMode] =
    useState(false);

  function showMessage(
    text: string,
    type: MessageType = "success"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function loadData() {
    try {
      setLoading(true);

      const [
        designsResponse,
        venuesResponse,
        themesResponse,
      ] = await Promise.all([
        fetch("/api/designs", {
          cache: "no-store",
        }),
        fetch("/api/venues", {
          cache: "no-store",
        }),
        fetch("/api/themes", {
          cache: "no-store",
        }),
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

      showMessage(
        error instanceof Error
          ? error.message
          : "Unable to load saved designs.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const syncTheme = (value?: string | null) => {
      setDarkMode((value ?? window.localStorage.getItem("wedding-planner-theme")) === "dark");
    };
    syncTheme();
    const onThemeChange = (event: Event) => {
      syncTheme((event as CustomEvent<string>).detail);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "wedding-planner-theme") syncTheme(event.newValue);
    };
    window.addEventListener("wedding-planner-theme-change", onThemeChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wedding-planner-theme-change", onThemeChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function getVenue(venueId: number) {
    return (
      venues.find(
        venue =>
          venue.id === venueId
      ) || null
    );
  }

  function getTheme(
    themeId: number | null
  ) {
    if (themeId === null) {
      return null;
    }

    return (
      themes.find(
        theme =>
          theme.id === themeId
      ) || null
    );
  }

  function formatDate(
    dateValue: string
  ) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Recently";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function openEditModal(
    design: SavedDesign
  ) {
    setEditingDesign(design);
    setEditName(design.name);
  }

  function closeEditModal() {
    if (savingEdit) {
      return;
    }

    setEditingDesign(null);
    setEditName("");
  }

  async function saveEdit() {
    if (!editingDesign) {
      return;
    }

    const name = editName.trim();

    if (!name) {
      showMessage(
        "Please enter a design name.",
        "error"
      );

      return;
    }

    try {
      setSavingEdit(true);
      setMessage("");

      /*
        IMPORTANT:
        Your /api/designs route uses PUT
        for updating designs.
      */
      const response =
        await fetch(
          "/api/designs",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id: editingDesign.id,
              name,
              venueId:
                editingDesign.venueId,
              themeId:
                editingDesign.themeId,
              layoutData:
                editingDesign.layoutData,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update design"
        );
      }

      setDesigns(
        current =>
          current.map(
            design =>
              design.id === data.id
                ? data
                : design
          )
      );

      showMessage(
        "Design details updated successfully."
      );

      setEditingDesign(null);
      setEditName("");
    } catch (error) {
      console.error(
        "Update design error:",
        error
      );

      showMessage(
        error instanceof Error
          ? error.message
          : "Failed to update design.",
        "error"
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function duplicateDesign(
    design: SavedDesign
  ) {
    try {
      setDuplicatingId(design.id);
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
                `${design.name} Copy`,
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
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to duplicate design"
        );
      }

      setDesigns(
        current => [
          data,
          ...current,
        ]
      );

      showMessage(
        `"${data.name}" was duplicated successfully.`
      );
    } catch (error) {
      console.error(
        "Duplicate design error:",
        error
      );

      showMessage(
        error instanceof Error
          ? error.message
          : "Failed to duplicate design.",
        "error"
      );
    } finally {
      setDuplicatingId(null);
    }
  }

  async function deleteDesign(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to permanently delete this design?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setMessage("");

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
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to delete design"
        );
      }

      setDesigns(
        current =>
          current.filter(
            design =>
              design.id !== id
          )
      );

      showMessage(
        "Design deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete design error:",
        error
      );

      showMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete design.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className={`page ${darkMode ? "page-dark" : ""}`}>

      <header className="planner-navbar">
        <div className="planner-navbar-inner">
          <Link href="/" className="planner-brand" aria-label="Wedding Planner home">
            <span className="planner-brand-mark">W</span>
            <span>
              <span className="planner-brand-title">Wedding Planner</span>
              <span className="planner-brand-subtitle">3D Venue Designer</span>
            </span>
          </Link>
          <nav className="planner-navigation" aria-label="Main navigation">
            <Link href="/" className="planner-nav-link">Designer</Link>
            <Link href="/venues" className="planner-nav-link">Venues</Link>
            <Link href="/inventory" className="planner-nav-link">Inventory</Link>
            <Link href="/match" className="planner-nav-link">Find Matches</Link>
            <Link href="/themes" className="planner-nav-link">Themes</Link>
            <Link href="/designs" className="planner-nav-link planner-nav-active">Saved Designs</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <span className="heroTag">
            SAVED DESIGN LIBRARY
          </span>

          <h1>
            Saved Designs
          </h1>

          <p>
            Reopen, update, duplicate or continue working on your wedding layouts.
          </p>
        </div>

        <Link
          href="/"
          className="newDesignButton"
        >
          + New Design
        </Link>
      </section>

      <section className="content">

        <div className="sectionHeading">
          <div>
            <h2>
              Your Designs
            </h2>

            <p>
              Open, duplicate, edit or
              manage your saved wedding
              layouts.
            </p>
          </div>

          <div className="headingActions">
            <div className="designCount">
              <strong>
                {designs.length}
              </strong>

              <span>
                {designs.length === 1
                  ? " Design"
                  : " Designs"}
              </span>
            </div>

            <button
              className="refreshButton"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {message && (
          <div
            className={
              messageType === "error"
                ? "message errorMessage"
                : "message"
            }
          >
            <span>
              {messageType === "error"
                ? "!"
                : "✓"}
            </span>

            {message}
          </div>
        )}

        {loading ? (

          <div className="stateCard">
            <div className="spinner" />

            <p>
              Loading your designs...
            </p>
          </div>

        ) : designs.length === 0 ? (

          <div className="emptyState">

            <div className="emptyIcon">
              ✦
            </div>

            <h3>
              No saved designs yet
            </h3>

            <p>
              Create your first wedding
              layout in the 3D Designer
              and save it to see it here.
            </p>

            <Link
              href="/"
              className="createButton"
            >
              Start Designing
            </Link>

          </div>

        ) : (

          <div className="designGrid">

            {designs.map(
              design => {
                const venue =
                  getVenue(
                    design.venueId
                  );

                const theme =
                  getTheme(
                    design.themeId
                  );

                return (
                  <article
                    className="designCard"
                    key={design.id}
                  >

                    <div
                      className="designPreview"
                      style={{
                        background:
                          theme
                            ? `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
                            : "linear-gradient(135deg, #2563eb, #7c3aed)",
                      }}
                    >

                      <div className="previewTop">
                        <span className="previewBadge">
                          SAVED DESIGN
                        </span>

                        <span className="designId">
                          #{design.id}
                        </span>
                      </div>

                      <div className="previewText">
                        <span>
                          WEDDING 3D
                        </span>

                        <strong>
                          {design.name}
                        </strong>
                      </div>

                    </div>

                    <div className="designContent">

                      <div className="designTitleRow">
                        <div>
                          <h3>
                            {design.name}
                          </h3>

                          <p>
                            Last updated{" "}
                            {formatDate(
                              design.updatedAt
                            )}
                          </p>
                        </div>

                        <button
                          className="editIconButton"
                          onClick={() =>
                            openEditModal(
                              design
                            )
                          }
                          title="Edit design details"
                          aria-label="Edit design details"
                        >
                          ✎
                        </button>
                      </div>

                      <div className="infoGrid">

                        <div className="infoBox">
                          <span className="infoLabel">
                            VENUE
                          </span>

                          <strong>
                            {venue
                              ? venue.name
                              : `Venue #${design.venueId}`}
                          </strong>

                          {venue && (
                            <small>
                              {venue.location}
                            </small>
                          )}
                        </div>

                        <div className="infoBox">
                          <span className="infoLabel">
                            THEME
                          </span>

                          <div className="themeInfo">
                            <span
                              className="themeDot"
                              style={{
                                background:
                                  theme
                                    ? theme.primaryColor
                                    : "#94a3b8",
                              }}
                            />

                            <strong>
                              {theme
                                ? theme.name
                                : "No theme"}
                            </strong>
                          </div>
                        </div>

                      </div>

                      <div className="cardActions">

                        <Link
                          href={`/?venueId=${design.venueId}&designId=${design.id}`}
                          className="actionButton primaryButton"
                        >
                          Open & Edit
                        </Link>

                        <button
                          className="actionButton secondaryButton"
                          onClick={() =>
                            openEditModal(
                              design
                            )
                          }
                        >
                          Edit Details
                        </button>

                        <button
                          className="actionButton duplicateButton"
                          onClick={() =>
                            duplicateDesign(
                              design
                            )
                          }
                          disabled={
                            duplicatingId ===
                            design.id
                          }
                        >
                          {duplicatingId ===
                          design.id
                            ? "Duplicating..."
                            : "Duplicate"}
                        </button>

                      </div>

                      <button
                        className="deleteButton"
                        onClick={() =>
                          deleteDesign(
                            design.id
                          )
                        }
                        disabled={
                          deletingId ===
                          design.id
                        }
                      >
                        {deletingId ===
                        design.id
                          ? "Deleting..."
                          : "Delete Design"}
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        )}
      </section>

      {editingDesign && (

        <div
          className="modalOverlay"
          onClick={closeEditModal}
        >

          <div
            className="modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <div className="modalHeader">

              <div>
                <span className="modalTag">
                  EDIT DESIGN
                </span>

                <h2>
                  Design Details
                </h2>
              </div>

              <button
                className="closeButton"
                onClick={closeEditModal}
                disabled={savingEdit}
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <div className="formGroup">

              <label>
                Design Name
              </label>

              <input
                value={editName}
                onChange={event =>
                  setEditName(
                    event.target.value
                  )
                }
                onKeyDown={event => {
                  if (
                    event.key === "Enter"
                  ) {
                    saveEdit();
                  }
                }}
                placeholder="Enter design name"
                autoFocus
              />

            </div>

            <div className="modalDetails">

              <div>
                <span>
                  Venue
                </span>

                <strong>
                  {getVenue(
                    editingDesign.venueId
                  )?.name ||
                    `Venue #${editingDesign.venueId}`}
                </strong>
              </div>

              <div>
                <span>
                  Theme
                </span>

                <strong>
                  {getTheme(
                    editingDesign.themeId
                  )?.name ||
                    "No theme selected"}
                </strong>
              </div>

            </div>

            <div className="modalActions">

              <button
                className="cancelButton"
                onClick={closeEditModal}
                disabled={savingEdit}
              >
                Cancel
              </button>

              <button
                className="saveEditButton"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>

        </div>

      )}

      <style>{`
        /* Shared Wedding Planner navigation - enhanced */
        /* Full-bleed navigation: touches the exact left and right edges of the viewport. */
        /* Full-width navbar without shifting or clipping the brand. */
        .page {
          --planner-page-gutter: 60px;
        }
        .planner-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: calc(100% + var(--planner-page-gutter) + var(--planner-page-gutter));
          max-width: none;
          left: auto;
          margin: 0 calc(-1 * var(--planner-page-gutter));
          padding: 0;
          box-sizing: border-box;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid #dbe3ef;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(15,23,42,.06);
        }
        .planner-navbar-inner {
          width: 100%;
          max-width: none;
          min-height: 92px;
          margin: 0;
          padding: 10px 28px;
          display: grid;
          grid-template-columns: max-content minmax(0, 1fr);
          align-items: center;
          gap: 18px;
          box-sizing: border-box;
        }
        .planner-navbar-inner::after {
          display: none;
        }
        .planner-brand {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #243247;
          text-decoration: none;
          width: max-content;
          max-width: 100%;
        }
        .planner-brand-mark {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          background: linear-gradient(135deg,#2f66c8,#1d4fa8);
          color: #fff;
          font-size: 24px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(37,99,235,.22);
        }
        .planner-brand-title {
          display: block;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: .02em;
          line-height: 1.15;
          white-space: nowrap;
        }
        .planner-brand-subtitle {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .planner-navigation {
          min-height: 60px;
          width: 100%;
          max-width: none;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px;
          box-sizing: border-box;
          border: 1px solid #d7dee9;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(248,250,252,.96), rgba(241,245,249,.9));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 4px 12px rgba(15,23,42,.035);
        }
        .planner-nav-link {
          padding: 10px 14px;
          border-radius: 10px;
          color: #3d4a5c;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
          transition: background .18s ease, color .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        .planner-nav-link:hover {
          background: #e8eef8;
          color: #2453a2;
          transform: translateY(-1px);
        }
        .planner-nav-active {
          background: linear-gradient(180deg,#dce8f9,#d5e2f5);
          color: #2453a2;
          box-shadow: 0 2px 8px rgba(30,64,175,.10), inset 0 1px 0 rgba(255,255,255,.75);
        }
        @media (max-width: 1180px) {
          .planner-navbar-inner {
            grid-template-columns: 240px minmax(0, 1fr);
            padding: 12px 28px;
          }
          .planner-navbar-inner::after { display: none; }
          .planner-navigation { width: 100%; }
          .planner-nav-link { padding: 10px 11px; }
        }
        @media (max-width: 900px) {
          .planner-navbar-inner {
            display: flex;
            min-height: auto;
            flex-wrap: wrap;
            gap: 10px;
          }
          .planner-navigation {
            order: 2;
            flex-basis: 100%;
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
          }
          .planner-navigation::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 620px) {
          .planner-navbar-inner { padding: 10px 12px; }
          .planner-brand-mark { width: 42px; height: 42px; font-size: 20px; border-radius: 10px; }
          .planner-brand-title { font-size: 17px; }
          .planner-brand-subtitle { font-size: 10px; }
          .planner-navigation { min-height: 52px; border-radius: 13px; }
          .planner-nav-link { padding: 9px 11px; font-size: 13px; }
        }


        .hero {
          margin-bottom: 35px;
          padding: 38px;
          border-radius: 22px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
          background:
            linear-gradient(
              135deg,
              #172554,
              #2563eb 55%,
              #7c3aed
            );
          box-shadow:
            0 20px 50px
            rgba(
              37,
              99,
              235,
              0.2
            );
        }

        .heroTag {
          display: inline-block;
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          opacity: 0.75;
        }

        .hero h2 {
          margin: 0;
          max-width: 680px;
          font-size: 32px;
          line-height: 1.2;
        }

        .hero p {
          margin:
            14px 0 0;
          max-width: 650px;
          color:
            rgba(
              255,
              255,
              255,
              0.82
            );
          line-height: 1.6;
        }

        .newDesignButton {
          white-space: nowrap;
          text-decoration: none;
          background: white;
          color: #1d4ed8;
          padding:
            13px 20px;
          border-radius: 10px;
          font-weight: 800;
          box-shadow:
            0 8px 25px
            rgba(
              0,
              0,
              0,
              0.15
            );
          transition:
            transform 0.2s ease;
        }

        .newDesignButton:hover {
          transform:
            translateY(-2px);
        }

        .sectionHeading {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .sectionHeading h2 {
          margin: 0;
          font-size: 25px;
        }

        .sectionHeading p {
          margin:
            7px 0 0;
          color: #64748b;
        }

        .headingActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .designCount {
          padding:
            10px 16px;
          border-radius: 999px;
          background: white;
          border:
            1px solid #e2e8f0;
          color: #64748b;
          white-space: nowrap;
        }

        .designCount strong {
          color: #2563eb;
          margin-right: 4px;
        }

        .refreshButton {
          min-height: 42px;
          padding: 0 15px;
          color: #475569;
          background: white;
          border:
            1px solid #cbd5e1;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .refreshButton:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        .refreshButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 22px;
          padding:
            14px 18px;
          color: #166534;
          background: #f0fdf4;
          border:
            1px solid #bbf7d0;
          border-radius: 12px;
          font-weight: 600;
        }

        .message span {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          color: white;
          background: #16a34a;
          font-size: 12px;
          font-weight: 900;
        }

        .errorMessage {
          color: #991b1b;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .errorMessage span {
          background: #dc2626;
        }

        .designGrid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                320px,
                1fr
              )
            );
          gap: 16px;
        }

        .designCard {
          overflow: hidden;
          background: white;
          border:
            1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow:
            0 10px 30px
            rgba(
              15,
              23,
              42,
              0.06
            );
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .designCard:hover {
          transform:
            translateY(-5px);
          box-shadow:
            0 22px 45px
            rgba(
              15,
              23,
              42,
              0.12
            );
        }

        .designPreview {
          height: 165px;
          padding: 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content:
            space-between;
          color: white;
        }

        .designPreview::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(
                0,
                0,
                0,
                0.28
              ),
              transparent
            );
          pointer-events: none;
        }

        .previewTop,
        .previewText {
          position: relative;
          z-index: 1;
        }

        .previewTop {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
        }

        .previewBadge {
          padding:
            6px 9px;
          border-radius: 7px;
          background:
            rgba(
              255,
              255,
              255,
              0.18
            );
          backdrop-filter:
            blur(10px);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .designId {
          font-size: 12px;
          font-weight: 700;
          opacity: 0.85;
        }

        .previewText {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .previewText span {
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
          opacity: 0.75;
        }

        .previewText strong {
          font-size: 23px;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .designContent {
          padding: 22px;
        }

        .designTitleRow {
          display: flex;
          justify-content:
            space-between;
          gap: 15px;
          align-items:
            flex-start;
          margin-bottom: 20px;
        }

        .designTitleRow h3 {
          margin: 0;
          font-size: 21px;
          color: #172033;
        }

        .designTitleRow p {
          margin:
            7px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .editIconButton {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border:
            1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          font-size: 17px;
          font-weight: 800;
          transition:
            all 0.2s ease;
        }

        .editIconButton:hover {
          color: white;
          background: #2563eb;
          border-color: #2563eb;
        }

        .infoGrid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .infoBox {
          min-width: 0;
          padding: 13px;
          background: #f8fafc;
          border:
            1px solid #f1f5f9;
          border-radius: 11px;
        }

        .infoLabel {
          display: block;
          margin-bottom: 7px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .infoBox strong {
          display: block;
          color: #334155;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .infoBox small {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .themeInfo {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .themeDot {
          width: 10px;
          height: 10px;
          flex-shrink: 0;
          border-radius: 50%;
        }

        .cardActions {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 9px;
        }

        .actionButton {
          min-height: 44px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition:
            all 0.2s ease;
        }

        .primaryButton {
          color: white;
          background: #2563eb;
          border:
            1px solid #2563eb;
        }

        .primaryButton:hover {
          background: #1d4ed8;
          border-color: #1d4ed8;
        }

        .secondaryButton {
          color: #334155;
          background: white;
          border:
            1px solid #cbd5e1;
        }

        .secondaryButton:hover {
          color: #1d4ed8;
          background: #eff6ff;
          border-color: #93c5fd;
        }

        .duplicateButton {
          color: #5b21b6;
          background: #f5f3ff;
          border:
            1px solid #c4b5fd;
        }

        .duplicateButton:hover:not(:disabled) {
          color: white;
          background: #7c3aed;
          border-color: #7c3aed;
        }

        .duplicateButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .deleteButton {
          width: 100%;
          min-height: 42px;
          margin-top: 10px;
          padding: 10px;
          border:
            1px solid #fecaca;
          background: #fff;
          color: #dc2626;
          border-radius: 9px;
          font-weight: 800;
          cursor: pointer;
          transition:
            all 0.2s ease;
        }

        .deleteButton:hover:not(:disabled) {
          color: white;
          background: #dc2626;
          border-color: #dc2626;
        }

        .deleteButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .stateCard,
        .emptyState {
          padding: 65px 25px;
          text-align: center;
          background: white;
          border:
            1px solid #e2e8f0;
          border-radius: 18px;
          color: #64748b;
        }

        .emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .emptyIcon {
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              #dbeafe,
              #ede9fe
            );
          color: #4f46e5;
          font-size: 30px;
        }

        .emptyState h3 {
          margin: 0;
          color: #1e293b;
          font-size: 22px;
        }

        .emptyState p {
          max-width: 380px;
          line-height: 1.6;
        }

        .createButton {
          margin-top: 12px;
          padding:
            12px 20px;
          text-decoration: none;
          color: white;
          background: #2563eb;
          border-radius: 9px;
          font-weight: 800;
        }

        .spinner {
          width: 35px;
          height: 35px;
          margin:
            0 auto 15px;
          border:
            4px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation:
            spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            rgba(
              15,
              23,
              42,
              0.55
            );
          backdrop-filter:
            blur(4px);
        }

        .modal {
          width: 100%;
          max-width: 480px;
          padding: 25px;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 25px 70px
            rgba(
              0,
              0,
              0,
              0.25
            );
        }

        .modalHeader {
          display: flex;
          justify-content:
            space-between;
          align-items:
            flex-start;
          margin-bottom: 25px;
        }

        .modalTag {
          color: #2563eb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .modalHeader h2 {
          margin:
            7px 0 0;
          font-size: 24px;
        }

        .closeButton {
          width: 36px;
          height: 36px;
          border:
            1px solid #e2e8f0;
          border-radius: 9px;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          font-size: 25px;
        }

        .closeButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .formGroup label {
          display: block;
          margin-bottom: 8px;
          color: #475569;
          font-size: 13px;
          font-weight: 800;
        }

        .formGroup input {
          width: 100%;
          padding: 13px;
          border:
            1px solid #cbd5e1;
          border-radius: 9px;
          outline: none;
          font-size: 15px;
        }

        .formGroup input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(
              37,
              99,
              235,
              0.1
            );
        }

        .modalDetails {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 12px;
          margin-top: 20px;
        }

        .modalDetails div {
          padding: 13px;
          border-radius: 10px;
          background: #f8fafc;
        }

        .modalDetails span {
          display: block;
          margin-bottom: 6px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .modalDetails strong {
          color: #334155;
          font-size: 13px;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 25px;
        }

        .cancelButton,
        .saveEditButton {
          min-height: 44px;
          padding:
            11px 17px;
          border-radius: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .cancelButton {
          color: #475569;
          background: white;
          border:
            1px solid #cbd5e1;
        }

        .saveEditButton {
          color: white;
          background: #2563eb;
          border:
            1px solid #2563eb;
        }

        .saveEditButton:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .saveEditButton:disabled,
        .cancelButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (
          max-width: 1000px
        ) {
          .header,
          .hero {
            flex-direction: column;
            align-items:
              flex-start;
          }

          .navigation {
            justify-content: flex-start;
          }
        }

        @media (
          max-width: 700px
        ) {
          .page {
            padding: 16px;
          }

          .hero {
            padding: 20px;
          }

          .hero h2 {
            font-size: 27px;
          }

          .sectionHeading {
            align-items:
              flex-start;
            flex-direction: column;
          }

          .headingActions {
            width: 100%;
            justify-content:
              space-between;
          }

          .cardActions {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 520px
        ) {
          .navigation {
            width: 100%;
            display: grid;
            grid-template-columns:
              repeat(2, 1fr);
          }

          .navigation a {
            text-align: center;
          }

          .infoGrid,
          .modalDetails {
            grid-template-columns:
              1fr;
          }

          .hero {
            padding: 24px;
          }

          .newDesignButton {
            width: 100%;
            text-align: center;
          }

          .headingActions {
            align-items:
              stretch;
            flex-direction: column;
          }

          .designCount,
          .refreshButton {
            text-align: center;
          }
        }


        /* =====================================================
           SAVED DESIGNS - COMPACT LAYOUT ENHANCEMENT
           Presentation-only changes. Existing functionality,
           API calls, edit, duplicate and delete actions remain.
        ====================================================== */

        .page {
          padding: 0 60px 64px;
          background-color: #f7f9fc;
          background-image:
            radial-gradient(circle, rgba(86, 112, 158, 0.20) 1px, transparent 1.2px);
          background-size: 24px 24px;
        }

        .hero,
        .content {
          max-width: 1500px;
        }

        .hero {
          min-height: 170px;
          margin: 34px auto 30px;
          padding: 26px 34px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          background:
            linear-gradient(105deg, #22345f 0%, #315db7 60%, #6943cf 100%);
          box-shadow: 0 18px 38px rgba(49, 81, 148, 0.18);
        }

        .heroCopy {
          min-width: 0;
          max-width: 760px;
        }

        .heroTag {
          margin-bottom: 7px;
          font-size: 10px;
          letter-spacing: 1.7px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(26px, 3vw, 38px);
          line-height: 1.1;
          letter-spacing: -0.7px;
          color: #ffffff;
        }

        .hero h2 {
          display: none;
        }

        .hero p {
          max-width: 700px;
          margin: 9px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.82);
        }

        .newDesignButton {
          flex: 0 0 auto;
          min-width: 164px;
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          border-radius: 12px;
          font-size: 15px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
        }

        .content {
          margin: 0 auto;
        }

        .sectionHeading {
          align-items: center;
          margin-bottom: 20px;
        }

        .sectionHeading h2 {
          font-size: 25px;
          margin: 0;
        }

        .sectionHeading p {
          margin-top: 6px;
          font-size: 14px;
        }

        .designGrid {
          grid-template-columns: repeat(auto-fill, minmax(300px, 350px));
          justify-content: start;
          align-items: start;
          gap: 20px;
        }

        .designCard {
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .designCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.10);
        }

        .designPreview {
          height: 118px;
          padding: 14px;
        }

        .previewBadge {
          padding: 5px 8px;
          font-size: 9px;
        }

        .designId {
          font-size: 11px;
        }

        .previewText {
          gap: 3px;
        }

        .previewText strong {
          font-size: 19px;
        }

        .designContent {
          padding: 16px;
        }

        .designTitleRow {
          margin-bottom: 14px;
          gap: 10px;
        }

        .designTitleRow h3 {
          font-size: 18px;
        }

        .designTitleRow p {
          margin-top: 5px;
          font-size: 11px;
        }

        .editIconButton {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          font-size: 15px;
        }

        .infoGrid {
          gap: 9px;
          margin-bottom: 14px;
        }

        .infoBox {
          padding: 10px;
          border-radius: 10px;
        }

        .infoLabel {
          margin-bottom: 5px;
          font-size: 9px;
        }

        .infoBox strong {
          font-size: 12px;
        }

        .infoBox small {
          font-size: 11px;
        }

        .cardActions {
          gap: 7px;
        }

        .actionButton {
          min-height: 39px;
          padding: 7px 8px;
          border-radius: 8px;
          font-size: 11px;
        }

        .deleteButton {
          min-height: 38px;
          margin-top: 8px;
          padding: 8px;
          border-radius: 8px;
          font-size: 12px;
        }

        @media (max-width: 1100px) {
          .page {
            --planner-page-gutter: 30px;
            padding-left: 30px;
            padding-right: 30px;
          }

          .hero {
            margin-top: 28px;
          }
        }

        @media (max-width: 720px) {
          .page {
            --planner-page-gutter: 18px;
            padding: 0 18px 48px;
          }

          .hero {
            min-height: auto;
            margin-top: 22px;
            margin-bottom: 24px;
            padding: 24px;
            align-items: flex-start;
            flex-direction: column;
            gap: 18px;
          }

          .hero h1 {
            font-size: 29px;
          }

          .newDesignButton {
            width: 100%;
          }

          .sectionHeading {
            align-items: flex-start;
            flex-direction: column;
          }

          .headingActions {
            width: 100%;
            justify-content: space-between;
          }

          .designGrid {
            grid-template-columns: 1fr;
          }

          .cardActions {
            grid-template-columns: 1fr;
          }
        }


        /* =====================================================
           PAGE DARK MODE
        ====================================================== */
        .page-dark {
          background-color: #131c2b;
          background-image:
            radial-gradient(
              circle,
              rgba(148, 163, 184, 0.38) 1.15px,
              transparent 1.25px
            ),
            linear-gradient(
              180deg,
              #172131 0%,
              #101827 100%
            );
          background-size: 22px 22px, 100% 100%;
          color: #e5edf8;
        }

        .page-dark .planner-navbar {
          background: rgba(22, 32, 48, .98);
          border-bottom-color: #2d4059;
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
        }
        .page-dark .planner-brand {
          color: #f1f5f9;
        }
        .page-dark .planner-brand-subtitle {
          color: #aebed2;
        }
        .page-dark .planner-navigation {
          border-color: #3b4d67;
          background: linear-gradient(
            180deg,
            rgba(39, 53, 75, .96),
            rgba(30, 42, 61, .96)
          );
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
        }
        .page-dark .planner-nav-link {
          color: #c8d4e3;
        }
        .page-dark .planner-nav-link:hover {
          background: #31445f;
          color: #ffffff;
        }
        .page-dark .planner-nav-active {
          background: linear-gradient(180deg,#3f6192,#31537f);
          color: #ffffff;
          box-shadow: 0 6px 14px rgba(0,0,0,.18);
        }
        .page-dark .planner-theme-toggle {
          border-color: #3b4d67;
          background: #202d40;
          color: #eef5ff;
          box-shadow: none;
        }
        .page-dark .planner-theme-toggle:hover {
          border-color: #5a7090;
          background: #2a3a51;
        }

        .page-dark .sectionHeading h2,
        .page-dark .sectionHeading p,
        .page-dark .designContent h3,
        .page-dark .designContent strong,
        .page-dark .emptyState h3,
        .page-dark .stateCard p {
          color: #edf3fb;
        }

        .page-dark .sectionHeading > div > p,
        .page-dark .designTitleRow p,
        .page-dark .infoBox small,
        .page-dark .emptyState p {
          color: #aebed2;
        }

        .page-dark .designCount,
        .page-dark .refreshButton,
        .page-dark .editIconButton {
          background: #202d40;
          color: #dce7f5;
          border-color: #3a4c66;
        }

        .page-dark .refreshButton:hover,
        .page-dark .editIconButton:hover {
          background: #2a3a51;
          border-color: #58708f;
        }

        .page-dark .designCard,
        .page-dark .stateCard,
        .page-dark .emptyState,
        .page-dark .modal {
          background: #202b3d;
          border-color: #3a4c66;
          box-shadow: 0 14px 34px rgba(0,0,0,.24);
        }

        .page-dark .designCard:hover {
          box-shadow: 0 22px 45px rgba(0,0,0,.34);
        }

        .page-dark .designContent {
          background: #202b3d;
        }

        .page-dark .infoBox,
        .page-dark .modalDetails > div {
          background: #192434;
          border-color: #35465f;
        }

        .page-dark .infoLabel,
        .page-dark .modalDetails span,
        .page-dark .modalTag {
          color: #8fa8c7;
        }

        .page-dark .secondaryButton,
        .page-dark .duplicateButton,
        .page-dark .cancelButton {
          background: #202d40;
          color: #dce7f5;
          border-color: #41536d;
        }

        .page-dark .secondaryButton:hover,
        .page-dark .duplicateButton:hover,
        .page-dark .cancelButton:hover {
          background: #2b3b53;
          border-color: #5b7190;
        }

        .page-dark .deleteButton {
          background: #2b2229;
          color: #fecaca;
          border-color: #6a4049;
        }

        .page-dark .message {
          background: #193d35;
          border-color: #2f685b;
          color: #d9fff5;
        }

        .page-dark .errorMessage {
          background: #42252a;
          border-color: #74434b;
          color: #fee2e2;
        }

        .page-dark .modalOverlay {
          background: rgba(3, 8, 18, .72);
        }

        .page-dark .modal input {
          background: #172131;
          color: #edf3fb;
          border-color: #3a4c66;
        }

        .page-dark .modalHeader {
          border-bottom-color: #35465f;
        }

        .page-dark .modalActions {
          border-top-color: #35465f;
        }
      `}</style>

    </main>
  );
}
