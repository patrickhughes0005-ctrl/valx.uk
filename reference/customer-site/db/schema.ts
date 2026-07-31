import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey(),
  status: text("status").notNull().default("available"),
  acceptedBy: text("accepted_by"),
  acceptedAt: integer("accepted_at"),
});
