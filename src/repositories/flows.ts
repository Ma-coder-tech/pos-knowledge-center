import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  AdvanceFlowSessionInput,
  CreateFlowEdgeInput,
  CreateFlowInput,
  CreateFlowNodeInput,
  FlowFilterInput,
  RunFlowInput,
  UpdateFlowEdgeInput,
  UpdateFlowInput,
  UpdateFlowNodeInput,
} from "../api/contracts";
import type { Database } from "../db/client";
import { deviceModels, products } from "../db/schema/catalog";
import {
  flowEdges,
  flowNodes,
  flowSessionEvents,
  flowSessions,
  troubleshootingFlowDeviceModels,
  troubleshootingFlowProducts,
  troubleshootingFlows,
} from "../db/schema/flows";
import { AppError } from "../lib/errors";
import type { DbExecutor } from "./shared";

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

async function assertProductIds(executor: DbExecutor, tenantId: string, productIds: string[]) {
  if (productIds.length === 0) {
    return;
  }

  const rows = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

  if (rows.length !== new Set(productIds).size) {
    throw new AppError(400, "validation_error", "One or more products do not belong to the tenant.", {
      field: "productIds",
    });
  }
}

async function assertDeviceModelIds(executor: DbExecutor, tenantId: string, deviceModelIds: string[]) {
  if (deviceModelIds.length === 0) {
    return;
  }

  const rows = await executor
    .select({ id: deviceModels.id })
    .from(deviceModels)
    .where(and(eq(deviceModels.tenantId, tenantId), inArray(deviceModels.id, deviceModelIds)));

  if (rows.length !== new Set(deviceModelIds).size) {
    throw new AppError(400, "validation_error", "One or more device models do not belong to the tenant.", {
      field: "deviceModelIds",
    });
  }
}

async function getFlowRecord(executor: DbExecutor, tenantId: string, flowId: string) {
  const [flow] = await executor
    .select()
    .from(troubleshootingFlows)
    .where(and(eq(troubleshootingFlows.id, flowId), eq(troubleshootingFlows.tenantId, tenantId)))
    .limit(1);

  if (!flow) {
    throw new AppError(404, "not_found", "Troubleshooting flow not found.");
  }

  return flow;
}

async function getFlowEdgeById(executor: DbExecutor, flowId: string, edgeId: string) {
  const [edge] = await executor
    .select()
    .from(flowEdges)
    .where(and(eq(flowEdges.id, edgeId), eq(flowEdges.flowId, flowId)))
    .limit(1);

  if (!edge) {
    throw new AppError(404, "not_found", "Flow edge not found.");
  }

  return edge;
}

async function getFlowNodes(executor: DbExecutor, flowId: string) {
  return executor
    .select()
    .from(flowNodes)
    .where(eq(flowNodes.flowId, flowId))
    .orderBy(asc(flowNodes.sortOrder), asc(flowNodes.createdAt));
}

async function getFlowNodeById(executor: DbExecutor, flowId: string, nodeId: string) {
  const [node] = await executor
    .select()
    .from(flowNodes)
    .where(and(eq(flowNodes.id, nodeId), eq(flowNodes.flowId, flowId)))
    .limit(1);

  if (!node) {
    throw new AppError(400, "validation_error", "Referenced flow node does not belong to the flow.", {
      field: "nodeId",
    });
  }

  return node;
}

async function hasActiveSessions(executor: DbExecutor, flowId: string) {
  const [activeSession] = await executor
    .select({ id: flowSessions.id })
    .from(flowSessions)
    .where(and(eq(flowSessions.flowId, flowId), eq(flowSessions.status, "active")))
    .limit(1);

  return Boolean(activeSession);
}

async function hasAnySessions(executor: DbExecutor, flowId: string) {
  const [session] = await executor
    .select({ id: flowSessions.id })
    .from(flowSessions)
    .where(eq(flowSessions.flowId, flowId))
    .limit(1);

  return Boolean(session);
}

async function assertNoActiveSessions(executor: DbExecutor, flowId: string) {
  if (await hasActiveSessions(executor, flowId)) {
    throw new AppError(409, "conflict", "Flow cannot be modified while it has active sessions.");
  }
}

