# Arduino extension — Armenian (`hy`) translation

**Date:** 2026-06-13
**Status:** Approved (design)
**Author:** Grisha (with Claude)

## Goal

Make the built-in `arduinoControl` extension display in Armenian when the editor
language is set to Armenian (`hy`), while keeping English (and every other
locale) working via fallbacks. Two user-visible surfaces must be translated:

1. The extension **block text and menus** in the VM.
2. The extension **library card** (name + description) in the GUI.

`hy` is already a supported locale in this build (`scratch-l10n` ships 80
locales, including `hy`), so no locale needs to be registered — only the
custom `arduino.*` / `gui.extension.arduino.*` strings need Armenian values.

## Background / how translation flows today

Both surfaces resolve their strings through `state.locales.messages`
(`packages/scratch-gui/src/reducers/locales.js`), which is seeded from
`scratch-l10n/locales/editor-msgs`:

- **Blocks:** `containers/blocks.jsx` calls
  `vm.setLocale(locale, state.locales.messages)` whenever the locale changes
  (`blocks.jsx:228-231`, `:269-271`). `virtual-machine.js:setLocale()` then does
  `formatMessage.setup({locale, translations: {[locale]: messages}})`. A
  built-in extension that calls `formatMessage({id, default, description})` in
  its `getInfo()` block text gets the localized string for `id`, falling back to
  `default` when the id is absent.
- **Library card:** rendered with react-intl `<FormattedMessage>`, which reads
  the same `state.locales.messages` via `connected-intl-provider.jsx`, falling
  back to `defaultMessage` when the id is absent.

The current `scratch3_arduino/index.js` uses hardcoded English strings (no
`formatMessage`), and the custom `arduino.*` ids do not exist in the external
`scratch-l10n` package. So today the extension is English-only.

## Approach (chosen)

Use the standard built-in i18n mechanism (same as micro:bit / EV3): wrap block
text in `formatMessage`, and inject the Armenian strings by **merging an in-repo
message bundle into the locales reducer**. This single injection point feeds
both surfaces (blocks via `vm.setLocale`, card via react-intl) because both read
`state.locales.messages`.

Rejected alternatives:
- *Edit `node_modules/scratch-l10n`* — fragile, lost on reinstall.
- *Armenian-only hard override* — breaks English for other users; not i18n.
- *`translation_map` in `getInfo()`* — not consumed anywhere in this codebase
  (verified: no reader of `translation_map` in `scratch-vm` or `scratch-gui`
  outside the example doc), so it would have no effect for a built-in extension.

English text is provided entirely by the `default` / `defaultMessage` fallbacks,
so the injected bundle only needs `hy` entries.

## Components / files changed

### 1. `packages/scratch-vm/src/extensions/scratch3_arduino/index.js`
- Add `const formatMessage = require('format-message');` (matching micro:bit).
- Replace each block `text:` literal with
  `formatMessage({id, default, description})`.
- Replace the `highLow` menu `text` literals (`'HIGH'`, `'LOW'`) with
  `formatMessage` calls.
- **Unchanged:** `id: 'arduinoControl'`, `name: 'Arduino'`, colors, icon,
  opcodes, argument keys (`PIN`, `VALUE`, `ANGLE`, etc.), `defaultValue`s, menu
  pin numbers, and all method implementations / WebSocket behavior.

Message ids use the `arduino.` prefix:

| id | default (English) |
|---|---|
| `arduino.isConnected` | `Arduino connected?` |
| `arduino.digitalWrite` | `set digital pin [PIN] to [VALUE]` |
| `arduino.digitalRead` | `read digital pin [PIN]` |
| `arduino.analogRead` | `read analog pin [PIN]` |
| `arduino.analogWrite` | `set PWM pin [PIN] to [VALUE]` |
| `arduino.servoWrite` | `set servo pin [PIN] to [ANGLE] degrees` |
| `arduino.whenDigitalPin` | `when digital pin [PIN] is [VALUE]` |
| `arduino.mapValue` | `map [VALUE] from [FROMLOW]-[FROMHIGH] to [TOLOW]-[TOHIGH]` |
| `arduino.highLow.high` | `HIGH` |
| `arduino.highLow.low` | `LOW` |

