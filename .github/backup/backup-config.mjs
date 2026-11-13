export function backupConnection(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') throw new Error('Backup requires a PostgreSQL URL');
  if (parsed.hostname.includes('-pooler')) throw new Error('Backup requires the direct, unpooled database URL');
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (!parsed.hostname || !parsed.username || !database) throw new Error('Backup database URL is incomplete');
  return {
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: database,
    PGSSLMODE: 'verify-full',
    PGSSLROOTCERT: 'system',
  };
}

export function backupPath(environment, at) {
  if (!['preview', 'production'].includes(environment) || !Number.isFinite(at.getTime())) throw new Error('Invalid backup target or time');
  return `backups/${environment}/${at.toISOString().replace(/[:.]/g, '-')}.dump`;
}
