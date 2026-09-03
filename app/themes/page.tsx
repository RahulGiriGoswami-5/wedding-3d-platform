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
      <header className="header">
        <div>
          <p className="eyebrow">
            WEDDING 3D PLATFORM
          </p>

          <h1>Theme Management</h1>

          <p className="subtitle">
            Create and manage visual styles for
            your wedding designs.
          </p>
        </div>

        <nav className="navigation">
          <Link href="/">Designer</Link>
          <Link href="/venues">Venues</Link>
          <Link href="/inventory">Inventory</Link>
          <Link className="activeNav" href="/themes">Themes</Link>
        </nav>
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
          grid-template-columns: 380px 1fr;
          gap: 28px;
          align-items: start;
        }

        .formCard,
        .themesSection {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
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
          min-height: 90px;
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
            minmax(260px, 1fr)
          );
          gap: 20px;
        }

        .themeCard {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }

        .colorPreview {
          height: 90px;
        }

        .themeContent {
          padding: 18px;
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
            padding: 18px;
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
