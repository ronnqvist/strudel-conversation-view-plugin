/**
 * Reader: an extra Conversation View for DeepSeek Harness.
 *
 * The tab registered here is a calm transcript of the current Session. It
 * does not fold session events itself: it reads the already-assembled Chat
 * target snapshot through the standard session prop
 * `useConversation(c => c.views.get('chat'))` and folds its seq-ordered
 * ConversationNodes into Turns:
 *
 *   - the user prompt(s) of the turn,
 *   - the assistant's plain-text answer (reasoning, images and tool calls are
 *     not transcript material),
 *   - one muted summary line per contiguous run of tool results,
 *   - red notes for turn errors,
 *   - a muted separator where older history was compacted.
 *
 * Unknown node kinds are ignored; a missing snapshot renders the empty state.
 * Only Harness theme tokens colour the view, and every visible string comes
 * from the `conversationView` locale namespace.
 */
import React from 'react';

/** Locale namespace owned by this view. */
const NS = 'conversationView';

/** `conversation.view` entry id. */
const VIEW_ID = 'reader';

/** Tool names printed inline before the summary is clipped. */
const MAX_TOOL_NAMES = 4;

/** Stable empty arrays keep selector results and memo dependencies stable. */
const EMPTY_LIST = [];

/** Copy for both shipped locales; also registered as JSON display metadata. */
const DICT = {
  en: {
    'tab.label': 'Reader',
    'empty.title': 'Nothing to read yet',
    'empty.body': 'Ask something below and the conversation appears here, one turn at a time.',
    'load.earlier': 'Load earlier turns',
    'load.loading': 'Loading earlier turns...',
    'label.you': 'You',
    'label.steer': 'Message added mid-turn',
    'tools.count': '{n} tool calls',
    'tools.more': '+{n} more',
    'tools.failed': '{n} failed',
    'tools.running': 'Calling tools...',
    'streaming': 'Writing...',
    'error.turn': 'This turn failed: {message}',
    'error.turn.fallback': 'This turn ended with an error.',
    'compaction.label': 'Older history summarized here',
    'compaction.count': '{n} items replaced',
    'error.render': 'The Reader could not display this transcript.',
  },
  zh: {
    'tab.label': '阅读',
    'empty.title': '这里还没有内容',
    'empty.body': '在下方提问，对话会按轮次显示在这里。',
    'load.earlier': '加载更早的轮次',
    'load.loading': '正在加载更早的轮次...',
    'label.you': '你',
    'label.steer': '本轮追加的消息',
    'tools.count': '{n} 次工具调用',
    'tools.more': '另有 {n} 个',
    'tools.failed': '{n} 次失败',
    'tools.running': '正在调用工具...',
    'streaming': '正在生成...',
    'error.turn': '本轮出错：{message}',
    'error.turn.fallback': '本轮因错误结束。',
    'compaction.label': '此处已压缩更早的历史',
    'compaction.count': '已替换 {n} 项',
    'error.render': '阅读视图无法显示这段对话。',
  },
};

/* ------------------------------------------------------------------ data */

/**
 * Join the text blocks of a user-style message.
 * @param content - ContentBlock list of a user, steering, or context node.
 * @returns plain text, or an empty string when the message carries none.
 */
function contentText(content) {
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const block of content) {
    if (block === null || typeof block !== 'object') continue;
    if (block.type !== 'text' || typeof block.text !== 'string') continue;
    if (block.text.trim() === '') continue;
    parts.push(block.text);
  }
  return parts.join('\n\n').trim();
}

/**
 * Join the answer prose of one assistant node.
 * Reasoning, images, tool calls, and unknown blocks are not transcript text.
 * @param blocks - AssistantBlock list.
 * @returns plain text, or an empty string when the step produced none.
 */
function assistantText(blocks) {
  if (!Array.isArray(blocks)) return '';
  const parts = [];
  for (const block of blocks) {
    if (block === null || typeof block !== 'object') continue;
    if (block.kind !== 'text' || typeof block.text !== 'string') continue;
    if (block.text.trim() === '') continue;
    parts.push(block.text);
  }
  return parts.join('\n\n').trim();
}

/** Add one tool result to the run it belongs to. */
function addToolResult(run, node) {
  run.count += 1;
  const name = node.call !== null && node.call !== undefined && typeof node.call.name === 'string'
    ? node.call.name
    : '';
  if (name !== '' && run.names.indexOf(name) === -1) run.names.push(name);
  if (node.isError === true) run.failed += 1;
}

/**
 * Fold the Chat target's finalized nodes into ordered, reader-shaped Turns.
 * Pure and defensive: an unfamiliar or malformed node is skipped, and a
 * failure while folding returns what was assembled so far.
 * @param nodes - seq-ordered ConversationNode list.
 * @param partial - in-progress assistant output, when a turn is streaming.
 * @param runningCalls - tool calls started but not answered yet.
 * @returns Turn sections, each holding ordered display items.
 */
