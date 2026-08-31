"use client";

import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import {
  Grid,
  Line,
  OrbitControls,
  OrthographicCamera,
  useGLTF,
} from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
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

/*
   InventoryItem comes directly from our
   /api/inventory endpoint.

   These are the same fields we created
   in the Prisma 8 contract.
*/
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

/*
   FurnitureItem is the object actually placed
   inside the venue editor.

   inventoryId tells us which inventory item
   this object came from.
*/
type FurnitureItem = {
  id: number;
  inventoryId?: number;

  type: ElementType;

  name?: string;
  modelUrl?: string;
  imageUrl?: string | null;

  width?: number;
  depth?: number;
  height?: number;

  position: [number, number, number];
  rotation: number;
};

type SavedScene = {
  items: FurnitureItem[];
};

/* =========================================================
   REAL-LIFE DEFAULT DIMENSIONS
========================================================= */

/*
   These remain as fallbacks for older saved scenes
   or objects that do not have inventory dimensions.

   New inventory objects use their own
   width/depth/height values.
*/

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
   DEFAULT MODEL PATHS
========================================================= */

/*
   These are kept ONLY as fallbacks.

   New inventory objects will use:

      inventoryItem.modelUrl

   instead.
*/

const MODEL_PATHS: Record<
  ElementType,
  string
> = {
  chair: "/models/SheenChair.glb",
  table: "/models/RoundTable.glb",
  sofa: "/models/Sofa.glb",
  stage: "/models/Stage.glb",
  flowers: "/models/Flowers.glb",
  lamp: "/models/Lamp.glb",
};

const LABELS: Record<
  ElementType,
  string
> = {
  chair: "Chair",
  table: "Table",
  sofa: "Sofa",
  stage: "Stage",
  flowers: "Flowers",
  lamp: "Lamp",
};

const ICONS: Record<
  ElementType,
  string
> = {
  chair: "🪑",
  table: "🟤",
  sofa: "🛋️",
  stage: "🎭",
  flowers: "💐",
  lamp: "💡",
};

/* =========================================================
   INVENTORY CATEGORY → ELEMENT TYPE
========================================================= */

function getElementType(
  category: string
): ElementType {
  const value =
    category.toLowerCase();

  if (
    value.includes("table")
  ) {
    return "table";
  }

  if (
    value.includes("sofa") ||
    value.includes("couch")
  ) {
    return "sofa";
  }

  if (
    value.includes("stage")
  ) {
    return "stage";
  }

  if (
    value.includes("flower") ||
    value.includes("decoration")
  ) {
    return "flowers";
  }

  if (
    value.includes("lamp") ||
    value.includes("light")
  ) {
    return "lamp";
  }

  if (
    value.includes("chair") ||
    value.includes("seat")
  ) {
    return "chair";
  }

  return "chair";
}

/* =========================================================
   GET ITEM DIMENSIONS
========================================================= */

function getItemDimensions(
  item: FurnitureItem
) {
  const fallback =
    DIMENSIONS[item.type];

  return {
    width:
      typeof item.width ===
      "number"
        ? item.width
        : fallback.width,

    depth:
      typeof item.depth ===
      "number"
        ? item.depth
        : fallback.depth,

    height:
      typeof item.height ===
      "number"
        ? item.height
        : fallback.height,
  };
}

/* =========================================================
   SCALE 3D MODEL TO REAL DIMENSIONS
========================================================= */

