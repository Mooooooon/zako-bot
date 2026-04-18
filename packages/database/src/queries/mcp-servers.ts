import { asc, eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../client.js'
import { mcpServers } from '../schema/mcp-servers.js'
import type { McpServerRow } from '../schema/mcp-servers.js'

export function listMcpServers(db: DB): McpServerRow[] {
  return db
    .select()
    .from(mcpServers)
    .orderBy(asc(mcpServers.createdAt))
    .all()
}

export function getMcpServer(db: DB, id: string): McpServerRow | undefined {
  return db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.id, id))
    .get()
}

export function getMcpServerByName(db: DB, name: string): McpServerRow | undefined {
  return db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.name, name))
    .get()
}

export function listEnabledMcpServers(db: DB): McpServerRow[] {
  return db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.enabled, true))
    .orderBy(asc(mcpServers.createdAt))
    .all()
}

export function createMcpServer(
  db: DB,
  input: Omit<McpServerRow, 'id' | 'createdAt' | 'updatedAt'>,
): McpServerRow {
  const now = new Date()
  const row = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  db.insert(mcpServers).values(row).run()
  return getMcpServer(db, row.id)!
}

export function updateMcpServer(
  db: DB,
  id: string,
  input: Partial<Omit<McpServerRow, 'id' | 'createdAt'>>,
): McpServerRow | undefined {
  db
    .update(mcpServers)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(mcpServers.id, id))
    .run()

  return getMcpServer(db, id)
}

export function deleteMcpServer(db: DB, id: string): void {
  db
    .delete(mcpServers)
    .where(eq(mcpServers.id, id))
    .run()
}