async function assertNoSessions(executor: DbExecutor, flowId: string) {
  if (await hasAnySessions(executor, flowId)) {
    throw new AppError(409, "conflict", "Flow cannot be deleted after sessions have been recorded.");
  }
}

async function markFlowAsDraft(executor: DbExecutor, flowId: string) {
  await executor
    .update(troubleshootingFlows)
    .set({
      status: "draft",
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(troubleshootingFlows.id, flowId));
}

function validateEdgeCondition(conditionType: typeof flowEdges.$inferSelect.conditionType, conditionValue: string | null) {
  if ((conditionType === "answer_equals" || conditionType === "answer_not_equals") && !conditionValue) {
    throw new AppError(400, "validation_error", "conditionValue is required for answer-based edges.", {
      field: "conditionValue",
    });
  }
}

function pickMatchingEdge(
  edges: typeof flowEdges.$inferSelect[],
  answer: string,
) {
  const normalizedAnswer = normalizeAnswer(answer);
  const answerEquals = edges.find(
    (edge) =>
      edge.conditionType === "answer_equals" &&
      edge.conditionValue !== null &&
      normalizeAnswer(edge.conditionValue) === normalizedAnswer,
  );

  if (answerEquals) {
    return answerEquals;
  }

  const answerNotEquals = edges.find(
    (edge) =>
      edge.conditionType === "answer_not_equals" &&
      edge.conditionValue !== null &&
      normalizeAnswer(edge.conditionValue) !== normalizedAnswer,
  );

  if (answerNotEquals) {
    return answerNotEquals;
  }

  return edges.find((edge) => edge.conditionType === "always") ?? null;
}

export async function listFlows(database: Database, tenantId: string, filters: FlowFilterInput) {
  const conditions = [eq(troubleshootingFlows.tenantId, tenantId)];

  if (filters.status) {
    conditions.push(eq(troubleshootingFlows.status, filters.status));
  }

  if (filters.audience) {
    conditions.push(eq(troubleshootingFlows.audience, filters.audience));
  }

  let flows = await database
    .select()
    .from(troubleshootingFlows)
    .where(and(...conditions))
    .orderBy(desc(troubleshootingFlows.updatedAt))
    .limit(filters.limit ?? 25);

  if (filters.productId) {
    const rows = await database
      .select({ flowId: troubleshootingFlowProducts.flowId })
      .from(troubleshootingFlowProducts)
      .where(eq(troubleshootingFlowProducts.productId, filters.productId));
    const allowedIds = new Set(rows.map((row) => row.flowId));
    flows = flows.filter((flow) => allowedIds.has(flow.id));
  }

  if (filters.deviceModelId) {
    const rows = await database
      .select({ flowId: troubleshootingFlowDeviceModels.flowId })
      .from(troubleshootingFlowDeviceModels)
      .where(eq(troubleshootingFlowDeviceModels.deviceModelId, filters.deviceModelId));
    const allowedIds = new Set(rows.map((row) => row.flowId));
    flows = flows.filter((flow) => allowedIds.has(flow.id));
  }

  if (flows.length === 0) {
    return [];
  }

  const flowIds = flows.map((flow) => flow.id);
  const [productRows, deviceRows, nodeCounts] = await Promise.all([
    database
      .select()
      .from(troubleshootingFlowProducts)
      .where(inArray(troubleshootingFlowProducts.flowId, flowIds)),
    database
      .select()
      .from(troubleshootingFlowDeviceModels)
      .where(inArray(troubleshootingFlowDeviceModels.flowId, flowIds)),
    database
      .select({
        flowId: flowNodes.flowId,
        count: sql<number>`count(*)::int`,
      })
      .from(flowNodes)
      .where(inArray(flowNodes.flowId, flowIds))
      .groupBy(flowNodes.flowId),
  ]);

  const productIdsByFlowId = new Map<string, string[]>();
  for (const row of productRows) {
    const ids = productIdsByFlowId.get(row.flowId) ?? [];
    ids.push(row.productId);
    productIdsByFlowId.set(row.flowId, ids);
  }

  const deviceIdsByFlowId = new Map<string, string[]>();
  for (const row of deviceRows) {
    const ids = deviceIdsByFlowId.get(row.flowId) ?? [];
    ids.push(row.deviceModelId);
    deviceIdsByFlowId.set(row.flowId, ids);
  }

  const nodeCountByFlowId = new Map(nodeCounts.map((row) => [row.flowId, row.count]));

  return flows.map((flow) => ({
    ...flow,
    productIds: productIdsByFlowId.get(flow.id) ?? [],
    deviceModelIds: deviceIdsByFlowId.get(flow.id) ?? [],
    nodeCount: nodeCountByFlowId.get(flow.id) ?? 0,
  }));
}

export async function getFlowById(executor: DbExecutor, tenantId: string, flowId: string) {
  const flow = await getFlowRecord(executor, tenantId, flowId);

  const [productRows, deviceRows, nodes, edges] = await Promise.all([
    executor
      .select()
      .from(troubleshootingFlowProducts)
      .where(eq(troubleshootingFlowProducts.flowId, flowId)),
    executor
      .select()
      .from(troubleshootingFlowDeviceModels)
      .where(eq(troubleshootingFlowDeviceModels.flowId, flowId)),
    getFlowNodes(executor, flowId),
    executor
      .select()
      .from(flowEdges)
      .where(eq(flowEdges.flowId, flowId))
      .orderBy(asc(flowEdges.createdAt)),
  ]);

  return {
    ...flow,
    productIds: productRows.map((row) => row.productId),
    deviceModelIds: deviceRows.map((row) => row.deviceModelId),
    nodes,
    edges,
  };
}

export async function createFlow(database: Database, tenantId: string, input: CreateFlowInput) {
  return database.transaction(async (tx) => {
    await Promise.all([
      assertProductIds(tx, tenantId, input.productIds),
      assertDeviceModelIds(tx, tenantId, input.deviceModelIds),
    ]);

    const [flow] = await tx
      .insert(troubleshootingFlows)
      .values({
        tenantId,
        title: input.title,
        symptom: input.symptom,
        audience: input.audience,
        status: "draft",
      })
      .returning();

    if (input.productIds.length > 0) {
      await tx.insert(troubleshootingFlowProducts).values(
        input.productIds.map((productId) => ({
          flowId: flow.id,
          productId,
        })),
      );
    }

    if (input.deviceModelIds.length > 0) {
      await tx.insert(troubleshootingFlowDeviceModels).values(
        input.deviceModelIds.map((deviceModelId) => ({
          flowId: flow.id,
          deviceModelId,
        })),
      );
    }

    return {
      ...flow,
      productIds: input.productIds,
      deviceModelIds: input.deviceModelIds,
    };
  });
}

export async function updateFlow(
  database: Database,
  tenantId: string,
  flowId: string,
  input: UpdateFlowInput,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await Promise.all([
      assertProductIds(tx, tenantId, input.productIds ?? []),
      assertDeviceModelIds(tx, tenantId, input.deviceModelIds ?? []),
    ]);

    const updates: Partial<typeof troubleshootingFlows.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      updates.title = input.title;
    }

    if (input.symptom !== undefined) {
      updates.symptom = input.symptom;
    }

    if (input.audience !== undefined) {
      updates.audience = input.audience;
    }

    await tx
      .update(troubleshootingFlows)
      .set({
        ...updates,
        status: "draft",
        publishedAt: null,
      })
      .where(eq(troubleshootingFlows.id, flowId));

    if (input.productIds !== undefined) {
      await tx.delete(troubleshootingFlowProducts).where(eq(troubleshootingFlowProducts.flowId, flowId));

      if (input.productIds.length > 0) {
        await tx.insert(troubleshootingFlowProducts).values(
          input.productIds.map((productId) => ({
            flowId,
            productId,
          })),
        );
      }
    }

    if (input.deviceModelIds !== undefined) {
      await tx
        .delete(troubleshootingFlowDeviceModels)
        .where(eq(troubleshootingFlowDeviceModels.flowId, flowId));

      if (input.deviceModelIds.length > 0) {
        await tx.insert(troubleshootingFlowDeviceModels).values(
          input.deviceModelIds.map((deviceModelId) => ({
            flowId,
            deviceModelId,
          })),
        );
      }
    }

    return getFlowById(tx, tenantId, flowId);
  });
}

