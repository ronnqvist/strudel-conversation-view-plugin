/**
 * Local smoke test for the built client bundle.
 *
 * Loads `client.js` the way the page does (through
 * `window.__ModuleLoader__.load`), registers the view against a fake Client
 * context, and renders it with the workspace's React. This checks the
 * registration contract and the transcript folding without installing the
 * bundle or booting a browser.
 *
 * Usage: node test/smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(join(workspaceRoot, 'package.json'));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(pluginRoot, 'client.js'), 'utf8');

const failures = [];
function check(condition, label) {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}`);
  }
}

/* ------------------------------------------------------- load the bundle */

let handoff = null;
globalThis.window = {
  __ModuleLoader__: {
    load(registration) {
      handoff = registration;
    },
  },
};
// eslint-disable-next-line no-new-func
new Function(code)();

check(handoff !== null, 'bundle registers through window.__ModuleLoader__.load');
check(handoff.id === '@local/dsh-conversation-view', 'module id is the package name');

const mod = handoff.factory((id) => {
  if (id === 'react') return React;
  throw new Error(`unexpected external require: ${id}`);
});
check(Array.isArray(mod.inject), 'client module exports inject[]');
check(mod.inject.join(',') === 'slots,locale,uiConversation,uiSession,sessions', 'declared services match the contract');
check(typeof mod.apply === 'function', 'client module exports apply()');

/* ------------------------------------------------- register the view tab */

let registration = null;
const registeredNamespaces = new Map();
const ctx = {
  effect(fn) { fn(); },
  locale: {
    register(namespace, dictionaries) { registeredNamespaces.set(namespace, dictionaries); },
    bind(namespace) {
      return (key) => {
        const dict = registeredNamespaces.get(namespace);
        return dict !== undefined && dict.en[key] !== undefined ? dict.en[key] : key;
      };
    },
  },
  slots: {
    inject(name, callback) {
      const dispose = callback();
      return dispose;
    },
    register(options, component) {
      registration = { options, component };
      return () => {};
    },
  },
  sessions: {
    binding(sessionId) {
      if (sessionId === 'missing') throw new Error('unknown session');
      return {
        session: {
          async loadOlder() { bindingCalls += 1; },
        },
      };
    },
  },
};
let bindingCalls = 0;

mod.apply(ctx);

check(registration !== null, 'ctx.slots.register was called');
check(registration.options.name === 'conversation.view', 'registration targets conversation.view');
check(registration.options.id === 'reader', 'registration id is reader');
check(registration.options.order === 20, 'registration order is 20');
check(registration.options.locale === 'conversationView', 'registration declares the locale namespace');
check(typeof registration.options.label === 'function', 'registration label is a locale thunk');
check(registration.options.label() === 'Reader', 'English tab label is Reader');

const zh = registeredNamespaces.get('conversationView');
check(zh !== undefined && zh.zh !== undefined, 'zh dictionary registered');
check(zh.zh['tab.label'] === '\u9605\u8BFB', 'Chinese tab label is the localized word for reading');
check(zh.en['tab.label'] === 'Reader', 'en dictionary registers Reader');

const injected = registration.options.inject('session-1');
check(typeof injected.loadOlder === 'function', 'inject provides loadOlder');
const paged = await injected.loadOlder();
check(paged === true && bindingCalls === 1, 'loadOlder reaches session.loadOlder');
const guarded = registration.options.inject('missing');
check((await guarded.loadOlder()) === false, 'loadOlder stays harmless when the binding throws');

/* ------------------------------------------------------- render fixtures */

const nodes = [
  { kind: 'user', seq: 1, time: 1, content: [{ type: 'text', text: 'First prompt' }], source: null },
  { kind: 'assistant', seq: 2, time: 2, turn: 1, step: 0, blocks: [
    { kind: 'reasoning', text: 'SECRET_REASONING' },
    { kind: 'text', text: 'First answer.' },
    { kind: 'tool-call', callId: 'c1', name: 'read', argsRaw: '{}' },
  ] },
  { kind: 'tool-result', seq: 3, time: 3, callId: 'c1', call: { name: 'read', argsRaw: '{}' }, callTime: 2, content: [], isError: false, subCalls: [] },
  { kind: 'tool-result', seq: 4, time: 4, callId: 'c2', call: { name: 'grep', argsRaw: '{}' }, callTime: 2, content: [], isError: false, subCalls: [] },
  { kind: 'context', seq: 5, time: 5, content: [{ type: 'text', text: 'CONTEXT_NOISE' }], source: null, provenance: null, form: null },
  { kind: 'assistant', seq: 6, time: 6, turn: 1, step: 1, blocks: [{ kind: 'text', text: 'Second answer.' }] },
  { kind: 'turn-error', seq: 7, time: 7, turn: 1, step: 1, message: 'BOOM', code: 'E_FAIL' },
  { kind: 'compaction', seq: 8, time: 8, summary: null, summaryEventSeq: null, shadowedItemCount: 12, shadowedTokenCount: null },
  { kind: 'command', seq: 9, time: 9, commandId: 'x', name: 'help', args: '', outcome: null },
  { kind: 'model-retry', seq: 10, time: 10, retryState: 'scheduled' },
  { kind: 'unknown', seq: 11, time: 11, type: 'weird', data: {} },
  { kind: 'user', seq: 12, time: 12, content: [{ type: 'text', text: 'Second prompt' }], source: null },
  { kind: 'steering', seq: 13, messageId: 'm', time: 13, content: [{ type: 'text', text: 'Mid-turn note' }], source: null },
  { kind: 'assistant', seq: 14, time: 14, turn: 2, step: 0, blocks: [{ kind: 'text', text: 'Third answer.' }] },
];