function buildSections(nodes, partial, runningCalls) {
  const sections = [];
  let current = null;
  let toolRun = null;

  const openSection = () => {
    current = { key: `turn-${sections.length}`, items: [] };
    sections.push(current);
    return current;
  };
  const ensureSection = () => current === null ? openSection() : current;
  const push = (item) => { ensureSection().items.push(item); };

  try {
    for (const node of nodes) {
      if (node === null || typeof node !== 'object') continue;
      const kind = node.kind;

      if (kind === 'tool-result') {
        const lastItem = current === null ? undefined : current.items[current.items.length - 1];
        if (toolRun !== null && lastItem === toolRun) {
          addToolResult(toolRun, node);
        } else {
          toolRun = { key: `tools-${node.seq}`, kind: 'tools', names: [], count: 0, failed: 0, running: false };
          addToolResult(toolRun, node);
          push(toolRun);
        }
        continue;
      }
      toolRun = null;

      if (kind === 'user') {
        const text = contentText(node.content);
        if (text === '') continue;
        // Every user message opens a Turn unless the current one is still empty.
        if (current === null || current.items.length > 0) openSection();
        push({ key: `prompt-${node.seq}`, kind: 'prompt', text, steer: false });
        continue;
      }

      if (kind === 'steering') {
        const text = contentText(node.content);
        if (text === '') continue;
        push({ key: `steer-${node.seq}`, kind: 'prompt', text, steer: true });
        continue;
      }

      if (kind === 'assistant') {
        const text = assistantText(node.blocks);
        if (text === '') continue;
        push({ key: `answer-${node.seq}`, kind: 'answer', text, streaming: false });
        continue;
      }

      if (kind === 'turn-error') {
        push({
          key: `error-${node.seq}`,
          kind: 'error',
          text: typeof node.message === 'string' ? node.message.trim() : '',
          code: typeof node.code === 'string' ? node.code.trim() : '',
        });
        continue;
      }

      if (kind === 'compaction') {
        push({
          key: `compaction-${node.seq}`,
          kind: 'compaction',
          count: typeof node.shadowedItemCount === 'number' && node.shadowedItemCount > 0
            ? node.shadowedItemCount
            : 0,
        });
        continue;
      }
      // 'context', 'command', 'model-retry', 'turn-max-tokens', and 'unknown'
      // are intentionally not transcript material.
    }

    if (partial !== null && typeof partial === 'object') {
      const text = assistantText(partial.blocks);
      if (text !== '') push({ key: 'partial', kind: 'answer', text, streaming: true });
    }

    if (Array.isArray(runningCalls) && runningCalls.length > 0) {
      const run = { key: 'running', kind: 'tools', names: [], count: runningCalls.length, failed: 0, running: true };
      for (const call of runningCalls) {
        const name = call !== null && typeof call === 'object' && typeof call.name === 'string' ? call.name : '';
        if (name !== '' && run.names.indexOf(name) === -1) run.names.push(name);
      }
      push(run);
    }
  } catch {
    // A malformed node never blanks the Reader: keep what was assembled.
  }

  return sections.filter(section => section.items.length > 0);
}

/**
 * Build a total translate function: a missing seat or dictionary key degrades
 * to the key itself instead of throwing during render.
 * @param t - framework-provided translate for this namespace, when present.
 * @returns translate(key, vars) with `{name}` interpolation.
 */
function createTranslate(t) {
  return (key, vars) => {
    let value = key;
    try {
      if (typeof t === 'function') {
        const translated = t(key);
        if (typeof translated === 'string' && translated !== '') value = translated;
      }
    } catch {
      value = key;
    }
    if (vars !== undefined && vars !== null) {
      for (const name of Object.keys(vars)) {
        value = value.split(`{${name}}`).join(String(vars[name]));
      }
    }
    return value;
  };
}

/** Clip a tool run's names to one short, stable phrase. */
function toolNames(item, tr) {
  if (item.names.length === 0) return '';
  const shown = item.names.slice(0, MAX_TOOL_NAMES);
  const extra = item.names.length - shown.length;
  const base = shown.join(', ');
  return extra > 0 ? `${base} ${tr('tools.more', { n: extra })}` : base;
}

/* ------------------------------------------------------------ presentation */

