"use client";

import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import { useEffect, useState } from "react";

type SavedScene = {
  position: [number, number, number];
  rotation: number;
};

function Chair({
  position,
  setPosition,
  rotation,
  setRotation,
  selected,
  setSelected,
}: {
  position: [number, number, number];
  setPosition: (position: [number, number, number]) => void;
  rotation: number;
  setRotation: (rotation: number) => void;
  selected: boolean;
  setSelected: (selected: boolean) => void;
}) {
  const { scene } = useGLTF("/models/SheenChair.glb");

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setSelected(true);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!selected) return;

    e.stopPropagation();

    const point = e.point;

    setPosition([point.x, 0, point.z]);
  };

  const handlePointerUp = () => {
    setSelected(false);
  };

  return (
    <primitive
      object={scene}
      scale={2}
      position={position}
      rotation={[0, rotation, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

function Room() {
  const [chairPosition, setChairPosition] = useState<
    [number, number, number]
  >([0, 0, 0]);

  const [chairRotation, setChairRotation] = useState(0);
  const [selected, setSelected] = useState(false);

  // Load saved design
  useEffect(() => {
    const saved = localStorage.getItem("wedding-design");

    if (saved) {
      const data: SavedScene = JSON.parse(saved);

      setChairPosition(data.position);
      setChairRotation(data.rotation);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selected) return;

      if (e.key.toLowerCase() === "r") {
        setChairRotation((prev) => prev + Math.PI / 4);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  // Save scene
  const saveScene = () => {
    const sceneData: SavedScene = {
      position: chairPosition,
      rotation: chairRotation,
    };

    localStorage.setItem("wedding-design", JSON.stringify(sceneData));

    alert("Design saved!");
  };

  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="lightgray" />
      </mesh>

      {/* Chair */}
      <Chair
        position={chairPosition}
        setPosition={setChairPosition}
        rotation={chairRotation}
        setRotation={setChairRotation}
        selected={selected}
        setSelected={setSelected}
      />

      {/* Lighting */}
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={2} />

      {/* Camera */}
      <OrbitControls />

      {/* Save Button */}
      <Html position={[-4, 3, 0]}>
        <button
          onClick={saveScene}
          style={{
            padding: "10px 20px",
            background: "black",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Save Design
        </button>
      </Html>
    </>
  );
}

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [5, 5, 5] }}>
        <Room />
      </Canvas>
    </main>
  );
}