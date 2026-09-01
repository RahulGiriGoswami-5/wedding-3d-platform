"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Grid,
} from "@react-three/drei";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

type Venue = {
  id: number;
  name: string;
  location: string;
  capacity: number;
  type: string;
  price: number;
  availability: boolean;
  modelUrl: string | null;
  layoutData: string | null;
};

type ElementType =
  | "chair"
  | "table"
  | "sofa"
  | "stage"
  | "flowers"
  | "lamp";

type FurnitureItem = {
  id: number;
  type: ElementType;
  position: [number, number, number];
  rotation: number;
};

type SavedScene = {
  items: FurnitureItem[];
};

/*
 * 1 Three.js unit = 1 meter.
 *
 * These are practical approximate dimensions
 * for a wedding/event planning environment.
 */
const REAL_DIMENSIONS: Record<
  ElementType,
  [number, number, number]
> = {
  chair: [0.5, 0.5, 0.9],
  table: [1.5, 1.5, 0.75],
  sofa: [2.0, 0.85, 0.85],
  stage: [4.0, 3.0, 0.3],
  flowers: [0.4, 0.4, 0.6],
  lamp: [0.4, 0.4, 1.2],
};

const MODEL_PATHS: Record<ElementType, string> = {
  chair: "/models/SheenChair.glb",
  table: "/models/RoundTable.glb",
  sofa: "/models/Sofa.glb",
  stage: "/models/Stage.glb",
  flowers: "/models/Flowers.glb",
  lamp: "/models/Lamp.glb",
};

const ELEMENT_NAMES: Record<ElementType, string> = {
  chair: "Chair",
  table: "Table",
  sofa: "Sofa",
  stage: "Stage",
  flowers: "Flowers",
  lamp: "Lamp",
};

const ELEMENT_ICONS: Record<ElementType, string> = {
  chair: "🪑",
  table: "🟤",
  sofa: "🛋️",
  stage: "🎭",
  flowers: "💐",
  lamp: "💡",
};

function getModelScale(
  scene: THREE.Object3D,
  type: ElementType
) {
  const clone = scene.clone(true);

  const box = new THREE.Box3().setFromObject(clone);

  const size = new THREE.Vector3();

  box.getSize(size);

  const target = REAL_DIMENSIONS[type];

  const xScale =
    size.x > 0 ? target[0] / size.x : 1;

  const yScale =
    size.y > 0 ? target[1] / size.y : 1;

  const zScale =
    size.z > 0 ? target[2] / size.z : 1;

  return Math.min(
    xScale,
    yScale,
    zScale
  );
}

function Furniture({
  item,
  selected,
  onSelect,
  onMove,
  onFinishMove,
}: {
  item: FurnitureItem;
  selected: boolean;
  onSelect: () => void;
  onMove: (
    position: [number, number, number]
  ) => void;
  onFinishMove: () => void;
}) {
  const { scene } = useGLTF(
    MODEL_PATHS[item.type]
  );

  const { camera, raycaster } = useThree();

  const pointerDown = useRef(false);

  const scale = useMemo(
    () =>
      getModelScale(
        scene,
        item.type
      ),
    [scene, item.type]
  );

  const handlePointerDown = (
    e: ThreeEvent<PointerEvent>
  ) => {
    e.stopPropagation();

    pointerDown.current = true;

    onSelect();

    e.target.setPointerCapture(
      e.pointerId
    );
  };

  const handlePointerMove = (
    e: ThreeEvent<PointerEvent>
  ) => {
    if (!pointerDown.current) return;

    e.stopPropagation();

    /*
     * Raycast the mouse onto the
     * horizontal floor plane.
     */
    const plane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      0
    );

    const point =
      new THREE.Vector3();

    raycaster.setFromCamera(
      e.pointer,
      camera
    );

    raycaster.ray.intersectPlane(
      plane,
      point
    );

    if (point) {
      onMove([
        THREE.MathUtils.clamp(
          point.x,
          -5.5,
          5.5
        ),
        0,
        THREE.MathUtils.clamp(
          point.z,
          -5.5,
          5.5
        ),
      ]);
    }
  };

  const handlePointerUp = (
    e: ThreeEvent<PointerEvent>
  ) => {
    pointerDown.current = false;

    try {
      e.target.releasePointerCapture(
        e.pointerId
      );
    } catch {}

    onFinishMove();
  };

  return (
    <group
      position={item.position}
      rotation={[0, item.rotation, 0]}
    >
      <primitive
        object={scene.clone(true)}
        scale={scale}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
      />

      {selected && (
        <mesh
          position={[
            0,
            0.02,
            0,
          ]}
          rotation={[
            -Math.PI / 2,
            0,
            0,
        ]}
      >
        <ringGeometry
          args={[0.45, 0.5, 32]}
        />
        <meshBasicMaterial
          color="#7c3aed"
          transparent
          opacity={0.75}
        />
      </mesh>
      )}
    </group>
  );
}

