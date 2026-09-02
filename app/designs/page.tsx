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

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [editingDesign, setEditingDesign] =
    useState<SavedDesign | null>(null);

  const [editName, setEditName] =
    useState("");

  const [savingEdit, setSavingEdit] =
    useState(false);

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

  function getVenue(
    venueId: number
  ) {
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
      setMessage(
        "Please enter a design name."
      );

      return;
    }

    try {
      setSavingEdit(true);
      setMessage("");

      const response =
        await fetch(
          "/api/designs",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              id:
                editingDesign.id,

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

      setMessage(
        "Design updated successfully."
      );

      setEditingDesign(null);
      setEditName("");
    } catch (error) {
      console.error(
        "Update design error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update design."
      );
    } finally {
      setSavingEdit(false);
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
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page">

      <header className="header">
        <div className="brand">
          <div className="brandMark">
            W3D
          </div>

          <div>
            <p className="eyebrow">
              WEDDING DESIGN PLATFORM
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
            YOUR WORKSPACE
          </span>

          <h2>
            Continue creating
            beautiful wedding spaces.
          </h2>

          <p>
            Every design you save from
            the 3D Designer will appear
            here automatically.
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
              Open, edit or manage your
              saved wedding layouts.
            </p>
          </div>

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

        </div>

        {message && (
          <div className="message">
            <span>
              ✓
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
              and save it.
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

                            {new Date(
                              design.updatedAt
                            ).toLocaleDateString(
                              undefined,
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
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
                          title="Edit design"
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
                          className="openButton"
                        >
                          Open & Edit
                        </Link>

                        <button
                          className="editButton"
                          onClick={() =>
                            openEditModal(
                              design
                            )
                          }
                        >
                          Edit Details
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

        .header {
          max-width: 1400px;
          margin:
            0 auto 32px;
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 30px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
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
          max-width: 1400px;
          margin:
            0 auto 35px;
          padding: 38px;
          border-radius: 22px;
          color: white;
          display: flex;
          justify-content:
            space-between;
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
          max-width: 650px;
          font-size: 32px;
          line-height: 1.2;
        }

        .hero p {
          margin:
            14px 0 0;
          max-width: 620px;
          color:
            rgba(
              255,
              255,
              255,
              0.8
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
        }

        .content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .sectionHeading {
          display: flex;
          justify-content:
            space-between;
          align-items: center;
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

        .designCount {
          padding:
            10px 16px;
          border-radius: 999px;
          background: white;
          border:
            1px solid #e2e8f0;
          color: #64748b;
        }

        .designCount strong {
          color: #2563eb;
          margin-right: 4px;
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
        }

        .designTitleRow p {
          margin:
            7px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .editIconButton {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 9px;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
          font-size: 17px;
          font-weight: 800;
        }

        .editIconButton:hover {
          color: white;
          background: #2563eb;
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
            1.2fr 1fr;
          gap: 10px;
        }

        .openButton,
        .editButton {
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .openButton {
          color: white;
          background: #2563eb;
          border:
            1px solid #2563eb;
        }

        .openButton:hover {
          background: #1d4ed8;
        }

        .editButton {
          color: #334155;
          background: white;
          border:
            1px solid #cbd5e1;
        }

        .editButton:hover {
          background: #f8fafc;
        }

        .deleteButton {
          width: 100%;
          margin-top: 10px;
          padding: 10px;
          border:
            1px solid transparent;
          background: transparent;
          color: #dc2626;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .deleteButton:hover:not(
          :disabled
        ) {
          background: #fef2f2;
          border-color: #fecaca;
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
          border: none;
          border-radius: 9px;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
          font-size: 25px;
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

        .saveEditButton:disabled,
        .cancelButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (
          max-width: 900px
        ) {
          .header,
          .hero {
            flex-direction: column;
            align-items:
              flex-start;
          }
        }

        @media (
          max-width: 600px
        ) {
          .page {
            padding: 15px;
          }

          .hero {
            padding: 25px;
          }

          .hero h2 {
            font-size: 26px;
          }

          .navigation {
            width: 100%;
          }

          .navigation a {
            flex: 1;
            text-align: center;
          }

          .infoGrid,
          .modalDetails,
          .cardActions {
            grid-template-columns: 1fr;
          }

          .sectionHeading {
            align-items:
              flex-start;
            flex-direction: column;
          }
        }

      `}</style>

    </main>
  );
}