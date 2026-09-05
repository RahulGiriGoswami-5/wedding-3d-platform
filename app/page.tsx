"use client";

import { Canvas, ThreeEvent, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Grid,
  Html,
  Line,
  OrbitControls,
  OrthographicCamera,
  useGLTF,
} from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";


function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.localStorage.getItem("wedding-planner-theme") === "dark");
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    const theme = nextIsDark ? "dark" : "light";
    setIsDark(nextIsDark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", nextIsDark);
    document.documentElement.classList.toggle("dark-mode", nextIsDark);
    document.documentElement.classList.toggle("page-dark", nextIsDark);
    window.localStorage.setItem("wedding-planner-theme", theme);
    window.dispatchEvent(new CustomEvent("wedding-planner-theme-change", { detail: theme }));
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

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
  /** Bulk-created objects share a temporary placement group. */
  groupId?: number;

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

type MatchedDesignPayload = {
  version?: number;
  venueId?: number;
  inventory?: InventoryItem[];
  clientRequirements?: {
    eventType?: string;
    eventDate?: string;
    location?: string;
    guests?: number;
    budget?: number;
    seating?: string;
    decoration?: string;
    requirements?: string;
  };
};

/*
   Convert Phase 5 inventory recommendations into real editor objects.
   The objects are placed in a simple grid so the planner can immediately
   see every selected recommendation and continue editing the design.
*/
function createMatchedFurnitureItems(
  inventoryItems: InventoryItem[]
): FurnitureItem[] {
  const baseId = Date.now();

  return inventoryItems.map((inventoryItem, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);

    return {
      id: baseId + index,
      inventoryId: inventoryItem.id,
      type: getInventoryElementType(inventoryItem),
      name: inventoryItem.name,
      modelUrl: inventoryItem.modelUrl,
      imageUrl: inventoryItem.imageUrl,
      width: inventoryItem.width,
      depth: inventoryItem.depth,
      height: inventoryItem.height,
      position: [
        -4.5 + column * 3,
        0,
        -4.5 + row * 3,
      ],
      rotation: 0,
    };
  });
}

type Theme = {
  id: number;
  name: string;
  description: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  decorationStyle: string | null;
  sceneSettings: string | null;
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

function getElementType(category: string): ElementType {
  const value = category.toLowerCase().trim();
  if (value.includes("sofa") || value.includes("couch")) return "sofa";
  if (value.includes("table")) return "table";
  if (value.includes("stage")) return "stage";
  if (value.includes("flower") || value.includes("decoration")) return "flowers";
  if (value.includes("lamp") || value.includes("light")) return "lamp";
  // Only explicit chair categories are chairs. Unknown seating must not become a chair.
  if (value.includes("chair")) return "chair";
  return "table";
}

function getInventoryElementType(item: InventoryItem): ElementType {
  /*
     Inventory categories such as "Seating" are shared by chairs and sofas.
     Therefore the item name must be checked before the generic category.
     This keeps the original chair/sofa identity and thumbnail correct.
  */
  const name = item.name.toLowerCase().trim();
  const category = item.category.toLowerCase().trim();
  const value = `${name} ${category}`;

  if (value.includes("sofa") || value.includes("couch")) return "sofa";
  if (value.includes("chair")) return "chair";
  if (value.includes("table")) return "table";
  if (value.includes("stage")) return "stage";
  if (value.includes("flower") || value.includes("decoration")) return "flowers";
  if (value.includes("lamp") || value.includes("light")) return "lamp";

  return getElementType(category);
}

function isActualChair(item: InventoryItem): boolean {
  /* A sofa is never a chair, even when both use the Seating category. */
  return getInventoryElementType(item) === "chair";
}

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
   UPLOADED VENUE MODEL

   This is intentionally separate from Furniture3D. The venue
   itself is the editable 3D workspace background and must stay
   visible even when there are no furniture items.
========================================================= */

function prepareVenueModel(
  source: THREE.Object3D,
  theme: {
    primaryColor: string;
    secondaryColor: string;
  }
) {
  const cloned = source.clone(true);

  /*
     Venue files can contain missing textures or very dark embedded materials.
     Rebuild the visible venue materials from the active editor theme so the
     imported venue always matches the workspace instead of appearing black.
  */
  cloned.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    const material = new THREE.MeshStandardMaterial({
      color: theme.secondaryColor,
      emissive: theme.primaryColor,
      emissiveIntensity: 0.025,
      roughness: 0.82,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    object.material = material;
    object.castShadow = true;
    object.receiveShadow = true;
  });

  cloned.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();

  box.getSize(size);

  const largestDimension = Math.max(
    size.x,
    size.y,
    size.z,
    0.001
  );

  // Fit venue exports from different modelling programs into the editor.
  const targetSize = 11;
  const scale = targetSize / largestDimension;

  cloned.scale.setScalar(scale);
  cloned.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(cloned);
  const scaledCenter = new THREE.Vector3();

  scaledBox.getCenter(scaledCenter);

  // Centre the venue horizontally and place its lowest point on the floor.
  cloned.position.x = -scaledCenter.x;
  cloned.position.z = -scaledCenter.z;
  cloned.position.y = -scaledBox.min.y;
  cloned.updateMatrixWorld(true);

  return cloned;
}

function getVenuePlacementHeight(model: THREE.Object3D) {
  /*
     Furniture positions are stored relative to the editor floor at y = 0.
     When an imported venue has a physical floor with thickness, its visible
     top surface can sit above y = 0. Sample that surface so furniture and
     selection rings sit exactly on the venue instead of being embedded in it.
  */
  const samplePoints: [number, number][] = [
    [0, 0],
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];

  const raycaster = new THREE.Raycaster();
  const heights: number[] = [];

  model.updateMatrixWorld(true);

  for (const [x, z] of samplePoints) {
    raycaster.set(
      new THREE.Vector3(x, 50, z),
      new THREE.Vector3(0, -1, 0)
    );

    const hit = raycaster.intersectObject(model, true)[0];
    if (hit) heights.push(hit.point.y);
  }

  if (heights.length === 0) return 0;

  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)];
}

function VenueGLTFModel({
  url,
  primaryColor,
  secondaryColor,
  onLoaded,
}: {
  url: string;
  primaryColor: string;
  secondaryColor: string;
  onLoaded?: (placementHeight: number) => void;
}) {
  const { scene } = useGLTF(url);
  const model = useMemo(
    () => prepareVenueModel(scene, { primaryColor, secondaryColor }),
    [scene, primaryColor, secondaryColor]
  );

  useEffect(() => {
    onLoaded?.(getVenuePlacementHeight(model));
  }, [onLoaded, model]);

  return <primitive object={model} dispose={null} />;
}

function VenueFBXModel({
  url,
  primaryColor,
  secondaryColor,
  onLoaded,
}: {
  url: string;
  primaryColor: string;
  secondaryColor: string;
  onLoaded?: (placementHeight: number) => void;
}) {
  const scene = useLoader(FBXLoader, url);
  const model = useMemo(
    () => prepareVenueModel(scene, { primaryColor, secondaryColor }),
    [scene, primaryColor, secondaryColor]
  );

  useEffect(() => {
    onLoaded?.(getVenuePlacementHeight(model));
  }, [onLoaded, model]);

  return <primitive object={model} dispose={null} />;
}

function VenueOBJModel({
  url,
  primaryColor,
  secondaryColor,
  onLoaded,
}: {
  url: string;
  primaryColor: string;
  secondaryColor: string;
  onLoaded?: (placementHeight: number) => void;
}) {
  const scene = useLoader(OBJLoader, url);
  const model = useMemo(
    () => prepareVenueModel(scene, { primaryColor, secondaryColor }),
    [scene, primaryColor, secondaryColor]
  );

  useEffect(() => {
    onLoaded?.(getVenuePlacementHeight(model));
  }, [onLoaded, model]);

  return <primitive object={model} dispose={null} />;
}

type ModelErrorBoundaryProps = {
  children: ReactNode;
};

type ModelErrorBoundaryState = {
  hasError: boolean;
};

class ModelErrorBoundary extends Component<
  ModelErrorBoundaryProps,
  ModelErrorBoundaryState
> {
  state: ModelErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ModelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unable to load the venue model:", error);
  }

  render() {
    if (this.state.hasError) {
      // Never allow one invalid upload to crash the complete editor.
      return null;
    }

    return this.props.children;
  }
}

type ModelLoadStatus = "checking" | "ready" | "missing" | "unsupported";

function getModelExtension(url: string) {
  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
  const match = cleanUrl.match(/\.([a-z0-9]+)$/);
  return match?.[1] || "";
}

function isSupportedVenueModel(url: string) {
  return ["fbx", "obj", "glb", "gltf"].includes(getModelExtension(url));
}

function VenueModel({
  url,
  primaryColor,
  secondaryColor,
  onLoaded,
}: {
  url: string;
  primaryColor: string;
  secondaryColor: string;
  onLoaded?: (placementHeight: number) => void;
}) {
  const [status, setStatus] = useState<ModelLoadStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    if (!isSupportedVenueModel(url)) {
      setStatus("unsupported");
      return;
    }

    setStatus("checking");

    // Check the file before Three.js creates a loader. A stale database URL
    // must never crash the complete editor or lose the WebGL context.
    fetch(url, { method: "HEAD", cache: "no-store" })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`Model request failed with ${response.status}`);
        }
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (status !== "ready") return null;

  const extension = getModelExtension(url);
  const props = {
    url,
    primaryColor,
    secondaryColor,
    onLoaded,
  };

  if (extension === "fbx") {
    return <VenueFBXModel {...props} />;
  }

  if (extension === "obj") {
    return <VenueOBJModel {...props} />;
  }

  return <VenueGLTFModel {...props} />;
}

function VenueModelNotice({ url }: { url: string | null }) {
  const [status, setStatus] = useState<ModelLoadStatus>("checking");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const showTemporarily = (nextStatus: ModelLoadStatus) => {
      if (cancelled) return;
      setStatus(nextStatus);
      setVisible(true);
      hideTimer = setTimeout(() => {
        if (!cancelled) setVisible(false);
      }, 2000);
    };

    setVisible(false);

    if (!url) {
      showTemporarily("missing");
      return () => {
        cancelled = true;
        if (hideTimer) clearTimeout(hideTimer);
      };
    }

    if (!isSupportedVenueModel(url)) {
      showTemporarily("unsupported");
      return () => {
        cancelled = true;
        if (hideTimer) clearTimeout(hideTimer);
      };
    }

    setStatus("checking");

    fetch(url, { method: "HEAD", cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("Model is unavailable");
        if (!cancelled) {
          setStatus("ready");
          setVisible(false);
        }
      })
      .catch(() => {
        showTemporarily("missing");
      });

    return () => {
      cancelled = true;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [url]);

  if (!visible || status === "checking" || status === "ready") return null;

  const message = status === "unsupported"
    ? "Unsupported venue model format."
    : "Venue model file was not found. Editor is still working safely.";

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 40,
        background: "rgba(255, 255, 255, 0.96)",
        color: "#991b1b",
        border: "1px solid #fecaca",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 9,
        lineHeight: 1.35,
        fontWeight: 700,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.10)",
        maxWidth: "70%",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      {message}
    </div>
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
  onStartDrag,
  placementSurfaceY = 0,
  readOnly = false,
}: {
  item: FurnitureItem;
  selected: boolean;
  measureMode: boolean;
  measureSelected: boolean;
  onSelect: (e: ThreeEvent<PointerEvent>) => void;
  onMeasureSelect: () => void;
  onMove: (
    position: [number, number, number]
  ) => void;
  onStartDrag?: (
    id: number,
    e: ThreeEvent<PointerEvent>
  ) => void;
  placementSurfaceY?: number;
  readOnly?: boolean;
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
    if (readOnly) return;

    e.stopPropagation();

    /*
       Measurement mode takes
       priority over normal selection.
    */

    if (measureMode) {
      onMeasureSelect();
      return;
    }

    onSelect(e);
    if (onStartDrag) {
      onStartDrag(item.id, e);
    }
  };

  /* =======================================================
     MOVE OBJECT
  ======================================================= */

  const handlePointerMove = (
    e: ThreeEvent<PointerEvent>
  ) => {
    /*
       Preview mode is strictly read-only.
    */

    if (
      readOnly ||
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

  /*
     Keep the inventory model visually seated on the venue, while adding only
     a tiny clearance so the venue surface cannot hide the selection indicator.
     0.035m is small enough to avoid a floating appearance.
  */
  const surfaceClearance = 0.035;

  /*
     The old fixed-size ring was hidden underneath larger objects such as sofas
     and stages. Size the ring from the real inventory footprint so it remains
     visible around the selected object.
  */
  const selectionRadius =
    Math.max(dimensions.width, dimensions.depth) / 2 + 0.08;
  const measurementRadius = selectionRadius + 0.10;

  return (
    <group
      position={[
        item.position[0],
        placementSurfaceY + surfaceClearance,
        item.position[2],
      ]}
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
            0.09,
            0,
          ]}
          renderOrder={1000}
        >
          <ringGeometry
            args={[
              selectionRadius,
              selectionRadius + 0.07,
              64,
            ]}
          />

          <meshBasicMaterial
            color="#2563eb"
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
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
            0.11,
            0,
          ]}
          renderOrder={1001}
        >
          <ringGeometry
            args={[
              measurementRadius,
              measurementRadius + 0.07,
              64,
            ]}
          />

          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
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
  onStartDrag,
}: {
  item: FurnitureItem;
  selected: boolean;
  measureMode: boolean;
  measureSelected: boolean;
  onSelect: (e: ThreeEvent<PointerEvent>) => void;
  onMeasureSelect: () => void;
  onMove: (
    position: [number, number, number]
  ) => void;
  onStartDrag?: (
    id: number,
    e: ThreeEvent<PointerEvent>
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
      onSelect(e);
      if (onStartDrag) {
        onStartDrag(item.id, e);
      }
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
   DRAG CONTROLLER (SMOOTH OBJECT DRAGGING)
========================================================= */

function DragController({
  isDragging,
  draggingId,
  dragOffset,
  onMove,
  onDragEnd,
}: {
  isDragging: boolean;
  draggingId: number | null;
  dragOffset: [number, number];
  onMove: (id: number, pos: [number, number, number]) => void;
  onDragEnd: () => void;
}) {
  const { camera, gl } = useThree();

  useEffect(() => {
    if (!isDragging || draggingId === null) return;

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(plane, hitPoint)) {
        const nextX = THREE.MathUtils.clamp(hitPoint.x + dragOffset[0], -5.5, 5.5);
        const nextZ = THREE.MathUtils.clamp(hitPoint.z + dragOffset[1], -5.5, 5.5);
        onMove(draggingId, [nextX, 0, nextZ]);
      }
    };

    const handlePointerUp = () => {
      onDragEnd();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, draggingId, dragOffset, camera, gl, onMove, onDragEnd]);

  return null;
}

/* =========================================================
   FLOOR / VENUE PLATFORM
========================================================= */

function Floor({
  onClear,
  primaryColor = "#2563eb",
  secondaryColor = "#f8fafc",
}: {
  onClear: () => void;
  primaryColor?: string;
  secondaryColor?: string;
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
          color={secondaryColor}
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
        cellColor={secondaryColor}
        sectionSize={1}
        sectionThickness={1.2}
        sectionColor={primaryColor}
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
        color={primaryColor}
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
  position: [number, number, number];
  distance: number;
}) {
  return (
    <Html
      position={position}
      center
      transform
      style={{ pointerEvents: "none" }}
    >
      <div className="distance-label">
        {distance.toFixed(2)} m
      </div>
    </Html>
  );
}

/* =========================================================
   READ-ONLY 3D PREVIEW
========================================================= */

function PreviewOverlay({
  open,
  onClose,
  venue,
  items,
  selectedTheme,
  venuePlacementSurfaceY,
  venueModelLoaded,
}: {
  open: boolean;
  onClose: () => void;
  venue: Venue | null;
  items: FurnitureItem[];
  selectedTheme: Theme | null;
  venuePlacementSurfaceY: number;
  venueModelLoaded: boolean;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const primaryColor = selectedTheme?.primaryColor || "#2563eb";
  const secondaryColor = selectedTheme?.secondaryColor || "#f8fafc";

  return (
    <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Read-only 3D preview">
      <div className="preview-toolbar">
        <div>
          <span className="preview-label">3D PREVIEW</span>
          <strong>{venue?.name || "Wedding Venue"}</strong>
        </div>
        <div className="preview-toolbar-actions">
          <span className="preview-hint">Drag to orbit • Scroll to zoom • Right-drag to pan</span>
          <button type="button" className="preview-close-button" onClick={onClose}>
            ✕ Exit Preview
          </button>
        </div>
      </div>

      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 45 }}
        className="preview-canvas"
      >
        {!venueModelLoaded && (
          <Floor
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onClear={() => {}}
          />
        )}

        {venue?.modelUrl && (
          <ModelErrorBoundary key={`preview-${venue.modelUrl}`}>
            <Suspense fallback={null}>
              <VenueModel
                url={venue.modelUrl}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
            </Suspense>
          </ModelErrorBoundary>
        )}

        {items.map((item) => (
          <Furniture3D
            key={item.id}
            item={item}
            placementSurfaceY={venueModelLoaded ? venuePlacementSurfaceY : 0}
            selected={false}
            measureMode={false}
            measureSelected={false}
            readOnly
            onSelect={() => {}}
            onMeasureSelect={() => {}}
            onMove={() => {}}
          />
        ))}

        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 8, 5]} intensity={2} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />

        <OrbitControls
          makeDefault
          enableRotate
          enablePan
          enableZoom
          minDistance={3}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2.02}
        />
      </Canvas>
    </div>
  );
}

