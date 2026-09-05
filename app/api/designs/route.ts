import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getDesignById(id: number) {
  const designs = await db.orm.public.SavedDesign.all();
  return designs.find((design) => Number(design.id) === id) ?? null;
}

async function getVenueById(id: number) {
  const venues = await db.orm.public.Venue.all();
  return venues.find((venue) => Number(venue.id) === id) ?? null;
}

async function getThemeById(id: number) {
  const themes = await db.orm.public.Theme.all();
  return themes.find((theme) => Number(theme.id) === id) ?? null;
}

/* =========================================================
   GET — GET ALL DESIGNS OR ONE DESIGN
========================================================= */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    const designs = await db.orm.public.SavedDesign.all();

    if (!idParam) {
      return NextResponse.json(designs, { status: 200 });
    }

    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid design ID is required" },
        { status: 400 }
      );
    }

    const design = designs.find(
      (item) => Number(item.id) === id
    );

    if (!design) {
      return NextResponse.json(
        { error: "Saved design not found", id },
        { status: 404 }
      );
    }

    return NextResponse.json(design, { status: 200 });
  } catch (error) {
    console.error("Saved design GET error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch saved designs",
        details:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST — CREATE OR DUPLICATE SAVED DESIGN
========================================================= */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    /* DUPLICATE */
    if (body.action === "duplicate") {
      const id = Number(body.id);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          { error: "Valid design ID is required" },
          { status: 400 }
        );
      }

      const existingDesign = await getDesignById(id);

      if (!existingDesign) {
        return NextResponse.json(
          { error: "Saved design not found" },
          { status: 404 }
        );
      }

      const duplicatedDesign =
        await db.orm.public.SavedDesign.create({
          name: `${existingDesign.name} Copy`,
          venueId: existingDesign.venueId,
          themeId: existingDesign.themeId ?? null,
          layoutData: existingDesign.layoutData,
        });

      return NextResponse.json(
        {
          message: "Design duplicated successfully",
          design: duplicatedDesign,
        },
        { status: 201 }
      );
    }

    /* CREATE */
    const name = cleanString(body.name);
    const venueId = Number(body.venueId);
    const themeId =
      body.themeId === null ||
      body.themeId === undefined ||
      body.themeId === ""
        ? null
        : Number(body.themeId);
    const layoutData = cleanString(body.layoutData);

    if (!name) {
      return NextResponse.json(
        { error: "Design name is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(venueId) || venueId <= 0) {
      return NextResponse.json(
        { error: "A valid venue is required" },
        { status: 400 }
      );
    }

    if (
      themeId !== null &&
      (!Number.isInteger(themeId) || themeId <= 0)
    ) {
      return NextResponse.json(
        { error: "Theme ID must be valid" },
        { status: 400 }
      );
    }

    if (!layoutData) {
      return NextResponse.json(
        { error: "Design layout data is required" },
        { status: 400 }
      );
    }

    const venue = await getVenueById(venueId);

    if (!venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    if (themeId !== null) {
      const theme = await getThemeById(themeId);

      if (!theme) {
        return NextResponse.json(
          { error: "Theme not found" },
          { status: 404 }
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

    return NextResponse.json(design, { status: 201 });
  } catch (error) {
    console.error("Saved design POST error:", error);

    return NextResponse.json(
      {
        error: "Failed to create saved design",
        details:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PUT — UPDATE SAVED DESIGN
========================================================= */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid design ID is required" },
        { status: 400 }
      );
    }

    const existingDesign = await getDesignById(id);

    if (!existingDesign) {
      return NextResponse.json(
        { error: "Saved design not found" },
        { status: 404 }
      );
    }

    const name = cleanString(body.name);
    const layoutData = cleanString(body.layoutData);
    const venueId = Number(
      body.venueId ?? existingDesign.venueId
    );

    const themeId =
      body.themeId === null || body.themeId === ""
        ? null
        : body.themeId === undefined
          ? existingDesign.themeId
          : Number(body.themeId);

    if (!name) {
      return NextResponse.json(
        { error: "Design name is required" },
        { status: 400 }
      );
    }

    if (!layoutData) {
      return NextResponse.json(
        { error: "Design layout data is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(venueId) || venueId <= 0) {
      return NextResponse.json(
        { error: "A valid venue is required" },
        { status: 400 }
      );
    }

    if (
      themeId !== null &&
      (!Number.isInteger(themeId) || themeId <= 0)
    ) {
      return NextResponse.json(
        { error: "Theme ID must be valid" },
        { status: 400 }
      );
    }

    const venue = await getVenueById(venueId);

    if (!venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    if (themeId !== null) {
      const theme = await getThemeById(themeId);

      if (!theme) {
        return NextResponse.json(
          { error: "Theme not found" },
          { status: 404 }
        );
      }
    }

    const updatedDesign =
      await db.orm.public.SavedDesign
        .where({ id })
        .update({
          name,
          venueId,
          themeId,
          layoutData,
        });

    return NextResponse.json(
      updatedDesign,
      { status: 200 }
    );
  } catch (error) {
    console.error("Saved design PUT error:", error);

    return NextResponse.json(
      {
        error: "Failed to update saved design",
        details:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE — DELETE SAVED DESIGN
========================================================= */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid design ID is required" },
        { status: 400 }
      );
    }

    const existingDesign = await getDesignById(id);

    if (!existingDesign) {
      return NextResponse.json(
        { error: "Saved design not found" },
        { status: 404 }
      );
    }

    await db.orm.public.SavedDesign
      .where({ id })
      .delete();

    return NextResponse.json(
      {
        message:
          "Saved design deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Saved design DELETE error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete saved design",
        details:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}