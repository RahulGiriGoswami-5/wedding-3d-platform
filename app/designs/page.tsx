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
    <main className="page">

      <header className="header">
        <div className="brand">
          <div className="brandMark">
            W
          </div>

          <div>
            <p className="eyebrow">
              WEDDING PLANNER
            </p>

            <h1>
              Saved Designs
            </h1>
          </div>
        </div>

        <nav className="navigation">
          <Link href="/">
            Designer
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

          <Link
            href="/designs"
            className="activeNav"
          >
            Saved Designs
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <span className="heroTag">
            DESIGN LIBRARY
          </span>

          <h2>
            Your wedding designs,
            ready whenever you are.
          </h2>

          <p>
            Reopen a saved layout, update
            its details, create an
            independent copy, or continue
            designing in the 3D workspace.
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

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 28px;
          background:
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #eef2f7 100%
            );
          color: #172033;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .header,
        .hero,
        .content {
          max-width: 1400px;
          margin-left: auto;
          margin-right: auto;
        }

        .header {
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }

        .brandMark {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          color: white;
          font-weight: 900;
          font-size: 22px;
          background:
            linear-gradient(
              135deg,
              #2563eb,
              #7c3aed
            );
          box-shadow:
            0 10px 25px
            rgba(
              37,
              99,
              235,
              0.25
            );
        }

        .eyebrow {
          margin: 0 0 3px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #64748b;
        }

        h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: -0.7px;
        }

        .navigation {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .navigation a {
          text-decoration: none;
          color: #475569;
          background: white;
          border:
            1px solid #e2e8f0;
          padding:
            10px 14px;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 700;
          transition:
            all 0.2s ease;
        }

        .navigation a:hover,
        .navigation .activeNav {
          color: white;
          background: #2563eb;
          border-color: #2563eb;
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
          gap: 24px;
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
            padding: 28px;
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

      `}</style>

    </main>
  );
}
