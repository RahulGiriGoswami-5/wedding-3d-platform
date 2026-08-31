"use client";

import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  Environment,
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

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
};

const categories = [
  "All",
  "Seating",
  "Tables",
  "Stage",
  "Lighting",
  "Flowers",
  "Decor",
];

const emptyForm = {
  name: "",
  category: "Seating",
  modelUrl: "",
  width: "",
  depth: "",
  height: "",
  quantity: "",
  availableQuantity: "",
  price: "",
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] =
    useState<InventoryItem | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [editingItem, setEditingItem] =
    useState<InventoryItem | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    try {
      setLoading(true);

      const response = await fetch("/api/inventory");

      if (!response.ok) {
        throw new Error("Failed to load inventory");
      }

      const data = await response.json();

      setItems(data);
    } catch (error) {
      console.error(
        "Inventory loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All" ||
        item.category.toLowerCase() ===
          category.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  }

  function openAddForm() {
    setEditingItem(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(item: InventoryItem) {
    setEditingItem(item);

    setForm({
      name: item.name,
      category: item.category,
      modelUrl: item.modelUrl,
      width: String(item.width),
      depth: String(item.depth),
      height: String(item.height),
      quantity: String(item.quantity),
      availableQuantity: String(
        item.availableQuantity
      ),
      price: String(item.price),
    });

    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
    setForm(emptyForm);
  }

  function updateForm(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveItem() {
    if (
      !form.name.trim() ||
      !form.category.trim() ||
      !form.modelUrl.trim() ||
      !form.width ||
      !form.depth ||
      !form.height ||
      !form.quantity ||
      !form.availableQuantity ||
      !form.price
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const width = Number(form.width);
    const depth = Number(form.depth);
    const height = Number(form.height);
    const quantity = Number(form.quantity);
    const availableQuantity = Number(
      form.availableQuantity
    );
    const price = Number(form.price);

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(depth) ||
      !Number.isFinite(height) ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(availableQuantity) ||
      !Number.isFinite(price)
    ) {
      alert("Please enter valid numbers.");
      return;
    }

    if (
      width <= 0 ||
      depth <= 0 ||
      height <= 0 ||
      quantity < 0 ||
      availableQuantity < 0 ||
      price < 0
    ) {
      alert("Please enter valid positive values.");
      return;
    }

    if (availableQuantity > quantity) {
      alert(
        "Available quantity cannot be greater than total quantity."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        modelUrl: form.modelUrl.trim(),
        imageUrl: null,

        width,
        depth,
        height,

        quantity,
        availableQuantity,

        price,
      };

      let response: Response;

      if (editingItem) {
        response = await fetch("/api/inventory", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingItem.id,
            ...payload,
          }),
        });
      } else {
        response = await fetch("/api/inventory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save item"
        );
      }

      closeForm();

      await loadInventory();

      setSelectedItem(null);
    } catch (error) {
      console.error(
        "Save inventory error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save inventory item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(item: InventoryItem) {
    const confirmed = window.confirm(
      `Delete "${item.name}" from inventory?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch("/api/inventory", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete item"
        );
      }

      setSelectedItem(null);

      await loadInventory();
    } catch (error) {
      console.error(
        "Delete inventory error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete inventory item."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fc",
        color: "#172033",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height: "72px",
          background: "white",
          borderBottom: "1px solid #e8eaf0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              color: "#7b8497",
              marginBottom: "3px",
            }}
          >
            Wedding Planner
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            Inventory
          </h1>
        </div>

        <button
          onClick={openAddForm}
          style={{
            border: "none",
            background:
              "linear-gradient(135deg, #5b5ce2, #7475ed)",
            color: "white",
            padding: "11px 18px",
            borderRadius: "10px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow:
              "0 5px 15px rgba(91, 92, 226, 0.18)",
          }}
        >
          + Add Item
        </button>
      </header>

      <div
        style={{
          display: "flex",
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        {/* SIDEBAR */}

        <aside
          style={{
            width: "230px",
            minHeight: "calc(100vh - 72px)",
            background: "white",
            borderRight: "1px solid #e8eaf0",
            padding: "28px 18px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#8b93a5",
              letterSpacing: "0.08em",
              marginBottom: "14px",
              paddingLeft: "10px",
            }}
          >
            CATEGORIES
          </div>

          {categories.map((item) => {
            const active = category === item;

            return (
              <button
                key={item}
                onClick={() => setCategory(item)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: active
                    ? "#eef0ff"
                    : "transparent",
                  color: active
                    ? "#5556d9"
                    : "#5d6678",
                  padding: "11px 12px",
                  borderRadius: "9px",
                  marginBottom: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: active ? 650 : 500,
                }}
              >
                {item}
              </button>
            );
          })}
        </aside>

        {/* MAIN */}

        <section
          style={{
            flex: 1,
            padding: "30px",
            minWidth: 0,
          }}
        >
          {/* TITLE + SEARCH */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "20px",
              marginBottom: "25px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: 750,
                  letterSpacing: "-0.02em",
                }}
              >
                Furniture & Decor
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  color: "#7a8395",
                  fontSize: "14px",
                }}
              >
                Manage the items available for your
                wedding designs.
              </p>
            </div>

            <div
              style={{
                position: "relative",
                width: "280px",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "13px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8b93a5",
                }}
              >
                🔍
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search inventory..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px 12px 38px",
                  border: "1px solid #e0e3eb",
                  borderRadius: "10px",
                  outline: "none",
                  background: "white",
                  fontSize: "14px",
                  color: "#172033",
                }}
              />
            </div>
          </div>

          {!loading && (
            <div
              style={{
                fontSize: "13px",
                color: "#8a92a3",
                marginBottom: "15px",
              }}
            >
              {filteredItems.length}{" "}
              {filteredItems.length === 1
                ? "item"
                : "items"}
            </div>
          )}

          {/* LOADING */}

          {loading && (
            <div
              style={{
                background: "white",
                border: "1px solid #e8eaf0",
                borderRadius: "14px",
                padding: "50px",
                textAlign: "center",
                color: "#7b8497",
              }}
            >
              Loading inventory...
            </div>
          )}

          {/* EMPTY */}

          {!loading &&
            filteredItems.length === 0 && (
              <div
                style={{
                  background: "white",
                  border: "1px solid #e8eaf0",
                  borderRadius: "14px",
                  padding: "60px 30px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "42px",
                    marginBottom: "12px",
                  }}
                >
                  🪑
                </div>

                <h3
                  style={{
                    margin: "0 0 7px",
                    fontSize: "18px",
                  }}
                >
                  No inventory items
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#858da0",
                    fontSize: "14px",
                  }}
                >
                  No items match your search or
                  category.
                </p>
              </div>
            )}

          {/* CARDS */}

          {!loading &&
            filteredItems.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "18px",
                }}
              >
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setSelectedItem(item)
                    }
                    style={{
                      padding: 0,
                      border: "1px solid #e3e6ee",
                      background: "white",
                      borderRadius: "14px",
                      overflow: "hidden",
                      textAlign: "left",
                      cursor: "pointer",
                      boxShadow:
                        "0 4px 14px rgba(30, 38, 60, 0.05)",
                    }}
                  >
                    {/* 3D PREVIEW */}

                    <div
                      style={{
                        height: "210px",
                        background:
                          "linear-gradient(145deg, #eef0f6, #fafbfe)",
                        position: "relative",
                      }}
                    >
                      <ModelPreview
                        modelUrl={item.modelUrl}
                      />

                      <div
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          background:
                            "rgba(255,255,255,0.9)",
                          borderRadius: "7px",
                          padding: "5px 8px",
                          fontSize: "10px",
                          color: "#697286",
                          fontWeight: 600,
                        }}
                      >
                        3D
                      </div>
                    </div>

                    {/* DETAILS */}

                    <div
                      style={{
                        padding: "16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#6668d9",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "6px",
                        }}
                      >
                        {item.category}
                      </div>

                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#20283a",
                          marginBottom: "10px",
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#7d8596",
                          marginBottom: "12px",
                        }}
                      >
                        {item.width.toFixed(2)} ×{" "}
                        {item.depth.toFixed(2)} ×{" "}
                        {item.height.toFixed(2)} m
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color:
                              item.availableQuantity >
                              0
                                ? "#43835e"
                                : "#c05a5a",
                            fontWeight: 600,
                          }}
                        >
                          {item.availableQuantity}{" "}
                          available
                        </span>

                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "#242b3b",
                          }}
                        >
                          {formatPrice(item.price)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </section>
      </div>

      {/* DETAILS PANEL */}

      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 25, 40, 0.28)",
            zIndex: 50,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "410px",
              maxWidth: "90vw",
              height: "100%",
              background: "white",
              boxShadow:
                "-10px 0 30px rgba(20, 25, 40, 0.12)",
              padding: "30px",
              boxSizing: "border-box",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                }}
              >
                Item Details
              </h3>

              <button
                onClick={() =>
                  setSelectedItem(null)
                }
                style={{
                  border: "none",
                  background: "#f1f2f6",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            {/* LARGE PREVIEW */}

            <div
              style={{
                height: "250px",
                background:
                  "linear-gradient(145deg, #eef0f6, #fafbfe)",
                borderRadius: "14px",
                overflow: "hidden",
                marginBottom: "22px",
              }}
            >
              <ModelPreview
                modelUrl={selectedItem.modelUrl}
              />
            </div>

            <div
              style={{
                color: "#6668d9",
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: "6px",
              }}
            >
              {selectedItem.category}
            </div>

            <h2
              style={{
                margin: "0 0 25px",
                fontSize: "25px",
              }}
            >
              {selectedItem.name}
            </h2>

            {/* DIMENSIONS */}

            <div
              style={{
                borderTop:
                  "1px solid #e9ebf0",
                paddingTop: "20px",
                marginBottom: "24px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 14px",
                  fontSize: "14px",
                }}
              >
                Dimensions
              </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "8px",
                }}
              >
                <InfoBox
                  label="Width"
                  value={`${selectedItem.width.toFixed(
                    2
                  )} m`}
                />

                <InfoBox
                  label="Depth"
                  value={`${selectedItem.depth.toFixed(
                    2
                  )} m`}
                />

                <InfoBox
                  label="Height"
                  value={`${selectedItem.height.toFixed(
                    2
                  )} m`}
                />
              </div>
            </div>

            {/* INVENTORY */}

            <div
              style={{
                borderTop:
                  "1px solid #e9ebf0",
                paddingTop: "20px",
                marginBottom: "24px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 14px",
                  fontSize: "14px",
                }}
              >
                Inventory
              </h4>

              <DetailRow
                label="Total quantity"
                value={String(
                  selectedItem.quantity
                )}
              />

              <DetailRow
                label="Available"
                value={String(
                  selectedItem.availableQuantity
                )}
              />
            </div>

            {/* PRICE */}

            <div
              style={{
                borderTop:
                  "1px solid #e9ebf0",
                paddingTop: "20px",
                marginBottom: "25px",
              }}
            >
              <div
                style={{
                  color: "#7b8497",
                  fontSize: "13px",
                  marginBottom: "5px",
                }}
              >
                Price per unit
              </div>

              <div
                style={{
                  fontSize: "25px",
                  fontWeight: 750,
                }}
              >
                {formatPrice(
                  selectedItem.price
                )}
              </div>
            </div>

            {/* EDIT / DELETE */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <button
                onClick={() =>
                  openEditForm(selectedItem)
                }
                style={{
                  border:
                    "1px solid #dfe2eb",
                  background: "white",
                  color: "#4f5668",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                Edit Item
              </button>

              <button
                onClick={() =>
                  deleteItem(selectedItem)
                }
                disabled={deleting}
                style={{
                  border:
                    "1px solid #f0cccc",
                  background: "#fff7f7",
                  color: "#c05a5a",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: 650,
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>

            <button
              style={{
                width: "100%",
                border: "none",
                background:
                  "linear-gradient(135deg, #5b5ce2, #7475ed)",
                color: "white",
                padding: "14px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Add to Design
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}

      {showForm && (
        <div
          onClick={closeForm}
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(20, 25, 40, 0.35)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "520px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              padding: "28px",
              boxSizing: "border-box",
              boxShadow:
                "0 20px 60px rgba(20, 25, 40, 0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6668d9",
                    fontWeight: 700,
                    textTransform:
                      "uppercase",
                    marginBottom: "5px",
                  }}
                >
                  Inventory
                </div>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                  }}
                >
                  {editingItem
                    ? "Edit Item"
                    : "Add New Item"}
                </h2>
              </div>

              <button
                onClick={closeForm}
                style={{
                  border: "none",
                  background: "#f1f2f6",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            <FormField
              label="Item Name"
              value={form.name}
              placeholder="e.g. Sheen Chair"
              onChange={(value) =>
                updateForm(
                  "name",
                  value
                )
              }
            />

            <label
              style={{
                display: "block",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 650,
                  marginBottom: "7px",
                  color: "#4d5567",
                }}
              >
                Category
              </span>

              <select
                value={form.category}
                onChange={(e) =>
                  updateForm(
                    "category",
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                {categories
                  .filter(
                    (item) => item !== "All"
                  )
                  .map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
              </select>
            </label>

            <FormField
              label="GLB Model Path"
              value={form.modelUrl}
              placeholder="/models/Stage.glb"
              onChange={(value) =>
                updateForm(
                  "modelUrl",
                  value
                )
              }
            />

            <div
              style={{
                background: "#f7f8fc",
                borderRadius: "9px",
                padding: "10px 12px",
                marginBottom: "18px",
                fontSize: "11px",
                color: "#7c8495",
              }}
            >
              Example:
              {" "}
              /models/Stage.glb
              <br />
              The file must exist inside
              {" "}
              public/models/
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: 650,
                color: "#4d5567",
                marginBottom: "8px",
              }}
            >
              Real-world dimensions
              (metres)
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "18px",
              }}
            >
              <SmallField
                label="Width"
                value={form.width}
                onChange={(value) =>
                  updateForm(
                    "width",
                    value
                  )
                }
              />

              <SmallField
                label="Depth"
                value={form.depth}
                onChange={(value) =>
                  updateForm(
                    "depth",
                    value
                  )
                }
              />

              <SmallField
                label="Height"
                value={form.height}
                onChange={(value) =>
                  updateForm(
                    "height",
                    value
                  )
                }
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <SmallField
                label="Total Quantity"
                value={form.quantity}
                onChange={(value) =>
                  updateForm(
                    "quantity",
                    value
                  )
                }
              />

              <SmallField
                label="Available Quantity"
                value={
                  form.availableQuantity
                }
                onChange={(value) =>
                  updateForm(
                    "availableQuantity",
                    value
                  )
                }
              />
            </div>

            <FormField
              label="Price per unit (₹)"
              value={form.price}
              placeholder="450"
              onChange={(value) =>
                updateForm(
                  "price",
                  value
                )
              }
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "10px",
                marginTop: "25px",
              }}
            >
              <button
                onClick={closeForm}
                style={{
                  border:
                    "1px solid #dfe2eb",
                  background: "white",
                  color: "#555d70",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={saveItem}
                disabled={saving}
                style={{
                  border: "none",
                  background:
                    "linear-gradient(135deg, #5b5ce2, #7475ed)",
                  color: "white",
                  padding: "13px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : editingItem
                  ? "Save Changes"
                  : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


/* =========================================================
   SAFE 3D MODEL PREVIEW
   ========================================================= */

function ModelPreview({
  modelUrl,
}: {
  modelUrl: string;
}) {
  const [status, setStatus] = useState<
    "checking" | "ready" | "error"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    async function checkModel() {
      if (!modelUrl || !modelUrl.trim()) {
        setStatus("error");
        return;
      }

      try {
        const response = await fetch(
          modelUrl,
          {
            method: "HEAD",
            cache: "no-store",
          }
        );

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setStatus("error");
          return;
        }

        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    checkModel();

    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  if (status === "checking") {
    return (
      <ModelPlaceholder text="Loading model..." />
    );
  }

  if (status === "error") {
    return (
      <ModelPlaceholder
        text="Model unavailable"
        subtext="Check the GLB file path"
      />
    );
  }

  return (
    <ModelErrorBoundary>
      <Canvas
        camera={{
          position: [3, 2.5, 4],
          fov: 40,
        }}
        gl={{
          antialias: true,
          alpha: true,
        }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={1.5} />

        <directionalLight
          position={[4, 6, 4]}
          intensity={2}
        />

        <directionalLight
          position={[-4, 3, -2]}
          intensity={0.7}
        />

        <Suspense
          fallback={
            <ModelLoadingInsideCanvas />
          }
        >
          <Bounds
            fit
            clip
            observe
            margin={1.2}
          >
            <InventoryModel
              modelUrl={modelUrl}
            />
          </Bounds>

          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </ModelErrorBoundary>
  );
}


/* =========================================================
   MODEL ERROR BOUNDARY
   ========================================================= */

class ModelErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
  },
  {
    hasError: boolean;
  }
> {
  constructor(props: {
    children: React.ReactNode;
  }) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: unknown) {
    console.error(
      "3D model error:",
      error
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <ModelPlaceholder
          text="Model unavailable"
          subtext="The GLB could not be loaded"
        />
      );
    }

    return this.props.children;
  }
}


/* =========================================================
   MODEL LOADING
   ========================================================= */

function ModelLoadingInsideCanvas() {
  return null;
}


/* =========================================================
   MODEL PLACEHOLDER
   ========================================================= */

function ModelPlaceholder({
  text,
  subtext,
}: {
  text: string;
  subtext?: string;
}) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "7px",
        color: "#7d8596",
        textAlign: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "30px",
          opacity: 0.6,
        }}
      >
        ◇
      </div>

      <div
        style={{
          fontSize: "13px",
          fontWeight: 650,
        }}
      >
        {text}
      </div>

      {subtext && (
        <div
          style={{
            fontSize: "11px",
            color: "#9aa1af",
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   GLB MODEL
   ========================================================= */

function InventoryModel({
  modelUrl,
}: {
  modelUrl: string;
}) {
  const { scene } = useGLTF(modelUrl);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;

        if (
          object.material instanceof
            THREE.MeshStandardMaterial ||
          object.material instanceof
            THREE.MeshPhysicalMaterial
        ) {
          object.material.roughness = 0.7;
          object.material.metalness = 0.05;
        }
      }
    });

    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      rotation={[0, 0.5, 0]}
    />
  );
}


/* =========================================================
   FORM COMPONENTS
   ========================================================= */

function FormField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "16px",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 650,
          marginBottom: "7px",
          color: "#4d5567",
        }}
      >
        {label}
      </span>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={inputStyle}
      />
    </label>
  );
}


function SmallField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span
        style={{
          display: "block",
          fontSize: "11px",
          color: "#81899a",
          marginBottom: "6px",
        }}
      >
        {label}
      </span>

      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={inputStyle}
      />
    </label>
  );
}


function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "10px",
        fontSize: "14px",
      }}
    >
      <span style={{ color: "#7b8497" }}>
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}


function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f7f8fc",
        borderRadius: "9px",
        padding: "11px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "#8991a2",
          marginBottom: "4px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "13px",
          fontWeight: 650,
        }}
      >
        {value}
      </div>
    </div>
  );
}


const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #dfe2eb",
  borderRadius: "9px",
  outline: "none",
  background: "white",
  fontSize: "14px",
  color: "#172033",
};