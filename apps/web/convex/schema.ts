import { defineSchema } from "convex/server";
import { users, syncLog } from "./core/tables";
import { contacts } from "./contacts/tables";
import { loans } from "./loans/tables";
import { documents } from "./documents/tables";
import { activities } from "./activities/tables";
import { feedItems } from "./feed/tables";
import { templates } from "./templates/tables";
import { rateSnapshots } from "./rates/tables";

export default defineSchema({
  users,
  syncLog,
  contacts,
  loans,
  documents,
  activities,
  feedItems,
  templates,
  rateSnapshots,
});
