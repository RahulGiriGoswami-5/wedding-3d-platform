"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Theme = {
  id: number;
  name: string;
  description: string | null;
  primaryColor: string;
  secondaryColor: string;
  decorationStyle: string;
};

const emptyForm = {
  name: "",
  description: "",
  primaryColor: "#d4af37",
  secondaryColor: "#ffffff",
  decorationStyle: "",
};


type ApiErrorData = {
  error?: unknown;
  message?: unknown;
};

async function readApiData(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getApiError(
  data: unknown,
  fallback: string
): string {
  if (data && typeof data === "object") {
    const apiData = data as ApiErrorData;

    if (typeof apiData.error === "string" && apiData.error.trim()) {
      return apiData.error;
    }

    if (typeof apiData.message === "string" && apiData.message.trim()) {
      return apiData.message;
    }
  }

  return fallback;
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] =
    useState<number | null>(null);

  async function loadThemes() {
    try {
      setLoading(true);

      const response = await fetch("/api/themes", {
        cache: "no-store",
      });

      const data = await readApiData(response);

      if (!response.ok) {
        throw new Error(
          getApiError(data, "Failed to load themes")
        );
      }

      setThemes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("Could not load themes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThemes();
  }, []);

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/themes", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId
            ? { id: editingId, ...form }
            : form
        ),
      });

      const data = await readApiData(response);

      if (!response.ok) {
        throw new Error(
          getApiError(data, "Failed to save theme")
        );
      }

      setMessage(
        editingId
          ? "Theme updated successfully!"
          : "Theme created successfully!"
      );

      setForm(emptyForm);
      setEditingId(null);

      await loadThemes();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save theme."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(theme: Theme) {
    setEditingId(theme.id);

    setForm({
      name: theme.name,
      description: theme.description || "",
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      decorationStyle: theme.decorationStyle,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function deleteTheme(id: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this theme?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/themes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await readApiData(response);

      if (!response.ok) {
        throw new Error(
          getApiError(data, "Failed to delete theme")
        );
      }

      setMessage("Theme deleted successfully.");

      await loadThemes();
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete theme."
      );
    }
  }

  return (
    <main className="page">

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
            <Link href="/themes" className="planner-nav-link planner-nav-active">Themes</Link>
            <Link href="/designs" className="planner-nav-link">Saved Designs</Link>
          </nav>
        </div>
      </header>

      

      <header className="page-heading">
        <div>
          <p className="eyebrow">STYLE LIBRARY</p>
          <h1>Wedding Themes</h1>
          <p className="subtitle">
            Create and manage visual styles for your wedding designs.
          </p>
        </div>
      </header>

<section className="content">
        <div className="formCard">
          <h2>
            {editingId
              ? "Edit Theme"
              : "Create New Theme"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Theme Name *</label>

              <input
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value
                  )
                }
                placeholder="Example: Royal Wedding"
                required
              />
            </div>

            <div className="field">
              <label>Description</label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Describe this theme..."
              />
            </div>

            <div className="colorRow">
              <div className="field">
                <label>Primary Color *</label>

                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(event) =>
                    updateField(
                      "primaryColor",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Secondary Color *</label>

                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(event) =>
                    updateField(
                      "secondaryColor",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Decoration Style *</label>

              <select
                value={form.decorationStyle}
                onChange={(event) =>
                  updateField(
                    "decorationStyle",
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select a style
                </option>

                <option value="Classic">
                  Classic
                </option>

                <option value="Royal">
                  Royal
                </option>

                <option value="Modern">
                  Modern
                </option>

                <option value="Garden">
                  Garden
                </option>

                <option value="Minimal">
                  Minimal
                </option>
              </select>
            </div>

            <div className="buttons">
              <button
                className="primaryButton"
                disabled={saving}
                type="submit"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Theme"
                  : "Create Theme"}
              </button>

              {editingId && (
                <button
                  className="secondaryButton"
                  type="button"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>

            {message && (
              <p className="message">
                {message}
              </p>
            )}
          </form>
        </div>

        <div className="themesSection">
          <div className="sectionHeading">
            <h2>Your Themes</h2>

            <span>
              {themes.length} theme
              {themes.length === 1 ? "" : "s"}
            </span>
          </div>

          {loading ? (
            <div className="emptyState">
              Loading themes...
            </div>
          ) : themes.length === 0 ? (
            <div className="emptyState">
              No themes created yet. Create
              your first wedding theme above.
            </div>
          ) : (
            <div className="themeGrid">
              {themes.map((theme) => (
                <article
                  className="themeCard"
                  key={theme.id}
                >
                  <div
                    className="colorPreview"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                    }}
                  />

                  <div className="themeContent">
                    <h3>{theme.name}</h3>

                    <span className="styleTag">
                      {theme.decorationStyle}
                    </span>

                    {theme.description && (
                      <p>
                        {theme.description}
                      </p>
                    )}

                    <div className="colorInfo">
                      <span>
                        <i
                          style={{
                            backgroundColor:
                              theme.primaryColor,
                          }}
                        />
                        Primary
                      </span>

                      <span>
                        <i
                          style={{
                            backgroundColor:
                              theme.secondaryColor,
                          }}
                        />
                        Secondary
                      </span>
                    </div>

                    <div className="cardButtons">
                      <button
                        onClick={() =>
                          startEdit(theme)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="deleteButton"
                        onClick={() =>
                          deleteTheme(theme.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        /* Shared Wedding Planner navigation - enhanced */
        .planner-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          background: rgba(255,255,255,.97);
          border-bottom: 1px solid #dbe3ef;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 24px rgba(15,23,42,.06);
        }
        .planner-navbar-inner {
          width: min(1680px, 100%);
          min-height: 92px;
          margin: 0 auto;
          padding: 10px 26px;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr) 260px;
          align-items: center;
          gap: 18px;
          box-sizing: border-box;
        }
        .planner-navbar-inner::after {
          content: "";
          min-width: 0;
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
          width: min(100%, 980px);
          margin: 0 auto;
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
            padding: 12px 18px;
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

        .page {
          min-height: 100vh;
          color: #1e293b;
          background-color: #f8fafc;
          background-image: radial-gradient(circle at 1px 1px, rgba(100, 116, 139, 0.18) 1px, transparent 1.2px);
          background-size: 20px 20px;
          padding: 0 0 32px;
        }


        .wp-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e2e8f0;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
        }

        .wp-nav-inner {
          max-width: 1500px;
          min-height: 62px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .wp-brand {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #173b6d;
          font-size: 15px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .wp-brand-mark {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #2563eb;
          color: #fff;
          font-size: 14px;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }

        .wp-nav-links {
          display: flex;
          align-items: center;
          gap: 5px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: none;
        }

        .wp-nav-links::-webkit-scrollbar {
          display: none;
        }

        .wp-nav-link {
          flex: 0 0 auto;
          padding: 8px 11px;
          border-radius: 8px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: background .2s ease, color .2s ease;
        }

        .wp-nav-link:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .wp-nav-link.wp-active {
          background: #eaf2ff;
          color: #2563eb;
        }

        @media (max-width: 900px) {
          .wp-nav-inner {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
            padding-top: 9px;
            padding-bottom: 8px;
          }

          .wp-nav-links {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .wp-nav-inner {
            padding-left: 14px;
            padding-right: 14px;
          }

          .wp-brand {
            font-size: 14px;
          }
        }

        .page-heading {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px 24px 18px;
        }

        .page-heading h1 {
          margin: 0;
          font-size: 27px;
          letter-spacing: -0.02em;
          color: #173b6d;
        }

        .page-heading .subtitle {
          margin: 7px 0 0;
          font-size: 13px;
          color: #64748b;
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
          font-size: 27px;
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
          border-radius: 8px;
          color: #334155;
          padding: 10px 16px;
          text-decoration: none;
          font-weight: 600;
        }

        .navigation a:hover,
        .navigation .activeNav {
          border-color: #2563eb;
          color: #2563eb;
          background: #eff6ff;
        }

        .content {
          max-width: 1400px;
          margin: auto;
          display: grid;
          grid-template-columns: minmax(300px, 340px) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .formCard,
        .themesSection {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 30px
            rgba(15, 23, 42, 0.05);
        }

        h2 {
          margin-top: 0;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        label {
          font-size: 14px;
          font-weight: 700;
        }

        input,
        textarea,
        select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 11px;
          font: inherit;
        }

        textarea {
          min-height: 72px;
          resize: vertical;
        }

        input[type="color"] {
          height: 48px;
          padding: 4px;
          cursor: pointer;
        }

        .colorRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .buttons {
          display: flex;
          gap: 10px;
        }

        button {
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .primaryButton {
          background: #2563eb;
          color: white;
        }

        .secondaryButton {
          background: #e2e8f0;
          color: #334155;
        }

        .message {
          margin: 16px 0 0;
          color: #475569;
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
          font-size: 14px;
        }

        .themeGrid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(220px, 1fr)
          );
          gap: 16px;
        }

        .themeCard {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }

        .colorPreview {
          height: 72px;
        }

        .themeContent {
          padding: 14px;
        }

        .themeContent h3 {
          margin: 0 0 10px;
        }

        .themeContent p {
          color: #64748b;
          line-height: 1.5;
          min-height: 42px;
        }

        .styleTag {
          display: inline-block;
          background: #eff6ff;
          color: #2563eb;
          padding: 5px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        .colorInfo {
          display: flex;
          gap: 16px;
          margin: 16px 0;
          color: #475569;
          font-size: 13px;
        }

        .colorInfo span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .colorInfo i {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid #cbd5e1;
        }

        .cardButtons {
          display: flex;
          gap: 10px;
        }

        .cardButtons button {
          background: #eff6ff;
          color: #2563eb;
          flex: 1;
        }

        .cardButtons .deleteButton {
          background: #fef2f2;
          color: #dc2626;
        }

        .emptyState {
          padding: 50px 20px;
          text-align: center;
          color: #64748b;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
        }

        @media (max-width: 900px) {
          .header,
          .content {
            grid-template-columns: 1fr;
            display: grid;
          }

          .header {
            justify-content: initial;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 14px;
          }

          .colorRow {
            grid-template-columns: 1fr;
          }

          .navigation {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