const CSS = `
.dsv-root {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 13px;
  line-height: 1.65;
}
.dsv-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 20px 40px;
}
.dsv-column {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}
.dsv-older {
  align-self: center;
  margin: 0 0 20px;
  padding: 3px 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsv-older:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.dsv-older:disabled { cursor: default; opacity: 0.6; }
.dsv-older:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsv-turn {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsv-turn:first-of-type { padding-top: 4px; }
.dsv-turn:last-of-type { padding-bottom: 0; border-bottom: none; }
.dsv-prompt {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 12px;
  border-left: 2px solid var(--dsw-alias-brand-primary);
}
.dsv-label {
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary);
}
.dsv-text {
  margin: 0;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dsv-tools {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  padding-left: 2px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-tools-count { flex: 0 0 auto; }
.dsv-tools-names {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-tools-failed { flex: 0 0 auto; opacity: 0.9; }
.dsv-error {
  padding-left: 12px;
  border-left: 2px solid var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary);
  font-size: 12.5px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dsv-error-code {
  display: block;
  font-size: 11px;
  opacity: 0.8;
}
.dsv-compaction {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-rule {
  flex: 1 1 auto;
  height: 1px;
  background: var(--dsw-alias-border-l1);
}
.dsv-compaction-text {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsv-caret {
  display: inline-block;
  width: 5px;
  height: 12px;
  margin-left: 2px;
  vertical-align: -1px;
  background: var(--dsw-alias-brand-primary);
  animation: dsv-pulse 1.1s ease-in-out infinite;
}
@keyframes dsv-pulse {
  0%, 45% { opacity: 0.7; }
  55%, 100% { opacity: 0.15; }
}
.dsv-streaming {
  margin-top: 12px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 24px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
}
.dsv-empty-glyph { color: var(--dsw-alias-label-secondary); opacity: 0.75; }
.dsv-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.dsv-empty-body { max-width: 320px; font-size: 12.5px; line-height: 1.6; }
.dsv-fallback {
  padding: 24px 0;
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary);
}
@media (prefers-reduced-motion: reduce) {
  .dsv-caret { animation: none; opacity: 0.6; }
}
`;

/** Original empty-state glyph: a quiet page with text lines. */
function ReaderGlyph() {
  return (
    <svg
      className="dsv-empty-glyph"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="5" width="22" height="30" rx="3" />
      <path d="M15 5v30" strokeOpacity="0.55" />
      <path d="M19 13h7" />
      <path d="M19 18h5" />
      <path d="M19 23h7" />
      <path d="M19 28h4" />
    </svg>
  );
}

/** One collapsed line per run of tool results. */
function ToolLine({ item, tr }) {
  const names = toolNames(item, tr);
  const label = item.running ? tr('tools.running') : tr('tools.count', { n: item.count });
  return (
    <div className="dsv-tools" title={names === '' ? label : `${label} · ${names}`}>
      <span className="dsv-tools-count">{label}</span>
      {names === '' ? null : <span className="dsv-tools-names">{names}</span>}
      {item.failed > 0 ? <span className="dsv-tools-failed">{tr('tools.failed', { n: item.failed })}</span> : null}
    </div>
  );
}

/** One display item inside a Turn. */
function ItemView({ item, tr }) {
  if (item.kind === 'prompt') {
    return (
      <div className="dsv-prompt">
        <div className="dsv-label">{item.steer ? tr('label.steer') : tr('label.you')}</div>
        <div className="dsv-text">{item.text}</div>
      </div>
    );
  }
  if (item.kind === 'answer') {
    return (
      <div className="dsv-text">
        {item.text}
        {item.streaming ? <span className="dsv-caret" aria-hidden="true" /> : null}
      </div>
    );
  }
  if (item.kind === 'tools') return <ToolLine item={item} tr={tr} />;
  if (item.kind === 'error') {
    return (
      <div className="dsv-error" role="note">
        {item.text === '' ? tr('error.turn.fallback') : tr('error.turn', { message: item.text })}
        {item.code === '' ? null : <span className="dsv-error-code">{item.code}</span>}
      </div>
    );
  }
  if (item.kind === 'compaction') {
    return (
      <div className="dsv-compaction" role="separator">
        <span className="dsv-rule" />
        <span className="dsv-compaction-text">
          {item.count > 0
            ? `${tr('compaction.label')} · ${tr('compaction.count', { n: item.count })}`
            : tr('compaction.label')}
        </span>
        <span className="dsv-rule" />
      </div>
    );
  }
  return null;
}

/** One Turn: its prompt(s), answer prose, tool summaries, and notes. */
function TurnView({ turn, tr }) {
  return (
    <section className="dsv-turn">
      {turn.items.map(item => <ItemView key={item.key} item={item} tr={tr} />)}
    </section>
  );
}

/** Friendly empty state for a Session with no readable transcript yet. */
function EmptyState({ tr }) {
  return (
    <div className="dsv-empty">
      <ReaderGlyph />
      <div className="dsv-empty-title">{tr('empty.title')}</div>
      <div className="dsv-empty-body">{tr('empty.body')}</div>
    </div>
  );
}

