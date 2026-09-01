import { NextResponse } from "next/server";
import { db } from "@/src/prisma/db";

type MatchRequest = {
  eventType?: string;
  eventDate?: string;
  location?: string;
  guests?: number;
  budget?: number;
  seating?: string;
  decoration?: string;
  requirements?: string;
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function calculateVenueMatch(
  venue: {
    id: number;
    name: string;
    location: string;
    capacity: number;
    price: number;
    availability: boolean;
  },
  request: {
    location: string;
    guests: number;
    budget: number;
  }
) {
  let score = 0;

  const reasons: string[] = [];

  const venueLocation = normalizeText(venue.location);
  const clientLocation = normalizeText(request.location);

  if (
    venueLocation === clientLocation
  ) {
    score += 30;

    reasons.push(
      "Located in the requested area"
    );
  } else if (
    venueLocation.includes(clientLocation) ||
    clientLocation.includes(venueLocation)
  ) {
    score += 20;

    reasons.push(
      "Located near the requested area"
    );
  }

  if (
    venue.capacity >= request.guests
  ) {
    const extraCapacity =
      venue.capacity - request.guests;

    score += 30;

    reasons.push(
      "Has enough capacity for all guests"
    );

    if (
      extraCapacity <=
      request.guests * 0.25
    ) {
      score += 10;

      reasons.push(
        "Capacity closely matches the guest count"
      );
    }
  }

  if (
    venue.price <= request.budget
  ) {
    score += 20;

    reasons.push(
      "Fits within the client's budget"
    );

    if (
      venue.price <=
      request.budget * 0.7
    ) {
      score += 5;

      reasons.push(
        "Leaves budget available for inventory and decoration"
      );
    }
  }

  if (venue.availability) {
    score += 15;

    reasons.push(
      "Currently available"
    );
  }

  return {
    score,
    reasons,
  };
}

function calculateInventoryMatch(
  item: {
    id: number;
    name: string;
    category: string;
    quantity: number;
    availableQuantity: number;
    price: number;
  },
  request: {
    guests: number;
    seating: string;
    decoration: string;
    requirements: string;
    eventType: string;
  }
) {
  let score = 0;

  const reasons: string[] = [];

  if (
    item.availableQuantity <= 0
  ) {
    return {
      score: 0,
      reasons: [
        "Currently unavailable",
      ],
    };
  }

  score += 20;

  reasons.push(
    "Item is currently available"
  );

  const searchableText = [
    normalizeText(item.name),
    normalizeText(item.category),
  ].join(" ");

  const keywords = [
    ...normalizeText(
      request.seating
    )
      .split(/\s+/),

    ...normalizeText(
      request.decoration
    )
      .split(/\s+/),

    ...normalizeText(
      request.requirements
    )
      .split(/\s+/),

    ...normalizeText(
      request.eventType
    )
      .split(/\s+/),
  ].filter(
    (keyword) =>
      keyword.length >= 3
  );

  const uniqueKeywords = [
    ...new Set(keywords),
  ];

  let matchedKeywords = 0;

  for (
    const keyword of uniqueKeywords
  ) {
    if (
      searchableText.includes(
        keyword
      )
    ) {
      matchedKeywords++;
    }
  }

  if (
    matchedKeywords > 0
  ) {
    const keywordScore =
      Math.min(
        matchedKeywords * 10,
        40
      );

    score += keywordScore;

    reasons.push(
      "Matches the client's event requirements"
    );
  }

  if (
    item.availableQuantity > 0
  ) {
    score += 20;

    reasons.push(
      "Available for use in the event"
    );
  }

  return {
    score,
    reasons,
  };
}

export async function POST(
  request: Request
) {
  try {
    const body: MatchRequest =
      await request.json();

    const eventType =
      normalizeText(body.eventType);

    const location =
      normalizeText(body.location);

    const guests =
      Number(body.guests);

    const budget =
      Number(body.budget);

    const seating =
      normalizeText(body.seating);

    const decoration =
      normalizeText(body.decoration);

    const requirements =
      normalizeText(
        body.requirements
      );

    if (
      !eventType ||
      !location
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Event type and location are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(guests) ||
      guests <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Guest count must be a positive whole number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Budget must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get existing Phase 3 data.
     *
     * No database schema changes.
     * No Prisma contract changes.
     */
    const venues =
      await db.orm.public.Venue.all();

    const inventoryItems =
      await db.orm.public.InventoryItem.all();

    /*
     * Match venues.
     */
    const matchedVenues =
      venues
        .map((venue) => {
          const match =
            calculateVenueMatch(
              venue,
              {
                location,
                guests,
                budget,
              }
            );

          return {
            ...venue,
            matchScore:
              match.score,
            matchReasons:
              match.reasons,
          };
        })
        .filter(
          (venue) =>
            venue.availability &&
            venue.capacity >= guests
        )
        .sort(
          (a, b) =>
            b.matchScore -
            a.matchScore
        );

    /*
     * Match inventory.
     */
    const matchedInventory =
      inventoryItems
        .map((item) => {
          const match =
            calculateInventoryMatch(
              item,
              {
                guests,
                seating,
                decoration,
                requirements,
                eventType,
              }
            );

          return {
            ...item,
            matchScore:
              match.score,
            matchReasons:
              match.reasons,
          };
        })
        .filter(
          (item) =>
            item.availableQuantity > 0 &&
            item.matchScore > 0
        )
        .sort(
          (a, b) =>
            b.matchScore -
            a.matchScore
        );

    /*
     * Return the best recommendations.
     */
    return NextResponse.json(
      {
        success: true,

        clientRequirements: {
          eventType:
            body.eventType,

          eventDate:
            body.eventDate ?? null,

          location:
            body.location,

          guests,

          budget,

          seating:
            body.seating ?? null,

          decoration:
            body.decoration ?? null,

          requirements:
            body.requirements ?? null,
        },

        summary: {
          totalVenues:
            venues.length,

          matchedVenues:
            matchedVenues.length,

          totalInventoryItems:
            inventoryItems.length,

          matchedInventoryItems:
            matchedInventory.length,
        },

        recommendations: {
          venues:
            matchedVenues.slice(
              0,
              5
            ),

          inventory:
            matchedInventory.slice(
              0,
              10
            ),
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Matching engine error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to generate recommendations.",
      },
      {
        status: 500,
      }
    );
  }
}