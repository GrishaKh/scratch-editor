/* eslint-env jest */
import localesReducer, {localesInitialState} from '../../../src/reducers/locales';
import editorMessages from 'scratch-l10n/locales/editor-msgs';

const UPDATE_LOCALES = 'scratch-gui/locales/UPDATE_LOCALES';

test('initial state merges Arduino hy strings into messagesByLocale', () => {
    expect(localesInitialState.messagesByLocale.hy['arduino.digitalWrite'])
        .toBe('սահմանել թվային ելուստ [PIN]-ը՝ [VALUE]');
    expect(localesInitialState.messagesByLocale.hy['gui.extension.arduino.description'])
        .toBe('Կառավարի՛ր Arduino Uno-ն իրական ժամանակում՝ USB-ի միջոցով։');
});

test('merge does not mutate the imported scratch-l10n source messages', () => {
    // mergeCustomMessages must build new objects, never add arduino.* (or a new
    // hy locale) onto scratch-l10n's own export.
    expect(editorMessages.hy).toBeUndefined();
    expect(editorMessages.en['arduino.digitalWrite']).toBeUndefined();
    // sanity: the merged state still received the hy arduino strings
    expect(localesInitialState.messagesByLocale.hy['arduino.highLow.high']).toBe('ԲԱՐՁՐ');
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
    // the derived `messages` shortcut tracks the merged map for the active locale
    expect(next.messages['arduino.highLow.low']).toBeUndefined(); // active locale is 'en'
});
