# Arduino Extension Armenian (`hy`) Translation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the built-in `arduinoControl` extension (blocks, menus, and library card) render in Armenian when the editor language is `hy`, with English preserved as the fallback for every other locale.

**Architecture:** Wrap the VM extension's block/menu text in `formatMessage({id, default, description})` (same pattern as micro:bit/EV3). Add one in-repo Armenian message bundle and merge it into the GUI `locales` reducer's `messagesByLocale`. That single merge feeds both surfaces, because the blocks read it via `vm.setLocale(locale, messages)` and the library card reads it via react-intl. English text comes entirely from the `default`/`defaultMessage` fallbacks, so only `hy` strings are authored.

**Tech Stack:** scratch-vm (`format-message`, tap), scratch-gui (React, react-intl, Redux, Jest).

**Spec:** `docs/superpowers/specs/2026-06-13-arduino-armenian-translation-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `packages/scratch-gui/src/lib/arduino-messages.js` | The Armenian (`hy`) string bundle for all `arduino.*` and `gui.extension.arduino.*` ids | Create |
| `packages/scratch-gui/test/unit/util/arduino-messages.test.js` | Guards the bundle shape, the approved copy, and the `[ARG]` placeholders | Create |
| `packages/scratch-gui/src/reducers/locales.js` | Merge the bundle into `messagesByLocale` (initial state + `UPDATE_LOCALES`) | Modify |
| `packages/scratch-gui/test/unit/reducers/locales-reducer.test.js` | Guards the merge (hy gets arduino strings, en untouched, core strings preserved) | Create |
| `packages/scratch-vm/src/extensions/scratch3_arduino/index.js` | Block/menu text via `formatMessage` | Modify |
| `packages/scratch-gui/src/lib/libraries/extensions/index.jsx` | Arduino card `name` → `<FormattedMessage>` | Modify |

**Testing note:** Automated tests live on the GUI (Jest) side — the pure bundle + reducer logic. The VM extension is verified by lint (which runs `format-message lint`) plus manual run, following this repo's own convention: `packages/scratch-vm/test/unit/extension_microbit.js` deliberately does **not** `require()` the extension module, because importing it triggers side effects (the Arduino module opens a `WebSocket` connection singleton and a reconnect timer at load time).

---

## Task 1: Create the Armenian message bundle

**Files:**
- Create: `packages/scratch-gui/src/lib/arduino-messages.js`
- Test: `packages/scratch-gui/test/unit/util/arduino-messages.test.js`

- [ ] **Step 1: Write the failing test**

Create `packages/scratch-gui/test/unit/util/arduino-messages.test.js`:

```js
/* eslint-env jest */
import arduinoMessages from '../../../src/lib/arduino-messages';

test('exports an hy (Armenian) locale bundle', () => {
    expect(arduinoMessages).toHaveProperty('hy');
    expect(typeof arduinoMessages.hy).toBe('object');
});

test('hy bundle has non-empty Armenian text for every Arduino id', () => {
    const expectedIds = [
        'gui.extension.arduino.name',
        'gui.extension.arduino.description',
        'arduino.isConnected',
        'arduino.digitalWrite',
        'arduino.digitalRead',
        'arduino.analogRead',
        'arduino.analogWrite',
        'arduino.servoWrite',
        'arduino.whenDigitalPin',
        'arduino.mapValue',
        'arduino.highLow.high',
        'arduino.highLow.low'
    ];
    for (const id of expectedIds) {
        expect(typeof arduinoMessages.hy[id]).toBe('string');
        expect(arduinoMessages.hy[id].length).toBeGreaterThan(0);
    }
});

test('hy block strings preserve the [ARG] placeholders the parser needs', () => {
    expect(arduinoMessages.hy['arduino.digitalWrite']).toContain('[PIN]');
    expect(arduinoMessages.hy['arduino.digitalWrite']).toContain('[VALUE]');
    expect(arduinoMessages.hy['arduino.servoWrite']).toContain('[ANGLE]');
    expect(arduinoMessages.hy['arduino.mapValue']).toContain('[FROMLOW]');
    expect(arduinoMessages.hy['arduino.mapValue']).toContain('[TOHIGH]');
});