export async function createFlowNode(
  database: Database,
  tenantId: string,
  flowId: string,
  input: CreateFlowNodeInput,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await assertNoActiveSessions(tx, flowId);

    if (input.nodeType === "start") {
      const [existingStart] = await tx
        .select({ id: flowNodes.id })
        .from(flowNodes)
        .where(and(eq(flowNodes.flowId, flowId), eq(flowNodes.nodeType, "start")))
        .limit(1);

      if (existingStart) {
        throw new AppError(409, "conflict", "A flow can only have one start node.");
      }
    }

    const resolvedSortOrder =
      input.sortOrder ??
      (
        await tx
          .select({
            nextValue: sql<number>`coalesce(max(${flowNodes.sortOrder}), -1) + 1`,
          })
          .from(flowNodes)
          .where(eq(flowNodes.flowId, flowId))
      )[0]?.nextValue ??
      0;

    const [node] = await tx
      .insert(flowNodes)
      .values({
        flowId,
        nodeType: input.nodeType,
        title: input.title,
        body: input.body,
        voiceText: input.voiceText,
        sortOrder: resolvedSortOrder,
      })
      .returning();

    await markFlowAsDraft(tx, flowId);

    return node;
  });
}

export async function updateFlowNode(
  database: Database,
  tenantId: string,
  flowId: string,
  nodeId: string,
  input: UpdateFlowNodeInput,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await assertNoActiveSessions(tx, flowId);

    const node = await getFlowNodeById(tx, flowId, nodeId);
    const nextNodeType = input.nodeType ?? node.nodeType;

    if (nextNodeType === "start" && node.nodeType !== "start") {
      const [existingStart] = await tx
        .select({ id: flowNodes.id })
        .from(flowNodes)
        .where(and(eq(flowNodes.flowId, flowId), eq(flowNodes.nodeType, "start")))
        .limit(1);

      if (existingStart) {
        throw new AppError(409, "conflict", "A flow can only have one start node.");
      }
    }

    const updates: Partial<typeof flowNodes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.nodeType !== undefined) {
      updates.nodeType = input.nodeType;
    }

    if (input.title !== undefined) {
      updates.title = input.title;
    }

    if (input.body !== undefined) {
      updates.body = input.body;
    }

    if (input.voiceText !== undefined) {
      updates.voiceText = input.voiceText;
    }

    if (input.sortOrder !== undefined) {
      updates.sortOrder = input.sortOrder;
    }

    const [updatedNode] = await tx
      .update(flowNodes)
      .set(updates)
      .where(eq(flowNodes.id, nodeId))
      .returning();

    await markFlowAsDraft(tx, flowId);

    return updatedNode;
  });
}

