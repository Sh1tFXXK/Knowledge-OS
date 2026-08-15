export const TAXONOMY_CONTAINER_SPECS = Object.freeze([
  {
    id: 'school_mathematics',
    parentTreeId: 'universe',
    name: '数学',
    description: '研究数量、结构、空间、变化以及抽象关系的基础学科。',
  },
  {
    id: 'school_logic',
    parentTreeId: 'universe',
    name: '逻辑',
    description: '研究有效推理、形式系统、命题、谓词和证明的基础学科。',
  },
  {
    id: 'school_real_world_conventions',
    parentTreeId: 'universe',
    name: '标准与约定',
    description: '跨系统复用的历法、时间、字符编码和互操作标准。',
  },
  {
    id: 'school_computation_theory',
    parentTreeId: 'demo_cs',
    name: '计算理论',
    description: '研究计算模型、可计算性、复杂性、形式语言和算法边界。',
  },
  {
    id: 'school_security',
    parentTreeId: 'demo_cs',
    name: '安全',
    description: '研究信息和计算系统的机密性、完整性、可用性及其保护机制。',
  },
  {
    id: 'database_principles',
    parentTreeId: 'demo_db',
    name: '数据库原理',
    description: '数据库系统的通用原理，包括关系模型、模式设计、事务、并发与恢复。',
  },
]);

export const DEPRECATED_TAXONOMY_CONTAINER_IDS = Object.freeze([
  'school_database_theory',
  'school_programming_languages',
  'school_systems',
  'school_information_retrieval',
]);

export const DOMAIN_MOUNTS = Object.freeze({
  set_theory: { parentTreeId: 'school_mathematics' },
  graph_theory: { parentTreeId: 'school_mathematics' },
  statistics: { parentTreeId: 'school_mathematics' },
  probability: { parentTreeId: 'school_mathematics' },
  numerical_analysis: { parentTreeId: 'school_mathematics' },
  information_theory: { parentTreeId: 'school_mathematics' },
  queueing_theory: { parentTreeId: 'school_mathematics' },

  first_order_logic: { parentTreeId: 'school_logic' },
  type_theory: { parentTreeId: 'school_logic' },
  three_valued_logic: { parentTreeId: 'school_logic' },

  relational_algebra: { parentTreeId: 'database_principles' },
  normalization_theory: { parentTreeId: 'database_principles' },
  transaction_theory: { parentTreeId: 'database_principles' },
  recovery_theory: { parentTreeId: 'database_principles' },

  formal_languages_automata: { parentTreeId: 'school_computation_theory' },
  complexity_theory: { parentTreeId: 'school_computation_theory' },
  algorithms: { parentTreeId: 'tree_acm2012_algorithms', direct: true },
  data_structures: { parentTreeId: 'tree_acm2012_algorithms' },

  programming_language_theory: {
    parentTreeId: 'tree_acm2012_software_notations_tools_programming_languages',
  },
  regular_expression_theory: {
    parentTreeId: 'tree_acm2012_software_notations_tools_programming_languages',
  },
  compiler_principles: {
    parentTreeId: 'tree_acm2012_software_notations_tools_programming_languages',
  },

  operating_systems: { parentTreeId: 'tree_acm2012_systems_organization' },
  computer_architecture: { parentTreeId: 'tree_acm2012_systems_organization' },
  storage_systems: { parentTreeId: 'tree_acm2012_systems_organization' },
  distributed_systems: { parentTreeId: 'tree_acm2012_systems_organization' },
  concurrency_theory: { parentTreeId: 'tree_acm2012_concurrency' },
  network_protocols: {
    parentTreeId: 'tree_acm2012_networks_network_protocols',
    direct: true,
  },

  cryptography: { parentTreeId: 'school_security' },
  access_control: { parentTreeId: 'school_security' },
  information_retrieval: {
    parentTreeId: 'tree_acm2012_information_systems_information_retrieval',
  },

  calendar_systems: { parentTreeId: 'school_real_world_conventions' },
  character_encoding_standards: { parentTreeId: 'school_real_world_conventions' },
  timezone_standards: { parentTreeId: 'school_real_world_conventions' },
});

export function domainMount(domainId) {
  const mount = DOMAIN_MOUNTS[domainId];
  if (!mount) throw new Error(`Missing taxonomy mount for domain ${domainId}`);
  return mount;
}
