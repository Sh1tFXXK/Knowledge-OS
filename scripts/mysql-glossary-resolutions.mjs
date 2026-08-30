function resolution(canonicalKey, targetId, memberIds, aliases = []) {
  return Object.freeze({
    canonicalKey,
    targetId,
    memberIds: Object.freeze(memberIds),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(aliases),
  });
}

export const MYSQL_GLOSSARY_SEMANTIC_RESOLUTIONS = Object.freeze([
  resolution('mysql:storage-engines', 'mysql_topic_storage_engines', [
    'mysql_glossary_group_storage_engines',
    'mysql_topic_storage_engines',
  ], ['Storage engines']),
  resolution('mysql:indexes-and-access-paths', 'mysql_topic_indexes_access', [
    'mysql_glossary_group_indexes_access',
    'mysql_topic_indexes_access',
  ]),
  resolution('mysql:replication-and-high-availability', 'mysql_topic_replication_ha', [
    'mysql_glossary_group_replication_ha',
    'mysql_topic_replication_ha',
  ]),
  resolution('mysql:optimizer-cache-performance', 'mysql_topic_optimizer_performance', [
    'mysql_glossary_group_optimizer_performance',
    'mysql_topic_optimizer_performance',
  ]),
  resolution('mysql:connectors-api-clients', 'mysql_topic_connectors_api', [
    'mysql_glossary_group_connectors_api',
    'mysql_topic_connectors_api',
  ]),
  resolution('mysql:security-accounts-authentication', 'mysql_topic_security_auth', [
    'mysql_glossary_group_security_auth',
    'mysql_topic_security_auth',
  ]),
  resolution('mysql:backup-operations-diagnostics', 'mysql_topic_backup_operations', [
    'mysql_glossary_group_backup_operations',
    'mysql_topic_backup_operations',
  ]),
  resolution('mysql:logs-recovery-persistence', 'mysql_topic_logs_recovery', [
    'mysql_glossary_group_logs_recovery',
    'mysql_topic_logs_recovery',
  ]),
  resolution('mysql:sql', 'mysql_topic_sql_objects', [
    'k_dict_a6mr0sdy',
    'mysql_topic_sql_objects',
  ], ['Structured Query Language']),
  resolution('java:servlet', 'k_1784340526295_skm8iw', [
    'mysql_glossary_servlet_12jp4v',
    'k_1784340526295_skm8iw',
  ], ['Java Servlet']),
]);
