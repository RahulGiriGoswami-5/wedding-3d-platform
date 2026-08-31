import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

function isValidModelUrl(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    typeof value === "string"
  );
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
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

    const venues = await db.orm.public.Venue.all();

    return NextResponse.json(venues);
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
    const body = await request.json();

    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (
      !body.location ||
      typeof body.location !== "string" ||
      body.location.trim() === ""
    ) {
      return NextResponse.json(
        { error: "location is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (
      !body.type ||
      typeof body.type !== "string" ||
      body.type.trim() === ""
    ) {
      return NextResponse.json(
        { error: "type is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof body.capacity !== "number" || body.capacity <= 0) {
      return NextResponse.json(
        { error: "capacity must be > 0" },
        { status: 400 }
      );
    }

    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json(
        { error: "price must be >= 0" },
        { status: 400 }
      );
    }

    if (!isValidModelUrl(body.modelUrl)) {
      return NextResponse.json(
        { error: "modelUrl must be a string" },
        { status: 400 }
      );
    }

    const venue = await db.orm.public.Venue.create({
      name: body.name.trim(),
      location: body.location.trim(),
      capacity: body.capacity,
      type: body.type.trim(),
      price: body.price,
      availability: body.availability ?? true,
      modelUrl: cleanOptionalString(body.modelUrl),
      layoutData: null,
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error("Create venue error:", error);

    return NextResponse.json(
      { error: "Failed to create venue" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid id is required" },
        { status: 400 }
      );
    }

    const existingVenue = await db.orm.public.Venue.first({ id });

    if (!existingVenue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    /*
     * Layout-only update.
     * This allows the 3D editor to save a layout without
     * having to send all the normal venue fields.
     */
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

      const updatedVenue = await db.orm.public.Venue
        .where({ id })
        .update({
          layoutData: body.layoutData,
        });

      return NextResponse.json(updatedVenue);
    }

    if (
      !body.name ||
      typeof body.name !== "string" ||
      body.name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "name is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (
      !body.location ||
      typeof body.location !== "string" ||
      body.location.trim() === ""
    ) {
      return NextResponse.json(
        { error: "location is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (
      !body.type ||
      typeof body.type !== "string" ||
      body.type.trim() === ""
    ) {
      return NextResponse.json(
        { error: "type is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof body.capacity !== "number" || body.capacity <= 0) {
      return NextResponse.json(
        { error: "capacity must be > 0" },
        { status: 400 }
      );
    }

    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json(
        { error: "price must be >= 0" },
        { status: 400 }
      );
    }

    if (!isValidModelUrl(body.modelUrl)) {
      return NextResponse.json(
        { error: "modelUrl must be a string" },
        { status: 400 }
      );
    }

    const updatedVenue = await db.orm.public.Venue
      .where({ id })
      .update({
        name: body.name.trim(),
        location: body.location.trim(),
        capacity: body.capacity,
        type: body.type.trim(),
        price: body.price,
        availability:
          body.availability ?? existingVenue.availability,
        modelUrl: cleanOptionalString(body.modelUrl),
      });

    return NextResponse.json(updatedVenue);
  } catch (error) {
    console.error("Update venue error:", error);

    return NextResponse.json(
      { error: "Failed to update venue" },
      { status: 500 }
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

    await db.orm.public.Venue
      .where({ id })
      .delete();

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