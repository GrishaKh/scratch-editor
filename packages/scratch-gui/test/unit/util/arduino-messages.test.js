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
    expect(arduinoMessages.hy['arduino.mapValue']).toContain('[FROMHIGH]');
    expect(arduinoMessages.hy['arduino.mapValue']).toContain('[TOLOW]');
    expect(arduinoMessages.hy['arduino.mapValue']).toContain('[TOHIGH]');
});

test('approved Armenian copy for representative strings', () => {
    expect(arduinoMessages.hy['arduino.digitalRead']).toBe('կարդալ թվային ելուստ [PIN]-ից');
    expect(arduinoMessages.hy['arduino.analogRead']).toBe('կարդալ անալոգային ելուստ [PIN]-ից');
    expect(arduinoMessages.hy['arduino.highLow.high']).toBe('ԲԱՐՁՐ');
    expect(arduinoMessages.hy['arduino.highLow.low']).toBe('ՑԱԾՐ');
});
