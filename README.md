# Reader — a Conversation View for DeepSeek Harness

An extra tab in the conversation's View row, beside **Chat** and **Trajectory**.
It renders the current Session as a calm transcript: what you asked, what the
agent answered, and one muted line for each run of tool calls.

# What it shows

- **One section per Turn.** Your prompt is set off with a brand-coloured rule;
  the assistant's answer follows as plain prose.
- **Only transcript material.** Reasoning, images, tool-call arguments and
  commands are left out; a contiguous run of tool results collapses into a
  single line such as `3 tool calls · read, grep, pwsh`, with failures counted.
- **Notices as notes.** A failed Turn becomes a red note with its error code, a
  compaction is a muted separator with the number of replaced items, and text
  injected mid-Turn appears as its own prompt.
- **Live tail.** While a Turn runs, the streaming answer is appended with a
  quiet caret; unfinished tool calls get their own `Calling tools...` line.
- **Older history on demand.** When the Session window starts mid-history the
  top of the list offers *Load earlier turns*, which pulls one older page.

The view is read-only on purpose: the composer below belongs to the resident
Conversation shell, so writing a reply and pressing Enter still works from the
Reader tab. If the transcript cannot be assembled, the surface degrades to one
muted line instead of blanking the slot.

# How it gets its data

The Reader does not fold session events itself. It reads the Chat target the
Harness Client already assembles:

```js
const chat = useConversation(snapshot => snapshot.views.get('chat'))
const nodes = chat?.legacy.nodes ?? []
```

`legacy.nodes` is the seq-ordered list of finalized `ConversationNode`s
(`user`, `assistant`, `tool-result`, `steering`, `turn-error`, `compaction`,
and so on). The Reader folds that list into Turns and ignores kinds it does not
know, so an unfamiliar node never breaks the view. Those nodes already reflect
the loaded event window, which is why paging is the only history operation the
view needs.

Registration follows the `conversation.view` slot contract:

```js
ctx.slots.inject('conversation.view', () => ctx.slots.register({
  name: 'conversation.view',
  id: 'reader',
  order: 20,
  locale: NS,
  label: () => t('tab.label'),
  inject: sessionId => ({ loadOlder }),
}, ReaderView))
```

The tab only appears while the View row is shown (the shell renders that row
once more than one View is registered), and it follows the active locale: the
en/zh dictionaries in `src/client.jsx` are also the source of the display
metadata in `locale/*.json`.

# Look and feel

The Reader is part of the Harness UI, so it inherits the host theme and uses
only `--dsw-alias-*` tokens for colour, borders and surfaces: no literal
colours, no second application on the page, no Harness client package imports.
`react` is the only external module; it comes from the page's shared module
table.

# Files

| File | Purpose |
| --- | --- |
| `index.js` | Host half. Registers nothing: the Reader is a presentation of client-owned Session state. |
| `src/client.jsx` | Client source: the fold, the view, the slot registration, the locale dictionaries. |
| `client.js` | Built bundle, loaded by the Harness client module loader. |
| `cordis.patch.yml` | Inserts the `conversation-view` row into the profile. |
| `locale/*.json` | `meta.title` / `meta.description` for the Plugins page. |
| `test/smoke.mjs` | Loads the built bundle through the module-loader handoff and renders it with React to check the registration and the fold. |

# Build and test

`client.js` is checked in. Rebuild only when editing `src/client.jsx`:

```sh
node build.mjs
node test/smoke.mjs
```

`build.mjs` bundles with esbuild (`react` external, JSX transform) and wraps the
result in the Client module-loader factory form. It uses a local
`node_modules` when present and otherwise reuses the copy installed in the
sibling `strudel-player-plugin`, so no network install is needed here.

# Verification

- `node build.mjs` produces the bundle; `node --check client.js` parses it.
- `node test/smoke.mjs` renders the view with React through the real
  module-loader handoff and checks the registration options, both dictionary
  tables, the Turn fold, tool-line collapsing, error and compaction notes,
  streaming tail, paging button, empty state, and that the stylesheet uses only
  approved theme tokens.
- Rendered appearance in the live page (light/dark, narrow and wide panes) has
  not been verified from this checkout; the tab needs a page reload after the
  bundle is installed.