> Note: `formatMessage` placeholders use `[PIN]` style here because Scratch's
> block text parser expects `[ARG]` tokens that map to the `arguments` keys. The
> `[PIN]`/`[VALUE]`/`[ANGLE]` tokens are kept verbatim in every translation;
> they are replaced at render time by the input/menu, never shown as words.

### 2. `packages/scratch-gui/src/lib/libraries/extensions/index.jsx`
- Change the Arduino card `name: 'Arduino'` into a `<FormattedMessage>` with
  `id="gui.extension.arduino.name"` and `defaultMessage="Arduino"` (the card
  component already renders `name` as a node; other entries do this).
- The description already uses `<FormattedMessage
  id="gui.extension.arduino.description">` — unchanged.

### 3. `packages/scratch-gui/src/lib/arduino-messages.js` (new)
Exports the Armenian bundle, keyed by locale then message id:

```js
export default {
    hy: {
        'gui.extension.arduino.name': 'Arduino',
        'gui.extension.arduino.description':
            'Կառավարի՛ր Arduino Uno-ն իրական ժամանակում՝ USB-ի միջոցով։',
        'arduino.isConnected': 'Arduino-ն միացվա՞ծ է',
        'arduino.digitalWrite': 'սահմանել թվային ելուստ [PIN]-ը՝ [VALUE]',
        'arduino.digitalRead': 'կարդալ թվային ելուստ [PIN]-ից',
        'arduino.analogRead': 'կարդալ անալոգային ելուստ [PIN]-ից',
        'arduino.analogWrite': 'սահմանել PWM ելուստ [PIN]-ը՝ [VALUE]',
        'arduino.servoWrite': 'սահմանել սերվո ելուստ [PIN]-ը՝ [ANGLE] աստիճան',
        'arduino.whenDigitalPin': 'երբ թվային ելուստ [PIN]-ը [VALUE] է',
        'arduino.mapValue':
            'ձևափոխել [VALUE]-ը [FROMLOW]-[FROMHIGH]-ից [TOLOW]-[TOHIGH]',
        'arduino.highLow.high': 'ԲԱՐՁՐ',
        'arduino.highLow.low': 'ՑԱԾՐ'
    }
};
```

### 4. `packages/scratch-gui/src/reducers/locales.js`
- Import `editorMessages` (existing) and the new `arduinoMessages`.
- Build a merged `messagesByLocale` at module load: for each locale present in
  `arduinoMessages`, shallow-merge its entries on top of
  `editorMessages[locale]`. Use the merged object as `initialState.messagesByLocale`
  (and for `messages: merged.en`). Merge must not mutate the imported
  `editorMessages` object (build a new map).

```js
const mergeMessages = base => {
    const out = {...base};
    for (const locale of Object.keys(arduinoMessages)) {
        out[locale] = {...(base[locale] || {}), ...arduinoMessages[locale]};
    }
    return out;
};
const messagesByLocale = mergeMessages(editorMessages);
```

`mergeMessages` feeds `initialState.messagesByLocale` (and `messages: messagesByLocale.en`).
`SELECT_LOCALE` already just reads `state.messagesByLocale[locale]`, so it needs
no change. `setLocales`/`UPDATE_LOCALES` is exported but is **not dispatched
anywhere in this repo** (verified — only a downstream consumer could call it);
to stay robust if a consumer ever does, the `UPDATE_LOCALES` case will also run
its incoming `action.messagesByLocale` through `mergeMessages` so the custom
`arduino.*` strings are never dropped.

## Final Armenian copy (approved)

