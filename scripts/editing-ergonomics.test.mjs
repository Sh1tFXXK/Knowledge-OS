import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

const indexSource = readProjectFile('src/core/ExplanationIndexView.tsx');
const questionSource = readProjectFile('src/components/QuestionDatabase.tsx');
const rightPanelSource = readProjectFile('src/layout/RightSidePanel.tsx');
const componentsCss = readProjectFile('src/styles/components.css');
const databaseCss = readProjectFile('src/styles/database.css');

function cssRuleBody(css, selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Missing CSS rule: ${selector}`);
  const bodyStart = css.indexOf('{', start) + 1;
  const end = css.indexOf('}', bodyStart);
  return css.slice(bodyStart, end);
}

assert.match(indexSource, /className="btn btn-sm explanation-index-header-edit"/);
assert.match(indexSource, /<IndexNode[\s\S]*\/>\s*\{isEditing && editor\}/);
assert.doesNotMatch(indexSource, /editor=\{editor\}/);
assert.match(componentsCss, /\.explanation-index-stage\s*\{[\s\S]*position:\s*relative/);
assert.match(componentsCss, /\.explanation-index-editor\s*\{[\s\S]*width:\s*min\(360px/);
assert.match(componentsCss, /\.explanation-index-title-input\s*\{[\s\S]*font-size:\s*13px/);
assert.doesNotMatch(indexSource, /tagDraft|selectedIndexNode\.tags|explanation-index-cell-tags/);
assert.doesNotMatch(componentsCss, /\.explanation-index-cell-tag|\.explanation-index-editor-tags/);

assert.match(rightPanelSource, /className=\{`right-question-card\$\{isOpen \? ' is-open' : ''\}`\}/);
assert.match(rightPanelSource, /const \[openQuestionId, setOpenQuestionId\]/);
assert.match(rightPanelSource, /aria-expanded=\{isOpen\}/);
assert.match(rightPanelSource, /setOpenQuestionId\(isOpen \? null : q\.id\)/);
assert.match(rightPanelSource, /className="right-question-card-question"/);
assert.match(rightPanelSource, /\{isOpen && \(/);
assert.match(rightPanelSource, /<MarkdownView content=\{q\.answer\} \/>/);
assert.match(rightPanelSource, /'暂无答案'/);
assert.match(rightPanelSource, /right-question-card-answer/);
assert.doesNotMatch(rightPanelSource, /QuickAnswer|QuickAdd|selectedQuestionId|rq-dot|rq-status/);
const rightQuestionListRule = cssRuleBody(componentsCss, '.right-questions-list');
assert.doesNotMatch(rightQuestionListRule, /max-height|overflow-y|scrollbar/);
assert.match(componentsCss, /\.right-question-card-question\s*\{[\s\S]*font-size:\s*13px/);
assert.match(componentsCss, /\.right-question-card-answer\s*\{[\s\S]*font-size:\s*13px/);
assert.match(databaseCss, /\.question-card-text\s*\{[\s\S]*font-size:\s*14px/);
assert.match(databaseCss, /\.question-answer-textarea\s*\{[\s\S]*min-height:\s*140px/);
assert.match(questionSource, /style=\{\{ flex: 1, fontSize: 13/);

console.log('editing ergonomics checks passed');
