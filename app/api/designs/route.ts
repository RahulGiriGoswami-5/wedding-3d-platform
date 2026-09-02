import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

// GET — Get all saved designs
export async function GET() {
  try {
    const designs =
      await db.orm.public.SavedDesign.all();

    return NextResponse.json(designs);
  } catch (error) {
    console.error(
      "Saved design GET error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch saved designs",
      },
      {
        status: 500,
      }
    );
  }
}

// POST — Create a saved design
export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const name =
      cleanString(body.name);

    const venueId =
      Number(body.venueId);

    const themeId =
      body.themeId === null ||
      body.themeId === undefined ||
      body.themeId === ""
        ? null
        : Number(body.themeId);

    const layoutData =
      cleanString(body.layoutData);

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Design name is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(venueId) ||
      venueId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "A valid venue is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      themeId !== null &&
      (
        !Number.isInteger(themeId) ||
        themeId <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Theme ID must be valid",
        },
        {
          status: 400,
        }
      );
    }

    if (!layoutData) {
      return NextResponse.json(
        {
          error:
            "Design layout data is required",
        },
        {
          status: 400,
        }
      );
    }

    const venue =
      await db.orm.public.Venue.first({
        id: venueId,
      });

    if (!venue) {
      return NextResponse.json(
        {
          error: "Venue not found",
        },
        {
          status: 404,
        }
      );
    }

    if (themeId !== null) {
      const theme =
        await db.orm.public.Theme.first({
          id: themeId,
        });

      if (!theme) {
        return NextResponse.json(
          {
            error: "Theme not found",
          },
          {
            status: 404,
          }
        );
      }
    }

    const design =
      await db.orm.public.SavedDesign.create({
        name,
        venueId,
        themeId,
        layoutData,
      });

    return NextResponse.json(
      design,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Saved design POST error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create saved design",
      },
      {
        status: 500,
      }
    );
  }
}

// DELETE — Delete a saved design
export async function DELETE(
  request: Request
) {
  try {
    const body = await request.json();

    const id =
      Number(body.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Valid design ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const existingDesign =
      await db.orm.public.SavedDesign.first({
        id,
      });

    if (!existingDesign) {
      return NextResponse.json(
        {
          error:
            "Saved design not found",
        },
        {
          status: 404,
        }
      );
    }

    await db.orm.public.SavedDesign
      .where({ id })
      .delete();

    return NextResponse.json({
      message:
        "Saved design deleted successfully",
    });
  } catch (error) {
    console.error(
      "Saved design DELETE error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete saved design",
      },
      {
        status: 500,
      }
    );
  }
}