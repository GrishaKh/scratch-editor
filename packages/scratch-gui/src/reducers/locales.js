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

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SELECT_LOCALE:
        return Object.assign({}, state, {
            isRtl: isRtl(action.locale),
            locale: action.locale,
            messagesByLocale: state.messagesByLocale,
            messages: state.messagesByLocale[action.locale]
        });
    case UPDATE_LOCALES: {
        const mergedByLocale = mergeCustomMessages(action.messagesByLocale);
        return Object.assign({}, state, {
            isRtl: state.isRtl,
            locale: state.locale,
            messagesByLocale: mergedByLocale,
            messages: mergedByLocale[state.locale]
        });
    }
    default:
        return state;
    }
};

const selectLocale = function (locale) {
    return {
        type: SELECT_LOCALE,
        locale: locale
    };
};

const setLocales = function (localesMessages) {
    return {
        type: UPDATE_LOCALES,
        messagesByLocale: localesMessages
    };
};
const initLocale = function (currentState, locale) {
    if (Object.prototype.hasOwnProperty.call(currentState.messagesByLocale, locale)) {
        return Object.assign(
            {},
            currentState,
            {
                isRtl: isRtl(locale),
                locale: locale,
                messagesByLocale: currentState.messagesByLocale,
                messages: currentState.messagesByLocale[locale]
            }
        );
    }
    // don't change locale if it's not in the current messages
    return currentState;
};
export {
    reducer as default,
    initialState as localesInitialState,
    initLocale,
    selectLocale,
    setLocales
};
