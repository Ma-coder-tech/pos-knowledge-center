import type { Database } from "../db/client";

type TransactionCallback = Parameters<Database["transaction"]>[0];

export type DbTransaction = Parameters<TransactionCallback>[0];
export type DbExecutor = Database | DbTransaction;

