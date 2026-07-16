import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAiPayload, sanitizeAiResult, sessionUserId } from './ai-policy.mjs';

test('DeepSeek payload stays bounded, non-thinking, and tool-free', () => {
  const userId = sessionUserId('fts_test_session');
  const payload = buildAiPayload({
    mode: 'analyze',
    question: 'Explain the bottleneck.',
    language: 'en',
    report: 'Synthetic report',
    context: { bottleneck: 'process-c' },
    model: 'deepseek-v4-flash',
    maxTokens: 700,
    userId,
  });

  assert.equal(payload.model, 'deepseek-v4-flash');
  assert.deepEqual(payload.thinking, { type: 'disabled' });
  assert.deepEqual(payload.response_format, { type: 'json_object' });
  assert.equal(payload.max_tokens, 700);
  assert.equal('tools' in payload, false);
  assert.match(payload.messages[0].content, /Never acknowledge alarms/);
  assert.match(userId, /^fts_[a-f0-9]{24}$/);
  assert.equal(userId.includes('fts_test_session'), false);
});

test('AI result sanitizer removes industrial actions and clamps simulator values', () => {
  const result = sanitizeAiResult({
    answer: 'Check the constrained process first.',
    evidence: Array.from({ length: 8 }, (_, index) => `Evidence ${index}`),
    assumptions: ['Synthetic data'],
    confidence: 'high',
    actions: [
      { type: 'reset_fault', targetId: 'press-01', label: 'Reset', reason: 'Not allowed' },
      { type: 'set_simulation_speed', value: 5000, label: 'Speed', reason: 'Test bound' },
      { type: 'set_process_time', targetId: 'process-c', value: -20, label: 'Time', reason: 'Test bound' },
      { type: 'focus_node', targetId: '../unsafe', label: 'Unsafe', reason: 'Invalid id' },
    ],
  }, { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }, 970);

  assert.equal(result.actions.length, 2);
  assert.equal(result.actions[0].type, 'set_simulation_speed');
  assert.equal(result.actions[0].value, 500);
  assert.equal(result.actions[1].type, 'set_process_time');
  assert.equal(result.actions[1].value, 0.1);
  assert.equal(result.evidence.length, 5);
  assert.equal(result.usage.remainingDailyTokens, 970);
});

test('AI result sanitizer rejects empty answers', () => {
  assert.throws(() => sanitizeAiResult({ answer: '', actions: [] }, {}, 1000), /does not contain an answer/);
});
