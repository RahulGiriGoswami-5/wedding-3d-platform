"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import {
  Grid,
  Line,
  OrbitControls,
  OrthographicCamera,
  useGLTF,
} from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   REAL-LIFE DIMENSIONS
========================================================= */

const DIMENSIONS: Record<
  ElementType,
  {
    width: number;
    depth: number;
    height: number;
  }
> = {
  chair: {
    width: 0.5,
    depth: 0.5,
    height: 0.9,
  },

  table: {
    width: 1.5,
    depth: 1.5,
    height: 0.75,
  },

  sofa: {
    width: 2.1,
    depth: 0.9,
    height: 0.85,
  },

  stage: {
    width: 4,
    depth: 3,
    height: 0.3,
  },

  flowers: {
    width: 0.5,
    depth: 0.5,
    height: 0.8,
  },

  lamp: {
    width: 0.4,
    depth: 0.4,
    height: 1.8,
  },
};

/* =========================================================
   MODEL PATHS
========================================================= */

const MODEL_PATHS: Record<ElementType, string> = {
  chair: "/models/SheenChair.glb",
  table: "/models/RoundTable.glb",
  sofa: "/models/Sofa.glb",
  stage: "/models/Stage.glb",
  flowers: "/models/Flowers.glb",
  lamp: "/models/Lamp.glb",
};

const LABELS: Record<ElementType, string> = {
  chair: "Chair",
  table: "Table",
  sofa: "Sofa",
  stage: "Stage",
  flowers: "Flowers",
  lamp: "Lamp",
};

const ICONS: Record<ElementType, string> = {
  chair: "🪑",
  table: "🟤",
  sofa: "🛋️",
  stage: "🎭",
  flowers: "💐",
  lamp: "💡",
};

/* =========================================================
   SCALE 3D MODEL TO REAL DIMENSIONS
========================================================= */

function createModel(
  scene: THREE.Object3D,
  type: ElementType
) {
  const model = scene.clone(true);

  const box = new THREE.Box3().setFromObject(model);

  const size = new THREE.Vector3();

  box.getSize(size);

  const target = DIMENSIONS[type];

  const scaleX =
    size.x > 0 ? target.width / size.x : 1;

  const scaleY =
    size.y > 0 ? target.height / size.y : 1;

  const scaleZ =
    size.z > 0 ? target.depth / size.z : 1;

  model.scale.set(
    scaleX,
    scaleY,
    scaleZ
  );

  const finalBox =
    new THREE.Box3().setFromObject(model);

  model.position.y = -finalBox.min.y;

  return model;
}

/* =========================================================
   UPLOADED VENUE MODEL
========================================================= */

function VenueModel({
  url,
}: {
  url: string;
}) {
  const { scene } = useGLTF(url);

  const model = useMemo(() => {
    const cloned = scene.clone(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const largestDimension = Math.max(
      size.x,
      size.y,
      size.z,
      0.001
    );

    /*
     * Imported GLB files can use completely different units.
     * Scale the model so that it fits inside the editable
     * 12m × 12m workspace while preserving its proportions.
     */
    const targetSize = 11;
    const scale = targetSize / largestDimension;

    cloned.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(cloned);
    const scaledCenter = new THREE.Vector3();

    scaledBox.getCenter(scaledCenter);

    cloned.position.x = -scaledCenter.x;
    cloned.position.z = -scaledCenter.z;
    cloned.position.y = -scaledBox.min.y;

    return cloned;
  }, [scene]);

  return (
    <primitive
      object={model}
      dispose={null}
    />
  );
}

/* =========================================================
   3D FURNITURE
========================================================= */

function Furniture3D({
  item,
  selected,
  measureMode,
  measureSelected,
  onSelect,
  onMeasureSelect,
  onMove,
}: {
  item: FurnitureItem;
  selected: boolean;
  measureMode: boolean;
  measureSelected: boolean;
  onSelect: () => void;
  onMeasureSelect: () => void;
  onMove: (
    position: [number, number, number]
  ) => void;
}) {
  const { scene } = useGLTF(
    MODEL_PATHS[item.type]
  );

  const { camera, raycaster } = useThree();

  const model = useMemo(
    () => createModel(scene, item.type),
    [scene, item.type]
  );

  const handlePointerDown = (
    e: ThreeEvent<PointerEvent>
  ) => {
    e.stopPropagation();

    if (measureMode) {
      onMeasureSelect();
      return;
    }

    onSelect();
  };

  const handlePointerMove = (
    e: ThreeEvent<PointerEvent>
  ) => {
    if (measureMode || !selected) {
      return;
    }

    e.stopPropagation();

    const plane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      0
    );

    const point = new THREE.Vector3();

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

  return (
    <group
      position={item.position}
      rotation={[
        0,
        item.rotation,
        0,
      ]}
    >
      <primitive
        object={model}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
      />

      {selected && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.03,
            0,
          ]}
        >
          <ringGeometry
            args={[
              0.45,
              0.52,
              32,
            ]}
          />

          <meshBasicMaterial
            color="#2563eb"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {measureSelected && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.05,
            0,
          ]}
        >
          <ringGeometry
            args={[
              0.58,
              0.66,
              32,
            ]}
          />

          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </group>
  );
}

/* =========================================================
   2D FLOOR PLAN OBJECT
========================================================= */