const chat = {
  legacy: {
    nodes,
    partial: { turn: 2, step: 0, blocks: [{ kind: 'text', text: 'Streaming tail' }] },
    runningCalls: [{ callId: 'c9', name: 'bash', argsRaw: '{}', turn: 2, step: 0, time: 15, subCalls: [] }],
  },
};

function renderView({ conversation, session }) {
  const useConversation = (selector) => selector(conversation);
  const useSession = (selector) => selector(session);
  const props = {
    sessionId: 'session-1',
    useConversation,
    useSession,
    loadOlder: async () => true,
    t: (key) => {
      const dict = registeredNamespaces.get('conversationView');
      return dict !== undefined && dict.en[key] !== undefined ? dict.en[key] : key;
    },
    viewRequest: null,
    openView: () => {},
    completeViewRequest: () => {},
  };
  return renderToStaticMarkup(React.createElement(registration.component, props));
}

const html = renderView({
  conversation: { views: { get: (target) => (target === 'chat' ? chat : undefined) }, activeTargets: new Set() },
  session: { hasMore: true, loadingOlder: false, running: true },
});

check(html.includes('First prompt'), 'user prompt is rendered');
check(html.includes('First answer.') && html.includes('Second answer.'), 'assistant text is rendered');
check(html.includes('Third answer.'), 'later turn answer is rendered');
check(html.includes('Mid-turn note'), 'steering message is rendered as a prompt');
check(!html.includes('SECRET_REASONING'), 'reasoning blocks are not transcript text');
check(!html.includes('CONTEXT_NOISE'), 'context injection is ignored');
check(!html.includes('weird'), 'unknown node kinds are ignored');
check(!html.includes('help'), 'command nodes are ignored');
check(html.includes('2 tool calls'), 'a run of tool results collapses to one summary line');
check((html.match(/class="dsv-tools"/g) || []).length === 2, 'the two adjacent results share one line');
check(html.includes('Calling tools...'), 'running tool calls get their own muted line');
check(html.includes('This turn failed: BOOM') && html.includes('E_FAIL'), 'turn error renders as a note with its code');
check(html.includes('--dsw-alias-state-error-primary'), 'turn error uses the error theme token');
check(html.includes('Older history summarized here') && html.includes('12 items replaced'), 'compaction renders a muted separator');
check(html.includes('Streaming tail'), 'streaming assistant tail is appended');
check(html.includes('Load earlier turns'), 'older-history button appears when hasMore is set');
check(!html.includes('Nothing to read yet'), 'empty state is absent when nodes exist');

const emptyHtml = renderView({
  conversation: { views: { get: () => undefined }, activeTargets: new Set() },
  session: { hasMore: false, loadingOlder: false, running: false },
});
check(emptyHtml.includes('Nothing to read yet'), 'missing chat snapshot renders the empty state');
check(emptyHtml.includes('Ask something below'), 'empty state has body copy');
check(!emptyHtml.includes('Load earlier turns'), 'no paging button without older history');

const brokenHtml = renderView({
  conversation: { views: { get: () => ({ legacy: { nodes: 'not-an-array' } }) }, activeTargets: new Set() },
  session: { hasMore: false, loadingOlder: false, running: false },
});
check(brokenHtml.includes('Nothing to read yet'), 'malformed snapshot degrades to the empty state instead of throwing');

const noSnapshotHtml = renderView({ conversation: null, session: null });
check(noSnapshotHtml.includes('Nothing to read yet'), 'absent conversation/session values do not throw');

/* --------------------------------------------------------- style hygiene */

const cssBlock = /const CSS = `([\s\S]*?)`;/.exec(
  readFileSync(join(pluginRoot, 'src', 'client.jsx'), 'utf8'),
);
check(cssBlock !== null, 'style source is discoverable');
const colors = [...cssBlock[1].matchAll(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))/g)].map(match => match[1]);
check(colors.length === 0, `no literal colours in the component stylesheet (${colors.join(', ') || 'none'})`);
const tokens = [...new Set([...cssBlock[1].matchAll(/--dsw-[a-z0-9-]+/g)].map(match => match[0]))];
const allowed = new Set([
  '--dsw-alias-bg-base',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-border-l1',
  '--dsw-alias-brand-primary',
  '--dsw-alias-state-error-primary',
]);
check(tokens.every(token => allowed.has(token)), `only approved theme tokens (${tokens.join(', ')})`);

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('all smoke checks passed');
