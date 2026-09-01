import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

type InventoryInput = {
  name: string;
  category: string;
  modelUrl: string;
  imageUrl?: string | null;
  width: number;
  depth: number;
  height: number;
  quantity: number;
  availableQuantity: number;
  price: number;
};

// GET - Get all inventory items
export async function GET() {
  try {
    const items =
      await db.orm.public.InventoryItem.all();

    return NextResponse.json(items, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Inventory GET error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown database error";

    return NextResponse.json(
      {
        error: "Failed to fetch inventory",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}

// POST - Add one or multiple inventory items
export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const items: InventoryInput[] =
      Array.isArray(body)
        ? body
        : [body];

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "No inventory items provided",
        },
        {
          status: 400,
        }
      );
    }

    const createdItems = [];

    for (const item of items) {
      if (
        !item.name ||
        !item.category ||
        !item.modelUrl
      ) {
        return NextResponse.json(
          {
            error:
              "Name, category and modelUrl are required",
          },
          {
            status: 400,
          }
        );
      }

      const created =
        await db.orm.public.InventoryItem.create({
          name: item.name.trim(),
          category: item.category.trim(),
          modelUrl: item.modelUrl.trim(),

          imageUrl: item.imageUrl
            ? item.imageUrl.trim()
            : null,

          width: Number(item.width),
          depth: Number(item.depth),
          height: Number(item.height),

          quantity: Number(item.quantity),

          availableQuantity: Number(
            item.availableQuantity
          ),

          price: Number(item.price),
        });

      createdItems.push(created);
    }

    return NextResponse.json(
      {
        message:
          "Inventory item(s) created successfully",
        items: createdItems,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Inventory POST error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown database error";

    return NextResponse.json(
      {
        error:
          "Failed to create inventory item(s)",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}

// PATCH - Update an inventory item
export async function PATCH(
  request: Request
) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          error: "Item ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const item =
      await db.orm.public.InventoryItem
        .where({
          id: Number(body.id),
        })
        .update({
          ...(body.name !== undefined && {
            name: String(body.name).trim(),
          }),

          ...(body.category !== undefined && {
            category: String(
              body.category
            ).trim(),
          }),

          ...(body.modelUrl !== undefined && {
            modelUrl: String(
              body.modelUrl
            ).trim(),
          }),

          ...(body.imageUrl !== undefined && {
            imageUrl: body.imageUrl
              ? String(
                  body.imageUrl
                ).trim()
              : null,
          }),

          ...(body.width !== undefined && {
            width: Number(body.width),
          }),

          ...(body.depth !== undefined && {
            depth: Number(body.depth),
          }),

          ...(body.height !== undefined && {
            height: Number(body.height),
          }),

          ...(body.quantity !== undefined && {
            quantity: Number(body.quantity),
          }),

          ...(body.availableQuantity !==
            undefined && {
            availableQuantity: Number(
              body.availableQuantity
            ),
          }),

          ...(body.price !== undefined && {
            price: Number(body.price),
          }),
        });

    return NextResponse.json(
      item,
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Inventory PATCH error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown database error";

    return NextResponse.json(
      {
        error:
          "Failed to update inventory item",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}

// DELETE - Delete an inventory item
export async function DELETE(
  request: Request
) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          error: "Item ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const item =
      await db.orm.public.InventoryItem
        .where({
          id: Number(body.id),
        })
        .delete();

    return NextResponse.json(
      {
        message:
          "Inventory item deleted successfully",
        item,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Inventory DELETE error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unknown database error";

    return NextResponse.json(
      {
        error:
          "Failed to delete inventory item",
        details: message,
      },
      {
        status: 500,
      }
    );
  }
}