function VenueModel({
  modelUrl,
}: {
  modelUrl: string;
}) {
  const { scene } = useGLTF(modelUrl);

  return (
    <primitive
      object={scene.clone(true)}
      position={[0, 0, 0]}
    />
  );
}

function Floor({
  onClearSelection,
}: {
  onClearSelection: () => void;
}) {
  return (
    <>
      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        onPointerDown={
          onClearSelection
        }
      >
        <planeGeometry
          args={[12, 12]}
        />

        <meshStandardMaterial
          color="#f3f4f6"
        />
      </mesh>

      <Grid
        args={[12, 12]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#d1d5db"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={20}
        fadeStrength={1}
        infiniteGrid={false}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

function EditorScene({
  venue,
  items,
  selectedId,
  setSelectedId,
  updateItemPosition,
  finishMove,
}: {
  venue: Venue | null;
  items: FurnitureItem[];
  selectedId: number | null;
  setSelectedId: (
    id: number | null
  ) => void;
  updateItemPosition: (
    id: number,
    position: [number, number, number]
  ) => void;
  finishMove: () => void;
}) {
  return (
    <>
      <Floor
        onClearSelection={() =>
          setSelectedId(null)
        }
      />

      {venue?.modelUrl && (
        <VenueModel
          modelUrl={venue.modelUrl}
        />
      )}

      {items.map((item) => (
        <Furniture
          key={item.id}
          item={item}
          selected={
            selectedId === item.id
          }
          onSelect={() =>
            setSelectedId(item.id)
          }
          onMove={(position) =>
            updateItemPosition(
              item.id,
              position
            )
          }
          onFinishMove={finishMove}
        />
      ))}

      <ambientLight intensity={1.2} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={2}
        castShadow
      />

      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.5}
      />

      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={18}
        maxPolarAngle={
          Math.PI / 2.05
        }
      />
    </>
  );
}

function Toolbar({
  venue,
  items,
  selectedId,
  addItem,
  deleteSelected,
  saveScene,
  saving,
}: {
  venue: Venue | null;
  items: FurnitureItem[];
  selectedId: number | null;
  addItem: (
    type: ElementType
  ) => void;
  deleteSelected: () => void;
  saveScene: () => void;
  saving: boolean;
}) {
  const selected = items.find(
    (item) =>
      item.id === selectedId
  );

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "310px",
        height: "100vh",
        background: "#ffffff",
        borderLeft:
          "1px solid #e5e7eb",
        boxShadow:
          "-5px 0 20px rgba(0,0,0,0.08)",
        zIndex: 20,
        padding: "22px",
        boxSizing: "border-box",
        overflowY: "auto",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#7c3aed",
            fontWeight: 700,
            letterSpacing: "1px",
            marginBottom: "6px",
          }}
        >
          3D VENUE PLANNER
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "23px",
            color: "#171717",
          }}
        >
          {venue
            ? venue.name
            : "Wedding Editor"}
        </h1>

        {venue && (
          <p
            style={{
              margin:
                "6px 0 0",
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            📍 {venue.location}
          </p>
        )}
      </div>

      <section>
        <h3 style={sectionTitle}>
          Add Elements
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "8px",
          }}
        >
          {(
            Object.keys(
              ELEMENT_NAMES
            ) as ElementType[]
          ).map((type) => (
            <button
              key={type}
              onClick={() =>
                addItem(type)
              }
              style={{
                padding: "12px 6px",
                border:
                  "1px solid #e5e7eb",
                background: "#fafafa",
                borderRadius: "9px",
                cursor: "pointer",
                color: "#171717",
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  marginBottom: "4px",
                }}
              >
                {ELEMENT_ICONS[type]}
              </div>

              <div
                style={{
                  fontSize: "12px",
                }}
              >
                {ELEMENT_NAMES[type]}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: "24px",
        }}
      >
        <h3 style={sectionTitle}>
          Selected Element
        </h3>

        {selected ? (
          <div
            style={{
              background: "#f8f7ff",
              border:
                "1px solid #ddd6fe",
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: "12px",
              }}
            >
              {ELEMENT_ICONS[
                selected.type
              ]}{" "}
              {ELEMENT_NAMES[
                selected.type
              ]}
            </div>

            <InfoRow
              label="Width"
              value={`${REAL_DIMENSIONS[
                selected.type
              ][0].toFixed(2)} m`}
            />

            <InfoRow
              label="Depth"
              value={`${REAL_DIMENSIONS[
                selected.type
              ][1].toFixed(2)} m`}
            />

            <InfoRow
              label="Height"
              value={`${REAL_DIMENSIONS[
                selected.type
              ][2].toFixed(2)} m`}
            />

            <div
              style={{
                borderTop:
                  "1px solid #e5e7eb",
                margin:
                  "10px 0",
              }}
            />

            <InfoRow
              label="X Position"
              value={`${selected.position[
                0
              ].toFixed(2)} m`}
            />

            <InfoRow
              label="Z Position"
              value={`${selected.position[
                2
              ].toFixed(2)} m`}
            />

            <InfoRow
              label="Rotation"
              value={`${Math.round(
                THREE.MathUtils.radToDeg(
                  selected.rotation
                )
              )}°`}
            />
          </div>
        ) : (
          <div
            style={{
              padding: "16px",
              background: "#f9fafb",
              borderRadius: "9px",
              color: "#6b7280",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            Select an element in the
            venue.
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: "24px",
        }}
      >
        <h3 style={sectionTitle}>
          Controls
        </h3>

        <div
          style={{
            fontSize: "13px",
            color: "#6b7280",
            lineHeight: 1.8,
          }}
        >
          🖱️ Drag — Move
          <br />
          ⌨️ R — Rotate
          <br />
          ⌨️ Arrow keys — Fine movement
          <br />
          ⌨️ Delete — Remove
          <br />
          🖱️ Scroll — Zoom
          <br />
          🖱️ Right drag — Camera
        </div>
      </section>

      <section
        style={{
          marginTop: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            Total elements
          </span>

          <strong>
            {items.length}
          </strong>
        </div>

        <button
          onClick={deleteSelected}
          disabled={
            selectedId === null
          }
          style={{
            width: "100%",
            padding: "11px",
            border:
              "1px solid #ef4444",
            borderRadius: "8px",
            background:
              selectedId === null
                ? "#f3f4f6"
                : "#fff",
            color:
              selectedId === null
                ? "#9ca3af"
                : "#dc2626",
            cursor:
              selectedId === null
                ? "default"
                : "pointer",
            fontWeight: 600,
          }}
        >
          🗑️ Delete Selected
        </button>
      </section>

      <button
        onClick={saveScene}
        disabled={saving}
        style={{
          width: "100%",
          marginTop: "24px",
          padding: "14px",
          background: "#171717",
          color: "#fff",
          border: "none",
          borderRadius: "9px",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "14px",
        }}
      >
        {saving
          ? "Saving..."
          : "💾 Save Design"}
      </button>

      <div
        style={{
          marginTop: "14px",
          padding: "10px",
          background: "#f9fafb",
          borderRadius: "8px",
          fontSize: "11px",
          color: "#9ca3af",
          textAlign: "center",
        }}
      >
        Planning area: 12m × 12m
      </div>
    </aside>
  );
}

function InfoRow({
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
        justifyContent:
          "space-between",
        marginBottom: "7px",
        fontSize: "12px",
      }}
    >
      <span
        style={{
          color: "#6b7280",
        }}
      >
        {label}
      </span>

      <strong>{value}</strong>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  margin:
    "0 0 10px",
  fontSize: "14px",
  color: "#171717",
};

export default function Home() {
  const [venue, setVenue] =
    useState<Venue | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [items, setItems] =
    useState<FurnitureItem[]>([
      {
        id: 1,
        type: "chair",
        position: [0, 0, 0],
        rotation: 0,
      },
    ]);

  const [selectedId, setSelectedId] =
    useState<number | null>(1);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const venueIdParam =
      params.get("venueId");

    if (!venueIdParam) {
      setLoading(false);
      return;
    }

    const venueId =
      Number(venueIdParam);

    if (
      !Number.isInteger(
        venueId
      ) ||
      venueId <= 0
    ) {
      setError(
        "Invalid venue ID"
      );

      setLoading(false);
      return;
    }

    async function loadVenue() {
      try {
        const response =
          await fetch(
            `/api/venues?id=${venueId}`
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load venue"
          );
        }

        const data: Venue =
          await response.json();

        setVenue(data);

        if (data.layoutData) {
          try {
            const saved =
              JSON.parse(
                data.layoutData
              );

            if (
              Array.isArray(
                saved.items
              )
            ) {
              const validItems =
                saved.items.filter(
                  (
                    item: FurnitureItem
                  ) =>
                    Number.isInteger(
                      item.id
                    ) &&
                    MODEL_PATHS[
                      item.type
                    ] &&
                    Array.isArray(
                      item.position
                    ) &&
                    item.position.length ===
                      3 &&
                    typeof item.rotation ===
                      "number"
                );

              if (
                validItems.length
              ) {
                setItems(
                  validItems
                );

                setSelectedId(
                  validItems[0].id
                );
              }
            } else if (
              Array.isArray(
                saved.chairs
              )
            ) {
              const chairs =
                saved.chairs.map(
                  (
                    chair: FurnitureItem
                  ) => ({
                    ...chair,
                    type: "chair" as ElementType,
                  })
                );

              if (
                chairs.length
              ) {
                setItems(chairs);
                setSelectedId(
                  chairs[0].id
                );
              }
            } else if (
              Array.isArray(
                saved.position
              )
            ) {
              setItems([
                {
                  id: 1,
                  type: "chair",
                  position:
                    saved.position,
                  rotation:
                    saved.rotation ??
                    0,
                },
              ]);

              setSelectedId(1);
            }
          } catch (layoutError) {
            console.error(
              "Layout error:",
              layoutError
            );
          }
        }
      } catch (loadError) {
        console.error(
          loadError
        );

        setError(
          "Failed to load venue"
        );
      } finally {
        setLoading(false);
      }
    }

    loadVenue();
  }, []);

  /*
   * Keyboard controls.
   */
  useEffect(() => {
    function handleKeyDown(
      e: KeyboardEvent
    ) {
      if (
        selectedId === null
      ) {
        return;
      }

      if (
        e.key.toLowerCase() ===
        "r"
      ) {
        e.preventDefault();

        setItems((current) =>
          current.map((item) =>
            item.id === selectedId
              ? {
                  ...item,
                  rotation:
                    item.rotation +
                    Math.PI / 8,
                }
              : item
          )
        );

        return;
      }

      if (
        e.key === "Delete" ||
        e.key === "Backspace"
      ) {
        e.preventDefault();

        setItems((current) =>
          current.filter(
            (item) =>
              item.id !==
              selectedId
          )
        );

        setSelectedId(null);

        return;
      }

      const movement =
        e.shiftKey
          ? 0.1
          : 0.05;

      let dx = 0;
      let dz = 0;

      if (
        e.key === "ArrowLeft"
      ) {
        dx = -movement;
      }

      if (
        e.key === "ArrowRight"
      ) {
        dx = movement;
      }

      if (
        e.key === "ArrowUp"
      ) {
        dz = -movement;
      }

      if (
        e.key === "ArrowDown"
      ) {
        dz = movement;
      }

      if (
        dx !== 0 ||
        dz !== 0
      ) {
        e.preventDefault();

        setItems((current) =>
          current.map((item) => {
            if (
              item.id !==
              selectedId
            ) {
              return item;
            }

            return {
              ...item,
              position: [
                THREE.MathUtils.clamp(
                  item.position[0] +
                    dx,
                  -5.5,
                  5.5
                ),
                0,
                THREE.MathUtils.clamp(
                  item.position[2] +
                    dz,
                  -5.5,
                  5.5
                ),
              ],
            };
          })
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, [selectedId]);

  function addItem(
    type: ElementType
  ) {
    const id = Date.now();

    const newItem: FurnitureItem = {
      id,
      type,
      position: [
        0,
        0,
        0,
      ],
      rotation: 0,
    };

    setItems((current) => [
      ...current,
      newItem,
    ]);

    setSelectedId(id);
  }

  function updateItemPosition(
    id: number,
    position: [number, number, number]
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              position,
            }
          : item
      )
    );
  }

  function deleteSelected() {
    if (
      selectedId === null
    ) {
      return;
    }

    setItems((current) =>
      current.filter(
        (item) =>
          item.id !==
          selectedId
      )
    );

    setSelectedId(null);
  }

  async function saveScene() {
    const sceneData: SavedScene = {
      items,
    };

    if (!venue) {
      localStorage.setItem(
        "wedding-design-default",
        JSON.stringify(
          sceneData
        )
      );

      alert(
        "Design saved!"
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/venues",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: venue.id,
              layoutData:
                JSON.stringify(
                  sceneData
                ),
            }),
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.error ??
            "Failed to save design"
        );
      }

      alert(
        `${venue.name} design saved!`
      );
    } catch (saveError) {
      console.error(
        saveError
      );

      alert(
        saveError instanceof
          Error
          ? saveError.message
          : "Failed to save design"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Loading venue...
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          flexDirection:
            "column",
          gap: "12px",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <h2>{error}</h2>

        <button
          onClick={() => {
            window.location.href =
              "/venues";
          }}
        >
          Back to Venues
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#f3f4f6",
      }}
    >
      <div
        style={{
          width: "calc(100vw - 310px)",
          height: "100vh",
        }}
      >
        <Canvas
          shadows
          camera={{
            position: [
              8,
              8,
              8,
            ],
            fov: 45,
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <EditorScene
            venue={venue}
            items={items}
            selectedId={selectedId}
            setSelectedId={
              setSelectedId
            }
            updateItemPosition={
              updateItemPosition
            }
            finishMove={() => {}}
          />
        </Canvas>
      </div>

      <Toolbar
        venue={venue}
        items={items}
        selectedId={selectedId}
        addItem={addItem}
        deleteSelected={
          deleteSelected
        }
        saveScene={saveScene}
        saving={saving}
      />
    </main>
  );
}

useGLTF.preload(
  "/models/SheenChair.glb"
);

useGLTF.preload(
  "/models/RoundTable.glb"
);

useGLTF.preload(
  "/models/Sofa.glb"
);

useGLTF.preload(
  "/models/Stage.glb"
);

useGLTF.preload(
  "/models/Flowers.glb"
);

useGLTF.preload(
  "/models/Lamp.glb"
);