/* =========================================================
   FIRST-PERSON WALK CONTROLS
========================================================= */

type WalkDirection = "forward" | "back" | "left" | "right";

function FirstPersonWalker({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(Math.PI);
  const pitch = useRef(0);
  const draggingTouch = useRef(false);
  const lastTouch = useRef({ x: 0, y: 0 });
  const locked = useRef(false);
  // Browsers reject a new pointer-lock request immediately after the lock
  // has been released. Keep a short cooldown and only request it from a
  // genuine canvas interaction.
  const pointerLockCooldownUntil = useRef(0);

  const clampPosition = () => {
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.6, 5.6);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -5.6, 5.6);
    camera.position.y = 1.65;
  };

  const updateCameraRotation = () => {
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = THREE.MathUtils.clamp(pitch.current, -1.25, 1.25);
  };

  const moveInDirection = (direction: WalkDirection, distance: number) => {
    const forward = new THREE.Vector3(
      -Math.sin(yaw.current),
      0,
      -Math.cos(yaw.current)
    );
    const right = new THREE.Vector3(
      Math.cos(yaw.current),
      0,
      -Math.sin(yaw.current)
    );

    if (direction === "forward") camera.position.addScaledVector(forward, distance);
    if (direction === "back") camera.position.addScaledVector(forward, -distance);
    if (direction === "right") camera.position.addScaledVector(right, distance);
    if (direction === "left") camera.position.addScaledVector(right, -distance);

    clampPosition();
  };

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";

    // Start just outside the front-side edge of the venue instead of in
    // the middle of the model. The camera faces diagonally into the venue so
    // the user can see both the platform and the surrounding open space.
    const walkStart = new THREE.Vector3(-5.0, 1.65, 4.8);
    const walkTarget = new THREE.Vector3(0, 1.65, 0);

    camera.position.copy(walkStart);

    const initialDirection = walkTarget
      .clone()
      .sub(walkStart)
      .normalize();

    yaw.current = Math.atan2(
      -initialDirection.x,
      -initialDirection.z
    );
    pitch.current = 0;
    updateCameraRotation();

    const movementKeys = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (movementKeys.includes(event.code)) {
        keys.current[event.code] = true;
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= event.movementX * 0.0024;
      pitch.current -= event.movementY * 0.0024;
      updateCameraRotation();
    };

    const handlePointerDown = (event: PointerEvent) => {
      // Touch devices use drag-to-look, so pointer lock is desktop-only.
      if (event.pointerType === "touch" || event.button !== 0) return;
      if (document.pointerLockElement === canvas) return;
      if (performance.now() < pointerLockCooldownUntil.current) return;

      try {
        const requestResult = canvas.requestPointerLock?.();

        // Modern browsers can return a Promise. Catch its rejection so a
        // browser security restriction never becomes a Next.js runtime error.
        if (requestResult && typeof (requestResult as Promise<void>).catch === "function") {
          (requestResult as Promise<void>).catch(() => {
            pointerLockCooldownUntil.current = performance.now() + 350;
          });
        }
      } catch {
        pointerLockCooldownUntil.current = performance.now() + 350;
      }
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas;
      locked.current = isLocked;

      if (!isLocked) {
        pointerLockCooldownUntil.current = performance.now() + 350;
      }
    };

    const handlePointerLockError = () => {
      locked.current = false;
      pointerLockCooldownUntil.current = performance.now() + 500;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      draggingTouch.current = true;
      lastTouch.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!draggingTouch.current || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - lastTouch.current.x;
      const dy = touch.clientY - lastTouch.current.y;

      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        event.preventDefault();
        yaw.current -= dx * 0.012;
        pitch.current -= dy * 0.012;
        updateCameraRotation();
        lastTouch.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = () => {
      draggingTouch.current = false;
    };

    const handleWalkStep = (event: Event) => {
      const direction = (event as CustomEvent<WalkDirection>).detail;
      if (
        direction === "forward" ||
        direction === "back" ||
        direction === "left" ||
        direction === "right"
      ) {
        moveInDirection(direction, 1.35);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("pointerlockerror", handlePointerLockError);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("wedding-walk-step", handleWalkStep as EventListener);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("pointerlockerror", handlePointerLockError);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("wedding-walk-step", handleWalkStep as EventListener);

      if (document.pointerLockElement === canvas) {
        pointerLockCooldownUntil.current = performance.now() + 350;
        document.exitPointerLock?.();
      }

      canvas.style.touchAction = previousTouchAction;
      keys.current = {};
      locked.current = false;
      draggingTouch.current = false;
    };
  }, [enabled, camera, gl]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const movement = new THREE.Vector3();
    const forward = new THREE.Vector3(
      -Math.sin(yaw.current),
      0,
      -Math.cos(yaw.current)
    );
    const right = new THREE.Vector3(
      Math.cos(yaw.current),
      0,
      -Math.sin(yaw.current)
    );

    if (keys.current.KeyW || keys.current.ArrowUp) movement.add(forward);
    if (keys.current.KeyS || keys.current.ArrowDown) movement.sub(forward);
    if (keys.current.KeyD || keys.current.ArrowRight) movement.add(right);
    if (keys.current.KeyA || keys.current.ArrowLeft) movement.sub(right);

    if (movement.lengthSq() === 0) return;

    movement.normalize().multiplyScalar(3.2 * Math.min(delta, 0.05));
    camera.position.add(movement);
    clampPosition();
  });

  return null;
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
  selectedTheme,
  onSwitchTheme,
  onPreview,
}: {
  venue: Venue | null;
  saving: boolean;
  saveScene: () => void;
  viewMode: "2D" | "3D" | "WALK";
  setViewMode: (mode: "2D" | "3D" | "WALK") => void;
  selectedTheme: Theme | null;
  onSwitchTheme: () => void;
  onPreview: () => void;
}) {
  const primaryColor = selectedTheme?.primaryColor || "#2563eb";

  const handleNavigationClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (viewMode !== "WALK") return;

    setViewMode("3D");

    // The Designer link points to the current page. Prevent a full reload so
    // tapping it on mobile simply exits Walk mode and returns to the editor.
    if (event.currentTarget.getAttribute("href") === "/") {
      event.preventDefault();
    }
  };

  return (
    <header className="topbar">
      <a href="/" className="brand" aria-label="Wedding Planner home">
        <div className="brand-icon" style={{ background: primaryColor }}>W</div>
        <div>
          <div className="brand-title">Wedding Planner</div>
          <div className="brand-subtitle">3D Venue Designer</div>
        </div>
      </a>

      <nav className="main-navigation" aria-label="Main navigation">
        <a href="/" className="top-nav-link active" aria-current="page" onClick={handleNavigationClick}>Designer</a>
        <a href="/venues" className="top-nav-link" onClick={handleNavigationClick}>Venues</a>
        <a href="/inventory" className="top-nav-link" onClick={handleNavigationClick}>Inventory</a>
        <a href="/match" className="top-nav-link" onClick={handleNavigationClick}>Find Matches</a>
        <a href="/themes" className="top-nav-link" onClick={handleNavigationClick}>Themes</a>
        <a href="/designs" className="top-nav-link" onClick={handleNavigationClick}>Saved Designs</a>
      </nav>

      <div className="project-title">
        <div className="project-small">PROJECT</div>
        <div className="project-name">{venue?.name || "Wedding Venue"}</div>
      </div>

      <div className="top-actions">
        <button
          type="button"
          onClick={onSwitchTheme}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "9px 12px",
            background: selectedTheme ? primaryColor : "#eef2ff",
            color: selectedTheme ? "#ffffff" : "#334155",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title="Choose or change the wedding theme"
        >
          ✨ {selectedTheme?.name || "No Theme Selected"}
        </button>

        <span className="saved-status">
          <span className="status-dot">●</span>{" "}
          {saving ? "Saving..." : "Ready"}
        </span>

        <button
          type="button"
          className="preview-button"
          onClick={onPreview}
          aria-label="Open 3D preview"
          title="Preview design"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" />
            <circle cx="12" cy="12" r="2.75" />
          </svg>
        </button>

        <button type="button" className="save-button" onClick={saveScene} disabled={saving}>
          {saving ? "Saving..." : "💾 Save Design"}
        </button>

        <div className="view-toggle">
          <button type="button" className={viewMode === "2D" ? "view-active" : ""} onClick={() => setViewMode("2D")}>2D</button>
          <button type="button" className={viewMode === "3D" ? "view-active" : ""} onClick={() => setViewMode("3D")}>3D</button>
          <button
            type="button"
            className={viewMode === "WALK" ? "view-active" : ""}
            onClick={() => setViewMode(viewMode === "WALK" ? "3D" : "WALK")}
            title={viewMode === "WALK" ? "Exit Walk view" : "Enter the venue and walk through it"}
          >
            🚶 Walk
          </button>
        </div>
      </div>

      <ThemeToggle />
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
            type="button"
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

      <button type="button" className="nav-item" onClick={() => setActive("Info")}>
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
   NAVIGATION CONTENT PANEL
========================================================= */

function NavigationPanel({
  active,
  venue,
  items,
}: {
  active: string;
  venue: Venue | null;
  items: FurnitureItem[];
}) {
  if (active === "Project") {
    return (
      <section className="build-panel">
        <div className="panel-heading">Project</div>
        <div className="panel-content">
          <div className="section-title">Venue Details</div>
          <div className="tip-box">
            <p><strong>{venue?.name || "Wedding Venue"}</strong></p>
            <p>{venue?.location || "No location selected"}</p>
            <p>Capacity: {venue?.capacity ?? "—"}</p>
            <p>Type: {venue?.type || "—"}</p>
          </div>
        </div>
      </section>
    );
  }

  if (active === "Objects") {
    return (
      <section className="build-panel">
        <div className="panel-heading">Objects</div>
        <div className="panel-content">
          <div className="section-title">Placed Elements ({items.length})</div>
          {items.length === 0 ? (
            <div className="tip-box">No objects have been placed yet.</div>
          ) : (
            items.map(item => (
              <div key={item.id} className="tip-box" style={{ marginBottom: 8 }}>
                <strong>{item.name || LABELS[item.type]}</strong>
                <p>{item.type}</p>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="build-panel">
      <div className="panel-heading">Info</div>
      <div className="panel-content">
        <div className="section-title">Designer Help</div>
        <div className="tip-box">
          <p>Use <strong>Build</strong> to add inventory items.</p>
          <p>Select an object to see its properties.</p>
          <p>Use the 2D / 3D buttons to change the view.</p>
          <p>If a venue model file is missing, the editor stays open safely.</p>
        </div>
      </div>
    </section>
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
  placedItems,
  onSelectSelectedGroup,
  onMoveIndividually,
  selectedGroupCount,
}: {
  addItem: (
    item: InventoryItem,
    count?: number,
    arrangement?: "line" | "rows" | "grid"
  ) => void;

  measureMode: boolean;

  startMeasurement: () => void;

  inventory: InventoryItem[];

  inventoryLoading: boolean;
  placedItems: FurnitureItem[];
  onSelectSelectedGroup: () => void;
  onMoveIndividually: () => void;
  selectedGroupCount: number;
}) {
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [bulkQuantity, setBulkQuantity] = useState<number>(25);
  const [bulkArrangement, setBulkArrangement] = useState<"line" | "rows" | "grid">("rows");

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
                const placedCount = placedItems.filter(
                  (placed) => placed.inventoryId === item.id
                ).length;
                const remainingQuantity = Math.max(
                  0, item.availableQuantity - placedCount
                );
                const unavailable = remainingQuantity <= 0;
                const isExpanded = expandedItemId === item.id;

                return (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column" }}>
                    <button
                      type="button"
                      className="element-button"
                      onClick={() => {
                        if (unavailable) return;
                        setBulkQuantity((current) => Math.max(1, Math.min(current, Math.min(50, remainingQuantity))));
                        setExpandedItemId((cur) => (cur === item.id ? null : item.id));
                      }}
                      disabled={unavailable}
                      style={{
                        padding: "8px",
                        cursor: unavailable ? "not-allowed" : "pointer",
                        opacity: unavailable ? 0.5 : 1,
                      }}
                    >
                      {/* =====================================
                          IMAGE
                      ===================================== */}

                      <span
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          background: "#f1f3f5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "20px" }}>
                            {ICONS[getInventoryElementType(item)]}
                          </span>
                        )}
                      </span>

                      {/* =====================================
                          INFORMATION
                      ===================================== */}

                      <span
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          className="element-name"
                          style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#374151",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                          }}
                        >
                          {item.name}
                        </span>

                        <span
                          className="element-category"
                          style={{
                            fontSize: "10px",
                            color: "#8b95a1",
                            marginTop: "3px",
                          }}
                        >
                          {item.category}
                        </span>

                        <span
                          className="element-dims"
                          style={{
                            fontSize: "9px",
                            color: "#9ca3af",
                            marginTop: "3px",
                          }}
                        >
                          {item.width}m × {item.depth}m × {item.height}m
                        </span>

                        <span
                          style={{
                            fontSize: "9px",
                            color: unavailable ? "#dc2626" : "#16a34a",
                            marginTop: "2px",
                          }}
                        >
                          {unavailable
                            ? "Out of stock"
                            : `${remainingQuantity} available`}
                        </span>
                      </span>

                      {/* =====================================
                          ADD ICON / INDICATOR
                      ===================================== */}

                      <span className="add-plus">
                        {isExpanded ? "▲" : "+"}
                      </span>
                    </button>

                    {/* =====================================
                        EXPANDABLE QUANTITY SELECTOR (1–50)
                    ===================================== */}
                    {isExpanded && (
                      <div
                        className="bulk-item-panel"
                        style={{
                          marginTop: "6px",
                          marginBottom: "4px",
                          padding: "12px",
                          background: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>
                            Select Quantity:
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            (up to available stock)
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {[1, 5, 10, 20, 25, 50]
                            .filter((qty) => qty <= Math.min(50, remainingQuantity))
                            .map((qty) => (
                            <button
                              key={qty}
                              type="button"
                              className={`preset-btn ${
                                bulkQuantity === qty ? "active" : ""
                              }`}
                              onClick={() => setBulkQuantity(Math.min(qty, remainingQuantity))}
                              style={{
                                flex: "1 0 28px",
                                padding: "5px 4px",
                                fontSize: "11px",
                                fontWeight: 700,
                                borderRadius: "6px",
                                border:
                                  bulkQuantity === qty
                                    ? "1px solid #2563eb"
                                    : "1px solid #cbd5e1",
                                background:
                                  bulkQuantity === qty ? "#2563eb" : "#ffffff",
                                color:
                                  bulkQuantity === qty ? "#ffffff" : "#334155",
                                cursor: "pointer",
                              }}
                            >
                              {qty}
                            </button>
                          ))}
                        </div>

                        {/* Stepper + Input + Slider */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
                            width: "100%",
                            minWidth: 0,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setBulkQuantity((prev) => Math.max(1, prev - 1))
                            }
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <input
                            type="number"
                            min={1}
                            max={Math.min(50, remainingQuantity)}
                            value={bulkQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (isNaN(val)) setBulkQuantity(1);
                              else setBulkQuantity(Math.min(Math.min(50, remainingQuantity), Math.max(1, val)));
                            }}
                            style={{
                              width: "55px",
                              height: "30px",
                              textAlign: "center",
                              fontWeight: 800,
                              fontSize: "13px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                            }}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setBulkQuantity((prev) => Math.min(Math.min(50, remainingQuantity), prev + 1))
                            }
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>

                          <input
                            type="range"
                            min={1}
                            max={Math.min(50, remainingQuantity)}
                            value={bulkQuantity}
                            onChange={(e) =>
                              setBulkQuantity(Number(e.target.value))
                            }
                            style={{
                              flex: "1 1 100%",
                              width: "100%",
                              minWidth: 0,
                              maxWidth: "100%",
                              boxSizing: "border-box",
                              accentColor: "#2563eb",
                              cursor: "pointer",
                            }}
                          />
                        </div>

                        {/* Arrangement */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>Arrangement:</span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {([ ["line", "Single Line"], ["rows", "Multiple Rows"], ["grid", "Square / Grid"] ] as const).map(([value, label]) => (
                              <button key={value} type="button" onClick={() => setBulkArrangement(value)} style={{ flex: 1, padding: "7px 4px", fontSize: "10px", fontWeight: 700, borderRadius: "6px", border: bulkArrangement === value ? "1px solid #2563eb" : "1px solid #cbd5e1", background: bulkArrangement === value ? "#2563eb" : "#fff", color: bulkArrangement === value ? "#fff" : "#334155", cursor: "pointer" }}>{label}</button>
                            ))}
                          </div>
                        </div>

                        {/* Confirm & Cancel */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              addItem(item, Math.min(bulkQuantity, remainingQuantity), bulkArrangement);
                              setExpandedItemId(null);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 10px",
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "8px",
                              fontWeight: 800,
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Add {Math.min(bulkQuantity, remainingQuantity)} {item.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(null)}
                            style={{
                              padding: "8px 10px",
                              background: "transparent",
                              color: "#64748b",
                              border: "1px solid #cbd5e1",
                              borderRadius: "8px",
                              fontWeight: 600,
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* =================================================
            GROUP MOVEMENT
        ================================================= */}

        {placedItems.length > 0 && (
          <>
            <div className="section-title second">Group Movement</div>

            <button type="button" className="tool-button" onClick={onSelectSelectedGroup}>
              <span>↔️</span>
              <span>Move Selected Group Together</span>
            </button>

            <button type="button" className="tool-button" onClick={onMoveIndividually} style={{ marginTop: "8px" }}>
              <span>☝️</span>
              <span>Move Individually</span>
            </button>

            <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>
              {selectedGroupCount > 1
                ? `${selectedGroupCount} selected objects move together while keeping their formation.`
                : "Select an object, then choose Move Selected Group Together to select its own placement group."}
            </div>
          </>
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
  deleteAllSelected,
  selectedCount,
  rotateSelected,
}: {
  selected:
    | FurnitureItem
    | undefined;
  deleteSelected: () => void;
  deleteAllSelected: () => void;
  selectedCount: number;
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

        <button className="delete-button delete-single-item-button" onClick={deleteSelected}>
          <span className="delete-item-preview" aria-hidden="true">
            {selected.imageUrl ? (
              <img src={selected.imageUrl} alt="" />
            ) : (
              <span>{ICONS[selected.type]}</span>
            )}
          </span>
          <span className="delete-item-action">Delete</span>
        </button>

        {selectedCount > 1 && (
          <button className="delete-button delete-all-button" onClick={deleteAllSelected}>
            <span aria-hidden="true">🗑</span>
            <span>Delete All</span>
          </button>
        )}
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
     THEMES
  ======================================================= */

  const [themes, setThemes] = useState<Theme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<number | null>(null);
  const [currentDesignName, setCurrentDesignName] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [venueModelLoaded, setVenueModelLoaded] = useState(false);
  const [venuePlacementSurfaceY, setVenuePlacementSurfaceY] = useState(0);
  useEffect(() => {
    setVenueModelLoaded(false);
    setVenuePlacementSurfaceY(0);
  }, [venue?.modelUrl]);

  /* =======================================================
     LOAD THEMES
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadThemes() {
      try {
        setThemesLoading(true);
        const response = await fetch("/api/themes", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load themes");
        }

        if (!cancelled) {
          setThemes(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load themes:", err);
        if (!cancelled) setThemes([]);
      } finally {
        if (!cancelled) setThemesLoading(false);
      }
    }

    loadThemes();
    return () => { cancelled = true; };
  }, []);

  /* =======================================================
   LOAD INVENTORY
======================================================= */

useEffect(() => {
  let cancelled = false;

  async function loadInventory() {
    try {
      setInventoryLoading(true);

      const response = await fetch(
        "/api/inventory",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            "Failed to load inventory"
        );
      }

      if (!cancelled) {
        setInventory(
          Array.isArray(data)
            ? data
            : []
        );
      }
    } catch (error) {
      console.error(
        "Failed to load inventory:",
        error
      );

      if (!cancelled) {
        setInventory([]);
      }
    } finally {
      if (!cancelled) {
        setInventoryLoading(false);
      }
    }
  }

  loadInventory();

  return () => {
    cancelled = true;
  };
}, []);

  /* =======================================================
     PLACED ITEMS
  ======================================================= */

  const [items, setItems] =
    useState<FurnitureItem[]>(
      []
    );

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  /* =======================================================
     DRAGGING STATE
  ======================================================= */

  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<[number, number]>([0, 0]);
  const [dragGroupIds, setDragGroupIds] = useState<number[]>([]);
  const [dragGroupStartPositions, setDragGroupStartPositions] = useState<Record<number, [number, number, number]>>({});
  const [dragStartPosition, setDragStartPosition] = useState<[number, number, number] | null>(null);

  function handleStartDrag(id: number, e: ThreeEvent<PointerEvent>) {
    if (measureMode) return;

    const targetItem = items.find((it) => it.id === id);
    if (!targetItem) return;

    /* Move only the current selection. If this item is not part of the
       current selection, start a new one-item selection. This prevents a
       previously selected bulk group from moving when a different group is selected. */
    const group =
      selectedIds.includes(id) && selectedIds.length > 1
        ? selectedIds
        : [id];

    const starts: Record<number, [number, number, number]> = {};

    items.forEach((item) => {
      if (group.includes(item.id)) {
        starts[item.id] = [...item.position] as [number, number, number];
      }
    });

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();

    if (e.ray) {
      e.ray.intersectPlane(plane, point);
    }

    setDragOffset([
      targetItem.position[0] - point.x,
      targetItem.position[2] - point.z,
    ]);

    setDraggingId(id);
    setDragGroupIds(group);
    setDragGroupStartPositions(starts);
    setDragStartPosition([...targetItem.position]);
    setIsDragging(true);
  }

  function handleEndDrag() {
    setIsDragging(false);
    setDraggingId(null);
    setDragGroupIds([]);
    setDragStartPosition(null);
  }

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
    useState<"2D" | "3D" | "WALK">(
      "3D"
    );

  /* Read-only full-scene preview. */
  const [previewOpen, setPreviewOpen] = useState(false);

  /* =======================================================
     LOAD EDITOR
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    function toNumber(value: unknown): number | null {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }

    function normalizeDesignPayload(payload: unknown): any[] {
      if (Array.isArray(payload)) {
        return payload;
      }

      if (!payload || typeof payload !== "object") {
        return [];
      }

      const record = payload as Record<string, unknown>;

      const candidates = [
        record.designs,
        record.savedDesigns,
        record.data,
        record.items,
        record.results,
      ];

      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          return candidate;
        }
      }

      return [];
    }

    async function readJson(response: Response) {
      const text = await response.text();

      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    async function loadEditor() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams(
          window.location.search
        );

        const venueIdParam = params.get("venueId");
        const designIdParam = params.get("designId");

        let loadedVenue: Venue | null = null;

        /* =====================================================
           LOAD SAVED DESIGN

           First use the dedicated GET-by-id endpoint.
           If that endpoint cannot find it, fall back to the
           normal list endpoint and match the ID locally.
        ===================================================== */

        if (designIdParam) {
          const designId = toNumber(designIdParam);

          if (designId === null || designId <= 0) {
            throw new Error("Invalid saved design ID.");
          }

          let design: any = null;

          /* Attempt 1: dedicated GET-by-id endpoint. */
          try {
            const directResponse = await fetch(
              `/api/designs?id=${encodeURIComponent(String(designId))}&_=${Date.now()}`,
              {
                cache: "no-store",
              }
            );

            const directPayload = await readJson(directResponse);

            if (directResponse.ok && directPayload?.id != null) {
              design = directPayload;
            }
          } catch (directError) {
            console.error(
              "Direct saved-design request failed:",
              directError
            );
          }

          /* Attempt 2: fetch all designs and find the ID locally. */
          if (!design) {
            const listResponse = await fetch(
              `/api/designs?_=${Date.now()}`,
              {
                cache: "no-store",
              }
            );

            const listPayload = await readJson(listResponse);

            if (!listResponse.ok) {
              throw new Error(
                listPayload?.error ||
                  listPayload?.details ||
                  `Failed to load saved designs (status ${listResponse.status}).`
              );
            }

            const designs = normalizeDesignPayload(listPayload);

            design = designs.find(
              item => toNumber(item?.id) === designId
            ) || null;
          }

          if (!design) {
            throw new Error(
              `Saved design #${designId} could not be loaded.`
            );
          }

          if (cancelled) {
            return;
          }

          setCurrentDesignId(
            toNumber(design.id)
          );

          setCurrentDesignName(
            typeof design.name === "string" && design.name.trim()
              ? design.name
              : "Saved Design"
          );

          const savedThemeId =
            design.themeId === null ||
            design.themeId === undefined ||
            design.themeId === ""
              ? null
              : toNumber(design.themeId);

          setSelectedThemeId(
            savedThemeId
          );

          /* ===================================================
             LOAD THE VENUE BELONGING TO THE SAVED DESIGN
          =================================================== */

          const savedVenueId = toNumber(
            design.venueId
          );

          if (savedVenueId !== null) {
            const venueResponse = await fetch(
              `/api/venues?id=${encodeURIComponent(String(savedVenueId))}&_=${Date.now()}`,
              {
                cache: "no-store",
              }
            );

            const venuePayload = await readJson(
              venueResponse
            );

            if (!venueResponse.ok) {
              throw new Error(
                venuePayload?.error ||
                  venuePayload?.details ||
                  `Failed to load venue #${savedVenueId}.`
              );
            }

            loadedVenue = Array.isArray(venuePayload)
              ? venuePayload.find(
                  (item: Venue) =>
                    Number(item.id) === savedVenueId
                ) || null
              : venuePayload;

            if (!loadedVenue) {
              throw new Error(
                `Venue #${savedVenueId} could not be loaded.`
              );
            }

            setVenue(loadedVenue);

            localStorage.setItem(
              "selectedVenue",
              JSON.stringify(loadedVenue)
            );

            localStorage.setItem(
              "selectedVenueId",
              String(loadedVenue.id)
            );
          }

          /* ===================================================
             RESTORE THE SAVED FURNITURE LAYOUT
          =================================================== */

          let savedLayout: any = null;

          try {
            savedLayout =
              typeof design.layoutData === "string"
                ? JSON.parse(design.layoutData)
                : design.layoutData;
          } catch {
            savedLayout = null;
          }

          if (!savedLayout || !Array.isArray(savedLayout.items)) {
            throw new Error(
              "This saved design contains invalid layout data."
            );
          }

          if (!cancelled) {
            setItems(savedLayout.items);

            setSelectedId(
              savedLayout.items.length > 0
                ? Number(savedLayout.items[0].id)
                : null
            );
          }

          return;
        }

        /* =====================================================
           NO SAVED DESIGN: LOAD VENUE FROM URL
        ===================================================== */

        if (venueIdParam) {
          const venueId = toNumber(venueIdParam);

          if (venueId === null || venueId <= 0) {
            throw new Error("Invalid venue ID.");
          }

          const venueResponse = await fetch(
            `/api/venues?id=${encodeURIComponent(String(venueId))}&_=${Date.now()}`,
            {
              cache: "no-store",
            }
          );

          const venuePayload = await readJson(
            venueResponse
          );

          if (!venueResponse.ok) {
            throw new Error(
              venuePayload?.error ||
                venuePayload?.details ||
                `Failed to load venue #${venueId}.`
            );
          }

          loadedVenue = Array.isArray(venuePayload)
            ? venuePayload.find(
                (item: Venue) =>
                  Number(item.id) === venueId
              ) || null
            : venuePayload;

          if (!loadedVenue) {
            throw new Error(
              `Venue #${venueId} could not be loaded.`
            );
          }

          setVenue(loadedVenue);

          localStorage.setItem(
            "selectedVenue",
            JSON.stringify(loadedVenue)
          );

          localStorage.setItem(
            "selectedVenueId",
            String(loadedVenue.id)
          );

          /*
             Phase 5 matched-design handoff.

             When the planner comes from /match, the selected inventory is
             converted into real FurnitureItem objects and placed into the
             selected venue. This takes priority over the venue's old layout
             because the planner explicitly started a new matched design.
          */
          const matchedDesignParam =
            params.get("matchedDesign");

          if (matchedDesignParam === "1") {
            try {
              const rawMatchedDesign =
                localStorage.getItem(
                  "matched-design"
                );

              const parsedMatchedDesign =
                rawMatchedDesign
                  ? JSON.parse(
                      rawMatchedDesign
                    ) as MatchedDesignPayload
                  : null;

              const matchedVenueId =
                Number(
                  parsedMatchedDesign?.venueId
                );

              const selectedInventory =
                Array.isArray(
                  parsedMatchedDesign?.inventory
                )
                  ? parsedMatchedDesign.inventory
                  : [];

              if (
                parsedMatchedDesign &&
                matchedVenueId ===
                  Number(loadedVenue.id)
              ) {
                const matchedItems =
                  createMatchedFurnitureItems(
                    selectedInventory
                  );

                setItems(matchedItems);

                setSelectedId(
                  matchedItems.length > 0
                    ? matchedItems[0].id
                    : null
                );

                /*
                   Consume the one-time handoff so a later normal visit
                   to the designer cannot accidentally recreate this
                   matched design.
                */
                localStorage.removeItem(
                  "matched-design"
                );
              } else {
                throw new Error(
                  "The matched design does not belong to the selected venue."
                );
              }
            } catch (matchedDesignError) {
              console.error(
                "Unable to load matched design:",
                matchedDesignError
              );

              throw new Error(
                "Unable to prepare the matched design."
              );
            }
          } else if (loadedVenue.layoutData) {
            try {
              const saved =
                JSON.parse(
                  loadedVenue.layoutData
                );

              if (Array.isArray(saved?.items)) {
                setItems(saved.items);

                setSelectedId(
                  saved.items.length > 0
                    ? Number(saved.items[0].id)
                    : null
                );
              }
            } catch {
              console.log(
                "No valid saved venue layout."
              );
            }
          }
        }
      } catch (err) {
        console.error(
          "Unable to load editor:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load editor."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEditor();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     APPLY SAVED THEME AFTER THEMES LOAD
  ======================================================= */

  useEffect(() => {
    if (selectedThemeId === null) {
      setSelectedTheme(null);
      return;
    }

    const foundTheme = themes.find(theme => theme.id === selectedThemeId) || null;
    setSelectedTheme(foundTheme);
  }, [themes, selectedThemeId]);

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

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      /* MOVEMENT */

      const amount =
        e.shiftKey
          ? 0.5
          : 0.2;

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

        const movementIds =
          selectedIds.length > 1
            ? selectedIds
            : [selectedId];

        setItems((current) => {
          const moving = current.filter((item) => movementIds.includes(item.id));
          if (moving.length === 0) return current;
          const minX = Math.min(...moving.map((item) => item.position[0]));
          const maxX = Math.max(...moving.map((item) => item.position[0]));
          const minZ = Math.min(...moving.map((item) => item.position[2]));
          const maxZ = Math.max(...moving.map((item) => item.position[2]));
          const safeDx = THREE.MathUtils.clamp(dx, -5.5 - minX, 5.5 - maxX);
          const safeDz = THREE.MathUtils.clamp(dz, -5.5 - minZ, 5.5 - maxZ);
          return current.map((item) => movementIds.includes(item.id)
            ? { ...item, position: [item.position[0] + safeDx, 0, item.position[2] + safeDz] }
            : item
          );
        });
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
    inventoryItem: InventoryItem,
    count: number = 1,
    arrangement: "line" | "rows" | "grid" = "rows"
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

    const type =
      getInventoryElementType(
        inventoryItem
      );

    const alreadyPlaced = items.filter(
      (placed) => placed.inventoryId === inventoryItem.id
    ).length;
    const remainingQuantity = Math.max(
      0, inventoryItem.availableQuantity - alreadyPlaced
    );
    const validCount = Math.max(1, Math.min(50, count, remainingQuantity));

    if (remainingQuantity <= 0) {
      alert("No more units of this item are available.");
      return;
    }

    if (validCount === 1) {
      const id =
        Date.now();

      const item: FurnitureItem = {
        id,
        inventoryId:
          inventoryItem.id,
        groupId: id,
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
      return;
    }

    /* BULK ADDING: exact independent objects, real dimensions and safe spacing for every inventory item. */
    const colSpacing = Math.max((inventoryItem.width || 0.5) + 0.18, 0.65);
    const rowSpacing = Math.max((inventoryItem.depth || 0.5) + 0.4, 0.9);
    let cols: number;
    if (arrangement === "line") cols = validCount;
    else if (arrangement === "grid") cols = Math.ceil(Math.sqrt(validCount));
    else cols = Math.min(validCount, Math.max(2, Math.ceil(Math.sqrt(validCount * 1.5))));
    const rows = Math.ceil(validCount / cols);
    const newItems: FurnitureItem[] = [];
    const baseId = Date.now();
    const placementGroupId = baseId;

    for (let i = 0; i < validCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const itemsInThisRow =
        row === rows - 1 && validCount % cols !== 0 ? validCount % cols : cols;

      const posX = (col - (itemsInThisRow - 1) / 2) * colSpacing;
      const posZ = (row - (rows - 1) / 2) * rowSpacing;

      newItems.push({
        id: baseId + i,
        inventoryId: inventoryItem.id,
        groupId: placementGroupId,
        type,
        name: `${inventoryItem.name} #${i + 1}`,
        modelUrl: inventoryItem.modelUrl,
        imageUrl: inventoryItem.imageUrl,
        width: inventoryItem.width,
        depth: inventoryItem.depth,
        height: inventoryItem.height,
        position: [
          THREE.MathUtils.clamp(posX, -5.5, 5.5),
          0,
          THREE.MathUtils.clamp(posZ, -5.5, 5.5),
        ],
        rotation: 0,
      });
    }

    setItems(current => [...current, ...newItems]);
    setSelectedIds(newItems.map((item) => item.id));
    setSelectedId(newItems[0].id);
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

  function moveItem(id: number, position: [number, number, number]) {
    if (dragGroupIds.length > 1 && dragGroupIds.includes(id) && dragStartPosition) {
      let dx = position[0] - dragStartPosition[0];
      let dz = position[2] - dragStartPosition[2];

      // Clamp the group's translation once, rather than clamping each chair
      // separately. This keeps every selected chair at the same relative
      // position while the complete group remains inside the venue.
      const startPositions = dragGroupIds
        .map((itemId) => dragGroupStartPositions[itemId])
        .filter((start): start is [number, number, number] => Boolean(start));

      if (startPositions.length > 0) {
        const minX = Math.min(...startPositions.map((start) => start[0]));
        const maxX = Math.max(...startPositions.map((start) => start[0]));
        const minZ = Math.min(...startPositions.map((start) => start[2]));
        const maxZ = Math.max(...startPositions.map((start) => start[2]));

        dx = THREE.MathUtils.clamp(dx, -5.5 - minX, 5.5 - maxX);
        dz = THREE.MathUtils.clamp(dz, -5.5 - minZ, 5.5 - maxZ);
      }

      setItems(current => current.map(item => {
        if (!dragGroupIds.includes(item.id)) return item;
        const start = dragGroupStartPositions[item.id] || item.position;
        return { ...item, position: [start[0] + dx, 0, start[2] + dz] };
      }));
      return;
    }
    setItems(current => current.map(item => item.id === id ? { ...item, position } : item));
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
    if (selectedId === null) return;
    const idToDelete = selectedId;
    setItems((current) => current.filter((item) => item.id !== idToDelete));
    setSelectedIds((current) => current.filter((id) => id !== idToDelete));
    setSelectedId(null);
  }

  function deleteAllSelected() {
    const idsToDelete = selectedIds.length > 0
      ? selectedIds
      : selectedId === null ? [] : [selectedId];
    if (idsToDelete.length === 0) return;
    setItems((current) => current.filter((item) => !idsToDelete.includes(item.id)));
    setSelectedIds([]);
    setSelectedId(null);
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

  function selectSelectedGroup() {
    if (selectedId === null) return;
    const selectedItem = items.find((item) => item.id === selectedId);
    if (!selectedItem) return;
    const groupIds = selectedItem.groupId !== undefined
      ? items.filter((item) => item.groupId === selectedItem.groupId).map((item) => item.id)
      : [selectedItem.id];
    setSelectedIds(groupIds);
  }

  function moveIndividually() {
    if (selectedId !== null) setSelectedIds([selectedId]);
    else setSelectedIds([]);
  }

  /* =======================================================
     SAVE SCENE
  ======================================================= */

  async function saveScene() {
    const sceneData: SavedScene = { items };

    if (!venue) {
      alert("Please select a venue before saving your design.");
      return;
    }

    try {
      setSaving(true);

      const venueResponse = await fetch("/api/venues", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: venue.id,
          name: venue.name,
          location: venue.location,
          capacity: venue.capacity,
          type: venue.type,
          price: venue.price,
          availability: venue.availability,
          modelUrl: venue.modelUrl,
          layoutData: JSON.stringify(sceneData),
        }),
      });

      if (!venueResponse.ok) {
        throw new Error("Failed to save venue layout");
      }

      /* Update an existing saved design in place. */
      if (currentDesignId !== null) {
        const updateResponse = await fetch("/api/designs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDesignId,
            name:
              currentDesignName.trim() ||
              `${venue.name} Design`,
            venueId: venue.id,
            themeId: selectedTheme?.id ?? null,
            layoutData: JSON.stringify(sceneData),
          }),
        });

        const updateData = await updateResponse
          .json()
          .catch(() => null);

        if (!updateResponse.ok) {
          throw new Error(
            updateData?.error ||
              updateData?.details ||
              "Failed to update saved design"
          );
        }

        setCurrentDesignName(updateData?.name || currentDesignName);
        setSelectedThemeId(
          updateData?.themeId === null ||
          updateData?.themeId === undefined
            ? selectedTheme?.id ?? null
            : Number(updateData.themeId)
        );

        alert(
          "Design updated successfully with the selected theme!"
        );
        return;
      }

      const designName = window.prompt(
        "Enter a name for your design:",
        `${venue.name} Design`
      );

      if (designName === null) return;
      if (!designName.trim()) {
        alert("Please enter a valid design name.");
        return;
      }

      const designResponse = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: designName.trim(),
          venueId: venue.id,
          themeId: selectedTheme?.id ?? null,
          layoutData: JSON.stringify(sceneData),
        }),
      });

      const designData = await designResponse.json().catch(() => null);
      if (!designResponse.ok) {
        throw new Error(designData?.error || "Failed to save design");
      }

      setCurrentDesignId(Number(designData.id));
      setCurrentDesignName(designData.name || designName.trim());
      setSelectedThemeId(
        designData.themeId ?? selectedTheme?.id ?? null
      );

      window.history.replaceState({}, "", `/?venueId=${venue.id}&designId=${designData.id}`);
      alert("Design saved successfully! You can now find it in Saved Designs.");
    } catch (err) {
      console.error("Save design error:", err);
      alert(err instanceof Error ? err.message : "Could not save design.");
    } finally {
      setSaving(false);
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
          selectedTheme={selectedTheme}
          onSwitchTheme={() => setThemeModalOpen(true)}
          onPreview={() => setPreviewOpen(true)}
        />

        <PreviewOverlay
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          venue={venue}
          items={items}
          selectedTheme={selectedTheme}
          venuePlacementSurfaceY={venuePlacementSurfaceY}
          venueModelLoaded={venueModelLoaded}
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

          {activeNav === "Build" ? (
            <BuildPanel
              addItem={addItem}
              measureMode={measureMode}
              startMeasurement={startMeasurement}
              inventory={inventory}
              inventoryLoading={inventoryLoading}
              placedItems={items}
              onSelectSelectedGroup={selectSelectedGroup}
              onMoveIndividually={moveIndividually}
              selectedGroupCount={selectedIds.length}
            />
          ) : (
            <NavigationPanel
              active={activeNav}
              venue={venue}
              items={items}
            />
          )}

          {/* =================================================
              WORKSPACE
          ================================================= */}

          <div
            className="workspace"
            style={{
              background: selectedTheme?.secondaryColor || undefined,
              transition: "background 0.3s ease",
            }}
          >

            {viewMode === "3D" && <VenueModelNotice url={venue?.modelUrl || null} />}

            {/* Visible group controls. They operate only on the currently selected
                placement group and never on unrelated groups elsewhere in the venue. */}
            {viewMode !== "WALK" && items.length > 0 && (
              <div className="chair-group-controls" role="group" aria-label="Selected group movement controls">
                <button type="button" className="move-all-chairs-button" onClick={selectSelectedGroup}
                  title="Select and move only the placement group of the current object">
                  <span className="chair-group-button-icon">↔️</span>
                  <span>Move Selected Group</span>
                </button>
                {selectedIds.length > 1 && (
                  <button type="button" className="move-chairs-individually-button" onClick={moveIndividually}
                    title="Return the current object to individual movement">
                    Move Individually
                  </button>
                )}
              </div>
            )}

            <Canvas
              shadows={viewMode !== "2D"}

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

              {!venueModelLoaded && (
                <Floor
                  primaryColor={selectedTheme?.primaryColor || "#2563eb"}
                  secondaryColor={selectedTheme?.secondaryColor || "#f8fafc"}
                  onClear={() => {
                    if (!measureMode) {
                      setSelectedId(null);
                    }
                  }}
                />
              )}

              {/* =================================================
                  UPLOADED VENUE MODEL

                  The uploaded venue replaces the editor's temporary grid platform
                  after it has loaded successfully. Its visible materials are rebuilt
                  from the active theme so dark or missing source textures cannot make
                  the venue appear as a black shape.
              ================================================= */}

              {viewMode !== "2D" && venue?.modelUrl && (
                <ModelErrorBoundary key={venue.modelUrl}>
                  <Suspense fallback={null}>
                    <VenueModel
                      url={venue.modelUrl}
                      primaryColor={selectedTheme?.primaryColor || "#2563eb"}
                      secondaryColor={selectedTheme?.secondaryColor || "#f8fafc"}
                      onLoaded={(placementHeight) => {
                        setVenuePlacementSurfaceY(placementHeight);
                        setVenueModelLoaded(true);
                      }}
                    />
                  </Suspense>
                </ModelErrorBoundary>
              )}

              {/* =================================================
                  FURNITURE
              ================================================= */}

              {items.map(
                item =>
                  viewMode !== "2D" ? (
                    <Furniture3D
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      placementSurfaceY={venueModelLoaded ? venuePlacementSurfaceY : 0}
                      selected={selectedIds.includes(item.id) || selectedId === item.id}
                      measureMode={
                        measureMode
                      }
                      measureSelected={
                        measurementStartId ===
                          item.id ||
                        measurementEndId ===
                          item.id
                      }
                      onSelect={(e) => {
                        setSelectedId(item.id);
                        setSelectedIds((current) => {
                          if (e.shiftKey) {
                            return current.includes(item.id)
                              ? current.filter((selected) => selected !== item.id)
                              : [...current, item.id];
                          }

                          /* Keep an already selected chair group intact while dragging it. */
                          if (current.length > 1 && current.includes(item.id)) {
                            return current;
                          }

                          return [item.id];
                        });
                      }}
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
                      onStartDrag={
                        handleStartDrag
                      }
                      readOnly={viewMode === "WALK"}
                    />
                  ) : (
                    <Furniture2D
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      selected={selectedIds.includes(item.id) || selectedId === item.id}
                      measureMode={
                        measureMode
                      }
                      measureSelected={
                        measurementStartId ===
                          item.id ||
                        measurementEndId ===
                          item.id
                      }
                      onSelect={(e) => {
                        setSelectedId(item.id);
                        setSelectedIds((current) => {
                          if (e.shiftKey) {
                            return current.includes(item.id)
                              ? current.filter((selected) => selected !== item.id)
                              : [...current, item.id];
                          }

                          /* Keep an already selected chair group intact while dragging it. */
                          if (current.length > 1 && current.includes(item.id)) {
                            return current;
                          }

                          return [item.id];
                        });
                      }}
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
                      onStartDrag={
                        handleStartDrag
                      }
                    />
                  )
              )}

              {/* =================================================
                  DRAG CONTROLLER
              ================================================= */}

              <DragController
                isDragging={isDragging}
                draggingId={draggingId}
                dragOffset={dragOffset}
                onMove={moveItem}
                onDragEnd={handleEndDrag}
              />

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
                  viewMode !== "2D"
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
                  viewMode !== "2D"
                    ? 2
                    : 1
                }
                castShadow={viewMode !== "2D"}
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

              {viewMode === "WALK" ? (
                <FirstPersonWalker enabled />
              ) : (
                <OrbitControls
                  makeDefault
                  enabled={!isDragging}
                  enableRotate={!isDragging && viewMode === "3D"}
                  enablePan={!isDragging}
                  minDistance={3}
                  maxDistance={18}
                  maxPolarAngle={Math.PI / 2.05}
                />
              )}
            </Canvas>


            {/* =================================================
                WORKSPACE TITLE
            ================================================= */}

            {viewMode !== "WALK" && (
              <div className="workspace-title">
                <span>
                  {viewMode} VIEW
                </span>

                <strong>
                  {viewMode === "2D"
                    ? "Top View • Real Scale"
                    : venue?.name || "Wedding Venue"}
                </strong>
              </div>
            )}

            {viewMode === "WALK" && (
              <>
                <button
                  type="button"
                  className="walk-exit-button"
                  onClick={() => setViewMode("3D")}
                  aria-label="Exit walk view"
                  title="Exit Walk view"
                >
                  ×
                </button>

                <div className="walk-navigation-controls" aria-label="Walk navigation">
                  <button
                    type="button"
                    className="walk-arrow walk-arrow-up"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent<WalkDirection>("wedding-walk-step", {
                          detail: "forward",
                        })
                      )
                    }
                    aria-label="Move forward"
                  >
                    ↑
                  </button>

                  <div className="walk-arrow-row">
                    <button
                      type="button"
                      className="walk-arrow"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent<WalkDirection>("wedding-walk-step", {
                            detail: "left",
                          })
                        )
                      }
                      aria-label="Move left"
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      className="walk-arrow walk-arrow-down"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent<WalkDirection>("wedding-walk-step", {
                            detail: "back",
                          })
                        )
                      }
                      aria-label="Move backward"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="walk-arrow"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent<WalkDirection>("wedding-walk-step", {
                            detail: "right",
                          })
                        )
                      }
                      aria-label="Move right"
                    >
                      →
                    </button>
                  </div>
                </div>
              </>
            )}

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
            selected={selected}
            deleteSelected={deleteSelected}
            deleteAllSelected={deleteAllSelected}
            selectedCount={selectedIds.length || (selectedId !== null ? 1 : 0)}
            rotateSelected={rotateSelected}
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
          min-height: 76px;
          flex-shrink: 0;
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 22px;
          background: #ffffff;
          border-bottom: 1px solid #dfe2e6;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
          z-index: 30;
          overflow: visible;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          text-decoration: none;
          color: inherit;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          border-radius: 10px;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          font-weight: 900;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.2);
        }

        .brand-title {
          font-size: 16px;
          font-weight: 900;
          color: #1f2937;
          letter-spacing: 0.1px;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #64748b;
          margin-top: 3px;
          font-weight: 600;
        }

        /* Main navigation is kept in the normal flex layout so it never
           overlaps the project title or disappears behind another element. */
        .main-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          flex: 1 1 auto;
          min-width: 0;
          margin: 0 auto;
          padding: 5px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 12px;
          white-space: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: thin;
        }

        .top-nav-link {
          flex: 0 0 auto;
          text-decoration: none;
          color: #334155;
          padding: 9px 10px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1;
          font-weight: 800;
          text-align: center;
          transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .top-nav-link:hover {
          background: #2563eb;
          color: #ffffff;
          transform: translateY(-1px);
        }

        .top-nav-link:first-child {
          background: #e0ecff;
          color: #1d4ed8;
        }

        /* The old absolutely positioned title could sit on top of navigation
           links. Keep it out of the flex row on normal desktop widths. */
        .project-title {
          display: none;
        }

        .project-small {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 800;
          letter-spacing: 1.2px;
        }

        .project-name {
          font-size: 14px;
          font-weight: 900;
          color: #334155;
          margin-top: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .top-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-left: auto;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .saved-status {
          font-size: 11px;
          color: #15803d;
          font-weight: 800;
        }

        .status-dot {
          font-size: 10px;
        }

        .save-button {
          border: none;
          background: #2563eb;
          color: #ffffff;
          border-radius: 8px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.22);
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .save-button:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .view-toggle {
          display: flex;
          border: 1px solid #d7dce2;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafc;
        }

        .view-toggle button {
          border: none;
          background: transparent;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .view-toggle button + button {
          border-left: 1px solid #d7dce2;
        }

        .view-toggle .view-active {
          background: #2563eb;
          color: #ffffff;
        }

        .walk-exit-button {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 45;
          width: 30px;
          height: 30px;
          border: 1px solid rgba(37, 99, 235, 0.28);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.94);
          color: #1e3a8a;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);
          font-size: 20px;
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform 0.18s ease, background 0.18s ease;
        }

        .walk-exit-button:hover {
          transform: scale(1.06);
          background: #ffffff;
        }

        .walk-navigation-controls {
          position: absolute;
          right: 12px;
          bottom: max(12px, env(safe-area-inset-bottom));
          left: auto;
          transform: none;
          z-index: 45;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 5px;
          border: 1px solid rgba(37, 99, 235, 0.22);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.88);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(8px);
        }

        .walk-arrow-row {
          display: flex;
          gap: 3px;
        }

        .walk-arrow {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(37, 99, 235, 0.22);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.96);
          color: #1d4ed8;
          font-size: 18px;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
          display: grid;
          place-items: center;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.10);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .walk-arrow:hover,
        .walk-arrow:active {
          background: #2563eb;
          color: #ffffff;
          transform: scale(0.96);
        }

        html[data-theme="dark"] .walk-exit-button,
        html[data-theme="dark"] .walk-navigation-controls,
        html[data-theme="dark"] .walk-arrow {
          background: rgba(23, 34, 53, 0.94);
          border-color: #3a4d67;
          color: #bfdbfe;
        }

        html[data-theme="dark"] .walk-arrow:hover,
        html[data-theme="dark"] .walk-arrow:active {
          background: #2563eb;
          color: #ffffff;
        }

        @media (max-width: 844px) {
          .walk-exit-button {
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            font-size: 18px;
          }

          .walk-navigation-controls {
            right: 8px;
            bottom: max(8px, env(safe-area-inset-bottom));
            padding: 4px;
            gap: 2px;
            border-radius: 12px;
          }

          .walk-arrow-row {
            gap: 2px;
          }

          .walk-arrow {
            width: 30px;
            height: 30px;
            font-size: 17px;
          }
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


        .select-all-chairs-button { position: absolute; top: 15px; right: 18px; z-index: 30; border: 1px solid #2563eb; background: #fff; color: #2563eb; border-radius: 8px; padding: 9px 12px; font-weight: 800; cursor: pointer; font-size: 12px; }
        /* Always-visible chair movement controls */
        .chair-group-controls {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 20;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          width: max-content;
          max-width: calc(100% - 36px);
          pointer-events: auto;
        }

        .move-all-chairs-button,
        .move-chairs-individually-button {
          border-radius: 10px;
          cursor: pointer;
          font-weight: 800;
          transition: all 0.2s ease;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
        }

        .move-all-chairs-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 10px;
          border: 1px solid #2563eb;
          background: #2563eb;
          color: #ffffff;
          font-size: 11px;
          white-space: nowrap;
        }

        .move-all-chairs-button:hover {
          transform: translateY(-1px);
          background: #1d4ed8;
        }

        .move-all-chairs-button.active {
          background: #15803d;
          border-color: #15803d;
        }

        .chair-group-button-icon {
          font-size: 14px;
          line-height: 1;
        }

        .move-chairs-individually-button {
          padding: 7px 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 11px;
          white-space: nowrap;
        }

        .move-chairs-individually-button:hover {
          background: #f8fafc;
        }

        @media (max-width: 1100px) {
          .chair-group-controls {
            top: 14px;
            right: 14px;
            max-width: calc(100% - 28px);
          }
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

        .workspace-theme-status {
          margin-top: 8px;
          min-width: 220px;
          max-width: 320px;
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.45);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.94);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
        }

        .workspace-theme-status-title {
          color: #1e293b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
        }

        .workspace-theme-status-text {
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.45;
        }

        .workspace-theme-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 9px;
          padding: 6px 10px;
          border: 0;
          border-radius: 7px;
          background: #2563eb;
          color: #ffffff;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        .workspace-theme-action:hover {
          background: #1d4ed8;
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
          flex-wrap: wrap;
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

        .delete-button.delete-all-button {
          flex-basis: 100%;
          width: 100%;
          margin-top: 2px;
          background: #991b1b;
          color: #ffffff;
          border-color: #991b1b;
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


        /* =====================================================
           FINAL DARK MODE + TOPBAR VISIBILITY
        ===================================================== */
        html[data-theme="dark"] .editor { background: #0f1726; color: #e7edf7; }
        html[data-theme="dark"] .topbar { background: #162033; border-bottom-color: #334155; box-shadow: 0 4px 18px rgba(0,0,0,.3); }
        html[data-theme="dark"] .main-navigation { background: #1b2940; border-color: #3b4b63; }
        html[data-theme="dark"] .top-nav-link { color: #cbd5e1; }
        html[data-theme="dark"] .top-nav-link:hover { background: #334155; color: #ffffff; }
        html[data-theme="dark"] .top-nav-link.active,
        html[data-theme="dark"] .top-nav-link:first-child { background: #2563eb !important; color: #ffffff !important; }
        html[data-theme="dark"] .brand-title, html[data-theme="dark"] .workspace-title, html[data-theme="dark"] .properties-title, html[data-theme="dark"] .panel-heading { color: #f8fafc !important; }
        html[data-theme="dark"] .brand-subtitle, html[data-theme="dark"] .workspace-theme-status-text { color: #94a3b8 !important; }
        html[data-theme="dark"] .left-nav, html[data-theme="dark"] .build-panel, html[data-theme="dark"] .properties-panel, html[data-theme="dark"] .workspace { background: #162033 !important; border-color: #334155 !important; }
        html[data-theme="dark"] .panel-content, html[data-theme="dark"] .tip-box, html[data-theme="dark"] .selected-card, html[data-theme="dark"] .bulk-item-panel { background: #1b2940 !important; border-color: #3b4b63 !important; color: #e7edf7 !important; }
        html[data-theme="dark"] .element-button { background: #1b2940 !important; border-color: #3b4b63 !important; }
        html[data-theme="dark"] .element-name, html[data-theme="dark"] .section-title { color: #f8fafc !important; }
        html[data-theme="dark"] .element-category, html[data-theme="dark"] .element-dims { color: #94a3b8 !important; }
        html[data-theme="dark"] .theme-modal-card { background: #162033 !important; color: #e7edf7 !important; }
        .top-actions { margin-left: 0 !important; }
        .topbar > .theme-toggle { margin-left: auto !important; flex: 0 0 46px; }
        html[data-theme="dark"] .view-toggle { background: #1b2940; border-color: #3b4b63; }
        html[data-theme="dark"] .view-toggle button { color: #cbd5e1; }
        html[data-theme="dark"] .view-toggle .view-active { background: #2563eb; color: #ffffff; }

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

        @media (max-width: 1250px) {
          .main-navigation {
            flex: 1 1 auto;
            justify-content: center;
          }
        }

        @media (max-width: 900px) {
          .topbar {
            min-height: auto;
            flex-wrap: wrap;
            padding: 10px 14px;
          }

          .main-navigation {
            order: 3;
            width: 100%;
            flex-basis: 100%;
            justify-content: flex-start;
            overflow-x: auto;
          }

          .saved-status {
            display: none;
          }
        }

        @media (max-width: 620px) {
          .brand-subtitle {
            display: none;
          }

          .brand-title {
            font-size: 14px;
          }

          .top-nav-link {
            padding: 8px 10px;
            font-size: 11px;
          }

          .save-button {
            padding: 9px 11px;
          }
        }


        /* =====================================================
           MOBILE + TABLET RESPONSIVE OPTIMIZATION
           These rules preserve the desktop editor and only
           reorganize the existing controls on smaller screens.
        ===================================================== */

        html,
        body,
        #__next {
          max-width: 100%;
        }

        .editor,
        .editor-body,
        .workspace {
          min-width: 0;
        }

        @media (max-width: 760px) {
          html,
          body {
            overflow: hidden;
            overscroll-behavior: none;
          }

          .topbar {
            min-height: auto;
            gap: 8px;
            padding: 8px 10px;
            align-items: center;
            flex-wrap: wrap;
          }

          .brand {
            flex: 1 1 auto;
            min-width: 0;
            gap: 8px;
          }

          .brand-icon {
            width: 36px;
            height: 36px;
            font-size: 17px;
          }

          .brand-title {
            max-width: min(44vw, 220px);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 14px;
          }

          .topbar > .theme-toggle {
            width: 40px;
            height: 40px;
            flex: 0 0 40px;
            margin-left: 0 !important;
          }

          .top-actions {
            order: 2;
            width: 100%;
            flex: 1 0 100%;
            justify-content: flex-start;
            gap: 7px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 2px 0 5px;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .top-actions::-webkit-scrollbar,
          .main-navigation::-webkit-scrollbar {
            display: none;
          }

          .top-actions > button,
          .top-actions > div {
            flex: 0 0 auto;
          }

          .top-actions > button:first-child {
            max-width: min(52vw, 240px);
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .preview-button {
            width: 40px;
            height: 40px;
            flex-basis: 40px;
          }

          .save-button {
            padding: 10px 12px;
            min-height: 40px;
          }

          .view-toggle button {
            min-height: 40px;
            padding: 9px 12px;
          }

          .main-navigation {
            order: 3;
            width: 100%;
            flex: 1 0 100%;
            justify-content: flex-start;
            gap: 4px;
            padding: 4px;
            border-radius: 10px;
            scroll-snap-type: x proximity;
          }

          .top-nav-link {
            scroll-snap-align: start;
            padding: 10px 11px;
            min-height: 40px;
            display: inline-flex;
            align-items: center;
          }

          .editor-body {
            position: relative;
            flex-direction: column;
            min-height: 0;
            overflow: hidden;
          }

          .left-nav {
            width: 100%;
            height: 58px;
            min-height: 58px;
            flex-direction: row;
            align-items: stretch;
            justify-content: flex-start;
            gap: 5px;
            padding: 6px 8px;
            overflow-x: auto;
            overflow-y: hidden;
            border-right: none;
            border-bottom: 1px solid #dfe2e6;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          .left-nav::-webkit-scrollbar {
            display: none;
          }

          .nav-item {
            width: auto;
            min-width: 68px;
            flex: 0 0 auto;
            min-height: 44px;
            padding: 5px 8px;
            flex-direction: row;
            justify-content: center;
            gap: 5px;
            font-size: 10px;
          }

          .nav-icon {
            font-size: 15px;
          }

          .nav-spacer {
            display: none;
          }

          .build-panel {
            width: 100%;
            max-height: min(36vh, 300px);
            min-height: 0;
            flex: 0 0 auto;
            border-right: none;
            border-bottom: 1px solid #dfe2e6;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .panel-heading {
            padding: 12px 16px;
            font-size: 15px;
          }

          .panel-content {
            padding: 12px;
          }

          .properties-panel {
            display: none;
          }

          .workspace {
            width: 100%;
            min-height: 0;
            flex: 1 1 auto;
          }

          .workspace-title {
            top: 10px;
            left: 10px;
            max-width: calc(100% - 20px);
            padding: 7px 9px;
          }

          .workspace-title strong {
            max-width: min(60vw, 280px);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .plan-info {
            display: none;
          }

          .chair-group-controls {
            top: 10px;
            right: 10px;
            max-width: calc(100% - 20px);
          }

          .bottom-toolbar {
            left: 50%;
            right: auto;
            bottom: 10px;
            width: calc(100% - 20px);
            max-width: 430px;
            transform: translateX(-50%);
            justify-content: flex-start;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 4px;
            scrollbar-width: none;
          }

          .bottom-toolbar::-webkit-scrollbar {
            display: none;
          }

          .bottom-tool {
            min-width: 60px;
            min-height: 44px;
            flex: 0 0 auto;
          }

          .scale-display {
            flex: 0 0 auto;
            margin-left: 4px;
          }

          .theme-modal-card {
            width: min(100%, 760px) !important;
            max-height: calc(100dvh - 24px) !important;
            padding: 16px !important;
            border-radius: 16px !important;
          }

          .theme-modal-card > div:first-child {
            align-items: flex-start !important;
            gap: 10px !important;
          }

          .theme-modal-card h2 {
            font-size: 18px;
          }
        }

        @media (max-width: 480px) {
          .topbar {
            padding: 7px 8px;
          }

          .brand-icon {
            width: 34px;
            height: 34px;
          }

          .brand-title {
            max-width: 52vw;
            font-size: 13px;
          }

          .top-actions {
            gap: 6px;
          }

          .top-actions > button:first-child {
            max-width: 48vw;
            font-size: 11px !important;
          }

          .main-navigation {
            border-radius: 9px;
          }

          .top-nav-link {
            padding: 9px 10px;
            font-size: 10px;
          }

          .left-nav {
            height: 54px;
            min-height: 54px;
            padding: 5px 6px;
          }

          .nav-item {
            min-width: 64px;
            min-height: 42px;
            padding: 5px 6px;
            font-size: 9px;
          }

          .build-panel {
            max-height: min(34vh, 250px);
          }

          .panel-heading {
            padding: 10px 12px;
          }

          .panel-content {
            padding: 10px;
          }

          .element-button,
          .tool-button {
            min-height: 44px;
          }

          .chair-group-controls {
            top: 8px;
            right: 8px;
          }

          .move-all-chairs-button,
          .move-chairs-individually-button {
            max-width: 180px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .workspace-title {
            top: 8px;
            left: 8px;
          }

          .workspace-theme-status {
            min-width: 0;
            max-width: calc(100vw - 16px);
          }

          .bottom-toolbar {
            bottom: 8px;
            width: calc(100% - 16px);
          }

          .preview-toolbar {
            min-height: 62px;
            gap: 8px;
            padding: 8px 10px;
          }

          .preview-toolbar strong {
            max-width: 52vw;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 15px;
          }

          .preview-close-button {
            min-height: 40px;
            padding: 9px 11px;
            font-size: 11px;
          }
        }

        @media (max-width: 380px) {
          .brand-title {
            max-width: 45vw;
          }

          .top-actions > button:first-child {
            max-width: 44vw;
          }

          .build-panel {
            max-height: min(32vh, 220px);
          }

          .workspace-title {
            display: none;
          }

          .nav-item {
            min-width: 60px;
          }
        }

        @media (pointer: coarse) {
          .top-nav-link,
          .nav-item,
          .element-button,
          .tool-button,
          .save-button,
          .preview-button,
          .preview-close-button,
          .move-all-chairs-button,
          .move-chairs-individually-button {
            touch-action: manipulation;
          }
        }

        /* =====================================================
           READ-ONLY 3D PREVIEW
        ===================================================== */

        .preview-button {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0;
          background: #ffffff;
          color: #2563eb;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .preview-button svg {
          width: 21px;
          height: 21px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.9;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .preview-button:hover {
          background: #eff6ff;
          border-color: #93c5fd;
          box-shadow: 0 7px 18px rgba(37, 99, 235, 0.16);
          transform: translateY(-1px);
        }

        .preview-button:active {
          transform: translateY(0) scale(0.96);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
        }

        .preview-button:focus-visible {
          outline: 3px solid rgba(37, 99, 235, 0.28);
          outline-offset: 2px;
        }

        .preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          animation: preview-fade-in 0.2s ease-out;
        }

        @keyframes preview-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .preview-toolbar {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 12px 22px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #dbe1ea;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);
          z-index: 2;
          animation: preview-toolbar-in 0.24s ease-out;
        }

        @keyframes preview-toolbar-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .preview-toolbar > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .preview-label {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          color: #2563eb;
        }

        .preview-toolbar strong {
          font-size: 18px;
          color: #1f2937;
        }

        .preview-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .preview-hint {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }

        .preview-close-button {
          border: none;
          border-radius: 10px;
          padding: 11px 16px;
          background: #2563eb;
          color: #ffffff;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.22);
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }

        .preview-close-button:hover {
          background: #1d4ed8;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
          transform: translateY(-1px);
        }

        .preview-close-button:active {
          transform: translateY(0) scale(0.98);
        }

        .preview-canvas {
          flex: 1;
          min-height: 0;
          touch-action: none;
        }

        @media (max-width: 760px) {
          .preview-toolbar {
            padding: 10px 12px;
          }

          .preview-hint {
            display: none;
          }
        }

        /* =====================================================
           FINAL MOBILE EDITOR LAYOUT
           Keep the desktop layout untouched. On phones the side
           panel becomes an overlay so the 3D workspace always has
           usable space instead of being pushed below the fold.
        ===================================================== */
        @media (max-width: 760px) {
          html,
          body,
          #__next {
            width: 100%;
            min-width: 0;
            height: 100%;
            min-height: 100%;
            overflow: hidden;
          }

          .editor {
            width: 100%;
            height: 100dvh;
            min-height: 100dvh;
            overflow: hidden;
          }

          /* Compact three-row header: brand, editor actions, navigation. */
          .topbar {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 42px;
            grid-template-areas:
              "brand theme"
              "actions actions"
              "navigation navigation";
            gap: 6px;
            padding: 7px 8px 8px;
            flex: 0 0 auto;
          }

          .brand {
            grid-area: brand;
            min-height: 42px;
            align-items: center;
          }

          .brand-icon {
            width: 34px;
            height: 34px;
          }

          .brand-title {
            max-width: 62vw;
            font-size: 14px;
          }

          .brand-subtitle {
            display: none;
          }

          .topbar > .theme-toggle {
            grid-area: theme;
            width: 42px;
            height: 42px;
            min-height: 42px;
            margin: 0 !important;
            justify-self: end;
          }

          .top-actions {
            grid-area: actions;
            order: initial;
            width: 100%;
            min-width: 0;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 6px;
            padding: 0;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
          }

          .top-actions > button:first-child {
            flex: 0 0 82px;
            width: 82px;
            min-width: 82px;
            max-width: 82px;
            min-height: 40px;
            padding: 8px !important;
            font-size: 0 !important;
            overflow: visible;
          }

          .top-actions > button:first-child::after {
            content: "✨ Theme";
            font-size: 11px;
            font-weight: 800;
          }

          .saved-status {
            display: none;
          }

          .preview-button {
            width: 40px;
            height: 40px;
            min-width: 40px;
            flex: 0 0 40px;
          }

          .save-button {
            flex: 0 0 82px;
            width: 82px;
            min-width: 82px;
            min-height: 40px;
            padding: 8px !important;
            font-size: 0 !important;
          }

          .save-button::after {
            content: "💾 Save";
            font-size: 11px;
            font-weight: 800;
          }

          .view-toggle {
            flex: 0 0 auto;
            min-height: 40px;
          }

          .view-toggle button {
            min-width: 42px;
            min-height: 40px;
            padding: 8px 10px;
          }

          .main-navigation {
            grid-area: navigation;
            order: initial;
            width: 100%;
            min-width: 0;
            flex: none;
            min-height: 44px;
            justify-content: flex-start;
            padding: 3px;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
          }

          .main-navigation::-webkit-scrollbar,
          .top-actions::-webkit-scrollbar {
            display: none;
          }

          .top-nav-link {
            min-height: 36px;
            padding: 8px 10px;
            font-size: 10px;
          }

          .editor-body {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }

          .left-nav {
            position: relative;
            z-index: 45;
            width: 100%;
            height: 52px;
            min-height: 52px;
            padding: 5px 6px;
            flex: 0 0 52px;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
          }

          .nav-item {
            min-width: 66px;
            min-height: 40px;
            padding: 5px 7px;
          }

          /* The content panel floats over the workspace instead of consuming
             most of the phone height. It remains fully scrollable and usable. */
          .build-panel {
            position: absolute;
            top: 52px;
            left: 0;
            right: 0;
            width: 100%;
            max-height: min(190px, 34dvh);
            min-height: 0;
            z-index: 40;
            flex: none;
            border-right: none;
            border-bottom: 1px solid #dfe2e6;
            border-radius: 0 0 14px 14px;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
            overflow-y: auto;
            overscroll-behavior: contain;
          }

          .panel-heading {
            position: sticky;
            top: 0;
            z-index: 1;
            padding: 10px 14px;
            font-size: 14px;
            background: inherit;
          }

          .panel-content {
            padding: 10px 12px 14px;
          }

          .properties-panel {
            display: none;
          }

          .workspace {
            position: relative;
            width: 100%;
            flex: 1 1 auto;
            min-height: 0;
            z-index: 1;
          }

          .workspace-title {
            top: 10px;
            left: 10px;
            z-index: 25;
            max-width: calc(100% - 20px);
          }

          .chair-group-controls {
            top: auto;
            right: 10px;
            bottom: 70px;
            z-index: 30;
            max-width: calc(100% - 20px);
          }

          .move-all-chairs-button,
          .move-chairs-individually-button {
            max-width: min(220px, calc(100vw - 20px));
          }

          .bottom-toolbar {
            z-index: 35;
            bottom: 8px;
          }

          .plan-info {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .topbar {
            gap: 5px;
            padding: 6px;
          }

          .brand-title {
            max-width: 58vw;
            font-size: 13px;
          }

          .top-actions {
            gap: 5px;
          }

          .top-actions > button:first-child {
            flex-basis: 74px;
            width: 74px;
            min-width: 74px;
            max-width: 74px;
          }

          .save-button {
            flex-basis: 74px;
            width: 74px;
            min-width: 74px;
          }

          .main-navigation {
            min-height: 42px;
          }

          .top-nav-link {
            min-height: 34px;
            padding: 7px 9px;
          }

          .left-nav {
            height: 48px;
            min-height: 48px;
            flex-basis: 48px;
          }

          .nav-item {
            min-width: 62px;
            min-height: 38px;
            font-size: 9px;
          }

          .build-panel {
            top: 48px;
            max-height: min(170px, 32dvh);
          }

          .workspace-title {
            padding: 6px 8px;
          }

          .workspace-title strong {
            max-width: 54vw;
          }
        }

        /* =====================================================
           PHONE LANDSCAPE MODE
           The 3D editor needs horizontal workspace. Phones cannot
           be physically rotated by CSS, so portrait mode shows a
           rotate prompt and the full editor automatically uses this
           layout as soon as the device is turned sideways.
        ===================================================== */
        @media (max-width: 500px) and (orientation: portrait) {
          .editor::after {
            content: "↻ Rotate your phone sideways to use the Wedding Planner";
            position: fixed;
            inset: 0;
            z-index: 5000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
            color: #ffffff;
            background: rgba(15, 23, 42, 0.97);
            font-size: 18px;
            font-weight: 800;
            line-height: 1.6;
          }
        }

        @media (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
          html,
          body,
          #__next {
            width: 100vw;
            height: 100dvh;
            overflow: hidden;
          }

          .editor {
            width: 100vw;
            height: 100dvh;
            min-height: 0;
          }

          /* One compact horizontal control strip. */
          .topbar {
            display: grid;
            grid-template-columns: minmax(140px, 1fr) auto 38px;
            grid-template-areas:
              "brand actions theme"
              "navigation navigation navigation";
            gap: 4px 8px;
            padding: 5px 8px;
            min-height: 0;
          }

          .topbar > .brand {
            grid-area: brand;
          }

          .topbar > .main-navigation {
            grid-area: navigation;
          }

          .topbar > .top-actions {
            grid-area: actions;
          }

          .topbar > .theme-toggle {
            grid-area: theme;
            margin-left: 0 !important;
          }

          .brand {
            min-height: 38px;
          }

          .brand-icon {
            width: 32px;
            height: 32px;
            font-size: 16px;
          }

          .brand-title {
            max-width: none;
            font-size: 13px;
          }

          .topbar > .theme-toggle {
            width: 38px;
            height: 38px;
            min-height: 38px;
          }

          .top-actions {
            width: auto;
            max-width: 430px;
            justify-content: flex-end;
            overflow: hidden;
            gap: 5px;
            min-width: 0;
          }

          /* The ready/saving label is useful on desktop but consumes
             valuable horizontal space on a 844 × 390 phone. */
          .saved-status {
            display: none;
          }

          .top-actions > button:first-child,
          .save-button {
            flex: 0 0 auto;
            width: auto;
            min-width: 0;
            max-width: none;
            min-height: 38px;
            padding: 7px 9px !important;
            font-size: 0 !important;
          }

          .top-actions > button:first-child::after {
            content: "✨ Theme";
            font-size: 10px;
          }

          .save-button::after {
            content: "💾 Save";
            font-size: 10px;
          }

          .preview-button {
            width: 38px;
            min-width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .view-toggle {
            min-height: 38px;
          }

          .view-toggle button {
            min-width: 38px;
            min-height: 38px;
            padding: 7px 9px;
          }

          .main-navigation {
            min-height: 38px;
            padding: 2px;
            justify-content: center;
            overflow-x: auto;
          }

          .top-nav-link {
            min-height: 32px;
            padding: 6px 11px;
            font-size: 10px;
          }

          /* Restore the editor's true horizontal workspace. */
          .editor-body {
            flex-direction: row;
            min-height: 0;
          }

          .left-nav {
            width: 58px;
            min-width: 58px;
            height: auto;
            min-height: 0;
            flex: 0 0 58px;
            flex-direction: column;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 5px;
          }

          .nav-item {
            width: 100%;
            min-width: 0;
            min-height: 50px;
            padding: 6px 4px;
            font-size: 8px;
          }

          /* The build panel opens beside the vertical tool rail and
             overlays only part of the canvas instead of using page height. */
          .build-panel {
            top: 0;
            bottom: 0;
            left: 58px;
            right: auto;
            width: min(300px, 42vw);
            max-height: none;
            height: auto;
            border-bottom: none;
            border-right: 1px solid #dfe2e6;
            border-radius: 0;
            box-shadow: 10px 0 24px rgba(15, 23, 42, 0.12);
          }

          .panel-heading {
            padding: 8px 10px;
            font-size: 13px;
          }

          .panel-content {
            padding: 8px 10px 12px;
          }

          .workspace {
            flex: 1 1 auto;
            min-width: 0;
            min-height: 0;
          }

          .workspace-title {
            top: 8px;
            left: 8px;
          }

          .workspace-title strong {
            max-width: 32vw;
          }

          .chair-group-controls {
            right: 8px;
            bottom: 56px;
          }

          .bottom-toolbar {
            bottom: 6px;
            max-width: calc(100% - 16px);
            overflow-x: auto;
          }

          .bottom-toolbar::-webkit-scrollbar {
            display: none;
          }

          /* =====================================================
             BASELINE PHONE LANDSCAPE: 844 × 390
             This is the primary design target for modern phones.
          ===================================================== */
          @media (min-width: 800px) and (max-width: 900px) and (min-height: 360px) and (max-height: 430px) {
            .topbar {
              grid-template-columns: minmax(145px, 1fr) auto 38px;
              gap: 3px 6px;
              padding: 4px 7px;
            }

            .brand {
              min-height: 34px;
            }

            .brand-icon {
              width: 30px;
              height: 30px;
              font-size: 15px;
            }

            .brand-title {
              font-size: 12px;
            }

            .top-actions > button:first-child,
            .save-button {
              min-height: 34px;
              padding: 6px 8px !important;
            }

            .preview-button,
            .topbar > .theme-toggle {
              width: 34px;
              min-width: 34px;
              height: 34px;
              min-height: 34px;
            }

            .view-toggle,
            .view-toggle button {
              min-height: 34px;
            }

            .view-toggle button {
              min-width: 34px;
              padding: 6px 8px;
            }

            .main-navigation {
              min-height: 34px;
            }

            .top-nav-link {
              min-height: 28px;
              padding: 5px 10px;
              font-size: 9px;
            }

            .left-nav {
              width: 54px;
              min-width: 54px;
              flex-basis: 54px;
              padding: 4px;
            }

            .nav-item {
              min-height: 43px;
              padding: 4px 2px;
              gap: 2px;
              font-size: 7px;
            }

            .nav-icon {
              font-size: 15px;
            }

            .build-panel {
              left: 54px;
              width: min(285px, 38vw);
            }

            .workspace-title {
              padding: 6px 8px;
            }

            .workspace-title strong {
              max-width: 260px;
              font-size: 11px;
            }

            .bottom-toolbar {
              transform: scale(0.9);
              transform-origin: bottom center;
            }
          }
        }

        /* =====================================================
           FINAL 844 × 390 MOBILE LANDSCAPE COMPACT OVERRIDES
        ===================================================== */
        @media (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
          /* Remove the Project / Build / Info / Objects vertical rail. */
          .left-nav {
            display: none !important;
          }

          /* Keep the Build panel available without sacrificing a permanent
             vertical navigation column. */
          .editor-body {
            position: relative;
          }

          .build-panel {
            left: 0 !important;
            width: min(280px, 34vw) !important;
            z-index: 42;
          }

          /* Compact inventory cards, images, icons and typography. */
          .build-panel .section-title {
            margin-bottom: 6px !important;
            font-size: 10px !important;
          }

          .element-button {
            min-height: 0 !important;
            padding: 5px !important;
            gap: 6px !important;
          }

          .element-button > span:first-child {
            width: 34px !important;
            height: 34px !important;
          }

          .element-button > span:first-child > span {
            font-size: 15px !important;
          }

          .element-name {
            font-size: 10px !important;
          }

          .element-category {
            font-size: 8px !important;
            margin-top: 1px !important;
          }

          .element-dims,
          .element-button > span:nth-child(2) > span:last-child {
            font-size: 7px !important;
            margin-top: 1px !important;
          }

          .add-plus {
            width: 18px !important;
            height: 18px !important;
            font-size: 12px !important;
          }

          /* Compact the quantity chooser for every inventory item. */
          .bulk-item-panel {
            margin-top: 4px !important;
            margin-bottom: 3px !important;
            padding: 7px !important;
            gap: 6px !important;
            border-radius: 8px !important;
          }

          .bulk-item-panel span {
            font-size: 9px !important;
          }

          .bulk-item-panel button {
            min-height: 24px !important;
            padding: 4px 5px !important;
            font-size: 8px !important;
          }

          .bulk-item-panel input[type="number"] {
            width: 44px !important;
            height: 24px !important;
            font-size: 10px !important;
          }

          .bulk-item-panel input[type="range"] {
            height: 14px !important;
          }

          /* Smaller Build tools and group movement controls. */
          .tool-button {
            min-height: 32px !important;
            padding: 6px 7px !important;
            gap: 5px !important;
            font-size: 9px !important;
          }

          .tool-button span:first-child {
            font-size: 12px !important;
          }

          .tip-box {
            padding: 7px !important;
            font-size: 8px !important;
          }

          .tip-box p {
            margin: 3px 0 !important;
          }

          /* Bring back the selected-item window as a compact delete menu. */
          .properties-panel {
            display: none !important;
          }

          .properties-panel:not(.empty-properties) {
            display: block !important;
            position: absolute !important;
            right: 8px !important;
            top: 8px !important;
            width: 155px !important;
            min-height: 0 !important;
            max-height: calc(100% - 16px) !important;
            padding: 7px !important;
            z-index: 55 !important;
            overflow: hidden !important;
            border: 1px solid #dfe2e6 !important;
            border-radius: 9px !important;
            background: rgba(255, 255, 255, 0.97) !important;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12) !important;
          }

          .properties-panel:not(.empty-properties) .properties-title,
          .properties-panel:not(.empty-properties) .selected-card,
          .properties-panel:not(.empty-properties) .property-section {
            display: none !important;
          }

          .properties-panel:not(.empty-properties) .property-actions {
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
            margin: 0 !important;
          }

          .properties-panel:not(.empty-properties) .rotate-button {
            display: none !important;
          }

          .properties-panel:not(.empty-properties) .delete-button {
            width: 100% !important;
            flex: none !important;
            padding: 7px 6px !important;
            font-size: 9px !important;
            line-height: 1.2 !important;
          }

          /* Make workspace labels and the measurement toolbar compact. */
          .workspace-title {
            top: 6px !important;
            left: 6px !important;
            padding: 5px 7px !important;
            gap: 1px !important;
          }

          .workspace-title span {
            font-size: 7px !important;
          }

          .workspace-title strong {
            max-width: 190px !important;
            font-size: 9px !important;
          }

          .bottom-toolbar {
            bottom: 5px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            padding: 3px !important;
            border-radius: 7px !important;
          }

          .bottom-tool {
            min-width: 44px !important;
            padding: 4px 5px !important;
            gap: 1px !important;
            font-size: 7px !important;
          }

          .toolbar-divider {
            height: 22px !important;
            margin: 0 1px !important;
          }

          .scale-display {
            margin-left: 4px !important;
            padding: 0 6px !important;
            font-size: 7px !important;
          }

          .scale-display strong {
            font-size: 8px !important;
          }

          /* Smaller group movement buttons. */
          .chair-group-controls {
            right: 7px !important;
            bottom: 48px !important;
            gap: 4px !important;
          }

          .move-all-chairs-button,
          .move-chairs-individually-button {
            padding: 5px 7px !important;
            font-size: 8px !important;
            border-radius: 6px !important;
            min-height: 26px !important;
          }

          .chair-group-button-icon {
            font-size: 10px !important;
          }

          /* Center the Venue / Inventory / Matches navigation as requested. */
          .main-navigation {
            justify-content: center !important;
          }

          .main-navigation > * {
            flex: 0 0 auto;
          }
        }

        /* =====================================================
           FINAL 844 × 390 COMPACT INVENTORY + DELETE CONTROLS
        ===================================================== */
        @media (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
          /* Keep the inventory area compact and use the panel width efficiently. */
          .build-panel {
            width: min(330px, 39vw) !important;
          }

          .build-panel .panel-content {
            padding: 7px !important;
          }

          .build-panel .section-title {
            margin-bottom: 4px !important;
          }

          .element-button {
            padding: 4px 5px !important;
            min-height: 42px !important;
          }

          .element-button > span:first-child {
            width: 30px !important;
            height: 30px !important;
            border-radius: 5px !important;
          }

          .element-button > span:first-child > span {
            font-size: 13px !important;
          }

          .element-name {
            font-size: 9px !important;
          }

          .element-category,
          .element-dims,
          .element-button > span:nth-child(2) > span:last-child {
            font-size: 7px !important;
            line-height: 1.15 !important;
          }

          .add-plus {
            width: 16px !important;
            height: 16px !important;
            font-size: 10px !important;
          }

          /* The expanded inventory chooser uses a compact horizontal grid. */
          .bulk-item-panel {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            gap: 4px 6px !important;
            padding: 6px !important;
            margin-top: 3px !important;
            margin-bottom: 2px !important;
            border-radius: 7px !important;
          }

          .bulk-item-panel > div {
            min-width: 0 !important;
          }

          .bulk-item-panel > div:nth-of-type(1) {
            grid-column: 1 / -1 !important;
          }

          .bulk-item-panel > div:nth-of-type(1) span {
            font-size: 8px !important;
          }

          .bulk-item-panel > div:nth-of-type(2) {
            grid-column: 1 / -1 !important;
            gap: 3px !important;
            flex-wrap: nowrap !important;
          }

          .bulk-item-panel > div:nth-of-type(2) .preset-btn {
            flex: 1 1 0 !important;
            min-width: 0 !important;
            min-height: 22px !important;
            padding: 3px 1px !important;
            font-size: 8px !important;
          }

          .bulk-item-panel > div:nth-of-type(3) {
            grid-column: 1 / -1 !important;
            display: grid !important;
            grid-template-columns: 24px 42px 24px minmax(70px, 1fr) !important;
            align-items: center !important;
            gap: 4px !important;
            flex-wrap: nowrap !important;
          }

          .bulk-item-panel > div:nth-of-type(3) button,
          .bulk-item-panel > div:nth-of-type(3) input[type="number"] {
            width: 24px !important;
            height: 24px !important;
            min-height: 24px !important;
            padding: 0 !important;
            font-size: 9px !important;
          }

          .bulk-item-panel > div:nth-of-type(3) input[type="number"] {
            width: 42px !important;
          }

          .bulk-item-panel > div:nth-of-type(3) input[type="range"] {
            grid-column: 4 !important;
            grid-row: 1 !important;
            width: 100% !important;
            min-width: 0 !important;
            height: 14px !important;
          }

          .bulk-item-panel > div:nth-of-type(4) {
            grid-column: 1 / -1 !important;
            display: grid !important;
            grid-template-columns: 58px minmax(0, 1fr) !important;
            align-items: center !important;
            gap: 5px !important;
          }

          .bulk-item-panel > div:nth-of-type(4) > span {
            font-size: 8px !important;
          }

          .bulk-item-panel > div:nth-of-type(4) > div {
            gap: 3px !important;
          }

          .bulk-item-panel > div:nth-of-type(4) button {
            min-height: 24px !important;
            padding: 3px 2px !important;
            font-size: 7px !important;
          }

          .bulk-item-panel > div:nth-of-type(5) {
            grid-column: 1 / -1 !important;
            margin-top: 0 !important;
            gap: 5px !important;
          }

          .bulk-item-panel > div:nth-of-type(5) button {
            min-height: 26px !important;
            padding: 4px 6px !important;
            font-size: 8px !important;
            border-radius: 6px !important;
          }

          /* Move the delete controls below the group-selection controls. */
          .properties-panel:not(.empty-properties) {
            top: 102px !important;
            width: 164px !important;
            padding: 5px !important;
          }

          .properties-panel:not(.empty-properties) .property-actions {
            gap: 4px !important;
          }

          .properties-panel:not(.empty-properties) .delete-button {
            min-height: 31px !important;
            padding: 4px 6px !important;
            font-size: 8px !important;
            border-radius: 6px !important;
          }

          /* Show a small visual identity for the exact item being deleted. */
          .delete-single-item-button {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
            gap: 5px !important;
            text-align: left !important;
          }

          .delete-item-preview {
            width: 22px !important;
            height: 22px !important;
            flex: 0 0 22px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            border-radius: 4px !important;
            background: #f8fafc !important;
          }

          .delete-item-preview img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          .delete-item-preview > span {
            font-size: 12px !important;
            line-height: 1 !important;
          }

          .delete-item-label {
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1px !important;
            overflow: hidden !important;
          }

          .delete-item-action {
            font-size: 8px !important;
            font-weight: 800 !important;
            white-space: nowrap !important;
          }

          .delete-item-name {
            font-size: 7px !important;
            font-weight: 600 !important;
            opacity: 0.82 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .delete-all-button {
            min-height: 27px !important;
          }
        }


        /* =====================================================
           FINAL MOBILE LANDSCAPE REFINEMENT — 844 × 390
           Keeps desktop/tablet styling unchanged.
        ===================================================== */
        @media (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
          /* A narrower inventory panel gives the 3D workspace more room. */
          .build-panel {
            width: min(280px, 33vw) !important;
          }

          .build-panel .panel-content {
            padding: 8px !important;
          }

          /* Slightly larger than the previous ultra-compact version, while
             still fitting efficiently in the narrower inventory column. */
          .build-panel .section-title {
            font-size: 11px !important;
            margin-bottom: 6px !important;
          }

          .element-button {
            min-height: 48px !important;
            padding: 6px 7px !important;
            gap: 7px !important;
          }

          .element-button > span:first-child {
            width: 34px !important;
            height: 34px !important;
          }

          .element-button > span:first-child > span {
            font-size: 15px !important;
          }

          .element-name {
            font-size: 10px !important;
          }

          .element-category,
          .element-dims,
          .element-button > span:nth-child(2) > span:last-child {
            font-size: 8px !important;
          }

          .add-plus {
            width: 19px !important;
            height: 19px !important;
            font-size: 12px !important;
          }

          /* Keep every inventory item's chooser compact and readable. */
          .bulk-item-panel {
            gap: 5px 6px !important;
            padding: 7px !important;
          }

          .bulk-item-panel > div:nth-of-type(2) .preset-btn {
            min-height: 25px !important;
            font-size: 9px !important;
          }

          .bulk-item-panel > div:nth-of-type(3) button,
          .bulk-item-panel > div:nth-of-type(3) input[type="number"] {
            height: 26px !important;
            min-height: 26px !important;
            font-size: 10px !important;
          }

          .bulk-item-panel > div:nth-of-type(4) > span {
            font-size: 9px !important;
          }

          .bulk-item-panel > div:nth-of-type(4) button {
            min-height: 26px !important;
            font-size: 8px !important;
          }

          .bulk-item-panel > div:nth-of-type(5) button {
            min-height: 29px !important;
            font-size: 9px !important;
          }

          /* Compact selected-item delete controls: icon + requested label only. */
          .properties-panel:not(.empty-properties) {
            top: 118px !important;
            right: 7px !important;
            width: 138px !important;
            padding: 5px !important;
          }

          .properties-panel:not(.empty-properties) .property-actions {
            gap: 4px !important;
          }

          .properties-panel:not(.empty-properties) .delete-button {
            min-height: 30px !important;
            padding: 5px 7px !important;
            font-size: 9px !important;
          }

          .delete-single-item-button,
          .delete-all-button {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            text-align: center !important;
          }

          .delete-single-item-button .delete-item-preview {
            width: 19px !important;
            height: 19px !important;
            flex: 0 0 19px !important;
          }

          .delete-single-item-button .delete-item-preview > span {
            font-size: 11px !important;
          }

          .delete-item-label,
          .delete-item-name {
            display: none !important;
          }

          .delete-item-action {
            font-size: 9px !important;
            font-weight: 800 !important;
          }

          /* Put the two group movement controls at the bottom edge instead
             of covering the upper 3D scene. */
          .chair-group-controls {
            top: auto !important;
            bottom: 8px !important;
            right: 8px !important;
            gap: 5px !important;
            z-index: 44 !important;
          }

          .move-all-chairs-button,
          .move-chairs-individually-button {
            min-height: 30px !important;
            padding: 6px 9px !important;
            font-size: 9px !important;
          }

          /* Move the measurement toolbar left so the two movement buttons
             have their own bottom-right space. */
          .bottom-toolbar {
            left: 52% !important;
            max-width: calc(100% - 180px) !important;
          }
        }

        /* =====================================================
           FINAL MOBILE LANDSCAPE CONTROL POSITION FIX — 844 × 390
           Keep selection controls at the top and place delete
           controls at the bottom-right, without changing desktop.
        ===================================================== */
        @media (max-width: 950px) and (max-height: 500px) and (orientation: landscape) {
          /* Restore group selection controls to their original top position. */
          .chair-group-controls {
            top: 14px !important;
            right: 8px !important;
            bottom: auto !important;
            z-index: 44 !important;
          }

          /* Move selected-item delete controls to the former bottom control area. */
          .properties-panel:not(.empty-properties) {
            top: auto !important;
            right: 8px !important;
            bottom: 8px !important;
            width: 138px !important;
            padding: 5px !important;
            z-index: 46 !important;
          }

          .properties-panel:not(.empty-properties) .property-actions {
            margin: 0 !important;
            gap: 4px !important;
          }

          /* The measurement toolbar remains clear of the delete controls. */
          .bottom-toolbar {
            left: 50% !important;
            transform: translateX(-50%) !important;
            max-width: calc(100% - 180px) !important;
            z-index: 35 !important;
          }
        }
      `}</style>

      {themeModalOpen && (
        <div onClick={() => setThemeModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 }}>
          <div className="theme-modal-card" onClick={event => event.stopPropagation()} style={{ width: "min(760px, 100%)", maxHeight: "80vh", overflowY: "auto", background: "#ffffff", borderRadius: "20px", padding: "24px", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0, color: "#0f172a" }}>Choose Your Wedding Theme</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>Switch themes anytime. Save the design to keep your selection.</p>
              </div>
              <button type="button" onClick={() => setThemeModalOpen(false)} style={{ border: "none", background: "#f1f5f9", borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>

            {themesLoading ? (
              <p style={{ color: "#64748b" }}>Loading themes...</p>
            ) : themes.length === 0 ? (
              <p style={{ color: "#64748b" }}>No themes are available yet. Add themes from the Themes page first.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
                {themes.map(theme => {
                  const active = selectedTheme?.id === theme.id;
                  const primary = theme.primaryColor || "#2563eb";
                  const secondary = theme.secondaryColor || "#f8fafc";
                  return (
                    <button key={theme.id} type="button" onClick={() => { setSelectedTheme(theme); setSelectedThemeId(theme.id); setThemeModalOpen(false); }} style={{ textAlign: "left", border: active ? `3px solid ${primary}` : "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", cursor: "pointer", background: secondary, boxShadow: active ? "0 10px 25px rgba(15, 23, 42, 0.12)" : "none" }}>
                      <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: primary, marginBottom: "14px" }} />
                      <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "16px" }}>{theme.name}</div>
                      {theme.description && <p style={{ color: "#475569", fontSize: "13px", lineHeight: 1.5, margin: "8px 0" }}>{theme.description}</p>}
                      {theme.decorationStyle && <div style={{ color: primary, fontSize: "12px", fontWeight: 800, marginTop: "10px" }}>✦ {theme.decorationStyle}</div>}
                      {active && <div style={{ marginTop: "12px", color: primary, fontWeight: 800, fontSize: "13px" }}>✓ Currently Selected</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
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
