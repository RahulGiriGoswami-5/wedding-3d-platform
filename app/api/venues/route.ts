import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

export async function GET() {
  try {
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

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "name is required and must be a non-empty string" }, { status: 400 });
    }
    if (!body.location || typeof body.location !== "string" || body.location.trim() === "") {
      return NextResponse.json({ error: "location is required and must be a non-empty string" }, { status: 400 });
    }
    if (!body.type || typeof body.type !== "string" || body.type.trim() === "") {
      return NextResponse.json({ error: "type is required and must be a non-empty string" }, { status: 400 });
    }
    if (typeof body.capacity !== "number" || body.capacity <= 0) {
      return NextResponse.json({ error: "capacity must be > 0" }, { status: 400 });
    }
    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "price must be >= 0" }, { status: 400 });
    }

    const venue = await db.orm.public.Venue.create({
      name: body.name,
      location: body.location,
      capacity: body.capacity,
      type: body.type,
      price: body.price,
      availability: body.availability ?? true,
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
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "name is required and must be a non-empty string" }, { status: 400 });
    }
    if (!body.location || typeof body.location !== "string" || body.location.trim() === "") {
      return NextResponse.json({ error: "location is required and must be a non-empty string" }, { status: 400 });
    }
    if (!body.type || typeof body.type !== "string" || body.type.trim() === "") {
      return NextResponse.json({ error: "type is required and must be a non-empty string" }, { status: 400 });
    }
    if (typeof body.capacity !== "number" || body.capacity <= 0) {
      return NextResponse.json({ error: "capacity must be > 0" }, { status: 400 });
    }
    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "price must be >= 0" }, { status: 400 });
    }

    const venue = await db.orm.public.Venue.first({
      id: Number(id),
    });

    if (!venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const updatedVenue = await db.orm.public.Venue.where({ id: Number(id) }).update({
      name: body.name,
      location: body.location,
      capacity: body.capacity,
      type: body.type,
      price: body.price,
      availability: body.availability ?? venue.availability,
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
    const { id } = await request.json();

    const venue = await db.orm.public.Venue.first({
      id: Number(id),
    });

    if (!venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    await db.orm.public.Venue
      .where({ id: Number(id) })
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