export async function createFlowEdge(
  database: Database,
  tenantId: string,
  flowId: string,
  input: CreateFlowEdgeInput,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await assertNoActiveSessions(tx, flowId);
    await Promise.all([
      getFlowNodeById(tx, flowId, input.fromNodeId),
      getFlowNodeById(tx, flowId, input.toNodeId),
    ]);

    const [edge] = await tx
      .insert(flowEdges)
      .values({
        flowId,
        fromNodeId: input.fromNodeId,
        toNodeId: input.toNodeId,
        conditionType: input.conditionType,
        conditionValue: input.conditionValue,
      })
      .returning();

    await markFlowAsDraft(tx, flowId);

    return edge;
  });
}

export async function updateFlowEdge(
  database: Database,
  tenantId: string,
  flowId: string,
  edgeId: string,
  input: UpdateFlowEdgeInput,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await assertNoActiveSessions(tx, flowId);

    const edge = await getFlowEdgeById(tx, flowId, edgeId);
    const nextFromNodeId = input.fromNodeId ?? edge.fromNodeId;
    const nextToNodeId = input.toNodeId ?? edge.toNodeId;
    const nextConditionType = input.conditionType ?? edge.conditionType;
    const nextConditionValue = input.conditionValue === undefined ? edge.conditionValue : input.conditionValue;

    await Promise.all([
      getFlowNodeById(tx, flowId, nextFromNodeId),
      getFlowNodeById(tx, flowId, nextToNodeId),
    ]);
    validateEdgeCondition(nextConditionType, nextConditionValue);

    const updates: Partial<typeof flowEdges.$inferInsert> = {};

    if (input.fromNodeId !== undefined) {
      updates.fromNodeId = input.fromNodeId;
    }

    if (input.toNodeId !== undefined) {
      updates.toNodeId = input.toNodeId;
    }

    if (input.conditionType !== undefined) {
      updates.conditionType = input.conditionType;
    }

    if (input.conditionValue !== undefined) {
      updates.conditionValue = input.conditionValue;
    }

    const [updatedEdge] = await tx
      .update(flowEdges)
      .set(updates)
      .where(eq(flowEdges.id, edgeId))
      .returning();

    await markFlowAsDraft(tx, flowId);

    return updatedEdge;
  });
}