| id | English | Հայերեն |
|---|---|---|
| `gui.extension.arduino.name` | Arduino | Arduino |
| `gui.extension.arduino.description` | Control Arduino Uno in real-time via USB. | Կառավարի՛ր Arduino Uno-ն իրական ժամանակում՝ USB-ի միջոցով։ |
| `arduino.isConnected` | Arduino connected? | Arduino-ն միացվա՞ծ է |
| `arduino.digitalWrite` | set digital pin [PIN] to [VALUE] | սահմանել թվային ելուստ [PIN]-ը՝ [VALUE] |
| `arduino.digitalRead` | read digital pin [PIN] | կարդալ թվային ելուստ [PIN]-ից |
| `arduino.analogRead` | read analog pin [PIN] | կարդալ անալոգային ելուստ [PIN]-ից |
| `arduino.analogWrite` | set PWM pin [PIN] to [VALUE] | սահմանել PWM ելուստ [PIN]-ը՝ [VALUE] |
| `arduino.servoWrite` | set servo pin [PIN] to [ANGLE] degrees | սահմանել սերվո ելուստ [PIN]-ը՝ [ANGLE] աստիճան |
| `arduino.whenDigitalPin` | when digital pin [PIN] is [VALUE] | երբ թվային ելուստ [PIN]-ը [VALUE] է |
| `arduino.mapValue` | map [VALUE] from [FROMLOW]-[FROMHIGH] to [TOLOW]-[TOHIGH] | ձևափոխել [VALUE]-ը [FROMLOW]-[FROMHIGH]-ից [TOLOW]-[TOHIGH] |
| `arduino.highLow.high` | HIGH | ԲԱՐՁՐ |
| `arduino.highLow.low` | LOW | ՑԱԾՐ |

Terminology decisions: `pin` → **ելուստ**; `set … to` → **սահմանել**; `map` →
**ձևափոխել**; `Arduino` / `PWM` / pin numbers (2, 13, A0) kept as technical
tokens; `read … pin [PIN]` uses the ablative **[PIN]-ից**.

## Data flow (unchanged at runtime)

```
user picks language "Հայերեն" (hy)
  -> SELECT_LOCALE -> state.locales.messages = messagesByLocale.hy   (now includes arduino.*)
       -> blocks.jsx componentDidUpdate -> vm.setLocale('hy', messages)
            -> formatMessage.setup({locale:'hy', translations:{hy: messages}})
            -> extension getInfo() formatMessage('arduino.*') -> Armenian
       -> IntlProvider messages=hy -> <FormattedMessage 'gui.extension.arduino.*'> -> Armenian
```

## Error handling / fallbacks

- Missing id in `hy` → `formatMessage`/react-intl fall back to the English
  `default`/`defaultMessage`. So a typo in an id degrades to English, never a
  crash or blank.
- Non-`hy` locales are untouched: they have no `arduino.*` entries and therefore
  show English defaults, exactly as today.

## Testing / verification

- **Lint:** `npm --workspace @scratch/scratch-vm run lint` and the gui lint must
  pass (the repo uses `@stylistic/max-len`; long `formatMessage` lines may need
  the same `// eslint-disable-next-line @stylistic/max-len` treatment already
  used in this file, or be wrapped).
- **Manual:** `npm start`, open the extension library → confirm the Arduino card
  name/description; add the extension; switch editor language to Armenian and
  confirm every block + the HIGH/LOW dropdown render in Armenian; switch back to
  English and confirm English is intact.
- **Build:** `npm --workspace @scratch/scratch-gui run build` succeeds (no broken
  imports from the new module).

## Out of scope

- Translating to languages other than Armenian (the bundle is structured to
  accept more locales later, but only `hy` is authored now).
- Any change to the Arduino WebSocket bridge, block behavior, opcodes, or icons.
- Upstreaming the strings into `scratch-l10n` / Transifex.
