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

export const SOURCE_SCOPED_SEMANTIC_RESOLUTIONS = Object.freeze([
  resolution('database:query-optimizer', 'k_wiki_en_outline_of_databases_s13_b6', [
    'k_dict_so2bcihf',
    'k_wiki_en_outline_of_databases_s13_b6',
  ], ['Query optimizer']),
  resolution('mysql:innodb:free-list', 'k_1782008098285_y7alsw', [
    'k_dict_p50vg060',
    'k_1782008098285_y7alsw',
  ], ['InnoDB free list']),
  resolution('discipline:decision-support', 'k_acm2012_information_systems_decision_support', [
    'k_dict_b1wqaica',
    'k_acm2012_information_systems_decision_support',
  ], ['Decision support']),
  resolution('database:data-warehouse', 'k_wiki_en_outline_of_databases_s20', [
    'k_dict_rpsngjuo',
    'k_wiki_en_outline_of_databases_s20',
  ], ['Data warehouse']),
  resolution('database:data-source', 'k_wiki_en_outline_of_databases_s4_b8', [
    'k_dict_suxn74f2',
    'k_wiki_en_outline_of_databases_s4_b8',
  ], ['Data source']),
  resolution('database:warehouse:extract', 'k_wiki_en_outline_of_databases_s27_b1', [
    'k_dict_h2inoq0w',
    'k_wiki_en_outline_of_databases_s27_b1',
  ], ['Extract']),
  resolution('database:warehouse:dimension-table', 'k_wiki_en_outline_of_databases_s26_b1', [
    'k_dict_nuf2s1s9',
    'k_wiki_en_outline_of_databases_s26_b1',
  ], ['Dimension table']),
  resolution('database:primary-key', 'k_wiki_en_outline_of_databases_s11_b7', [
    'k_dict_1epd7idn',
    'k_wiki_en_outline_of_databases_s11_b7',
  ], ['Primary key']),
  resolution('programming-language:java', 'k_1782746457581_30q8ao', [
    'mysql_glossary_java_uspy11',
    'k_1782746457581_30q8ao',
  ], ['Java']),
]);
