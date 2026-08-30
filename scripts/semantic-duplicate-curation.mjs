import { organizeDuplicateKnowledge } from './knowledge-deduplication.mjs';
import { JAVA_SYNTAX_SEMANTIC_RESOLUTIONS } from './java-syntax-duplicate-resolutions.mjs';
import { MYSQL_GLOSSARY_SEMANTIC_RESOLUTIONS } from './mysql-glossary-resolutions.mjs';
import { SOURCE_SCOPED_SEMANTIC_RESOLUTIONS } from './source-scoped-resolutions.mjs';
import { CORE_CONCEPT_SEMANTIC_RESOLUTIONS } from './core-concept-resolutions.mjs';
import { repairTreeBindingEdges } from './data-integrity.mjs';
import {
  applyOverlapTreeCuration,
  OVERLAP_CONTEXT_MIGRATIONS,
  OVERLAP_SEMANTIC_RESOLUTIONS,
} from './overlap-duplicate-resolutions.mjs';

const MYSQL_TRANSACTION_TREE_ID = 'demo_tree_tx';
const MYSQL_ACID_TREE_ID = 'demo_tree_acid';

const STRUCTURE_REPAIRS = Object.freeze([
  Object.freeze({
    treeNodeId: 'tree_1782813951312_jzp80c',
    expectedNodeRef: 'k_1782813951272_huivnu',
  }),
]);

