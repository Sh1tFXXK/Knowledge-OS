function resolution(canonicalKey, targetId, memberIds, aliases = [], options = {}) {
  return Object.freeze({
    canonicalKey,
    targetId,
    memberIds: Object.freeze(memberIds),
    kind: options.kind ?? 'concept',
    role: options.role ?? 'subsystem',
    aliases: Object.freeze(aliases),
  });
}

export const CORE_CONCEPT_SEMANTIC_RESOLUTIONS = Object.freeze([
  resolution('database:model', 'k_1783250387082_pp338r', [
    'k_1783250387082_pp338r',
    'k_wiki_zh_数据库_s8',
    'k_wiki_en_outline_of_databases_s16',
    'k_wiki_en_outline_of_databases_s10_b1',
    'k_wiki_en_outline_of_databases_s16_b1',
  ], ['Database model']),
  resolution('database:database', 'n_u4va719e', [
    'n_u4va719e',
    'k_wiki_zh_数据库',
    'k_wiki_en_outline_of_databases_s11_b1',
    'k_wiki_en_database',
  ], ['Database']),
  resolution('database:relational-database', 'k_1783250122245_2rg7bc', [
    'k_1783250122245_2rg7bc',
    'k_wiki_zh_数据库_s4',
    'k_wiki_en_outline_of_databases_s2_b30',
    'k_wiki_en_outline_of_databases_s10_b9',
  ], ['Relational database']),
  resolution('discipline:algorithms', 'theory_domain_algorithms', [
    'theory_domain_algorithms',
    'k_acm2012_algorithms',
  ], ['Algorithms']),
  resolution('discipline:database-theory', 'school_database_theory', [
    'school_database_theory',
    'k_wiki_en_outline_of_databases_s4_b2',
  ], ['Database theory']),
  resolution('database:key-value-database', 'k_1783250218905_21uook', [
    'k_1783250218905_21uook',
    'k_wiki_zh_数据库_s6',
  ], ['Key-value database']),
  resolution('database:object-database', 'k_1784217898017_3bfane', [
    'k_1784217898017_3bfane',
    'k_wiki_en_outline_of_databases_s17_b8',
  ], ['Object database']),
  resolution('java-syntax:package', 'k_1784281148267_2scm9i', [
    'k_1784281148267_2scm9i',
    'k_1786347548906_htiiap',
  ], ['Java package']),
  resolution('object-oriented-programming:encapsulation', 'k_1784260051954_diol2t', [
    'k_1783167529977_jal59j',
    'k_1784260051954_diol2t',
  ], ['Encapsulation']),
  resolution('spring:autowiring', 'k_1784453158872_rsqoiy', [
    'k_1784453158872_rsqoiy',
    'k_1785227788717_6671mc',
  ], ['Spring autowiring']),
  resolution('database:postgresql', 'demo_postgres', [
    'demo_postgres',
    'n_2vbkwr8v',
  ], ['PostgreSQL'], { kind: 'entity' }),
  resolution('database:nosql', 'n_21yoee5g', [
    'n_21yoee5g',
    'k_wiki_en_outline_of_databases_s11_b11',
  ], ['NoSQL']),
  resolution('discipline:compiler', 'k_acm2012_software_notations_tools_compilers', [
    'k_acm2012_software_notations_tools_compilers',
    'k_wiki_en_compiler',
  ], ['Compiler']),
  resolution('computing:virtual-machine', 'k_acm2012_software_organization_virtual_machines', [
    'k_acm2012_software_organization_virtual_machines',
    'k_wiki_en_virtual_machine',
  ], ['Virtual machine']),
  resolution('program-analysis:control-flow', 'k_acm2012_software_development_control_flow', [
    'k_acm2012_software_development_control_flow',
    'k_wiki_en_program_analysis_s2',
  ], ['Control flow']),
  resolution('programming-language:bytecode', 'k_1783824357875_gs9rn2', [
    'k_1782809150059_ibx5gd',
    'k_1783824357875_gs9rn2',
  ], ['Bytecode'], { kind: 'mechanism', role: 'mechanism' }),
  resolution('discipline:programming-language', 'k_acm2012_software_notations_tools_programming_languages', [
    'k_1783235593684_pob0bg',
    'k_acm2012_software_notations_tools_programming_languages',
  ], ['Programming language']),
  resolution('discipline:computational-mathematics', 'k_acm2012_mathematics_of_computing', [
    'k_acm2012_mathematics_of_computing',
    'k_acm2012_applied_computing_computational_mathematics',
  ], ['Computational mathematics']),
  resolution('programming-language:string', 'k_1783242642426_oz4jm3', [
    'k_dict_utwr8eyp',
    'k_1783242642426_oz4jm3',
  ], ['String'], { role: 'plain' }),
  resolution('database:query-optimization', 'k_wiki_en_outline_of_databases_s14_b2', [
    'demo_query',
    'k_wiki_en_outline_of_databases_s14_b2',
  ], ['Query optimization'], { kind: 'mechanism' }),
  resolution('mysql:innodb:free-page', 'k_1781974703663_4k3grq', [
    'k_1781962813099_no7mjn',
    'k_1781974703663_4k3grq',
  ], ['InnoDB free page'], { role: 'plain' }),
  resolution('mysql:innodb:dirty-page', 'k_1781974756575_ldbdtp', [
    'k_1781962840653_zqqies',
    'k_1781974756575_ldbdtp',
  ], ['InnoDB dirty page'], { role: 'plain' }),
  resolution('mysql:server', 'k_1782032149173_bli3vq', [
    'k_1782027350612_nh9nu2',
    'k_1782032149173_bli3vq',
  ], ['MySQL Server'], { kind: 'entity' }),
]);