function Furniture2D({
  item,
  selected,
  measureMode,
  measureSelected,
  onSelect,
  onMeasureSelect,
  onMove,
}: {
  item: FurnitureItem;
  selected: boolean;
  measureMode: boolean;
  measureSelected: boolean;
  onSelect: () => void;
  onMeasureSelect: () => void;
  onMove: (
    position: [number, number, number]
  ) => void;
}) {
  const { camera, raycaster } = useThree();

  const dimensions = DIMENSIONS[item.type];

  const handlePointerDown = (
    e: ThreeEvent<PointerEvent>
  ) => {
    e.stopPropagation();

    if (measureMode) {
      onMeasureSelect();
    } else {
      onSelect();
    }
  };

  const handlePointerMove = (
    e: ThreeEvent<PointerEvent>
  ) => {
    if (measureMode || !selected) {
      return;
    }

    e.stopPropagation();

    const plane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      0
    );

    const point = new THREE.Vector3();

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

  const isCircle =
    item.type === "table" ||
    item.type === "flowers" ||
    item.type === "lamp";

  let fill = "#e5e7eb";

  if (item.type === "chair") {
    fill = "#fde68a";
  }

  if (item.type === "table") {
    fill = "#ddd6fe";
  }

  if (item.type === "sofa") {
    fill = "#bbf7d0";
  }

  if (item.type === "stage") {
    fill = "#fecaca";
  }

  if (item.type === "flowers") {
    fill = "#fbcfe8";
  }

  if (item.type === "lamp") {
    fill = "#fed7aa";
  }

  return (
    <group
      position={[
        item.position[0],
        0.08,
        item.position[2],
      ]}
      rotation={[
        0,
        item.rotation,
        0,
      ]}
    >
      {/* OBJECT FOOTPRINT */}
      <mesh
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
      >
        {isCircle ? (
          <cylinderGeometry
            args={[
              dimensions.width / 2,
              dimensions.width / 2,
              0.08,
              40,
            ]}
          />
        ) : (
          <boxGeometry
            args={[
              dimensions.width,
              0.08,
              dimensions.depth,
            ]}
          />
        )}

        <meshStandardMaterial
          color={fill}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* SELECTION */}
      {selected && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.06,
            0,
          ]}
        >
          {isCircle ? (
            <ringGeometry
              args={[
                dimensions.width / 2 + 0.08,
                dimensions.width / 2 + 0.12,
                40,
              ]}
            />
          ) : (
            <planeGeometry
              args={[
                dimensions.width + 0.16,
                dimensions.depth + 0.16,
              ]}
            />
          )}

          <meshBasicMaterial
            color="#2563eb"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* MEASUREMENT SELECTION */}
      {measureSelected && (
        <mesh
          rotation={[
            -Math.PI / 2,
            0,
            0,
          ]}
          position={[
            0,
            0.07,
            0,
          ]}
        >
          {isCircle ? (
            <ringGeometry
              args={[
                dimensions.width / 2 + 0.13,
                dimensions.width / 2 + 0.17,
                40,
              ]}
            />
          ) : (
            <planeGeometry
              args={[
                dimensions.width + 0.22,
                dimensions.depth + 0.22,
              ]}
            />
          )}

          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/* =========================================================
   FLOOR / VENUE PLATFORM
========================================================= */

function Floor({
  onClear,
}: {
  onClear: () => void;
}) {
  return (
    <>
      {/* WHITE VENUE PLATFORM */}
      <mesh
        rotation={[
          -Math.PI / 2,
          0,
          0,
        ]}
        onPointerDown={
          onClear
        }
      >
        <planeGeometry
          args={[
            12,
            12,
          ]}
        />

        <meshStandardMaterial
          color="#ffffff"
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* GRID */}
      <Grid
        args={[
          12,
          12,
        ]}
        cellSize={0.5}
        cellThickness={0.7}
        cellColor="#d1d5db"
        sectionSize={1}
        sectionThickness={1.2}
        sectionColor="#9ca3af"
        fadeDistance={20}
        fadeStrength={0}
        infiniteGrid={false}
        position={[
          0,
          0.02,
          0,
        ]}
      />

      {/* PLATFORM BORDER */}
      <Line
        points={[
          [-6, 0.04, -6],
          [6, 0.04, -6],
          [6, 0.04, 6],
          [-6, 0.04, 6],
          [-6, 0.04, -6],
        ]}
        color="#374151"
        lineWidth={3}
      />

      {/* TOP/BOTTOM DIMENSION */}
      <Line
        points={[
          [-6, 0.05, 6.35],
          [6, 0.05, 6.35],
        ]}
        color="#6b7280"
        lineWidth={1}
      />

      {/* LEFT/RIGHT DIMENSION */}
      <Line
        points={[
          [-6.35, 0.05, -6],
          [-6.35, 0.05, 6],
        ]}
        color="#6b7280"
        lineWidth={1}
      />
    </>
  );
}

/* =========================================================
   MEASUREMENT
========================================================= */

function Measurement({
  start,
  end,
}: {
  start: FurnitureItem;
  end: FurnitureItem;
}) {
  const distance = Math.sqrt(
    Math.pow(
      end.position[0] -
        start.position[0],
      2
    ) +
      Math.pow(
        end.position[2] -
          start.position[2],
        2
      )
  );

  const middle: [
    number,
    number,
    number
  ] = [
    (start.position[0] +
      end.position[0]) /
      2,
    0.4,
    (start.position[2] +
      end.position[2]) /
      2,
  ];

  return (
    <>
      <Line
        points={[
          [
            start.position[0],
            0.2,
            start.position[2],
          ],
          [
            end.position[0],
            0.2,
            end.position[2],
          ],
        ]}
        color="#2563eb"
        lineWidth={3}
      />

      <HtmlDistanceLabel
        position={middle}
        distance={distance}
      />
    </>
  );
}

/* =========================================================
   DISTANCE LABEL
========================================================= */

function HtmlDistanceLabel({
  position,
  distance,
}: {
  position: [
    number,
    number,
    number
  ];
  distance: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform:
          "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    >
      <div
        className="distance-label"
        style={{
          position: "absolute",
          left: position[0] * 20,
          top: position[2] * 20,
        }}
      >
        {distance.toFixed(2)} m
      </div>
    </div>
  );
}

/* =========================================================
   TOP BAR
========================================================= */

function TopBar({
  venue,
  saving,
  saveScene,
  viewMode,
  setViewMode,
}: {
  venue: Venue | null;
  saving: boolean;
  saveScene: () => void;
  viewMode: "2D" | "3D";
  setViewMode: (
    mode: "2D" | "3D"
  ) => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">
          W
        </div>

        <div>
          <div className="brand-title">
            Wedding Planner
          </div>

          <div className="brand-subtitle">
            3D Venue Designer
          </div>
        </div>
      </div>

      <nav className="top-navigation" aria-label="Main navigation">
        <a href="/" className="top-nav-link top-nav-active">
          Designer
        </a>

        <a href="/venues" className="top-nav-link">
          Venues
        </a>

        <a href="/inventory" className="top-nav-link">
          Inventory
        </a>

        <a href="/themes" className="top-nav-link">
          Themes
        </a>

        <a href="/match" className="top-nav-link">
          Find Matches
        </a>

        <a href="/designs" className="top-nav-link">
          Saved Designs
        </a>
      </nav>

      <div className="project-title">
        <div className="project-small">
          PROJECT
        </div>

        <div className="project-name">
          {venue?.name ||
            "Wedding Venue"}
        </div>
      </div>

      <div className="top-actions">
        <span className="saved-status">
          ●{" "}
          {saving
            ? "Saving..."
            : "Saved"}
        </span>

        <button
          className="save-button"
          onClick={
            saveScene
          }
        >
          💾 Save
        </button>

        <div className="view-toggle">
          <button
            className={
              viewMode ===
              "2D"
                ? "view-active"
                : ""
            }
            onClick={() =>
              setViewMode(
                "2D"
              )
            }
          >
            2D
          </button>

          <button
            className={
              viewMode ===
              "3D"
                ? "view-active"
                : ""
            }
            onClick={() =>
              setViewMode(
                "3D"
              )
            }
          >
            3D
          </button>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   LEFT NAVIGATION
========================================================= */

function LeftNav({
  active,
  setActive,
}: {
  active: string;
  setActive: (
    value: string
  ) => void;
}) {
  const options = [
    ["▦", "Project"],
    ["🔧", "Build"],
    ["ⓘ", "Info"],
    ["🪑", "Objects"],
  ];

  return (
    <nav className="left-nav">
      {options.map(
        ([icon, label]) => (
          <button
            key={label}
            className={
              active ===
              label
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActive(
                label
              )
            }
          >
            <span className="nav-icon">
              {icon}
            </span>

            <span>
              {label}
            </span>
          </button>
        )
      )}

      <div className="nav-spacer" />

      <button className="nav-item">
        <span className="nav-icon">
          ?
        </span>

        <span>
          Help
        </span>
      </button>
    </nav>
  );
}

/* =========================================================
   BUILD PANEL
========================================================= */

function BuildPanel({
  addItem,
  measureMode,
  startMeasurement,
}: {
  addItem: (
    type: ElementType
  ) => void;
  measureMode: boolean;
  startMeasurement: () => void;
}) {
  return (
    <section className="build-panel">
      <div className="panel-heading">
        Build
      </div>

      <div className="panel-content">
        <div className="section-title">
          Add Elements
        </div>

        <div className="element-list">
          {(
            Object.keys(
              LABELS
            ) as ElementType[]
          ).map(
            (type) => (
              <button
                className="element-button"
                key={type}
                onClick={() =>
                  addItem(
                    type
                  )
                }
              >
                <span className="element-icon">
                  {
                    ICONS[
                      type
                    ]
                  }
                </span>

                <span>
                  {
                    LABELS[
                      type
                    ]
                  }
                </span>

                <span className="add-plus">
                  +
                </span>
              </button>
            )
          )}
        </div>

        <div className="section-title second">
          Tools
        </div>

        <button
          className={
            measureMode
              ? "tool-button selected-tool"
              : "tool-button"
          }
          onClick={
            startMeasurement
          }
        >
          <span>
            📏
          </span>

          <span>
            {measureMode
              ? "Select 2 Elements"
              : "Measure Distance"}
          </span>
        </button>

        <div className="tip-box">
          <strong>
            Quick controls
          </strong>

          <p>
            Drag objects
            to move them.
          </p>

          <p>
            Press{" "}
            <b>R</b>{" "}
            to rotate.
          </p>

          <p>
            Use 2D view
            for precise
            floor planning.
          </p>

          <p>
            All furniture
            uses practical
            real-world
            dimensions.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PROPERTIES PANEL
========================================================= */

function PropertiesPanel({
  selected,
  deleteSelected,
  rotateSelected,
}: {
  selected:
    | FurnitureItem
    | undefined;
  deleteSelected: () => void;
  rotateSelected: () => void;
}) {
  if (!selected) {
    return (
      <aside className="properties-panel empty-properties">
        <div className="properties-title">
          Properties
        </div>

        <div className="empty-icon">
          🖱️
        </div>

        <div className="empty-title">
          Nothing selected
        </div>

        <div className="empty-text">
          Select an element
          to view its
          dimensions and
          controls.
        </div>
      </aside>
    );
  }

  const dimensions =
    DIMENSIONS[
      selected.type
    ];

  return (
    <aside className="properties-panel">
      <div className="properties-title">
        Properties
      </div>

      <div className="selected-card">
        <div className="selected-icon">
          {
            ICONS[
              selected.type
            ]
          }
        </div>

        <div>
          <div className="selected-name">
            {
              LABELS[
                selected.type
              ]
            }
          </div>

          <div className="selected-type">
            Furniture element
          </div>
        </div>
      </div>

      <div className="property-section">
        <div className="property-heading">
          Real Dimensions
        </div>

        <PropertyRow
          label="Width"
          value={`${dimensions.width.toFixed(
            2
          )} m`}
        />

        <PropertyRow
          label="Depth"
          value={`${dimensions.depth.toFixed(
            2
          )} m`}
        />

        <PropertyRow
          label="Height"
          value={`${dimensions.height.toFixed(
            2
          )} m`}
        />
      </div>

      <div className="property-section">
        <div className="property-heading">
          Position
        </div>

        <PropertyRow
          label="X"
          value={`${selected.position[0].toFixed(
            2
          )} m`}
        />

        <PropertyRow
          label="Z"
          value={`${selected.position[2].toFixed(
            2
          )} m`}
        />

        <PropertyRow
          label="Rotation"
          value={`${Math.round(
            THREE.MathUtils.radToDeg(
              selected.rotation
            )
          )}°`}
        />
      </div>

      <div className="property-actions">
        <button
          className="rotate-button"
          onClick={
            rotateSelected
          }
        >
          ↻ Rotate
        </button>

        <button
          className="delete-button"
          onClick={
            deleteSelected
          }
        >
          🗑 Delete
        </button>
      </div>
    </aside>
  );
}

function PropertyRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="property-row">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/* =========================================================
   BOTTOM TOOLBAR
========================================================= */

function BottomToolbar({
  startMeasurement,
  measureMode,
  clearMeasurement,
}: {
  startMeasurement: () => void;
  measureMode: boolean;
  clearMeasurement: () => void;
}) {
  return (
    <div className="bottom-toolbar">
      <button
        className={
          measureMode
            ? "bottom-tool active"
            : "bottom-tool"
        }
        onClick={
          startMeasurement
        }
      >
        📏
        <span>
          Measure
        </span>
      </button>

      <div className="toolbar-divider" />

      <button
        className="bottom-tool"
        onClick={() =>
          window.location.reload()
        }
      >
        ↶
        <span>
          Reset
        </span>
      </button>

      <button
        className="bottom-tool"
        onClick={
          clearMeasurement
        }
      >
        ✕
        <span>
          Clear
        </span>
      </button>

      <div className="scale-display">
        <span>
          Real Scale
        </span>

        <strong>
          1 : 1
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Home() {
  const [venue, setVenue] =
    useState<Venue | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [items, setItems] =
    useState<FurnitureItem[]>([
      {
        id: 1,
        type: "chair",
        position: [
          0,
          0,
          0,
        ],
        rotation: 0,
      },
    ]);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<number | null>(
      1
    );

  const [saving, setSaving] =
    useState(false);

  const [
    measureMode,
    setMeasureMode,
  ] =
    useState(false);

  const [
    measurementStartId,
    setMeasurementStartId,
  ] =
    useState<number | null>(
      null
    );

  const [
    measurementEndId,
    setMeasurementEndId,
  ] =
    useState<number | null>(
      null
    );

  const [
    activeNav,
    setActiveNav,
  ] =
    useState("Build");

  const [
    viewMode,
    setViewMode,
  ] =
    useState<"2D" | "3D">(
      "3D"
    );

  /* =======================================================
     LOAD VENUE
  ======================================================= */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const idParam =
      params.get(
        "venueId"
      );

    if (!idParam) {
      setLoading(false);
      return;
    }

    const id =
      Number(idParam);

    async function loadVenue() {
      try {
        const response =
          await fetch(
            `/api/venues?id=${id}`
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load venue"
          );
        }

        const data =
          await response.json();

        const loadedVenue =
          Array.isArray(data)
            ? data.find(
                (
                  item: Venue
                ) =>
                  item.id ===
                  id
              ) ||
              data[0]
            : data;

        setVenue(
          loadedVenue ||
            null
        );

        if (
          loadedVenue?.layoutData
        ) {
          try {
            const saved =
              JSON.parse(
                loadedVenue.layoutData
              );

            if (
              Array.isArray(
                saved.items
              )
            ) {
              setItems(
                saved.items
              );

              if (
                saved.items
                  .length >
                0
              ) {
                setSelectedId(
                  saved
                    .items[0]
                    .id
                );
              }
            }
          } catch {
            console.log(
              "No valid saved layout."
            );
          }
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load venue."
        );
      } finally {
        setLoading(
          false
        );
      }
    }

    loadVenue();
  }, []);

  /* =======================================================
     KEYBOARD CONTROLS
  ======================================================= */

  useEffect(() => {
    function handleKeyDown(
      e: KeyboardEvent
    ) {
      if (
        measureMode ||
        selectedId === null
      ) {
        return;
      }

      if (
        e.key.toLowerCase() ===
        "r"
      ) {
        rotateSelected();
      }

      if (
        e.key === "Delete" ||
        e.key ===
          "Backspace"
      ) {
        deleteSelected();
      }

      const amount =
        e.shiftKey
          ? 0.1
          : 0.05;

      let dx = 0;
      let dz = 0;

      if (
        e.key ===
        "ArrowLeft"
      ) {
        dx = -amount;
      }

      if (
        e.key ===
        "ArrowRight"
      ) {
        dx = amount;
      }

      if (
        e.key ===
        "ArrowUp"
      ) {
        dz = -amount;
      }

      if (
        e.key ===
        "ArrowDown"
      ) {
        dz = amount;
      }

      if (dx !== 0 || dz !== 0) {
        e.preventDefault();

        setItems(
          current =>
            current.map(
              item =>
                item.id ===
                selectedId
                  ? {
                      ...item,
                      position:
                        [
                          THREE.MathUtils.clamp(
                            item
                              .position[0] +
                              dx,
                            -5.5,
                            5.5
                          ),
                          0,
                          THREE.MathUtils.clamp(
                            item
                              .position[2] +
                              dz,
                            -5.5,
                            5.5
                          ),
                        ],
                    }
                  : item
            )
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
  });

  /* =======================================================
     ADD ELEMENT
  ======================================================= */

  function addItem(
    type: ElementType
  ) {
    const id =
      Date.now();

    const item: FurnitureItem = {
      id,
      type,
      position: [
        0,
        0,
        0,
      ],
      rotation: 0,
    };

    setItems(
      current => [
        ...current,
        item,
      ]
    );

    setSelectedId(id);
  }

  /* =======================================================
     MOVE ELEMENT
  ======================================================= */

  function moveItem(
    id: number,
    position: [
      number,
      number,
      number
    ]
  ) {
    setItems(
      current =>
        current.map(
          item =>
            item.id === id
              ? {
                  ...item,
                  position,
                }
              : item
        )
    );
  }

  /* =======================================================
     ROTATE
  ======================================================= */

  function rotateSelected() {
    if (
      selectedId === null
    ) {
      return;
    }

    setItems(
      current =>
        current.map(
          item =>
            item.id ===
            selectedId
              ? {
                  ...item,
                  rotation:
                    item.rotation +
                    Math.PI /
                      8,
                }
              : item
        )
    );
  }

  /* =======================================================
     DELETE
  ======================================================= */

  function deleteSelected() {
    if (
      selectedId === null
    ) {
      return;
    }

    setItems(
      current =>
        current.filter(
          item =>
            item.id !==
            selectedId
        )
    );

    setSelectedId(
      null
    );
  }

  /* =======================================================
     MEASUREMENT
  ======================================================= */

  function startMeasurement() {
    setMeasurementStartId(
      null
    );

    setMeasurementEndId(
      null
    );

    setSelectedId(
      null
    );

    setMeasureMode(
      true
    );
  }

  function selectMeasurementItem(
    id: number
  ) {
    if (
      measurementStartId ===
      null
    ) {
      setMeasurementStartId(
        id
      );

      return;
    }

    if (
      id ===
      measurementStartId
    ) {
      return;
    }

    setMeasurementEndId(
      id
    );

    setMeasureMode(
      false
    );
  }

  function clearMeasurement() {
    setMeasurementStartId(
      null
    );

    setMeasurementEndId(
      null
    );

    setMeasureMode(
      false
    );
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveScene() {
    const sceneData: SavedScene =
      {
        items,
      };

    if (!venue) {
      localStorage.setItem(
        "wedding-design",
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
      setSaving(
        true
      );

      const response =
        await fetch(
          "/api/venues",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              {
                id: venue.id,
                name: venue.name,
                location:
                  venue.location,
                capacity:
                  venue.capacity,
                type: venue.type,
                price: venue.price,
                availability:
                  venue.availability,
                modelUrl:
                  venue.modelUrl,
                layoutData:
                  JSON.stringify(
                    sceneData
                  ),
              }
            ),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Failed to save"
        );
      }

      alert(
        "Design saved successfully!"
      );
    } catch (err) {
      console.error(err);

      alert(
        "Could not save design."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="loading">
        Loading venue...
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading">
        {error}
      </div>
    );
  }

  const selected =
    items.find(
      item =>
        item.id ===
        selectedId
    );

  const measurementStart =
    items.find(
      item =>
        item.id ===
        measurementStartId
    );

  const measurementEnd =
    items.find(
      item =>
        item.id ===
        measurementEndId
    );

  return (
    <>
      <div className="editor">
        <TopBar
          venue={venue}
          saving={saving}
          saveScene={saveScene}
          viewMode={viewMode}
          setViewMode={
            setViewMode
          }
        />

        <div className="editor-body">
          <LeftNav
            active={activeNav}
            setActive={
              setActiveNav
            }
          />

          {activeNav ===
            "Build" && (
            <BuildPanel
              addItem={addItem}
              measureMode={
                measureMode
              }
              startMeasurement={
                startMeasurement
              }
            />
          )}

          <div className="workspace">
            <Canvas
              shadows={
                viewMode ===
                "3D"
              }
              camera={{
                position: [
                  8,
                  8,
                  8,
                ],
                fov: 45,
              }}
            >
              {/* =================================================
                  2D CAMERA
              ================================================= */}
              {viewMode ===
                "2D" && (
                <OrthographicCamera
                  makeDefault
                  position={[
                    0,
                    10,
                    0,
                  ]}
                  rotation={[
                    -Math.PI /
                      2,
                    0,
                    0,
                  ]}
                  zoom={55}
                />
              )}

              {/* FLOOR */}
              <Floor
                onClear={() => {
                  if (
                    !measureMode
                  ) {
                    setSelectedId(
                      null
                    );
                  }
                }}
              />

              {/* =================================================
                  UPLOADED VENUE GLB
              ================================================= */}
              {viewMode === "3D" &&
                venue?.modelUrl && (
                  <Suspense fallback={null}>
                    <VenueModel
                      key={venue.modelUrl}
                      url={venue.modelUrl}
                    />
                  </Suspense>
                )}

              {/* =================================================
                  FURNITURE
              ================================================= */}

              {items.map(
                item =>
                  viewMode ===
                  "3D" ? (
                    <Furniture3D
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      selected={
                        selectedId ===
                        item.id
                      }
                      measureMode={
                        measureMode
                      }
                      measureSelected={
                        measurementStartId ===
                          item.id ||
                        measurementEndId ===
                          item.id
                      }
                      onSelect={() =>
                        setSelectedId(
                          item.id
                        )
                      }
                      onMeasureSelect={() =>
                        selectMeasurementItem(
                          item.id
                        )
                      }
                      onMove={position =>
                        moveItem(
                          item.id,
                          position
                        )
                      }
                    />
                  ) : (
                    <Furniture2D
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      selected={
                        selectedId ===
                        item.id
                      }
                      measureMode={
                        measureMode
                      }
                      measureSelected={
                        measurementStartId ===
                          item.id ||
                        measurementEndId ===
                          item.id
                      }
                      onSelect={() =>
                        setSelectedId(
                          item.id
                        )
                      }
                      onMeasureSelect={() =>
                        selectMeasurementItem(
                          item.id
                        )
                      }
                      onMove={position =>
                        moveItem(
                          item.id,
                          position
                        )
                      }
                    />
                  )
              )}

              {/* MEASUREMENT */}
              {measurementStart &&
                measurementEnd && (
                  <Measurement
                    start={
                      measurementStart
                    }
                    end={
                      measurementEnd
                    }
                  />
                )}

              {/* LIGHTING */}
              <ambientLight
                intensity={
                  viewMode ===
                  "3D"
                    ? 1.2
                    : 1
                }
              />

              <directionalLight
                position={[
                  5,
                  8,
                  5,
                ]}
                intensity={
                  viewMode ===
                  "3D"
                    ? 2
                    : 1
                }
                castShadow={
                  viewMode ===
                  "3D"
                }
              />

              <directionalLight
                position={[
                  -5,
                  5,
                  -5,
                ]}
                intensity={0.5}
              />

              {/* CAMERA CONTROLS */}
              <OrbitControls
                makeDefault
                enableRotate={
                  viewMode ===
                  "3D"
                }
                enablePan={
                  true
                }
                minDistance={3}
                maxDistance={18}
                maxPolarAngle={
                  Math.PI /
                  2.05
                }
              />
            </Canvas>

            {/* =================================================
                WORKSPACE TITLE
            ================================================= */}

            <div className="workspace-title">
              <span>
                {viewMode} VIEW
              </span>

              <strong>
                {viewMode ===
                "2D"
                  ? "Top View • Real Scale"
                  : venue?.name ||
                    "Wedding Venue"}
              </strong>
            </div>

            {/* =================================================
                2D INFO
            ================================================= */}

            {viewMode ===
              "2D" && (
              <div className="plan-info">
                <span>
                  📐 Top-down floor
                  plan
                </span>

                <span>
                  12m × 12m
                </span>

                <span>
                  1 grid square =
                  0.5m
                </span>
              </div>
            )}

            {/* BOTTOM TOOLBAR */}
            <BottomToolbar
              startMeasurement={
                startMeasurement
              }
              measureMode={
                measureMode
              }
              clearMeasurement={
                clearMeasurement
              }
            />
          </div>

          {/* PROPERTIES */}
          <PropertiesPanel
            selected={
              selected
            }
            deleteSelected={
              deleteSelected
            }
            rotateSelected={
              rotateSelected
            }
          />
        </div>
      </div>

      {/* =====================================================
          CSS
      ===================================================== */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          font-family:
            Inter,
            Arial,
            sans-serif;
          color: #1f2937;
          background: #f1f2f4;
        }

        button {
          font-family: inherit;
        }

        .editor {
          width: 100vw;
          height: 100vh;
          background: #f1f2f4;
        }

        /* =====================================================
           TOP BAR
        ===================================================== */

        .topbar {
          height: 68px;
          background: white;
          border-bottom: 1px solid #dfe2e6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: relative;
          z-index: 50;
          box-shadow:
            0 1px 4px
            rgba(0, 0, 0, 0.06);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 230px;
          flex-shrink: 0;
        }

        .top-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
          margin: 0 12px;
          white-space: nowrap;
        }

        .top-nav-link {
          text-decoration: none;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          padding: 9px 10px;
          border-radius: 7px;
          transition: background 0.15s, color 0.15s;
        }

        .top-nav-link:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .top-nav-active {
          background: #e8f1ff;
          color: #2563eb;
        }

        .brand-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 17px;
        }

        .brand-title {
          font-size: 15px;
          font-weight: 800;
          color: #273444;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #8b95a1;
          margin-top: 2px;
        }

        .project-title {
          text-align: center;
          flex-shrink: 0;
          min-width: 150px;
        }

        .project-small {
          font-size: 9px;
          color: #9ca3af;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .project-name {
          font-size: 17px;
          font-weight: 800;
          color: #374151;
          margin-top: 2px;
        }

        .top-actions {
          min-width: 300px;
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
        }

        .saved-status {
          color: #16a34a;
          font-size: 12px;
          font-weight: 700;
        }

        .save-button {
          border: none;
          background: #2563eb;
          color: white;
          border-radius: 7px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 800;
          box-shadow:
            0 2px 5px
            rgba(
              37,
              99,
              235,
              0.25
            );
        }

        .save-button:hover {
          background: #1d4ed8;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
          background: #f9fafb;
        }

        .view-toggle button {
          border: none;
          background: transparent;
          padding: 9px 15px;
          cursor: pointer;
          font-weight: 800;
          color: #6b7280;
        }

        .view-toggle
          .view-active {
          background: #2563eb;
          color: white;
        }

        /* =====================================================
           BODY
        ===================================================== */

        .editor-body {
          display: flex;
          height: calc(
            100vh - 68px
          );
        }

        /* =====================================================
           LEFT NAV
        ===================================================== */

        .left-nav {
          width: 76px;
          background: white;
          border-right: 1px solid #dfe2e6;
          padding: 12px 7px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 30;
        }

        .nav-item {
          border: none;
          background: transparent;
          border-radius: 8px;
          min-height: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: #596574;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .nav-icon {
          font-size: 18px;
        }

        .nav-item:hover {
          background: #f3f4f6;
        }

        .nav-item.active {
          background: #e8f1ff;
          color: #2563eb;
        }

        .nav-spacer {
          flex: 1;
        }

        /* =====================================================
           BUILD PANEL
        ===================================================== */

        .build-panel {
          width: 285px;
          background: white;
          border-right: 1px solid #dfe2e6;
          z-index: 25;
          box-shadow:
            2px 0 7px
            rgba(0, 0, 0, 0.04);
        }

        .panel-heading {
          font-size: 21px;
          font-weight: 800;
          padding: 23px 20px 18px;
          border-bottom: 1px solid #edf0f2;
        }

        .panel-content {
          padding: 20px;
          overflow-y: auto;
          height: calc(
            100% - 67px
          );
        }

        .section-title {
          font-size: 13px;
          color: #667281;
          font-weight: 800;
          margin-bottom: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .section-title.second {
          margin-top: 28px;
        }

        .element-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .element-button {
          width: 100%;
          border: 1px solid #e2e5e9;
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px 13px;
          display: flex;
          align-items: center;
          gap: 13px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          cursor: pointer;
          text-align: left;
          transition: 0.15s;
        }

        .element-button:hover {
          border-color: #93c5fd;
          background: #eff6ff;
          transform: translateX(
            2px
          );
        }

        .element-icon {
          width: 27px;
          text-align: center;
          font-size: 20px;
        }

        .add-plus {
          margin-left: auto;
          font-size: 17px;
          color: #9ca3af;
        }

        .tool-button {
          width: 100%;
          border: 1px solid #d7dce2;
          background: white;
          border-radius: 8px;
          padding: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #374151;
          font-weight: 700;
          cursor: pointer;
        }

        .tool-button:hover,
        .selected-tool {
          background: #eff6ff;
          border-color: #60a5fa;
          color: #1d4ed8;
        }

        .tip-box {
          margin-top: 22px;
          padding: 13px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          font-size: 11px;
          line-height: 1.6;
          color: #667281;
        }

        .tip-box strong {
          color: #374151;
        }

        .tip-box p {
          margin: 7px 0 0;
        }

        /* =====================================================
           WORKSPACE
        ===================================================== */

        .workspace {
          flex: 1;
          min-width: 0;
          position: relative;
          background:
            radial-gradient(
              circle at 50% 45%,
              #ffffff 0%,
              #f1f2f4 65%
            );
        }

        .workspace-title {
          position: absolute;
          top: 15px;
          left: 18px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: rgba(
            255,
            255,
            255,
            0.94
          );
          border: 1px solid #e1e5e9;
          border-radius: 7px;
          padding: 9px 12px;
          box-shadow:
            0 2px 7px
            rgba(0, 0, 0, 0.05);
          pointer-events: none;
        }

        .workspace-title span {
          font-size: 9px;
          color: #2563eb;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .workspace-title strong {
          font-size: 13px;
          color: #374151;
        }

        .plan-info {
          position: absolute;
          top: 15px;
          right: 18px;
          background: rgba(
            255,
            255,
            255,
            0.94
          );
          border: 1px solid #e1e5e9;
          border-radius: 7px;
          padding: 9px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 10px;
          color: #697586;
          box-shadow:
            0 2px 7px
            rgba(0, 0, 0, 0.05);
          pointer-events: none;
        }

        .plan-info span:first-child {
          color: #374151;
          font-weight: 800;
        }

        /* =====================================================
           PROPERTIES
        ===================================================== */

        .properties-panel {
          width: 270px;
          background: white;
          border-left: 1px solid #dfe2e6;
          padding: 20px;
          z-index: 25;
          box-shadow:
            -2px 0 7px
            rgba(0, 0, 0, 0.04);
          overflow-y: auto;
        }

        .properties-title {
          font-size: 17px;
          font-weight: 800;
          margin-bottom: 18px;
          color: #374151;
        }

        .selected-card {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
          border-radius: 9px;
          background: #f8faff;
          border: 1px solid #c7d9ff;
        }

        .selected-icon {
          font-size: 25px;
        }

        .selected-name {
          font-size: 14px;
          font-weight: 800;
          color: #1f2937;
        }

        .selected-type {
          font-size: 10px;
          color: #8993a0;
          margin-top: 3px;
        }

        .property-section {
          margin-top: 23px;
          padding-top: 17px;
          border-top: 1px solid #edf0f2;
        }

        .property-heading {
          font-size: 11px;
          font-weight: 800;
          color: #7b8490;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 12px;
        }

        .property-row {
          display: flex;
          justify-content: space-between;
          padding: 7px 0;
          font-size: 12px;
        }

        .property-row span {
          color: #697586;
        }

        .property-row strong {
          color: #293241;
        }

        .property-actions {
          margin-top: 25px;
          display: flex;
          gap: 7px;
        }

        .rotate-button,
        .delete-button {
          flex: 1;
          padding: 10px 6px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: 700;
          font-size: 11px;
        }

        .rotate-button {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
        }

        .delete-button {
          border: 1px solid #fecaca;
          background: #fff5f5;
          color: #dc2626;
        }

        .empty-properties {
          text-align: center;
          padding-top: 25px;
        }

        .empty-icon {
          font-size: 34px;
          margin: 25px 0 12px;
        }

        .empty-title {
          font-weight: 800;
          color: #374151;
        }

        .empty-text {
          font-size: 11px;
          color: #8b95a1;
          line-height: 1.6;
          margin-top: 8px;
        }

        /* =====================================================
           BOTTOM TOOLBAR
        ===================================================== */

        .bottom-toolbar {
          position: absolute;
          bottom: 18px;
          left: 18px;
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid #dce1e6;
          border-radius: 9px;
          box-shadow:
            0 4px 14px
            rgba(0, 0, 0, 0.1);
          padding: 5px;
          z-index: 20;
        }

        .bottom-tool {
          border: none;
          background: transparent;
          min-width: 65px;
          padding: 8px 9px;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          color: #566171;
          font-size: 10px;
          font-weight: 700;
        }

        .bottom-tool:hover,
        .bottom-tool.active {
          background: #e8f1ff;
          color: #2563eb;
        }

        .toolbar-divider {
          height: 30px;
          width: 1px;
          background: #e5e7eb;
          margin: 0 3px;
        }

        .scale-display {
          margin-left: 10px;
          padding: 0 12px;
          border-left: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 9px;
          color: #8b95a1;
        }

        .scale-display strong {
          color: #374151;
          font-size: 11px;
        }

        /* =====================================================
           MEASUREMENT
        ===================================================== */

        .distance-label {
          background: #2563eb;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow:
            0 3px 8px
            rgba(
              37,
              99,
              235,
              0.3
            );
          pointer-events: none;
        }

        /* =====================================================
           LOADING
        ===================================================== */

        .loading {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          color: #374151;
          font-weight: 700;
          font-family:
            Arial,
            sans-serif;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1250px) {
          .top-navigation {
            gap: 1px;
            margin: 0 6px;
          }

          .top-nav-link {
            padding: 8px 7px;
            font-size: 11px;
          }

          .top-actions {
            min-width: auto;
            gap: 8px;
          }

          .saved-status {
            display: none;
          }
        }

        @media (max-width: 1100px) {
          .top-navigation {
            display: none;
          }

          .properties-panel {
            width: 230px;
          }

          .build-panel {
            width: 250px;
          }

          .brand {
            min-width: auto;
          }

          .brand-subtitle {
            display: none;
          }
        }

        @media (max-width: 850px) {
          .properties-panel {
            display: none;
          }

          .build-panel {
            width: 230px;
          }

          .project-title {
            display: none;
          }
        }
      `}</style>
    </>
  );
}

/* =========================================================
   PRELOAD ALL GLB MODELS
========================================================= */

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