export const SEMANTIC_RESOLUTIONS = Object.freeze([
  ...JAVA_SYNTAX_SEMANTIC_RESOLUTIONS,
  ...MYSQL_GLOSSARY_SEMANTIC_RESOLUTIONS,
  ...SOURCE_SCOPED_SEMANTIC_RESOLUTIONS,
  ...CORE_CONCEPT_SEMANTIC_RESOLUTIONS,
  ...OVERLAP_SEMANTIC_RESOLUTIONS,
  Object.freeze({
    canonicalKey: 'database-transaction:acid',
    targetId: 'demo_acid',
    memberIds: Object.freeze([
      'demo_acid',
      'k_1784730311893_zahpq5',
      'k_wiki_en_outline_of_databases_s11_b2',
      'k_1786288007184_cfwjih',
    ]),
    kind: 'concept',
    role: 'axiom',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    canonicalKey: 'software-design:dependency-injection',
    targetId: 'k_1784466531162_zcrhl7',
    memberIds: Object.freeze([
      'k_1784452283762_5dboq3',
      'k_1784466531162_zcrhl7',
      'k_1785214842744_v601y4',
    ]),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['DI', 'Dependency Injection']),
  }),
  Object.freeze({
    canonicalKey: 'concurrency-control:optimistic',
    targetId: 'demo_optimistic',
    memberIds: Object.freeze([
      'demo_optimistic',
      'k_1782928703651_dpqbc4',
      'k_1784703345480_oeg0w6',
    ]),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['OCC', '乐观并发控制']),
  }),
  Object.freeze({
    canonicalKey: 'concurrency-control:pessimistic',
    targetId: 'demo_pessimistic',
    memberIds: Object.freeze([
      'demo_pessimistic',
      'k_1782928843737_biclf4',
    ]),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['悲观并发控制']),
  }),
  Object.freeze({
    canonicalKey: 'memory-barrier:store-load',
    targetId: 'k_atom_storeload',
    memberIds: Object.freeze(['k_atom_storeload', 'k_1783157274694_odbiuu']),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['StoreLoad Barrier']),
  }),
  Object.freeze({
    canonicalKey: 'memory-barrier:store-store',
    targetId: 'k_atom_storestore',
    memberIds: Object.freeze(['k_atom_storestore', 'k_1783157221196_esfnre']),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['StoreStore Barrier']),
  }),
  Object.freeze({
    canonicalKey: 'memory-barrier:load-store',
    targetId: 'k_atom_loadstore',
    memberIds: Object.freeze(['k_atom_loadstore', 'k_1783157247430_n6ubvn']),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['LoadStore Barrier']),
  }),
  Object.freeze({
    canonicalKey: 'memory-barrier:load-load',
    targetId: 'k_atom_loadload',
    memberIds: Object.freeze(['k_atom_loadload']),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['LoadLoad Barrier']),
  }),
  Object.freeze({
    canonicalKey: 'software-framework:spring-boot',
    targetId: 'k_1784510206217_m4qngo',
    memberIds: Object.freeze([
      'k_1784461837141_w0v8rq',
      'k_1784510206217_m4qngo',
    ]),
    kind: 'entity',
    role: 'subsystem',
    aliases: Object.freeze([]),
  }),
  Object.freeze({
    canonicalKey: 'programming-language:type-system',
    targetId: 'k_1782748382034_b8a1a9',
    memberIds: Object.freeze([
      'k_1782748382034_b8a1a9',
      'k_wiki_en_program_analysis_s5',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Type system']),
  }),
  Object.freeze({
    canonicalKey: 'programming-language:identifier',
    targetId: 'k_1783186425134_v31qjt',
    memberIds: Object.freeze([
      'k_1783186425134_v31qjt',
      'k_1783871308772_07svsw',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Identifier']),
  }),
  Object.freeze({
    canonicalKey: 'java-syntax:switch-statement',
    targetId: 'k_java_syntax_switch_3pbrgc',
    memberIds: Object.freeze([
      'k_java_syntax_switch',
      'k_java_syntax_switch_3pbrgc',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['switch statement']),
  }),
  Object.freeze({
    canonicalKey: 'java-syntax:conditional-statement',
    targetId: 'k_1784283505394_c9me1e',
    memberIds: Object.freeze([
      'k_1784283505394_c9me1e',
      'k_java_syntax_zh_7na569',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['conditional statement']),
  }),
  Object.freeze({
    canonicalKey: 'database-transaction:transaction',
    targetId: 'n_ag24bbkc',
    memberIds: Object.freeze([
      'n_ag24bbkc',
      'k_1785129602238_j76sr0',
      'k_1785248000563_m7pwwl',
      'k_1786241496998_be2umg',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Database transaction']),
  }),
  Object.freeze({
    canonicalKey: 'programming-paradigm:object-oriented-programming',
    targetId: 'k_1782834118965_n5r1fr',
    memberIds: Object.freeze([
      'k_1782834118965_n5r1fr',
      'k_1786338277733_gu5z4j',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['OOP', 'Object-oriented programming']),
  }),
  Object.freeze({
    canonicalKey: 'object-oriented-programming:object',
    targetId: 'k_1783238676302_ggr3kg',
    memberIds: Object.freeze([
      'k_1783101878467_d26xhv',
      'k_1783238676302_ggr3kg',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Object']),
  }),
  Object.freeze({
    canonicalKey: 'object-oriented-programming:method',
    targetId: 'k_1784169555803_adzqks',
    memberIds: Object.freeze([
      'k_1783257371791_411u3j',
      'k_1784169555803_adzqks',
      'k_java_syntax_zh_z9ne3',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Method']),
  }),
  Object.freeze({
    canonicalKey: 'object-oriented-programming:constructor',
    targetId: 'k_1783184829912_usl41q',
    memberIds: Object.freeze([
      'k_1783184829912_usl41q',
      'k_1784078753095_ukevgi',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Constructor']),
  }),
  Object.freeze({
    canonicalKey: 'database:index',
    targetId: 'n_0xxb9cqy',
    memberIds: Object.freeze(['n_0xxb9cqy', 'k_1786175187928_huarwt']),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Database index']),
  }),
  Object.freeze({
    canonicalKey: 'memory-management:garbage-collection',
    targetId: 'k_1783171786650_rheusm',
    memberIds: Object.freeze(['k_dict_jc1kco2u', 'k_1783171786650_rheusm']),
    kind: 'mechanism',
    role: 'subsystem',
    aliases: Object.freeze(['Garbage collection', 'GC']),
  }),
  Object.freeze({
    canonicalKey: 'database:data-dictionary',
    targetId: 'k_wiki_en_outline_of_databases_s13_b2',
    memberIds: Object.freeze([
      'k_dict_q9rhqirn',
      'k_wiki_en_outline_of_databases_s13_b2',
      'k_wiki_en_outline_of_databases_s24_b1',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Data dictionary']),
  }),
  Object.freeze({
    canonicalKey: 'database-theory:relational-algebra',
    targetId: 'theory_domain_relational_algebra',
    memberIds: Object.freeze([
      'theory_domain_relational_algebra',
      'k_wiki_en_outline_of_databases_s10_b7',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Relational algebra']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:logic',
    targetId: 'school_logic',
    memberIds: Object.freeze(['school_logic', 'k_acm2012_theory_of_computing_logic']),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Logic']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:statistics',
    targetId: 'theory_domain_statistics',
    memberIds: Object.freeze([
      'theory_domain_statistics',
      'k_acm2012_mathematics_of_computing_statistics',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Statistics']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:network-protocols',
    targetId: 'theory_domain_network_protocols',
    memberIds: Object.freeze([
      'theory_domain_network_protocols',
      'k_acm2012_networks_network_protocols',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Network protocols']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:cryptography',
    targetId: 'theory_domain_cryptography',
    memberIds: Object.freeze([
      'theory_domain_cryptography',
      'k_acm2012_security_cryptography',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Cryptography']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:information-retrieval',
    targetId: 'school_information_retrieval',
    memberIds: Object.freeze([
      'school_information_retrieval',
      'k_acm2012_information_systems_information_retrieval',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Information retrieval']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:numerical-analysis',
    targetId: 'theory_domain_numerical_analysis',
    memberIds: Object.freeze([
      'theory_domain_numerical_analysis',
      'k_acm2012_mathematics_of_computing_numerical_analysis',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Numerical analysis']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:information-theory',
    targetId: 'theory_domain_information_theory',
    memberIds: Object.freeze([
      'theory_domain_information_theory',
      'k_acm2012_mathematics_of_computing_information_theory',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Information theory']),
  }),
  Object.freeze({
    canonicalKey: 'concurrency:thread-pool',
    targetId: 'k_1784597083135_287nro',
    memberIds: Object.freeze(['k_1784597083135_287nro', 'k_1785415708882_o3okfp']),
    kind: 'mechanism',
    role: 'subsystem',
    aliases: Object.freeze(['Thread pool']),
  }),
  Object.freeze({
    canonicalKey: 'java:inner-class',
    targetId: 'k_1784044129424_ffqm4z',
    memberIds: Object.freeze(['k_1784044129424_ffqm4z', 'k_1786353277269_msn0ma90f']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Inner class']),
  }),
  Object.freeze({
    canonicalKey: 'object-oriented-programming:inheritance',
    targetId: 'k_1783167541244_d3d092',
    memberIds: Object.freeze(['k_1783167541244_d3d092', 'k_java_syntax_zh_scbpwz']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Inheritance']),
  }),
  Object.freeze({
    canonicalKey: 'database:stored-procedure',
    targetId: 'k_1782930954484_nwtfg7',
    memberIds: Object.freeze([
      'k_dict_c39xi7vj',
      'k_1782930954484_nwtfg7',
      'k_wiki_en_outline_of_databases_s12_b10',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Stored procedure']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:data-mining',
    targetId: 'k_acm2012_information_systems_data_mining',
    memberIds: Object.freeze([
      'k_dict_cnvjcx7t',
      'k_acm2012_information_systems_data_mining',
      'k_wiki_en_outline_of_databases_s29_b3',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Data mining']),
  }),
  Object.freeze({
    canonicalKey: 'program-analysis:escape-analysis',
    targetId: 'k_atom_escape_analysis',
    memberIds: Object.freeze(['k_atom_escape_analysis', 'k_wiki_en_escape_analysis']),
    kind: 'mechanism',
    role: 'mechanism',
    aliases: Object.freeze(['Escape analysis']),
  }),
  Object.freeze({
    canonicalKey: 'java:class-modifier',
    targetId: 'k_1784044457709_jt70a4',
    memberIds: Object.freeze(['k_1782820272019_wtb7gb', 'k_1784044457709_jt70a4']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Class modifier']),
  }),
  Object.freeze({
    canonicalKey: 'software-server:apache-tomcat',
    targetId: 'k_1786353277269_msn0ma9ap',
    memberIds: Object.freeze(['mysql_glossary_tomcat_10qwey', 'k_1786353277269_msn0ma9ap']),
    kind: 'entity',
    role: 'subsystem',
    aliases: Object.freeze(['Apache Tomcat']),
  }),
  Object.freeze({
    canonicalKey: 'concurrency:compare-and-swap',
    targetId: 'k_1786353277269_msn0ma9o13',
    memberIds: Object.freeze(['k_1782928521555_m3qum5', 'k_1786353277269_msn0ma9o13']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Compare-and-swap']),
  }),
  Object.freeze({
    canonicalKey: 'java-syntax:static-keyword',
    targetId: 'k_web_4a06c6e69a03',
    memberIds: Object.freeze(['k_dict_m1otklyi', 'k_web_4a06c6e69a03']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Static']),
  }),
  Object.freeze({
    canonicalKey: 'java:member-inner-class',
    targetId: 'k_1786344709850_rcbpr3',
    memberIds: Object.freeze(['k_1782836361135_5lhb2w', 'k_1786344709850_rcbpr3']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Member inner class']),
  }),
  Object.freeze({
    canonicalKey: 'java:abstract-class',
    targetId: 'k_1784295376153_uiovkk',
    memberIds: Object.freeze(['k_java_syntax_zh_1hqaeyr', 'k_1784295376153_uiovkk', 'k_1786343651160_8lfdu7']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Abstract class']),
  }),
  Object.freeze({
    canonicalKey: 'discipline:theory-of-computation',
    targetId: 'school_computation_theory',
    memberIds: Object.freeze(['k_acm2012_theory_of_computing', 'school_computation_theory']),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Theory of computation']),
  }),
  Object.freeze({
    canonicalKey: 'concurrency:lock',
    targetId: 'k_1784531131067_9tdszo',
    memberIds: Object.freeze(['k_1782928696595_fflhq1', 'k_1784531131067_9tdszo']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Lock']),
  }),
  Object.freeze({
    canonicalKey: 'concurrency:read-write-lock',
    targetId: 'k_1784571058917_k7qd83',
    memberIds: Object.freeze(['k_1784571058917_k7qd83', 'k_1786017239491_8fbyyw']),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Read-write lock']),
  }),
  Object.freeze({
    canonicalKey: 'database:model:transaction',
    targetId: 'k_1783250593540_v2w5hy',
    memberIds: Object.freeze([
      'k_1783250593540_v2w5hy',
      'k_wiki_zh_数据库_s11',
      'k_wiki_en_outline_of_databases_s12_b6',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Database transaction']),
  }),
  Object.freeze({
    canonicalKey: 'database:model:index',
    targetId: 'k_1783250520307_j25py7',
    memberIds: Object.freeze([
      'k_1783250520307_j25py7',
      'k_wiki_zh_数据库_s10',
    ]),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(['Database index']),
  }),
  Object.freeze({
    canonicalKey: 'program-analysis:dynamic-analysis',
    targetId: 'k_wiki_en_program_analysis_s8',
    memberIds: Object.freeze([
      'k_wiki_en_program_analysis_s8',
      'k_wiki_en_dynamic_program_analysis',
    ]),
    kind: 'concept',
    role: 'subsystem',
    aliases: Object.freeze(['Dynamic program analysis']),
  }),
]);

export const DISTINCT_IDENTITY_ASSIGNMENTS = Object.freeze([
  // Same-label groups below were reviewed against their tree paths and source
  // scope. These keys intentionally preserve separate concepts instead of
  // allowing label-only deduplication to collapse them.
  Object.freeze({ nodeId: 'n_6dgtsmpj', canonicalKey: 'system:data-structures' }),
  Object.freeze({ nodeId: 'theory_domain_data_structures', canonicalKey: 'mysql:data-structures' }),
  Object.freeze({ nodeId: 'k_1785471820450_v6okms', canonicalKey: 'java:hashmap:data-structures' }),
  Object.freeze({ nodeId: 'k_1786170062009_1o5xtm', canonicalKey: 'redis:data-structures' }),
  Object.freeze({ nodeId: 'k_wiki_en_database_s20', canonicalKey: 'database:security' }),
  Object.freeze({ nodeId: 'k_wiki_en_virtual_machine_s13', canonicalKey: 'virtual-machine:security' }),
  Object.freeze({ nodeId: 'k_1784113900164_5cwlcb', canonicalKey: 'java:constructor:type' }),
  Object.freeze({ nodeId: 'k_1784131155243_r7iibz', canonicalKey: 'object-oriented-programming:type' }),
  Object.freeze({ nodeId: 'k_wiki_en_compiler_s11', canonicalKey: 'compiler:type' }),
  Object.freeze({ nodeId: 'k_wiki_en_dynamic_program_analysis_s1', canonicalKey: 'dynamic-program-analysis:type' }),
  Object.freeze({ nodeId: 'k_dict_40kypo2i', canonicalKey: 'glossary:concurrency-control' }),
  Object.freeze({ nodeId: 'k_1784543450678_zk199g', canonicalKey: 'concurrency:control' }),
  Object.freeze({ nodeId: 'k_wiki_en_outline_of_databases_s13_b1', canonicalKey: 'database-management:concurrency-control' }),
  Object.freeze({ nodeId: 'k_1784456386575_b7hxoh', canonicalKey: 'mysql-runtime:transaction-management' }),
  Object.freeze({ nodeId: 'k_1786953720608_h0qp73', canonicalKey: 'spring:transaction-management' }),
  Object.freeze({ nodeId: 'k_dict_wbty6m1l', canonicalKey: 'glossary:string' }),
  Object.freeze({ nodeId: 'k_1785340521063_6f448a', canonicalKey: 'java:string' }),
  Object.freeze({ nodeId: 'k_1786234895923_uqw3i5', canonicalKey: 'redis:string' }),
  Object.freeze({ nodeId: 'k_dict_9rrfnx3a', canonicalKey: 'glossary:feature' }),
  Object.freeze({ nodeId: 'k_1784197948927_3c20z4', canonicalKey: 'object-oriented-programming:feature' }),
  Object.freeze({ nodeId: 'k_1785927625536_a1tvc6', canonicalKey: 'java:volatile:feature' }),
  Object.freeze({ nodeId: 'k_1782836111549_qetpvx', canonicalKey: 'object-oriented-programming:class' }),
  Object.freeze({ nodeId: 'k_1783257466386_qkloru', canonicalKey: 'software-architecture:class' }),
  Object.freeze({ nodeId: 'k_1785339432462_ff5zs4', canonicalKey: 'java:class' }),
  Object.freeze({ nodeId: 'k_1783249680752_eglr74', canonicalKey: 'program-design:variable' }),
  Object.freeze({ nodeId: 'k_1783873400066_pyp602', canonicalKey: 'java-syntax:variable' }),
  Object.freeze({ nodeId: 'k_1786344034905_lslnka', canonicalKey: 'java:class:variable' }),
  Object.freeze({ nodeId: 'k_acm2012_information_systems_database_management', canonicalKey: 'acm:database-management' }),
  Object.freeze({ nodeId: 'k_wiki_en_outline_of_databases_s9', canonicalKey: 'database-usage:database-management' }),
  Object.freeze({ nodeId: 'k_wiki_en_outline_of_databases_s14_b1', canonicalKey: 'dbms:function:database-management' }),
  Object.freeze({ nodeId: 'k_auto_1hl4cg6', canonicalKey: 'orphan:memory:1' }),
  Object.freeze({ nodeId: 'k_1781976016450_ggvuc3', canonicalKey: 'orphan:memory:2' }),
  Object.freeze({ nodeId: 'k_dict_6cwf4dqv', canonicalKey: 'glossary:partition' }),
  Object.freeze({ nodeId: 'k_1786340067400_hpavtb', canonicalKey: 'redis:partition' }),
  Object.freeze({ nodeId: 'k_dict_mkm4eoaz', canonicalKey: 'glossary:tool' }),
  Object.freeze({ nodeId: 'k_wiki_en_outline_of_databases_s31', canonicalKey: 'data-warehouse:tool' }),
  Object.freeze({ nodeId: 'k_dict_9hxo9oxe', canonicalKey: 'glossary:snapshot' }),
  Object.freeze({ nodeId: 'k_wiki_en_virtual_machine_s9', canonicalKey: 'virtual-machine:snapshot' }),
  Object.freeze({ nodeId: 'k_dict_eqso8226', canonicalKey: 'glossary:security' }),
  Object.freeze({ nodeId: 'k_1786159553876_tcfd24', canonicalKey: 'spring-cloud:security' }),
  Object.freeze({ nodeId: 'k_1782793417791_nvare3', canonicalKey: 'programming-language:reference-type' }),
  Object.freeze({ nodeId: 'k_1784042843935_picv84', canonicalKey: 'java-syntax:reference-type' }),
  Object.freeze({ nodeId: 'k_1782798814309_j3jj7c', canonicalKey: 'jvm:heap' }),
  Object.freeze({ nodeId: 'k_1782839313525_2saytt', canonicalKey: 'orphan:heap' }),
  Object.freeze({ nodeId: 'k_1783107227892_dqq4ek', canonicalKey: 'jvm:dynamic-linking' }),
  Object.freeze({ nodeId: 'k_wiki_en_linker_computing_s2', canonicalKey: 'linker:dynamic-linking' }),
  Object.freeze({ nodeId: 'k_1783167918831_zqk4a6', canonicalKey: 'object-oriented-programming:interface' }),
  Object.freeze({ nodeId: 'k_java_syntax_zh_cbn51n', canonicalKey: 'java-syntax:interface' }),
  Object.freeze({ nodeId: 'k_1783250367496_zv2crw', canonicalKey: 'database:classification' }),
  Object.freeze({ nodeId: 'k_class_programming_classification', canonicalKey: 'object-oriented-programming:classification' }),
  Object.freeze({ nodeId: 'k_1783873300296_o38v1d', canonicalKey: 'software-development' }),
  Object.freeze({ nodeId: 'k_1784224555283_zb08id', canonicalKey: 'software-engineering:software-development' }),
  Object.freeze({ nodeId: 'k_1784045110759_kqnpgx', canonicalKey: 'abstract-type:creation' }),
  Object.freeze({ nodeId: 'k_1784129898661_hekldq', canonicalKey: 'object-lifecycle:creation' }),
  Object.freeze({ nodeId: 'k_1784281281401_d1ijds', canonicalKey: 'java-syntax:module' }),
  Object.freeze({ nodeId: 'k_1784445218734_mbutiz', canonicalKey: 'spring-framework:module' }),
  Object.freeze({ nodeId: 'k_1784343538435_2potgn', canonicalKey: 'java:implementation' }),
  Object.freeze({ nodeId: 'k_1784348517053_72vt2j', canonicalKey: 'concurrency:implementation' }),
  Object.freeze({ nodeId: 'k_1784348023461_qz7wyl', canonicalKey: 'concurrency:model' }),
  Object.freeze({ nodeId: 'k_wiki_en_database_s28', canonicalKey: 'database:model:section' }),
  Object.freeze({ nodeId: 'k_1784822169362_2tqq6v', canonicalKey: 'compiler:execution' }),
  Object.freeze({ nodeId: 'k_wiki_en_interpreter_computing_s4', canonicalKey: 'interpreter:execution' }),
  Object.freeze({ nodeId: 'k_1785831643303_tr9cpn', canonicalKey: 'operating-system:context-switch' }),
  Object.freeze({ nodeId: 'k_1786353277269_msn0ma9kz', canonicalKey: 'java-concurrency:context-switch' }),
  Object.freeze({ nodeId: 'k_java_source_937c739517d0031f_s_external_types', canonicalKey: 'java-reflection:external-reference-types' }),
  Object.freeze({ nodeId: 'k_1785909354346_oxtcgv_s_external_types', canonicalKey: 'java-concurrency:external-reference-types' }),
  Object.freeze({ nodeId: 'k_1782748910899_dtrnpe', canonicalKey: 'database:mysql:data-types' }),
  Object.freeze({ nodeId: 'k_1782793389266_8caigh', canonicalKey: 'programming-language:data-type' }),
  Object.freeze({ nodeId: 'k_1783257388677_uxt2vm', canonicalKey: 'program-design:data-type' }),
  Object.freeze({ nodeId: 'k_1786232234420_feohxw', canonicalKey: 'database:redis:data-types' }),
  Object.freeze({ nodeId: 'k_1786333299353_augb03', canonicalKey: 'java-syntax:data-types' }),
  Object.freeze({ nodeId: 'k_wiki_en_outline_of_databases_s12', canonicalKey: 'database-management:objects' }),
  Object.freeze({ nodeId: 'k_1782813819683_ntjiho', canonicalKey: 'java:primitive:byte' }),
  Object.freeze({ nodeId: 'k_1783087818322_st7eoj', canonicalKey: 'java:type:java.lang.Byte' }),
  Object.freeze({ nodeId: 'k_1782813951272_huivnu', canonicalKey: 'java:primitive:float' }),
  Object.freeze({ nodeId: 'k_1783087864934_n0yzzj', canonicalKey: 'java:type:java.lang.Float' }),
  Object.freeze({ nodeId: 'k_wiki_en_database_s22', canonicalKey: 'database:migration' }),
  Object.freeze({ nodeId: 'k_wiki_en_virtual_machine_s10', canonicalKey: 'virtual-machine:migration' }),
  Object.freeze({ nodeId: 'k_1782810274459_fc4dll', canonicalKey: 'jvm:constant-pool:literal' }),
  Object.freeze({ nodeId: 'k_java_syntax_zh_1l9agwm', canonicalKey: 'java-syntax:literal' }),
  Object.freeze({ nodeId: 'k_1782813876473_f9kgq2', canonicalKey: 'java:primitive:short' }),
  Object.freeze({ nodeId: 'k_1783087834350_gmpg3u', canonicalKey: 'java:type:java.lang.Short' }),
  Object.freeze({ nodeId: 'k_1782813900716_0oixi3', canonicalKey: 'java:primitive:int' }),
  Object.freeze({ nodeId: 'k_1783087848544_mpfic6', canonicalKey: 'java:type:java.lang.Integer' }),
  Object.freeze({ nodeId: 'k_1782813922894_kmrc5z', canonicalKey: 'java:primitive:long' }),
  Object.freeze({ nodeId: 'k_1783087856834_zelajj', canonicalKey: 'java:type:java.lang.Long' }),
  Object.freeze({ nodeId: 'k_1782813973111_a25i2a', canonicalKey: 'java:primitive:double' }),
  Object.freeze({ nodeId: 'k_1783087878206_r1e7p8', canonicalKey: 'java:type:java.lang.Double' }),
  Object.freeze({ nodeId: 'k_1782814002747_fldlbm', canonicalKey: 'java:primitive:boolean' }),
  Object.freeze({ nodeId: 'k_1783087884886_wy66ig', canonicalKey: 'java:type:java.lang.Boolean' }),
  Object.freeze({ nodeId: 'k_1782814020917_u54b3z', canonicalKey: 'java:primitive:char' }),
]);

export const CONTEXT_MIGRATIONS = Object.freeze([
  ...OVERLAP_CONTEXT_MIGRATIONS,
  Object.freeze({
    treeNodeId: MYSQL_ACID_TREE_ID,
    sourceNodeId: 'demo_acid',
    namespace: 'context:mysql:acid',
    label: 'MySQL 中的 ACID',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'tree_1786288007373_pp3blo',
    sourceNodeId: 'k_1786288007184_cfwjih',
    namespace: 'context:redis:acid',
    label: 'Redis 中的 ACID',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1784452283804_by9a3l',
    sourceNodeId: 'k_1784452283762_5dboq3',
    namespace: 'context:spring-framework:dependency-injection',
    label: 'Spring Framework 中的依赖注入',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1785214842845_4n40a4',
    sourceNodeId: 'k_1785214842744_v601y4',
    namespace: 'context:spring-ioc:dependency-injection',
    label: 'Spring IOC 中的依赖注入',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782928703685_fuj7ev',
    sourceNodeId: 'k_1782928703651_dpqbc4',
    namespace: 'context:java:optimistic-lock',
    label: 'Java 应用中的乐观锁',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782928843771_cmjyzt',
    sourceNodeId: 'k_1782928843737_biclf4',
    namespace: 'context:java:pessimistic-lock',
    label: 'Java 应用中的悲观锁',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1783157274734_po0bzr',
    sourceNodeId: 'k_1783157274694_odbiuu',
    namespace: 'context:os:store-load-barrier',
    label: '操作系统语境中的 StoreLoad 屏障',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1783157221230_hungj5',
    sourceNodeId: 'k_1783157221196_esfnre',
    namespace: 'context:os:store-store-barrier',
    label: '操作系统语境中的 StoreStore 屏障',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1783157247463_q2hnrn',
    sourceNodeId: 'k_1783157247430_n6ubvn',
    namespace: 'context:os:load-store-barrier',
    label: '操作系统语境中的 LoadStore 屏障',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_program_analysis_s1_s5',
    sourceNodeId: 'k_wiki_en_program_analysis_s5',
    namespace: 'context:program-analysis:type-system',
    label: '程序分析中的类型系统',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1783871308881_fo1067',
    sourceNodeId: 'k_1783871308772_07svsw',
    namespace: 'context:java:identifier',
    label: 'Java 中的标识符',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1786241497224_yi63e9',
    sourceNodeId: 'k_1786241496998_be2umg',
    namespace: 'context:redis:transaction',
    label: 'Redis 事务',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1786338278239_rfh8os',
    sourceNodeId: 'k_1786338277733_gu5z4j',
    namespace: 'context:java:object-oriented-programming',
    label: 'Java 面向对象编程',
    removeTags: Object.freeze(['Java面试突击']),
  }),
  Object.freeze({
    treeNodeId: 'tree_java_syntax_zh_z9ne3',
    sourceNodeId: 'k_java_syntax_zh_z9ne3',
    namespace: 'context:java:method',
    label: 'Java 方法',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1784078753124_t8w4rv',
    sourceNodeId: 'k_1784078753095_ukevgi',
    namespace: 'context:java:constructor',
    label: 'Java 构造方法',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1785415709050_n3rbw5',
    sourceNodeId: 'k_1785415708882_o3okfp',
    namespace: 'context:java:thread-pool',
    label: 'Java 线程池',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_java_syntax_zh_scbpwz',
    sourceNodeId: 'k_java_syntax_zh_scbpwz',
    namespace: 'context:java:inheritance',
    label: 'Java 继承',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782930954515_g9b5bl',
    sourceNodeId: 'k_1782930954484_nwtfg7',
    namespace: 'context:mysql:stored-procedure',
    label: 'MySQL 存储过程',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1786353277269_msn0ma9bq',
    sourceNodeId: 'mysql_glossary_tomcat_10qwey',
    namespace: 'context:mysql:tomcat',
    label: 'Tomcat glossary context',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782928696623_almc5c',
    sourceNodeId: 'k_1782928696595_fflhq1',
    namespace: 'context:java:lock',
    label: 'Java lock context',
    removeTags: Object.freeze(['Java闈㈣瘯绐佸嚮']),
  }),
  Object.freeze({
    treeNodeId: 'tree_1786017239718_fuvw86',
    sourceNodeId: 'k_1786017239491_8fbyyw',
    namespace: 'context:java:read-write-lock',
    label: 'Java read-write lock context',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_storage_engines',
    sourceNodeId: 'mysql_glossary_group_storage_engines',
    namespace: 'context:mysql:storage-engines',
    label: 'MySQL glossary: storage engines',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_indexes_access',
    sourceNodeId: 'mysql_glossary_group_indexes_access',
    namespace: 'context:mysql:indexes-access-paths',
    label: 'MySQL glossary: indexes and access paths',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_replication_ha',
    sourceNodeId: 'mysql_glossary_group_replication_ha',
    namespace: 'context:mysql:replication-high-availability',
    label: 'MySQL glossary: replication and high availability',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_optimizer_performance',
    sourceNodeId: 'mysql_glossary_group_optimizer_performance',
    namespace: 'context:mysql:optimizer-performance',
    label: 'MySQL glossary: optimizer, cache, and performance',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_connectors_api',
    sourceNodeId: 'mysql_glossary_group_connectors_api',
    namespace: 'context:mysql:connectors-api-clients',
    label: 'MySQL glossary: connectors, API, and clients',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_security_auth',
    sourceNodeId: 'mysql_glossary_group_security_auth',
    namespace: 'context:mysql:security-authentication',
    label: 'MySQL glossary: security, accounts, and authentication',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_backup_operations',
    sourceNodeId: 'mysql_glossary_group_backup_operations',
    namespace: 'context:mysql:backup-operations-diagnostics',
    label: 'MySQL glossary: backup, operations, and diagnostics',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_logs_recovery',
    sourceNodeId: 'mysql_glossary_group_logs_recovery',
    namespace: 'context:mysql:logs-recovery-persistence',
    label: 'MySQL glossary: logs, recovery, and persistence',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'mysql_topic_sql_objects',
    sourceNodeId: 'k_dict_a6mr0sdy',
    namespace: 'context:mysql:sql',
    label: 'MySQL glossary: SQL',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1784340526390_w18922',
    sourceNodeId: 'mysql_glossary_servlet_12jp4v',
    namespace: 'context:java:servlet',
    label: 'MySQL glossary: Servlet',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782746457614_osttpr',
    sourceNodeId: 'mysql_glossary_java_uspy11',
    namespace: 'context:mysql:java',
    label: 'MySQL glossary: Java',
    removeTags: Object.freeze(['mysql', 'glossary', 'mysql-glossary']),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782008098294_hsntsy',
    sourceNodeId: 'k_dict_p50vg060',
    namespace: 'context:mysql:innodb-free-list',
    label: 'Dictionary: InnoDB free list',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_acm2012_information_systems_decision_support',
    sourceNodeId: 'k_dict_b1wqaica',
    namespace: 'context:database:decision-support',
    label: 'Dictionary: decision support',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_outline_of_databases_s20',
    sourceNodeId: 'k_dict_rpsngjuo',
    namespace: 'context:database:data-warehouse',
    label: 'Dictionary: data warehouse',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_outline_of_databases_s4_b8',
    sourceNodeId: 'k_dict_suxn74f2',
    namespace: 'context:database:data-source',
    label: 'Dictionary: data source',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_outline_of_databases_s20_s21_s27_b1',
    sourceNodeId: 'k_dict_h2inoq0w',
    namespace: 'context:database:warehouse-extract',
    label: 'Dictionary: extract',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_outline_of_databases_s20_s21_s26_b1',
    sourceNodeId: 'k_dict_nuf2s1s9',
    namespace: 'context:database:warehouse-dimension-table',
    label: 'Dictionary: dimension table',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_outline_of_databases_s10_s11_b7',
    sourceNodeId: 'k_dict_1epd7idn',
    namespace: 'context:database:primary-key',
    label: 'Dictionary: primary key',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_outline_of_databases_s10_s13_b6',
    sourceNodeId: 'k_dict_so2bcihf',
    namespace: 'context:database:query-optimizer',
    label: 'Dictionary: query optimizer',
    removeTags: Object.freeze([]),
  }),
  Object.freeze({
    treeNodeId: 'tree_1782809150150_a1neqh',
    sourceNodeId: 'k_1782809150059_ibx5gd',
    namespace: 'context:java:bytecode',
    label: 'Java bytecode and class files',
    removeTags: Object.freeze(['Java闈㈣瘯绐佸嚮']),
  }),
]);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function findTreeNode(root, treeNodeId) {
  if (root.id === treeNodeId) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

function parseTreeBinding(edgeId) {
  if (!edgeId.startsWith('treebind:')) return null;
  const binding = edgeId.slice('treebind:'.length);
  const separator = binding.lastIndexOf(':');
  if (separator < 0) return null;
  return {
    parentTreeId: binding.slice(0, separator),
    childTreeId: binding.slice(separator + 1),
  };
}

function repairStructure(dataset, stats) {
  for (const repair of STRUCTURE_REPAIRS) {
    const treeNode = findTreeNode(dataset.tree, repair.treeNodeId);
    if (!treeNode) throw new Error(`Missing structure repair tree node ${repair.treeNodeId}.`);
    if (!dataset.nodePool[repair.expectedNodeRef]) {
      throw new Error(`Missing structure repair node ${repair.expectedNodeRef}.`);
    }
    if (treeNode.nodeRef !== repair.expectedNodeRef) {
      treeNode.nodeRef = repair.expectedNodeRef;
      stats.treeReferencesRepaired += 1;
    }

    for (const edge of dataset.edges) {
      const binding = parseTreeBinding(edge.id);
      if (!binding) continue;
      if (
        binding.parentTreeId !== repair.treeNodeId
        && binding.childTreeId !== repair.treeNodeId
      ) continue;
      const parentTree = findTreeNode(dataset.tree, binding.parentTreeId);
      const childTree = findTreeNode(dataset.tree, binding.childTreeId);
      if (!parentTree?.nodeRef || !childTree?.nodeRef) continue;
      if (edge.source === parentTree.nodeRef && edge.target === childTree.nodeRef) continue;
      edge.source = parentTree.nodeRef;
      edge.target = childTree.nodeRef;
      stats.treeBindingEdgesRepaired += 1;
    }
  }
}

function namespaceItem(item, namespace) {
  return {
    ...structuredClone(item),
    id: `${namespace}:${item.id}`,
    pages: item.pages?.map((page) => namespaceItem(page, namespace)),
    tabs: item.tabs?.map((tab) => namespaceItem(tab, namespace)),
  };
}

function contextualTabs(card, migration, sourceTags) {
  const tabs = [];
  if (String(card.rootContent ?? '').trim() || card.rootTable) {
    tabs.push({
      id: `${migration.namespace}:overview`,
      label: migration.label,
      content: card.rootContent ?? '',
      table: card.rootTable ? structuredClone(card.rootTable) : undefined,
      tags: sourceTags.length > 0 ? [...sourceTags] : undefined,
    });
  }
  tabs.push(...(card.tabs ?? []).map((tab) => namespaceItem(tab, migration.namespace)));
  if ((card.definitionPages ?? []).length > 0) {
    tabs.push({
      id: `${migration.namespace}:legacy-definition-pages`,
      label: `${migration.label}补充`,
      content: '',
      pages: card.definitionPages.map((page) => namespaceItem(page, migration.namespace)),
    });
  }
  return tabs;
}

function clearCardContent(node) {
  node.card = {
    ...node.card,
    rootContent: undefined,
    rootTable: undefined,
    tabs: [],
    definitionPages: undefined,
    notes: undefined,
  };
}

function ensureMysqlAcidOccurrence(dataset, stats) {
  const transactionTree = findTreeNode(dataset.tree, MYSQL_TRANSACTION_TREE_ID);
  if (!transactionTree) {
    throw new Error(`Missing MySQL transaction tree node ${MYSQL_TRANSACTION_TREE_ID}.`);
  }
  transactionTree.children ??= [];
  if (!transactionTree.children.some((child) => child.id === MYSQL_ACID_TREE_ID)) {
    transactionTree.children.unshift({
      id: MYSQL_ACID_TREE_ID,
      name: 'ACID',
      count: 0,
      nodeRef: 'demo_acid',
      children: [],
    });
    stats.treeOccurrencesAdded += 1;
  }

  const edgeId = `treebind:${MYSQL_TRANSACTION_TREE_ID}:${MYSQL_ACID_TREE_ID}`;
  if (!dataset.edges.some((edge) => edge.id === edgeId)) {
    dataset.edges.push({
      id: edgeId,
      source: transactionTree.nodeRef,
      target: 'demo_acid',
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
      dimensions: ['transaction', 'storage'],
    });
    stats.treeBindingEdgesAdded += 1;
  }
}

function migrateContextCard(dataset, migration, stats) {
  const source = dataset.nodePool[migration.sourceNodeId];
  if (!source) return;
  const treeNode = findTreeNode(dataset.tree, migration.treeNodeId);
  if (!treeNode) {
    throw new Error(`Missing context tree node ${migration.treeNodeId}.`);
  }

  const sourceTags = (source.tags ?? []).filter((tag) => !migration.removeTags.includes(tag));
  const tabs = contextualTabs(source.card ?? { tabs: [] }, migration, sourceTags);
  const existingTabs = treeNode.supplement?.tabs ?? [];
  const alreadyMigrated = existingTabs.some((tab) => (
    tab.id.startsWith(`${migration.namespace}:`)
  ));
  if (alreadyMigrated || tabs.length === 0) return;

  treeNode.supplement = {
    ...treeNode.supplement,
    tabs: [...existingTabs, ...tabs],
    notes: unique([
      treeNode.supplement?.notes,
      source.card?.notes,
    ]).join('\n\n') || undefined,
  };
  source.tags = sourceTags.length > 0 ? sourceTags : undefined;
  clearCardContent(source);
  stats.contextSupplementsAdded += 1;
  stats.contextCardsCleared += 1;
}

function assignResolution(dataset, resolution, stats) {
  if (!resolution.memberIds.includes(resolution.targetId)) {
    throw new Error(`Resolution target ${resolution.targetId} is not listed as a member.`);
  }
  const target = dataset.nodePool[resolution.targetId];
  if (!target) {
    throw new Error(`Missing semantic resolution target ${resolution.targetId}.`);
  }

  for (const nodeId of resolution.memberIds) {
    const node = dataset.nodePool[nodeId];
    if (!node || node.status === 'archived-redirect') continue;
    if (node.canonicalKey !== resolution.canonicalKey) {
      node.canonicalKey = resolution.canonicalKey;
      stats.identitiesAssigned += 1;
    }
  }

  if (target.kind !== resolution.kind) {
    target.kind = resolution.kind;
    stats.targetMetadataUpdated += 1;
  }
  if (target.role !== resolution.role) {
    target.role = resolution.role;
    stats.targetMetadataUpdated += 1;
  }
  const aliases = unique([...(target.aliases ?? []), ...resolution.aliases]);
  if (JSON.stringify(aliases) !== JSON.stringify(target.aliases ?? [])) {
    target.aliases = aliases.length > 0 ? aliases : undefined;
    stats.targetMetadataUpdated += 1;
  }
}

function assignDistinctIdentities(dataset, stats) {
  for (const assignment of DISTINCT_IDENTITY_ASSIGNMENTS) {
    const node = dataset.nodePool[assignment.nodeId];
    if (!node) continue;
    if (node.canonicalKey === assignment.canonicalKey) continue;
    node.canonicalKey = assignment.canonicalKey;
    stats.distinctIdentitiesAssigned += 1;
  }
}

export function applySemanticDuplicateCuration(dataset) {
  const prepared = structuredClone(dataset);
  const stats = {
    treeReferencesRepaired: 0,
    treeBindingEdgesRepaired: 0,
    treeOccurrencesAdded: 0,
    treeBindingEdgesAdded: 0,
    contextSupplementsAdded: 0,
    contextCardsCleared: 0,
    identitiesAssigned: 0,
    distinctIdentitiesAssigned: 0,
    targetMetadataUpdated: 0,
  };

  repairStructure(prepared, stats);
  ensureMysqlAcidOccurrence(prepared, stats);
  for (const migration of CONTEXT_MIGRATIONS) {
    migrateContextCard(prepared, migration, stats);
  }
  for (const resolution of SEMANTIC_RESOLUTIONS) {
    assignResolution(prepared, resolution, stats);
  }
  assignDistinctIdentities(prepared, stats);

  const canonicalTargets = new Map(
    SEMANTIC_RESOLUTIONS.map((resolution) => [
      resolution.canonicalKey,
      resolution.targetId,
    ]),
  );
  const organized = organizeDuplicateKnowledge(prepared, { canonicalTargets });
  const overlap = applyOverlapTreeCuration(organized.dataset);
  const bindings = repairTreeBindingEdges(
    overlap.dataset.edges,
    overlap.dataset.tree,
    overlap.dataset.nodePool,
  );
  overlap.dataset.edges = bindings.edges;

  return {
    dataset: overlap.dataset,
    stats: {
      ...stats,
      ...organized.stats,
      ...overlap.stats,
      staleTreeBindingsRemoved: bindings.stats.staleBindingsRemoved,
      movedTreeBindingsRebuilt: bindings.stats.movedBindingsRebuilt,
    },
    redirects: organized.redirects,
    candidates: organized.report,
  };
}