function createModel(
  scene: THREE.Object3D,
  dimensions: {
    width: number;
    depth: number;
    height: number;
  }
) {
  const model =
    scene.clone(true);

  const box =
    new THREE.Box3().setFromObject(
      model
    );

  const size =
    new THREE.Vector3();

  box.getSize(size);

  /*
     Scale X → real width
     Scale Y → real height
     Scale Z → real depth
  */

  const scaleX =
    size.x > 0
      ? dimensions.width /
        size.x
      : 1;

  const scaleY =
    size.y > 0
      ? dimensions.height /
        size.y
      : 1;

  const scaleZ =
    size.z > 0
      ? dimensions.depth /
        size.z
      : 1;

  model.scale.set(
    scaleX,
    scaleY,
    scaleZ
  );

  /*
     Put the bottom of the model
     exactly on the venue floor.
  */

  const finalBox =
    new THREE.Box3().setFromObject(
      model
    );

  model.position.y =
    -finalBox.min.y;

  return model;
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
  /*
     IMPORTANT:

     Inventory modelUrl is preferred.

     MODEL_PATHS remains as a fallback
     for older objects saved before
     Phase 2 Step 3.
  */

  const modelUrl =
    item.modelUrl ||
    MODEL_PATHS[item.type];

  const { scene } =
    useGLTF(modelUrl);

  const {
    camera,
    raycaster,
  } = useThree();

  const dimensions =
    getItemDimensions(item);

  const model =
    useMemo(
      () =>
        createModel(
          scene,
          dimensions
        ),
      [
        scene,
        dimensions.width,
        dimensions.depth,
        dimensions.height,
      ]
    );

  /* =======================================================
     SELECT OBJECT
  ======================================================= */

  const handlePointerDown = (
    e: ThreeEvent<PointerEvent>
  ) => {
    e.stopPropagation();

    /*
       Measurement mode takes
       priority over normal selection.
    */

    if (measureMode) {
      onMeasureSelect();
      return;
    }

    onSelect();
  };

  /* =======================================================
     MOVE OBJECT
  ======================================================= */

  const handlePointerMove = (
    e: ThreeEvent<PointerEvent>
  ) => {
    /*
       Do not move while measuring.
    */

    if (
      measureMode ||
      !selected
    ) {
      return;
    }

    e.stopPropagation();

    /*
       Horizontal floor plane.
    */

    const plane =
      new THREE.Plane(
        new THREE.Vector3(
          0,
          1,
          0
        ),
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
      /*
         Keep the object inside
         the 12m × 12m venue.

         The centre is kept between
         -5.5m and +5.5m.
      */

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

      {/* =================================================
          NORMAL SELECTION
      ================================================= */}

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

      {/* =================================================
          MEASUREMENT SELECTION
      ================================================= */}

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
  const {
    camera,
    raycaster,
  } = useThree();

  /*
     IMPORTANT:

     2D view now also uses the
     actual inventory dimensions.
  */

  const dimensions =
    getItemDimensions(item);

  /* =======================================================
     SELECT
  ======================================================= */

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

  /* =======================================================
     MOVE
  ======================================================= */

  const handlePointerMove = (
    e: ThreeEvent<PointerEvent>
  ) => {
    if (
      measureMode ||
      !selected
    ) {
      return;
    }

    e.stopPropagation();

    const plane =
      new THREE.Plane(
        new THREE.Vector3(
          0,
          1,
          0
        ),
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

  /* =======================================================
     OBJECT SHAPE
  ======================================================= */

  const isCircle =
    item.type === "table" ||
    item.type === "flowers" ||
    item.type === "lamp";

  /* =======================================================
     OBJECT COLOUR
  ======================================================= */

  let fill = "#e5e7eb";

  if (
    item.type === "chair"
  ) {
    fill = "#fde68a";
  }

  if (
    item.type === "table"
  ) {
    fill = "#ddd6fe";
  }

  if (
    item.type === "sofa"
  ) {
    fill = "#bbf7d0";
  }

  if (
    item.type === "stage"
  ) {
    fill = "#fecaca";
  }

  if (
    item.type === "flowers"
  ) {
    fill = "#fbcfe8";
  }

  if (
    item.type === "lamp"
  ) {
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
      {/* =================================================
          OBJECT FOOTPRINT
      ================================================= */}

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
              dimensions.width /
                2,
              dimensions.width /
                2,
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

      {/* =================================================
          NORMAL SELECTION
      ================================================= */}

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
                dimensions.width /
                    2 +
                  0.08,

                dimensions.width /
                    2 +
                  0.12,

                40,
              ]}
            />
          ) : (
            <planeGeometry
              args={[
                dimensions.width +
                  0.16,

                dimensions.depth +
                  0.16,
              ]}
            />
          )}

          <meshBasicMaterial
            color="#2563eb"
            transparent
            opacity={0.35}
            side={
              THREE.DoubleSide
            }
          />
        </mesh>
      )}

      {/* =================================================
          MEASUREMENT SELECTION
      ================================================= */}

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
                dimensions.width /
                    2 +
                  0.13,

                dimensions.width /
                    2 +
                  0.17,

                40,
              ]}
            />
          ) : (
            <planeGeometry
              args={[
                dimensions.width +
                  0.22,

                dimensions.depth +
                  0.22,
              ]}
            />
          )}

          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.4}
            side={
              THREE.DoubleSide
            }
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
      {/* =================================================
          WHITE VENUE PLATFORM
      ================================================= */}

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
          side={
            THREE.DoubleSide
          }
        />
      </mesh>

      {/* =================================================
          GRID
      ================================================= */}

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

      {/* =================================================
          PLATFORM BORDER
      ================================================= */}

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

      {/* =================================================
          TOP/BOTTOM DIMENSION
      ================================================= */}

      <Line
        points={[
          [-6, 0.05, 6.35],
          [6, 0.05, 6.35],
        ]}
        color="#6b7280"
        lineWidth={1}
      />

      {/* =================================================
          LEFT/RIGHT DIMENSION
      ================================================= */}

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
  const distance =
    Math.sqrt(
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
        position:
          "absolute",

        left: "50%",

        top: "50%",

        transform:
          "translate(-50%, -50%)",

        pointerEvents:
          "none",
      }}
    >
      <div
        className="distance-label"
        style={{
          position:
            "absolute",

          left:
            position[0] * 20,

          top:
            position[2] * 20,
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
  inventory,
  inventoryLoading,
}: {
  addItem: (
    item: InventoryItem
  ) => void;

  measureMode: boolean;

  startMeasurement: () => void;

  inventory: InventoryItem[];

  inventoryLoading: boolean;
}) {
  return (
    <section className="build-panel">
      <div className="panel-heading">
        Build
      </div>

      <div className="panel-content">

        {/* =================================================
            INVENTORY
        ================================================= */}

        <div className="section-title">
          Inventory
        </div>

        {inventoryLoading ? (
          <div
            style={{
              padding:
                "20px 5px",

              textAlign:
                "center",

              color:
                "#8b95a1",

              fontSize:
                "12px",
            }}
          >
            Loading inventory...
          </div>
        ) : inventory.length ===
          0 ? (
          <div
            style={{
              padding:
                "20px 5px",

              textAlign:
                "center",

              color:
                "#8b95a1",

              fontSize:
                "12px",
            }}
          >
            No inventory items
            found.
          </div>
        ) : (
          <div
            style={{
              display:
                "flex",

              flexDirection:
                "column",

              gap: "10px",
            }}
          >
            {inventory.map(
              (item) => {
                const
                  unavailable =
                    item.availableQuantity <=
                    0;

                return (
                  <button
                    key={
                      item.id
                    }
                    className="element-button"
                    onClick={() =>
                      addItem(
                        item
                      )
                    }
                    disabled={
                      unavailable
                    }
                    style={{
                      padding:
                        "8px",

                      cursor:
                        unavailable
                          ? "not-allowed"
                          : "pointer",

                      opacity:
                        unavailable
                          ? 0.5
                          : 1,
                    }}
                  >
                    {/* =====================================
                        IMAGE
                    ===================================== */}

                    <span
                      style={{
                        width:
                          "48px",

                        height:
                          "48px",

                        borderRadius:
                          "6px",

                        overflow:
                          "hidden",

                        background:
                          "#f1f3f5",

                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        flexShrink:
                          0,
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={
                            item.imageUrl
                          }
                          alt={
                            item.name
                          }
                          style={{
                            width:
                              "100%",

                            height:
                              "100%",

                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize:
                              "20px",
                          }}
                        >
                          {ICONS[
                            getElementType(
                              item.category
                            )
                          ]}
                        </span>
                      )}
                    </span>

                    {/* =====================================
                        INFORMATION
                    ===================================== */}

                    <span
                      style={{
                        display:
                          "flex",

                        flexDirection:
                          "column",

                        alignItems:
                          "flex-start",

                        minWidth:
                          0,

                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "12px",

                          fontWeight:
                            800,

                          color:
                            "#374151",

                          overflow:
                            "hidden",

                          textOverflow:
                            "ellipsis",

                          whiteSpace:
                            "nowrap",

                          width:
                            "100%",
                        }}
                      >
                        {
                          item.name
                        }
                      </span>

                      <span
                        style={{
                          fontSize:
                            "10px",

                          color:
                            "#8b95a1",

                          marginTop:
                            "3px",
                        }}
                      >
                        {
                          item.category
                        }
                      </span>

                      <span
                        style={{
                          fontSize:
                            "9px",

                          color:
                            "#9ca3af",

                          marginTop:
                            "3px",
                        }}
                      >
                        {
                          item.width
                        }
                        m ×{" "}
                        {
                          item.depth
                        }
                        m ×{" "}
                        {
                          item.height
                        }
                        m
                      </span>

                      <span
                        style={{
                          fontSize:
                            "9px",

                          color:
                            unavailable
                              ? "#dc2626"
                              : "#16a34a",

                          marginTop:
                            "2px",
                        }}
                      >
                        {unavailable
                          ? "Out of stock"
                          : `${item.availableQuantity} available`}
                      </span>
                    </span>

                    {/* =====================================
                        ADD ICON
                    ===================================== */}

                    <span className="add-plus">
                      +
                    </span>
                  </button>
                );
              }
            )}
          </div>
        )}

        {/* =================================================
            TOOLS
        ================================================= */}

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

        {/* =================================================
            TIP
        ================================================= */}

        <div className="tip-box">
          <strong>
            Quick controls
          </strong>

          <p>
            Drag objects to move
            them.
          </p>

          <p>
            Press <b>R</b> to
            rotate.
          </p>

          <p>
            Use 2D view for
            precise floor
            planning.
          </p>

          <p>
            Inventory items use
            their real dimensions.
          </p>

          <p>
            Click an inventory
            item to add it to
            your design.
          </p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   END OF FIRST SECTION
========================================================= */
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

  /*
     Use the dimensions stored
     with the inventory item.

     Fall back to the old dimensions
     for older saved objects.
  */

  const dimensions =
    getItemDimensions(
      selected
    );

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
            {selected.name ||
              LABELS[
                selected.type
              ]}
          </div>

          <div className="selected-type">
            {selected.inventoryId
              ? "Inventory item"
              : "Furniture element"}
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

/* =========================================================
   PROPERTY ROW
========================================================= */

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
  /* =======================================================
     VENUE
  ======================================================= */

  const [venue, setVenue] =
    useState<Venue | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     INVENTORY
  ======================================================= */

  const [
    inventory,
    setInventory,
  ] = useState<
    InventoryItem[]
  >([]);

  const [
    inventoryLoading,
    setInventoryLoading,
  ] = useState(true);

  /* =======================================================
     PLACED ITEMS
  ======================================================= */

  const [items, setItems] =
    useState<FurnitureItem[]>(
      []
    );

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<number | null>(
      null
    );

  /* =======================================================
     SAVE
  ======================================================= */

  const [saving, setSaving] =
    useState(false);

  /* =======================================================
     MEASUREMENT
  ======================================================= */

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

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const [
    activeNav,
    setActiveNav,
  ] =
    useState("Build");

  /* =======================================================
     VIEW
  ======================================================= */

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

    /*
       If no venueId exists,
       we still allow the editor
       to work using local state.
    */

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

        /*
           Restore previously saved
           furniture layout.
        */

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
                  saved.items[0].id
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
     LOAD INVENTORY
  ======================================================= */

  useEffect(() => {
    async function loadInventory() {
      try {
        setInventoryLoading(
          true
        );

        const response =
          await fetch(
            "/api/inventory"
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load inventory"
          );
        }

        const data =
          await response.json();

        /*
           Our API returns the
           inventory array directly.

           This fallback also supports
           { inventory: [...] }.
        */

        const inventoryData =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.inventory
              )
            ? data.inventory
            : [];

        setInventory(
          inventoryData
        );
      } catch (err) {
        console.error(
          "Inventory loading error:",
          err
        );

        setInventory([]);
      } finally {
        setInventoryLoading(
          false
        );
      }
    }

    loadInventory();
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

      /* ROTATE */

      if (
        e.key.toLowerCase() ===
        "r"
      ) {
        rotateSelected();
      }

      /* DELETE */

      if (
        e.key === "Delete" ||
        e.key ===
          "Backspace"
      ) {
        deleteSelected();
      }

      /* MOVEMENT */

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

      if (
        dx !== 0 ||
        dz !== 0
      ) {
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
     ADD INVENTORY ITEM
  ======================================================= */

  function addItem(
    inventoryItem: InventoryItem
  ) {
    /*
       Do not allow an item with
       zero available quantity.
    */

    if (
      inventoryItem.availableQuantity <=
      0
    ) {
      alert(
        "This item is currently unavailable."
      );

      return;
    }

    const id =
      Date.now();

    /*
       Convert the inventory category
       into one of our supported
       visual types.

       The actual model comes from
       inventoryItem.modelUrl.
    */

    const type =
      getElementType(
        inventoryItem.category
      );

    const item: FurnitureItem = {
      id,

      inventoryId:
        inventoryItem.id,

      type,

      name:
        inventoryItem.name,

      modelUrl:
        inventoryItem.modelUrl,

      imageUrl:
        inventoryItem.imageUrl,

      width:
        inventoryItem.width,

      depth:
        inventoryItem.depth,

      height:
        inventoryItem.height,

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

    setSelectedId(
      id
    );
  }

  /* =======================================================
     ADD INVENTORY ITEM FROM INVENTORY PAGE
  ======================================================= */

  useEffect(() => {
    /*
       Wait until the venue/layout has finished loading.

       The inventory page stores the selected inventory
       item in localStorage before opening this page.
    */

    if (loading) {
      return;
    }

    const pendingItem =
      localStorage.getItem(
        "design-item"
      );

    if (!pendingItem) {
      return;
    }

    try {
      const inventoryItem =
        JSON.parse(
          pendingItem
        ) as InventoryItem;

      localStorage.removeItem(
        "design-item"
      );

      addItem(
        inventoryItem
      );
    } catch (err) {
      console.error(
        "Unable to add inventory item to design:",
        err
      );

      localStorage.removeItem(
        "design-item"
      );
    }
  }, [loading]);

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

  /* =======================================================
     SELECT MEASUREMENT ITEM
  ======================================================= */

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

  /* =======================================================
     CLEAR MEASUREMENT
  ======================================================= */

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
     SAVE SCENE
  ======================================================= */

  async function saveScene() {
    const sceneData:
      SavedScene = {
      items,
    };

    /*
       If no venue is selected,
       save locally.
    */

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

            body:
              JSON.stringify({
                id: venue.id,

                name:
                  venue.name,

                location:
                  venue.location,

                capacity:
                  venue.capacity,

                type:
                  venue.type,

                price:
                  venue.price,

                availability:
                  venue.availability,

                modelUrl:
                  venue.modelUrl,

                layoutData:
                  JSON.stringify(
                    sceneData
                  ),
              }),
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

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="loading">
        {error}
      </div>
    );
  }

  /* =======================================================
     SELECTED ITEM
  ======================================================= */

  const selected =
    items.find(
      item =>
        item.id ===
        selectedId
    );

  /* =======================================================
     MEASUREMENT START
  ======================================================= */

  const measurementStart =
    items.find(
      item =>
        item.id ===
        measurementStartId
    );

  /* =======================================================
     MEASUREMENT END
  ======================================================= */

  const measurementEnd =
    items.find(
      item =>
        item.id ===
        measurementEndId
    );

  return (
    <>
      <div className="editor">

        {/* =================================================
            TOP BAR
        ================================================= */}

        <TopBar
          venue={venue}
          saving={saving}
          saveScene={
            saveScene
          }
          viewMode={
            viewMode
          }
          setViewMode={
            setViewMode
          }
        />

        <div className="editor-body">

          {/* =================================================
              LEFT NAVIGATION
          ================================================= */}

          <LeftNav
            active={
              activeNav
            }
            setActive={
              setActiveNav
            }
          />

          {/* =================================================
              BUILD PANEL
          ================================================= */}

          {activeNav ===
            "Build" && (
            <BuildPanel
              addItem={
                addItem
              }

              measureMode={
                measureMode
              }

              startMeasurement={
                startMeasurement
              }

              inventory={
                inventory
              }

              inventoryLoading={
                inventoryLoading
              }
            />
          )}

          {/* =================================================
              WORKSPACE
          ================================================= */}

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

              {/* =================================================
                  FLOOR
              ================================================= */}

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

                      onMove={
                        position =>
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

                      onMove={
                        position =>
                          moveItem(
                            item.id,
                            position
                          )
                      }
                    />
                  )
              )}

              {/* =================================================
                  MEASUREMENT
              ================================================= */}

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

              {/* =================================================
                  LIGHTING
              ================================================= */}

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

              {/* =================================================
                  CAMERA CONTROLS
              ================================================= */}

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

            {/* =================================================
                BOTTOM TOOLBAR
            ================================================= */}

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

          {/* =================================================
              PROPERTIES
          ================================================= */}

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
          GLOBAL STYLES
      ===================================================== */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          font-family:
            Arial,
            sans-serif;
        }

        button {
          font-family:
            inherit;
        }

        .editor {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f3f4f6;
          color: #374151;
        }

        /* =====================================================
           TOP BAR
        ===================================================== */

        .topbar {
          height: 68px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: white;
          border-bottom: 1px solid #dfe2e6;
          z-index: 30;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 230px;
        }

        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 900;
        }

        .brand-title {
          font-size: 15px;
          font-weight: 900;
          color: #1f2937;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #8993a0;
          margin-top: 2px;
        }

        .project-title {
          text-align: center;
        }

        .project-small {
          font-size: 8px;
          color: #9ca3af;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .project-name {
          font-size: 13px;
          font-weight: 800;
          color: #374151;
          margin-top: 3px;
        }

        .top-actions {
          min-width: 230px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .saved-status {
          font-size: 10px;
          color: #16a34a;
          font-weight: 700;
        }

        .save-button {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 7px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .save-button:hover {
          background: #dbeafe;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #d7dce2;
          border-radius: 7px;
          overflow: hidden;
        }

        .view-toggle button {
          border: none;
          background: white;
          padding: 7px 11px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
          color: #6b7280;
        }

        .view-toggle button + button {
          border-left: 1px solid #d7dce2;
        }

        .view-toggle .view-active {
          background: #2563eb;
          color: white;
        }

        /* =====================================================
           EDITOR BODY
        ===================================================== */

        .editor-body {
          flex: 1;
          min-height: 0;
          display: flex;
        }

        /* =====================================================
           LEFT NAV
        ===================================================== */

        .left-nav {
          width: 72px;
          flex-shrink: 0;
          background: #ffffff;
          border-right: 1px solid #dfe2e6;
          display: flex;
          flex-direction: column;
          padding: 10px 7px;
          z-index: 25;
        }

        .nav-item {
          width: 100%;
          border: none;
          background: transparent;
          border-radius: 7px;
          padding: 10px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #697586;
          cursor: pointer;
          font-size: 9px;
          font-weight: 700;
        }

        .nav-item:hover,
        .nav-item.active {
          background: #eff6ff;
          color: #2563eb;
        }

        .nav-icon {
          font-size: 17px;
        }

        .nav-spacer {
          flex: 1;
        }

        /* =====================================================
           BUILD PANEL
        ===================================================== */

        .build-panel {
          width: 285px;
          flex-shrink: 0;
          background: #ffffff;
          border-right: 1px solid #dfe2e6;
          overflow-y: auto;
          z-index: 25;
        }

        .panel-heading {
          padding: 18px 20px;
          border-bottom: 1px solid #edf0f2;
          font-size: 17px;
          font-weight: 900;
          color: #374151;
        }

        .panel-content {
          padding: 18px;
        }

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #7b8490;
          font-weight: 900;
          margin-bottom: 11px;
        }

        .section-title.second {
          margin-top: 23px;
        }

        .element-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .element-button {
          width: 100%;
          border: 1px solid #d7dce2;
          background: white;
          border-radius: 8px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #374151;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          transition: 0.15s ease;
        }

        .element-button:hover {
          border-color: #93c5fd;
          background: #eff6ff;
          transform: translateX(2px);
        }

        .element-button:disabled {
          cursor: not-allowed;
          transform: none;
        }

        .element-button:disabled:hover {
          border-color: #d7dce2;
          background: white;
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
          flex-shrink: 0;
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

        @media (max-width: 1100px) {
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
   PRELOAD DEFAULT GLB MODELS
========================================================= */

/*
   These are only fallbacks for old objects.

   Inventory models are loaded dynamically
   using their database modelUrl.
*/

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