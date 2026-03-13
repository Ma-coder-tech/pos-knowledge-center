import { Hono } from "hono";
import {
  advanceFlowSessionSchema,
  createFlowEdgeSchema,
  createFlowNodeSchema,
  createFlowSchema,
  flowFilterSchema,
  runFlowSchema,
  updateFlowEdgeSchema,
  updateFlowNodeSchema,
  updateFlowSchema,
} from "../../api/contracts";
import type { Database } from "../../db/client";
import { parseJson, parseQuery } from "../../lib/http";
import {
  advanceFlowSession,
  createFlow,
  createFlowEdge,
  createFlowNode,
  deleteFlow,
  deleteFlowEdge,
  deleteFlowNode,
  getFlowById,
  listFlows,
  publishFlow,
  startFlowSession,
  updateFlow,
  updateFlowEdge,
  updateFlowNode,
} from "../../repositories/flows";
import type { AppBindings } from "../middleware";

export function createFlowsRouter(database: Database) {
  const router = new Hono<AppBindings>();

  router.get("/flows", async (context) => {
    const filters = parseQuery(context, flowFilterSchema);
    const items = await listFlows(database, context.get("tenantId"), filters);

    return context.json({
      items,
      nextCursor: null,
    });
  });

  router.post("/flows", async (context) => {
    const input = await parseJson(context, createFlowSchema);
    const flow = await createFlow(database, context.get("tenantId"), input);
    return context.json({ flow }, 201);
  });

  router.patch("/flows/:flowId", async (context) => {
    const input = await parseJson(context, updateFlowSchema);
    const flow = await updateFlow(database, context.get("tenantId"), context.req.param("flowId"), input);
    return context.json({ flow });
  });

  router.delete("/flows/:flowId", async (context) => {
    const deleted = await deleteFlow(database, context.get("tenantId"), context.req.param("flowId"));
    return context.json({ deleted });
  });

  router.post("/flows/:flowId/publish", async (context) => {
    const flow = await publishFlow(database, context.get("tenantId"), context.req.param("flowId"));
    return context.json({ flow });
  });

  router.get("/flows/:flowId", async (context) => {
    const flow = await getFlowById(database, context.get("tenantId"), context.req.param("flowId"));
    return context.json({ flow });
  });

  router.post("/flows/:flowId/nodes", async (context) => {
    const input = await parseJson(context, createFlowNodeSchema);
    const node = await createFlowNode(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      input,
    );

    return context.json({ node }, 201);
  });

  router.patch("/flows/:flowId/nodes/:nodeId", async (context) => {
    const input = await parseJson(context, updateFlowNodeSchema);
    const node = await updateFlowNode(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      context.req.param("nodeId"),
      input,
    );

    return context.json({ node });
  });

  router.delete("/flows/:flowId/nodes/:nodeId", async (context) => {
    const deleted = await deleteFlowNode(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      context.req.param("nodeId"),
    );

    return context.json({ deleted });
  });

  router.post("/flows/:flowId/edges", async (context) => {
    const input = await parseJson(context, createFlowEdgeSchema);
    const edge = await createFlowEdge(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      input,
    );

    return context.json({ edge }, 201);
  });

  router.patch("/flows/:flowId/edges/:edgeId", async (context) => {
    const input = await parseJson(context, updateFlowEdgeSchema);
    const edge = await updateFlowEdge(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      context.req.param("edgeId"),
      input,
    );

    return context.json({ edge });
  });

  router.delete("/flows/:flowId/edges/:edgeId", async (context) => {
    const deleted = await deleteFlowEdge(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      context.req.param("edgeId"),
    );

    return context.json({ deleted });
  });

  router.post("/flows/:flowId/sessions", async (context) => {
    const input = await parseJson(context, runFlowSchema);
    const result = await startFlowSession(
      database,
      context.get("tenantId"),
      context.req.param("flowId"),
      input,
    );

    return context.json(result, 201);
  });

  router.post("/flow-sessions/:sessionId/advance", async (context) => {
    const input = await parseJson(context, advanceFlowSessionSchema);
    const result = await advanceFlowSession(
      database,
      context.get("tenantId"),
      context.req.param("sessionId"),
      input,
    );

    return context.json(result);
  });

  return router;
}
