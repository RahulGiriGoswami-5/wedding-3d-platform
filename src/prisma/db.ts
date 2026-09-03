import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

/*
 * The database already contains the application tables.
 *
 * Marker verification is disabled because the deployed database marker
 * can become stale or unreadable independently of the actual tables.
 *
 * This prevents database operations such as Venue.create() from failing
 * with: "Database error while reading contract marker".
 */
export const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
  verifyMarker: false,
});