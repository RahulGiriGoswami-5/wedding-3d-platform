import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// GET — Get all themes
export async function GET() {
  try {
    const themes = await db.orm.public.Theme.all();

    return NextResponse.json(themes);
  } catch (error) {
    console.error("Theme GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

// POST — Create a theme
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = cleanString(body.name);
    const description = cleanString(body.description);
    const primaryColor = cleanString(body.primaryColor);
    const secondaryColor = cleanString(body.secondaryColor);
    const decorationStyle = cleanString(body.decorationStyle);

    if (!name) {
      return NextResponse.json(
        { error: "Theme name is required" },
        { status: 400 }
      );
    }

    if (!primaryColor || !secondaryColor) {
      return NextResponse.json(
        { error: "Both theme colors are required" },
        { status: 400 }
      );
    }

    if (!decorationStyle) {
      return NextResponse.json(
        { error: "Decoration style is required" },
        { status: 400 }
      );
    }

    const theme = await db.orm.public.Theme.create({
      name,
      description: description || null,
      primaryColor,
      secondaryColor,
      decorationStyle,
    });

    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    console.error("Theme POST error:", error);

    return NextResponse.json(
      { error: "Failed to create theme" },
      { status: 500 }
    );
  }
}

// PUT — Update a theme
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid theme id is required" },
        { status: 400 }
      );
    }

    const existingTheme =
      await db.orm.public.Theme.first({ id });

    if (!existingTheme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    const name = cleanString(body.name);
    const description = cleanString(body.description);
    const primaryColor = cleanString(body.primaryColor);
    const secondaryColor = cleanString(body.secondaryColor);
    const decorationStyle = cleanString(body.decorationStyle);

    if (!name) {
      return NextResponse.json(
        { error: "Theme name is required" },
        { status: 400 }
      );
    }

    if (!primaryColor || !secondaryColor) {
      return NextResponse.json(
        { error: "Both theme colors are required" },
        { status: 400 }
      );
    }

    if (!decorationStyle) {
      return NextResponse.json(
        { error: "Decoration style is required" },
        { status: 400 }
      );
    }

    const updatedTheme =
      await db.orm.public.Theme
        .where({ id })
        .update({
          name,
          description: description || null,
          primaryColor,
          secondaryColor,
          decorationStyle,
        });

    return NextResponse.json(updatedTheme);
  } catch (error) {
    console.error("Theme PUT error:", error);

    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 }
    );
  }
}

// DELETE — Delete a theme
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid theme id is required" },
        { status: 400 }
      );
    }

    const existingTheme =
      await db.orm.public.Theme.first({ id });

    if (!existingTheme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    await db.orm.public.Theme
      .where({ id })
      .delete();

    return NextResponse.json({
      message: "Theme deleted successfully",
    });
  } catch (error) {
    console.error("Theme DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}