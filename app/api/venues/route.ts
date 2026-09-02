import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

import path from "path";
import { mkdir, writeFile } from "fs/promises";

export const runtime = "nodejs";

const MAX_MODEL_SIZE = 100 * 1024 * 1024;

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
  return trimmed === "" ? null : trimmed;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}

function validateVenuePayload(body: VenuePayload): string | null {
  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return "name is required and must be a non-empty string";
  }

  if (!body.location || typeof body.location !== "string" || body.location.trim() === "") {
    return "location is required and must be a non-empty string";
  }

  if (!body.type || typeof body.type !== "string" || body.type.trim() === "") {
    return "type is required and must be a non-empty string";
  }

  if (
    typeof body.capacity !== "number" ||
    !Number.isFinite(body.capacity) ||
    body.capacity <= 0
  ) {
    return "capacity must be greater than 0";
  }

  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0
  ) {
    return "price must be 0 or greater";
  }

  return null;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);

  if (value && typeof value !== "string" && value.size > 0) {
    return value;
  }

  return null;
}

async function saveModelFile(file: File): Promise<string> {
  const originalName = file.name || "venue.glb";

  if (!originalName.toLowerCase().endsWith(".glb")) {
    throw new Error("Only .glb 3D model files are supported.");
  }

  if (file.size > MAX_MODEL_SIZE) {
    throw new Error(
      "The 3D model is too large. Maximum file size is 100 MB."
    );
  }

  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "venues"
  );

  await mkdir(uploadDirectory, { recursive: true });

  const baseName =
    path
      .basename(originalName, ".glb")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "venue-model";

  const fileName = `${Date.now()}-${baseName}.glb`;

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
        modelUrl: cleanOptionalString(
          formString(formData, "modelUrl")
        ),
      },
      modelFile: formFile(formData, "model"),
    };
  }

  return {
    payload: await request.json(),
    modelFile: null,
  };
}

function errorStatus(message: string): number {
  return message.includes(".glb") || message.includes("100 MB")
    ? 400
    : 500;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (idParam !== null) {
      const id = Number(idParam);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { error: "Invalid venue id" },
          { status: 400 }
        );
      }

      const venue = await db.orm.public.Venue.first({ id });

      if (!venue) {
        return NextResponse.json(
          { error: "Venue not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(venue);
    }

    return NextResponse.json(
      await db.orm.public.Venue.all()
    );
  } catch (error) {
    console.error("Venue API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch venues" },
      { status: 500 }
    );
  }
}

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
    console.error("Create venue error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create venue";

    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const id = Number(body.id);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { error: "Valid id is required" },
          { status: 400 }
        );
      }

      const existingVenue =
        await db.orm.public.Venue.first({ id });

      if (!existingVenue) {
        return NextResponse.json(
          { error: "Venue not found" },
          { status: 404 }
        );
      }

      if (body.layoutData !== undefined) {
        if (
          body.layoutData !== null &&
          typeof body.layoutData !== "string"
        ) {
          return NextResponse.json(
            { error: "layoutData must be a string or null" },
            { status: 400 }
          );
        }

        const updatedVenue =
          await db.orm.public.Venue
            .where({ id })
            .update({ layoutData: body.layoutData });

        return NextResponse.json(updatedVenue);
      }

      const validationError = validateVenuePayload(body);

      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 400 }
        );
      }

      const updatedVenue =
        await db.orm.public.Venue
          .where({ id })
          .update({
            name: body.name.trim(),
            location: body.location.trim(),
            capacity: body.capacity,
            type: body.type.trim(),
            price: body.price,
            availability: parseBoolean(
              body.availability,
              existingVenue.availability
            ),
            modelUrl: cleanOptionalString(body.modelUrl),
          });

      return NextResponse.json(updatedVenue);
    }

    const { payload, modelFile } = await parseVenueRequest(request);
    const id = Number(payload.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid id is required" },
        { status: 400 }
      );
    }

    const existingVenue =
      await db.orm.public.Venue.first({ id });

    if (!existingVenue) {
      return NextResponse.json(
        { error: "Venue not found" },
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

    const updatedVenue =
      await db.orm.public.Venue
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
    console.error("Update venue error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to update venue";

    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid id is required" },
        { status: 400 }
      );
    }

    const venue = await db.orm.public.Venue.first({ id });

    if (!venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    await db.orm.public.Venue.where({ id }).delete();

    return NextResponse.json({
      message: "Venue deleted successfully",
    });
  } catch (error) {
    console.error("Delete venue error:", error);

    return NextResponse.json(
      { error: "Failed to delete venue" },
      { status: 500 }
    );
  }
}
