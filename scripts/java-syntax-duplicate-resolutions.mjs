function resolution(canonicalKey, targetId, memberIds, aliases = []) {
  return Object.freeze({
    canonicalKey,
    targetId,
    memberIds: Object.freeze(memberIds),
    kind: 'concept',
    role: 'plain',
    aliases: Object.freeze(aliases),
  });
}

export const JAVA_SYNTAX_SEMANTIC_RESOLUTIONS = Object.freeze([
  resolution(
    'java-syntax:boxing-unboxing',
    'k_1784039625817_rqf584',
    ['k_1784039625817_rqf584', 'k_java_syntax_zh_1d5leqt'],
    ['Boxing and unboxing'],
  ),
  resolution(
    'java-syntax:primitive-types',
    'k_1784039594063_ddeiyo',
    ['k_1784039594063_ddeiyo', 'k_java_syntax_zh_cnflxh', 'k_java_syntax_zh_7oglyd'],
    ['Java primitive types'],
  ),
  resolution(
    'java-syntax:operators',
    'k_1784283219004_ytuy5c',
    ['k_1784283219004_ytuy5c', 'k_java_syntax_zh_gtneay'],
    ['Java operators'],
  ),
  resolution(
    'java-syntax:control-structures',
    'k_1784283493027_3q8sty',
    ['k_1784283493027_3q8sty', 'k_java_syntax_zh_p9b7nr'],
    ['Java control structures'],
  ),
  resolution(
    'java-syntax:type:java.lang.Enum',
    'k_java_syntax_java_lang_enum_6ieryv',
    ['k_java_syntax_java_lang_enum', 'k_java_syntax_java_lang_enum_6ieryv'],
  ),
  resolution(
    'java-syntax:type:java.lang.Class',
    'k_java_syntax_java_lang_class_1aiuycf',
    ['k_java_syntax_java_lang_class', 'k_java_syntax_java_lang_class_1aiuycf'],
  ),
  resolution(
    'java-syntax:if-statement',
    'k_java_syntax_if_1xu5b8h',
    ['k_java_syntax_if', 'k_java_syntax_if_1xu5b8h'],
  ),
  resolution(
    'java-syntax:switch-expression',
    'k_java_syntax_switch_switch_java_14_12o5mof',
    ['k_java_syntax_switch_switch_java_14', 'k_java_syntax_switch_switch_java_14_12o5mof'],
  ),
  resolution(
    'java-syntax:while-loop',
    'k_java_syntax_while_1o88mwj',
    ['k_java_syntax_while', 'k_java_syntax_while_1o88mwj'],
  ),
  resolution(
    'java-syntax:do-while-loop',
    'k_java_syntax_do_while_vwrhb1',
    ['k_java_syntax_do_while', 'k_java_syntax_do_while_vwrhb1'],
  ),
  resolution(
    'java-syntax:for-loop',
    'k_java_syntax_for_94d2x5',
    ['k_java_syntax_for', 'k_java_syntax_for_94d2x5'],
  ),
  resolution(
    'java-syntax:foreach-loop',
    'k_java_syntax_foreach_j2se_5_0_12bn9kg',
    ['k_java_syntax_foreach_j2se_5_0', 'k_java_syntax_foreach_j2se_5_0_12bn9kg'],
  ),
  resolution(
    'java-syntax:break-statement',
    'k_java_syntax_break_13duo8t',
    ['k_java_syntax_break', 'k_java_syntax_break_13duo8t'],
  ),
  resolution(
    'java-syntax:continue-statement',
    'k_java_syntax_continue_j9e90r',
    ['k_java_syntax_continue', 'k_java_syntax_continue_j9e90r'],
  ),
  resolution(
    'java-syntax:return-statement',
    'k_java_syntax_return_gnu17m',
    ['k_java_syntax_return', 'k_java_syntax_return_gnu17m'],
  ),
  resolution(
    'java-syntax:try-catch-finally',
    'k_java_syntax_try_catch_finally_knjof2',
    ['k_java_syntax_try_catch_finally', 'k_java_syntax_try_catch_finally_knjof2'],
  ),
  resolution(
    'java-syntax:try-with-resources',
    'k_java_syntax_try_with_resources_java_se_7_uldwy1',
    [
      'k_java_syntax_try_with_resources_java_se_7',
      'k_java_syntax_try_with_resources_java_se_7_uldwy1',
    ],
  ),
  resolution(
    'java-syntax:throw-statement',
    'k_java_syntax_throw_kbsvid',
    ['k_java_syntax_throw', 'k_java_syntax_throw_kbsvid'],
  ),
  resolution(
    'java-syntax:assert-statement',
    'k_java_syntax_assert_6h86hg',
    ['k_java_syntax_assert', 'k_java_syntax_assert_6h86hg'],
  ),
  resolution(
    'java-syntax:final-method',
    'k_java_syntax_final_158tsal',
    ['k_java_syntax_final', 'k_java_syntax_final_158tsal'],
  ),
  resolution(
    'java-syntax:annotation',
    'k_java_syntax_j2se_5_0_1h3ikif',
    ['k_java_syntax_j2se_5_0', 'k_java_syntax_j2se_5_0_1h3ikif'],
  ),
  resolution(
    'java-syntax:functional-interface-lambda',
    'k_java_syntax_lambda_java_se_8_1fpadqh',
    ['k_java_syntax_lambda_java_se_8', 'k_java_syntax_lambda_java_se_8_1fpadqh'],
  ),
  resolution(
    'java-syntax:interface-static-method',
    'k_java_syntax_java_se_8_ubvxu8',
    ['k_java_syntax_java_se_8', 'k_java_syntax_java_se_8_ubvxu8'],
  ),
  resolution(
    'java-syntax:interface-private-method',
    'k_java_syntax_java_9_jpfphf',
    ['k_java_syntax_java_9', 'k_java_syntax_java_9_jpfphf'],
  ),
]);