export async function deleteFlow(database: Database, tenantId: string, flowId: string) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await assertNoSessions(tx, flowId);

    const [deletedFlow] = await tx
      .delete(troubleshootingFlows)
      .where(and(eq(troubleshootingFlows.id, flowId), eq(troubleshootingFlows.tenantId, tenantId)))
      .returning({ id: troubleshootingFlows.id });

    return deletedFlow ?? { id: flowId };
  });
}

export async function deleteFlowNode(
  database: Database,
  tenantId: string,
  flowId: string,
  nodeId: string,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);

    if (await hasAnySessions(tx, flowId)) {
      throw new AppError(409, "conflict", "Flow nodes cannot be deleted after sessions have been recorded.");
    }

    await getFlowNodeById(tx, flowId, nodeId);

    const [deletedNode] = await tx
      .delete(flowNodes)
      .where(eq(flowNodes.id, nodeId))
      .returning({ id: flowNodes.id });

    await markFlowAsDraft(tx, flowId);

    return deletedNode ?? { id: nodeId };
  });
}

export async function deleteFlowEdge(
  database: Database,
  tenantId: string,
  flowId: string,
  edgeId: string,
) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);
    await assertNoActiveSessions(tx, flowId);
    await getFlowEdgeById(tx, flowId, edgeId);

    const [deletedEdge] = await tx
      .delete(flowEdges)
      .where(eq(flowEdges.id, edgeId))
      .returning({ id: flowEdges.id });

    await markFlowAsDraft(tx, flowId);

    return deletedEdge ?? { id: edgeId };
  });
}

export async function publishFlow(database: Database, tenantId: string, flowId: string) {
  return database.transaction(async (tx) => {
    await getFlowRecord(tx, tenantId, flowId);

    const [nodes, edges] = await Promise.all([
      getFlowNodes(tx, flowId),
      tx.select().from(flowEdges).where(eq(flowEdges.flowId, flowId)),
    ]);

    if (nodes.length === 0) {
      throw new AppError(400, "validation_error", "Flow must have at least one node before publishing.");
    }

    const startNodes = nodes.filter((node) => node.nodeType === "start");
    const outcomeNodes = nodes.filter((node) => node.nodeType === "outcome");

    if (startNodes.length !== 1) {
      throw new AppError(400, "validation_error", "Flow must have exactly one start node before publishing.");
    }

    if (outcomeNodes.length === 0) {
      throw new AppError(400, "validation_error", "Flow must have at least one outcome node before publishing.");
    }

    if (edges.length === 0) {
      throw new AppError(400, "validation_error", "Flow must have at least one edge before publishing.");
    }

    const outgoingCountByNodeId = new Map<string, number>();
    for (const edge of edges) {
      outgoingCountByNodeId.set(edge.fromNodeId, (outgoingCountByNodeId.get(edge.fromNodeId) ?? 0) + 1);
    }

    const deadEndNode = nodes.find(
      (node) => node.nodeType !== "outcome" && (outgoingCountByNodeId.get(node.id) ?? 0) === 0,
    );

    if (deadEndNode) {
      throw new AppError(
        400,
        "validation_error",
        `Flow node "${deadEndNode.title}" does not have any outgoing edges.`,
      );
    }

    const [publishedFlow] = await tx
      .update(troubleshootingFlows)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(troubleshootingFlows.id, flowId))
      .returning();

    return publishedFlow;
  });
}

