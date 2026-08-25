export const TAXONOMY_PARENT_TREE_IDS = Object.freeze({
  universe: 'universe',
  computerScience: 'demo_cs',
});

export const SCHOOL_PARENT_TREE_IDS = Object.freeze({
  school_mathematics: TAXONOMY_PARENT_TREE_IDS.universe,
  school_logic: TAXONOMY_PARENT_TREE_IDS.universe,
  school_database_theory: TAXONOMY_PARENT_TREE_IDS.computerScience,
  school_computation_theory: TAXONOMY_PARENT_TREE_IDS.computerScience,
  school_programming_languages: TAXONOMY_PARENT_TREE_IDS.computerScience,
  school_systems: TAXONOMY_PARENT_TREE_IDS.computerScience,
  school_security: TAXONOMY_PARENT_TREE_IDS.computerScience,
  school_information_retrieval: TAXONOMY_PARENT_TREE_IDS.computerScience,
  school_real_world_conventions: TAXONOMY_PARENT_TREE_IDS.universe,
});

export const TAXONOMY_SCHOOL_IDS = Object.freeze(Object.keys(SCHOOL_PARENT_TREE_IDS));

export function parentTreeIdForSchool(schoolId) {
  const parentTreeId = SCHOOL_PARENT_TREE_IDS[schoolId];
  if (!parentTreeId) throw new Error(`Missing taxonomy parent for school ${schoolId}`);
  return parentTreeId;
}
