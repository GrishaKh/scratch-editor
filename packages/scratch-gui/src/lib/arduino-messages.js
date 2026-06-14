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
