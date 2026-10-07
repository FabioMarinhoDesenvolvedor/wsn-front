export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  /** Nunca colocar dado pessoal aqui — só IDs, status e campos alterados. */
  detail?: Record<string, unknown>;
  ipHash?: string | null;
}

export const auditStatement = (db: D1Database, e: AuditEntry): D1PreparedStatement =>
  db
    .prepare("INSERT INTO audit_log (actor_id, action, entity, entity_id, detail, ip_hash) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(
      e.actorId,
      e.action,
      e.entity,
      e.entityId == null ? null : String(e.entityId),
      e.detail ? JSON.stringify(e.detail) : null,
      e.ipHash ?? null,
    );