export async function startFlowSession(
  database: Database,
  tenantId: string,
  flowId: string,
  input: RunFlowInput,
) {
  return database.transaction(async (tx) => {
    const flow = await getFlowRecord(tx, tenantId, flowId);
    await assertDeviceModelIds(tx, tenantId, input.deviceModelId ? [input.deviceModelId] : []);

    const nodes = await getFlowNodes(tx, flowId);

    if (nodes.length === 0) {
      throw new AppError(400, "validation_error", "Flow must have at least one node before it can run.");
    }

    const startNode = nodes.find((node) => node.nodeType === "start") ?? nodes[0];

    const [session] = await tx
      .insert(flowSessions)
      .values({
        tenantId,
        flowId,
        audience: flow.audience,
        mode: input.mode,
        currentNodeId: startNode.id,
        status: "active",
      })
      .returning();

    await tx.insert(flowSessionEvents).values({
      flowSessionId: session.id,
      nodeId: startNode.id,
      eventType: "session_started",
    });

    return { session, currentNode: startNode };
  });
}

export async function advanceFlowSession(
  database: Database,
  tenantId: string,
  sessionId: string,
  input: AdvanceFlowSessionInput,
) {
  return database.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(flowSessions)
      .where(and(eq(flowSessions.id, sessionId), eq(flowSessions.tenantId, tenantId)))
      .limit(1);

    if (!session) {
      throw new AppError(404, "not_found", "Flow session not found.");
    }

    if (session.status !== "active") {
      throw new AppError(400, "validation_error", "Flow session is no longer active.");
    }

    if (!session.currentNodeId) {
      throw new AppError(400, "validation_error", "Flow session has no current node.");
    }

    const currentNode = await getFlowNodeById(tx, session.flowId, session.currentNodeId);

    if (currentNode.nodeType === "outcome") {
      throw new AppError(400, "validation_error", "Flow session is already at an outcome node.");
    }

    const outgoingEdges = await tx
      .select()
      .from(flowEdges)
      .where(and(eq(flowEdges.flowId, session.flowId), eq(flowEdges.fromNodeId, currentNode.id)))
      .orderBy(asc(flowEdges.createdAt));

    const matchingEdge = pickMatchingEdge(outgoingEdges, input.answer);

    if (!matchingEdge) {
      throw new AppError(400, "validation_error", "No matching edge was found for the provided answer.", {
        field: "answer",
      });
    }

    const nextNode = await getFlowNodeById(tx, session.flowId, matchingEdge.toNodeId);
    const nextStatus = nextNode.nodeType === "outcome" ? "completed" : "active";

    const [updatedSession] = await tx
      .update(flowSessions)
      .set({
        currentNodeId: nextNode.id,
        status: nextStatus,
        endedAt: nextStatus === "completed" ? new Date() : null,
      })
      .where(eq(flowSessions.id, session.id))
      .returning();

    await tx.insert(flowSessionEvents).values([
      {
        flowSessionId: session.id,
        nodeId: currentNode.id,
        eventType: "answer_submitted",
        answer: input.answer,
      },
      {
        flowSessionId: session.id,
        nodeId: nextNode.id,
        eventType: nextStatus === "completed" ? "outcome_reached" : "node_reached",
      },
    ]);

    return { session: updatedSession, currentNode: nextNode };
  });
}

export async function getFlowSessionById(database: Database, tenantId: string, sessionId: string) {
  const [session] = await database
    .select()
    .from(flowSessions)
    .where(and(eq(flowSessions.id, sessionId), eq(flowSessions.tenantId, tenantId)))
    .limit(1);

  if (!session) {
    return null;
  }

  const [flow, currentNode, outgoingEdges] = await Promise.all([
    getFlowRecord(database, tenantId, session.flowId),
    session.currentNodeId ? getFlowNodeById(database, session.flowId, session.currentNodeId) : Promise.resolve(null),
    session.currentNodeId
      ? database
          .select()
          .from(flowEdges)
          .where(and(eq(flowEdges.flowId, session.flowId), eq(flowEdges.fromNodeId, session.currentNodeId)))
          .orderBy(asc(flowEdges.createdAt))
      : Promise.resolve([]),
  ]);

  return {
    session,
    flow,
    currentNode,
    outgoingEdges,
  };
}
