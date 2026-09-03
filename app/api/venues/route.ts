import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";

const MAX_MODEL_SIZE = 100 * 1024 * 1024;
const SUPPORTED_MODEL_EXTENSIONS = new Set([".glb", ".fbx", ".obj"]);

type VenuePayload = {
  id?: number;
  name?: string;
  location?: string;
  capacity?: number;
  type?: string;
  price?: number;
  availability?: boolean;
  modelUrl?: string | null;
  layoutData?: string | null;
};

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function validateVenuePayload(body: VenuePayload): string | null {
  if (typeof body.name !== "string" || body.name.trim() === "") {
    return "Venue name is required.";
  }

  if (typeof body.location !== "string" || body.location.trim() === "") {
    return "Venue location is required.";
  }

  if (typeof body.type !== "string" || body.type.trim() === "") {
    return "Venue type is required.";
  }

  if (
    typeof body.capacity !== "number" ||
    !Number.isFinite(body.capacity) ||
    body.capacity <= 0
  ) {
    return "Capacity must be greater than 0.";
  }

  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0
  ) {
    return "Price must be 0 or greater.";
  }

  return null;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);

  if (
    value &&
    typeof value !== "string" &&
    value instanceof File &&
    value.size > 0
  ) {
    return value;
  }

  return null;
}

function getModelExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

async function saveModelFile(file: File): Promise<string> {
  const originalName = file.name || "venue.glb";
  const extension = getModelExtension(originalName);

  if (!SUPPORTED_MODEL_EXTENSIONS.has(extension)) {
    throw new Error(
      "Only .glb, .fbx and .obj 3D model files are currently supported."
    );
  }

  if (file.size > MAX_MODEL_SIZE) {
    throw new Error("The 3D model is too large. Maximum file size is 100 MB.");
  }

  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "venues"
  );

  await mkdir(uploadDirectory, { recursive: true });

  const rawBaseName = path.basename(originalName, extension);

  const baseName =
    rawBaseName
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "venue-model";

  const fileName = `${Date.now()}-${baseName}${extension}`;

  await writeFile(
    path.join(uploadDirectory, fileName),
    Buffer.from(await file.arrayBuffer())
  );

  return `/uploads/venues/${fileName}`;
}

async function parseVenueRequest(request: Request): Promise<{
  payload: VenuePayload;
  modelFile: File | null;
}> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    return {
      payload: {
        id: Number(formString(formData, "id")),
        name: formString(formData, "name"),
        location: formString(formData, "location"),
        capacity: Number(formString(formData, "capacity")),
        type: formString(formData, "type"),
        price: Number(formString(formData, "price")),
        availability: parseBoolean(
          formString(formData, "availability"),
          true
        ),
        modelUrl: cleanOptionalString(formString(formData, "modelUrl")),
      },
      modelFile: formFile(formData, "model"),
    };
  }

  const payload = (await request.json()) as VenuePayload;

  return {
    payload,
    modelFile: null,
  };
}

function errorStatus(message: string): number {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("required") ||
    lowerMessage.includes("capacity") ||
    lowerMessage.includes("price") ||
    lowerMessage.includes("3d model") ||
    lowerMessage.includes(".glb") ||
    lowerMessage.includes(".fbx") ||
    lowerMessage.includes(".obj") ||
    lowerMessage.includes("100 mb")
  ) {
    return 400;
  }

  return 500;
}