/**
 * Catch a render failure inside the transcript so the slot never blanks.
 * The fallback is one muted line; it is not an error report surface.
 */
class ReaderBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // The shell reports entry crashes; the Reader only degrades quietly.
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Transcript body. Data comes from the already-assembled Chat target; the
 * Reader never folds session events, so it stays correct across log windows.
 */
function ReaderBody({ useConversation, useSession, loadOlder, t }) {
  const tr = createTranslate(t);
  const chat = useConversation((snapshot) => {
    try {
      const views = snapshot !== null && snapshot !== undefined ? snapshot.views : undefined;
      if (views === null || views === undefined || typeof views.get !== 'function') return null;
      return views.get('chat') || null;
    } catch {
      return null;
    }
  });
  const hasMore = useSession((snapshot) => Boolean(snapshot !== null && snapshot !== undefined && snapshot.hasMore));
  const loadingOlder = useSession(
    (snapshot) => Boolean(snapshot !== null && snapshot !== undefined && snapshot.loadingOlder),
  );
  const running = useSession((snapshot) => Boolean(snapshot !== null && snapshot !== undefined && snapshot.running));

  const legacy = chat !== null && chat !== undefined && chat.legacy !== null && chat.legacy !== undefined
    ? chat.legacy
    : null;
  const nodes = legacy !== null && Array.isArray(legacy.nodes) ? legacy.nodes : EMPTY_LIST;
  const partial = legacy !== null && legacy.partial !== null && legacy.partial !== undefined
    ? legacy.partial
    : null;
  const runningCalls = legacy !== null && Array.isArray(legacy.runningCalls) ? legacy.runningCalls : EMPTY_LIST;

  const turns = React.useMemo(
    () => buildSections(nodes, partial, runningCalls),
    [nodes, partial, runningCalls],
  );

  const [paging, setPaging] = React.useState(false);
  const onLoadOlder = React.useCallback(() => {
    setPaging(true);
    Promise.resolve()
      .then(() => (typeof loadOlder === 'function' ? loadOlder() : false))
      .catch(() => false)
      .then(() => { setPaging(false); });
  }, [loadOlder]);

  const olderLoading = paging || loadingOlder;
  const streaming = partial !== null && turns.some(turn => turn.items.some(item => item.streaming));
  const empty = turns.length === 0;

  return (
    <div className="dsv-scroll">
      <div className="dsv-column">
        {hasMore ? (
          <button type="button" className="dsv-older" disabled={olderLoading} onClick={onLoadOlder}>
            {olderLoading ? tr('load.loading') : tr('load.earlier')}
          </button>
        ) : null}
        {empty
          ? <EmptyState tr={tr} />
          : turns.map(turn => <TurnView key={turn.key} turn={turn} tr={tr} />)}
        {running && !empty && !streaming
          ? <div className="dsv-streaming" aria-hidden="true">{tr('streaming')}</div>
          : null}
      </div>
    </div>
  );
}

/**
 * `conversation.view` entry component. The props are the slot contract's
 * owner share (ignored here), the session standard kit, and this plugin's
 * injected `loadOlder`.
 */
export function ReaderView({ useConversation, useSession, loadOlder, t }) {
  const tr = createTranslate(t);
  return (
    <div className="dsv-root">
      <style>{CSS}</style>
      <ReaderBoundary
        fallback={<div className="dsv-scroll"><div className="dsv-column"><div className="dsv-fallback">{tr('error.render')}</div></div></div>}
      >
        <ReaderBody
          useConversation={useConversation}
          useSession={useSession}
          loadOlder={loadOlder}
          t={t}
        />
      </ReaderBoundary>
    </div>
  );
}

/* ------------------------------------------------------------------ entry */

/** Services required to register the tab and its locale copy. */
export const inject = ['slots', 'locale', 'uiConversation', 'uiSession', 'sessions'];

/**
 * Register the Reader tab beside Chat and Trajectory.
 * @param ctx - the Client root context.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { en: DICT.en, zh: DICT.zh }), 'conversation-view: dictionaries');
  // Registration-time text (the tab label) reads through a bound translate so
  // it follows the active locale without re-registration.
  const t = ctx.locale.bind(NS);

  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: VIEW_ID,
    order: 20,
    locale: NS,
    label: () => t('tab.label'),
    inject: (sessionId) => ({
      // Older-history paging resolves through the Session binding at call
      // time; an unavailable binding leaves the view working, without paging.
      loadOlder: async () => {
        try {
          const binding = ctx.sessions.binding(sessionId);
          const session = binding !== null && binding !== undefined ? binding.session : undefined;
          if (session === null || session === undefined || typeof session.loadOlder !== 'function') return false;
          await session.loadOlder();
          return true;
        } catch {
          return false;
        }
      },
    }),
  }, ReaderView));
}