test('approved Armenian copy for representative strings', () => {
    expect(arduinoMessages.hy['arduino.digitalRead']).toBe('կարդալ թվային ելուստ [PIN]-ից');
    expect(arduinoMessages.hy['arduino.analogRead']).toBe('կարդալ անալոգային ելուստ [PIN]-ից');
    expect(arduinoMessages.hy['arduino.highLow.high']).toBe('ԲԱՐՁՐ');
    expect(arduinoMessages.hy['arduino.highLow.low']).toBe('ՑԱԾՐ');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @scratch/scratch-gui exec -- jest test/unit/util/arduino-messages.test.js`
Expected: FAIL — `Cannot find module '../../../src/lib/arduino-messages'`.

- [ ] **Step 3: Create the bundle**

Create `packages/scratch-gui/src/lib/arduino-messages.js`:

```js
/**
 * In-repo translations for the built-in Arduino (`arduinoControl`) extension.
 * Merged into the editor messages by `src/reducers/locales.js`. English is
 * provided by each block's `default` / `defaultMessage`, so only non-English
 * locales need entries here. `[PIN]`, `[VALUE]`, `[ANGLE]`, `[FROMLOW]`, etc.
 * are block-argument placeholders and MUST be preserved verbatim in every
 * translation — they are replaced by inputs/menus at render time.
 */
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --workspace @scratch/scratch-gui exec -- jest test/unit/util/arduino-messages.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/scratch-gui/src/lib/arduino-messages.js \
        packages/scratch-gui/test/unit/util/arduino-messages.test.js
git commit -m "feat(l10n): add Armenian message bundle for Arduino extension"
```

---

## Task 2: Merge the bundle into the locales reducer

**Files:**
- Modify: `packages/scratch-gui/src/reducers/locales.js`
- Test: `packages/scratch-gui/test/unit/reducers/locales-reducer.test.js`

- [ ] **Step 1: Write the failing test**

Create `packages/scratch-gui/test/unit/reducers/locales-reducer.test.js`:

```js
/* eslint-env jest */
import localesReducer, {localesInitialState} from '../../../src/reducers/locales';

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES';

test('initial state merges Arduino hy strings into messagesByLocale', () => {
    expect(localesInitialState.messagesByLocale.hy['arduino.digitalWrite'])
        .toBe('սահմանել թվային ելուստ [PIN]-ը՝ [VALUE]');
    expect(localesInitialState.messagesByLocale.hy['gui.extension.arduino.description'])
        .toBe('Կառավարի՛ր Arduino Uno-ն իրական ժամանակում՝ USB-ի միջոցով։');
});

test('merge keeps existing scratch-l10n hy strings (does not clobber)', () => {
    // scratch-l10n ships hundreds of hy strings; merge must not drop them
    expect(Object.keys(localesInitialState.messagesByLocale.hy).length)
        .toBeGreaterThan(20);
});

test('en locale gets no arduino.* override (falls back to English defaults)', () => {
    expect(localesInitialState.messagesByLocale.en['arduino.digitalWrite'])
        .toBeUndefined();
});

test('UPDATE_LOCALES re-merges custom strings onto incoming messages', () => {
    const action = {
        type: UPDATE_LOCALES,
        messagesByLocale: {hy: {'some.core.id': 'թարմ'}, en: {}}
    };
    const next = localesReducer(localesInitialState, action);
    expect(next.messagesByLocale.hy['some.core.id']).toBe('թարմ');
    expect(next.messagesByLocale.hy['arduino.highLow.low']).toBe('ՑԱԾՐ');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --workspace @scratch/scratch-gui exec -- jest test/unit/reducers/locales-reducer.test.js`
Expected: FAIL — `messagesByLocale.hy['arduino.digitalWrite']` is `undefined` (no merge yet).

- [ ] **Step 3: Modify the reducer**

Replace the top of `packages/scratch-gui/src/reducers/locales.js` (the imports through `initialState`) with:

```js
import {isRtl} from 'scratch-l10n';
import editorMessages from 'scratch-l10n/locales/editor-msgs';
import customMessages from '../lib/arduino-messages';

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES';
const SELECT_LOCALE = 'scratch-gui/locales/SELECT_LOCALE';

// Merge in-repo custom extension strings (e.g. Arduino) on top of the
// scratch-l10n editor messages, per locale, without mutating the source.
const mergeCustomMessages = base => {
    const merged = Object.assign({}, base);
    for (const locale of Object.keys(customMessages)) {
        merged[locale] = Object.assign({}, base[locale] || {}, customMessages[locale]);
    }
    return merged;
};

const mergedEditorMessages = mergeCustomMessages(editorMessages);

const initialState = {
    isRtl: false,
    locale: 'en',
    messagesByLocale: mergedEditorMessages,
    messages: mergedEditorMessages.en
};
```

Then replace the `UPDATE_LOCALES` case in the reducer with one that re-applies the merge:

```js
    case UPDATE_LOCALES: {
        const mergedByLocale = mergeCustomMessages(action.messagesByLocale);
        return Object.assign({}, state, {
            isRtl: state.isRtl,
            locale: state.locale,
            messagesByLocale: mergedByLocale,
            messages: mergedByLocale[state.locale]
        });
    }
```

Leave `SELECT_LOCALE`, `selectLocale`, `setLocales`, `initLocale`, and the exports unchanged — they already read from whatever `messagesByLocale` they are given, which is now the merged map.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --workspace @scratch/scratch-gui exec -- jest test/unit/reducers/locales-reducer.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/scratch-gui/src/reducers/locales.js \
        packages/scratch-gui/test/unit/reducers/locales-reducer.test.js
git commit -m "feat(l10n): merge custom Arduino strings into editor messages"
```

---

## Task 3: Convert the VM extension block text to `formatMessage`

**Files:**
- Modify: `packages/scratch-vm/src/extensions/scratch3_arduino/index.js`

No new automated test (see Testing note above); verified by `format-message lint` + ESLint in Step 3 and manual run in Task 5.

- [ ] **Step 1: Add the `format-message` import**

In `packages/scratch-vm/src/extensions/scratch3_arduino/index.js`, add the require after the existing `BlockType` require (line 2):

```js
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
```

- [ ] **Step 2: Replace the `blocks` array with `formatMessage` text**

Replace the entire `blocks: [ ... ],` array inside `getInfo()` with:

```js
            blocks: [
                {
                    opcode: 'isConnected',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'arduino.isConnected',
                        default: 'Arduino connected?',
                        description: 'reports whether the Arduino board is connected'
                    })
                },

                '---',

                {
                    opcode: 'digitalWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduino.digitalWrite',
                        default: 'set digital pin [PIN] to [VALUE]',
                        description: 'set a digital output pin HIGH or LOW'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 13,
                            menu: 'digitalPins'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                            menu: 'highLow'
                        }
                    }
                },

                {
                    opcode: 'digitalRead',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduino.digitalRead',
                        default: 'read digital pin [PIN]',
                        description: 'read the value of a digital input pin'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2,
                            menu: 'digitalPins'
                        }
                    }
                },

                '---',

                {
                    opcode: 'analogRead',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduino.analogRead',
                        default: 'read analog pin [PIN]',
                        description: 'read the value of an analog input pin'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.STRING,
                            defaultValue: 'A0',
                            menu: 'analogPins'
                        }
                    }
                },

                {
                    opcode: 'analogWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduino.analogWrite',
                        default: 'set PWM pin [PIN] to [VALUE]',
                        description: 'set a PWM output pin to a value from 0 to 255'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 9,
                            menu: 'pwmPins'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 128
                        }
                    }
                },

                '---',

                {
                    opcode: 'servoWrite',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'arduino.servoWrite',
                        default: 'set servo pin [PIN] to [ANGLE] degrees',
                        description: 'move a servo connected to a pin to an angle'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 9,
                            menu: 'pwmPins'
                        },
                        ANGLE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 90
                        }
                    }
                },

                '---',

                {
                    opcode: 'whenDigitalPin',
                    blockType: BlockType.HAT,
                    text: formatMessage({
                        id: 'arduino.whenDigitalPin',
                        default: 'when digital pin [PIN] is [VALUE]',
                        description: 'hat block triggered when a digital pin reaches a value'
                    }),
                    arguments: {
                        PIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2,
                            menu: 'digitalPins'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                            menu: 'highLow'
                        }
                    }
                },

                '---',

                {
                    opcode: 'mapValue',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'arduino.mapValue',
                        default: 'map [VALUE] from [FROMLOW]-[FROMHIGH] to [TOLOW]-[TOHIGH]',
                        description: 're-scale a number from one range to another'
                    }),
                    arguments: {
                        VALUE: {type: ArgumentType.NUMBER, defaultValue: 512},
                        FROMLOW: {type: ArgumentType.NUMBER, defaultValue: 0},
                        FROMHIGH: {type: ArgumentType.NUMBER, defaultValue: 1023},
                        TOLOW: {type: ArgumentType.NUMBER, defaultValue: 0},
                        TOHIGH: {type: ArgumentType.NUMBER, defaultValue: 255}
                    }
                }
            ],
```

- [ ] **Step 3: Replace the `highLow` menu with `formatMessage` labels**

In the same `menus:` object, replace the `highLow` menu with:

```js
                highLow: {
                    acceptReporters: true,
                    items: [
                        {
                            text: formatMessage({
                                id: 'arduino.highLow.high',
                                default: 'HIGH',
                                description: 'menu label for digital HIGH (1) level'
                            }),
                            value: '1'
                        },
                        {
                            text: formatMessage({
                                id: 'arduino.highLow.low',
                                default: 'LOW',
                                description: 'menu label for digital LOW (0) level'
                            }),
                            value: '0'
                        }
                    ]
                }
```

Leave `digitalPins`, `analogPins`, and `pwmPins` menus unchanged (pin numbers are not translated).

- [ ] **Step 4: Lint the VM (includes `format-message lint`)**

Run: `npm --workspace @scratch/scratch-vm run lint`
Expected: PASS, no errors. (ESLint validates style; `format-message lint` validates the `formatMessage` calls and ids.) If ESLint reports `max-len` on any `default:` line, wrap that string across two lines using string concatenation, matching the existing style in this file.

- [ ] **Step 5: Commit**

```bash
git add packages/scratch-vm/src/extensions/scratch3_arduino/index.js
git commit -m "feat(arduino): localize block and menu text via formatMessage"
```

---

## Task 4: Make the GUI library card name translatable

**Files:**
- Modify: `packages/scratch-gui/src/lib/libraries/extensions/index.jsx` (the Arduino entry, currently `name: 'Arduino'` near line 420)

- [ ] **Step 1: Replace the plain `name` string with a `<FormattedMessage>`**

`FormattedMessage` is already imported in this file (the description below it uses it). Change the Arduino entry's `name` field from:

```jsx
        name: 'Arduino',
        extensionId: 'arduinoControl',
```

to:

```jsx
        name: (
            <FormattedMessage
                defaultMessage="Arduino"
                description="Name for the 'Arduino' extension"
                id="gui.extension.arduino.name"
            />
        ),
        extensionId: 'arduinoControl',
```

Leave the rest of the Arduino entry (icons, description, flags) unchanged.

- [ ] **Step 2: Lint the GUI**

Run: `npm --workspace @scratch/scratch-gui run test:lint`
Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/scratch-gui/src/lib/libraries/extensions/index.jsx
git commit -m "feat(arduino): make extension library card name translatable"
```

---

## Task 5: Full verification (checkpoint)

**Files:** none (verification only)

- [ ] **Step 1: Run the full GUI unit suite for the new/changed files**

Run:
```bash
npm --workspace @scratch/scratch-gui exec -- jest test/unit/util/arduino-messages.test.js test/unit/reducers/locales-reducer.test.js
```
Expected: PASS (8 tests total).

- [ ] **Step 2: Lint both packages**

Run:
```bash
npm --workspace @scratch/scratch-vm run lint
npm --workspace @scratch/scratch-gui run test:lint
```
Expected: both PASS.

- [ ] **Step 3: Build the GUI (catches broken imports)**

Run: `npm --workspace @scratch/scratch-gui run build`
Expected: build succeeds with no module-resolution errors for `../lib/arduino-messages`.

- [ ] **Step 4: Manual smoke test**

Run: `npm start` (serves the GUI). Then:
1. Open the extension library — confirm the **Arduino** card shows its name and description.
2. Add the Arduino extension; confirm blocks appear in English.
3. Switch the editor language to **Հայերեն (Armenian)** via the language menu.
4. Confirm every Arduino block renders in Armenian (e.g. «կարդալ թվային ելուստ [PIN]-ից», «սահմանել թվային ելուստ …»), and the HIGH/LOW dropdown shows **ԲԱՐՁՐ / ՑԱԾՐ**.
5. Confirm the `[PIN]`/`[VALUE]`/`[ANGLE]` inputs still work (numbers/menus fill in normally).
6. Switch back to English — confirm everything reverts to English.

Expected: Armenian shows under `hy`, English everywhere else, no console errors, blocks still function.

- [ ] **Step 5: Final commit (only if Step 4 surfaced fixes)**

If manual testing required code changes, commit them:
```bash
git add -A
git commit -m "fix(arduino): address manual-test findings for Armenian l10n"
```
Otherwise, no commit needed.

---

## Self-Review

**Spec coverage:**
- Block text via `formatMessage` → Task 3. ✓
- HIGH/LOW menu localized → Task 3 Step 3. ✓
- Library card name + description → description already a `FormattedMessage` (spec §2); name → Task 4. ✓
- New `arduino-messages.js` bundle (`hy` only) → Task 1. ✓
- Reducer merge, initial state + `UPDATE_LOCALES` → Task 2. ✓
- Final approved Armenian copy (ելուստ / սահմանել / ձևափոխել / [PIN]-ից / ԲԱՐՁՐ-ՑԱԾՐ) → Task 1 bundle + Task 1/2 assertions. ✓
- Fallback behavior (English via defaults) → Task 2 "en has no override" test; no `en` entries authored. ✓
- Testing/verification (lint incl. format-message lint, build, manual) → Task 5. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full code. ✓

**Type/name consistency:** Bundle keys, reducer assertions, VM `formatMessage` ids, and the GUI `gui.extension.arduino.name` id all use the identical 12 id strings across Tasks 1–4. `mergeCustomMessages`/`customMessages`/`mergedEditorMessages` names are consistent within Task 2. The 4 Armenian strings asserted in tests (Task 1/2) exactly match the bundle authored in Task 1. ✓