/* =========================================================
   GET — LOAD ONE OR ALL VENUES
========================================================= */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (idParam !== null) {
      const id = Number(idParam);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { error: "Invalid venue id." },
          { status: 400 }
        );
      }

      const venue = await db.orm.public.Venue.first({ id });

      if (!venue) {
        return NextResponse.json(
          { error: "Venue not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(venue);
    }

    // IMPORTANT:
    // An empty Venue table is a valid state. Always return [] to the page.
    const venues = await db.orm.public.Venue.all();

    return NextResponse.json(Array.isArray(venues) ? venues : []);
  } catch (error) {
    console.error("Venue GET error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch venues.",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST — CREATE VENUE
========================================================= */

export async function POST(request: Request) {
  try {
    const { payload, modelFile } = await parseVenueRequest(request);

    const validationError = validateVenuePayload(payload);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    let modelUrl = cleanOptionalString(payload.modelUrl);

    if (modelFile) {
      modelUrl = await saveModelFile(modelFile);
    }

    const venue = await db.orm.public.Venue.create({
      name: payload.name!.trim(),
      location: payload.location!.trim(),
      capacity: payload.capacity!,
      type: payload.type!.trim(),
      price: payload.price!,
      availability: parseBoolean(payload.availability, true),
      modelUrl,
      layoutData: null,
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error("Venue POST error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create venue.";

    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

/* =========================================================
   PUT — UPDATE VENUE OR SAVE LAYOUT
========================================================= */

export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as VenuePayload;
      const id = Number(body.id);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { error: "Valid venue id is required." },
          { status: 400 }
        );
      }

      const existingVenue = await db.orm.public.Venue.first({ id });

      if (!existingVenue) {
        return NextResponse.json(
          { error: "Venue not found." },
          { status: 404 }
        );
      }

      // Saving a layout must not require all venue fields again.
      if (Object.prototype.hasOwnProperty.call(body, "layoutData")) {
        if (
          body.layoutData !== null &&
          typeof body.layoutData !== "string"
        ) {
          return NextResponse.json(
            { error: "layoutData must be a string or null." },
            { status: 400 }
          );
        }

        const updatedVenue = await db.orm.public.Venue
          .where({ id })
          .update({
            layoutData: body.layoutData ?? null,
          });

        return NextResponse.json(updatedVenue);
      }

      const validationError = validateVenuePayload(body);

      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 }
        );
      }

      const updatedVenue = await db.orm.public.Venue
        .where({ id })
        .update({
          name: body.name!.trim(),
          location: body.location!.trim(),
          capacity: body.capacity!,
          type: body.type!.trim(),
          price: body.price!,
          availability: parseBoolean(
            body.availability,
            existingVenue.availability
          ),
          modelUrl:
            body.modelUrl === undefined
              ? existingVenue.modelUrl
              : cleanOptionalString(body.modelUrl),
        });

      return NextResponse.json(updatedVenue);
    }

    const { payload, modelFile } = await parseVenueRequest(request);
    const id = Number(payload.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid venue id is required." },
        { status: 400 }
      );
    }

    const existingVenue = await db.orm.public.Venue.first({ id });

    if (!existingVenue) {
      return NextResponse.json(
        { error: "Venue not found." },
        { status: 404 }
      );
    }

    const validationError = validateVenuePayload(payload);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    let modelUrl =
      cleanOptionalString(payload.modelUrl) ??
      existingVenue.modelUrl;

    if (modelFile) {
      modelUrl = await saveModelFile(modelFile);
    }

    const updatedVenue = await db.orm.public.Venue
      .where({ id })
      .update({
        name: payload.name!.trim(),
        location: payload.location!.trim(),
        capacity: payload.capacity!,
        type: payload.type!.trim(),
        price: payload.price!,
        availability: parseBoolean(
          payload.availability,
          existingVenue.availability
        ),
        modelUrl,
      });

    return NextResponse.json(updatedVenue);
  } catch (error) {
    console.error("Venue PUT error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update venue.";

    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

/* =========================================================
   DELETE — DELETE VENUE
========================================================= */

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: number };
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid venue id is required." },
        { status: 400 }
      );
    }

    const existingVenue = await db.orm.public.Venue.first({ id });

    if (!existingVenue) {
      // Treat an already-deleted venue as a completed delete operation.
      return NextResponse.json({
        message: "Venue was already deleted.",
      });
    }

    await db.orm.public.Venue.where({ id }).delete();

    return NextResponse.json({
      message: "Venue deleted successfully.",
    });
  } catch (error) {
    console.error("Venue DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to delete venue." },
      { status: 500 }
    );
  }
}
