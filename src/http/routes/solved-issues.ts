import { Hono } from "hono";
import { createSolvedIssueSchema } from "../../api/contracts";
import type { Database } from "../../db/client";
import { parseJson } from "../../lib/http";
import { createSolvedIssue } from "../../repositories/solved-issues";
import type { AppBindings } from "../middleware";

export function createSolvedIssuesRouter(database: Database) {
  const router = new Hono<AppBindings>();

  router.post("/solved-issues", async (context) => {
    const input = await parseJson(context, createSolvedIssueSchema);
    const solvedIssue = await createSolvedIssue(database, context.get("tenantId"), input);
    return context.json(
      {
        solvedIssue: {
          id: solvedIssue.id,
          status: solvedIssue.status,
        },
      },
      201,
    );
  });

  return router;
}

