const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

const WS_URL = 'ws://localhost:9000';
const RECONNECT_INTERVAL = 3000;
const REQUEST_TIMEOUT = 2000;

// eslint-disable-next-line @stylistic/max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3QgeD0iMiIgeT0iOCIgd2lkdGg9IjM2IiBoZWlnaHQ9IjI0IiByeD0iMyIgZmlsbD0iIzAwOTc5RCIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjYiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjkiLz48dGV4dCB4PSIyMCIgeT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZpbGw9IiMwMDk3OUQiPkE8L3RleHQ+PC9zdmc+';

class ArduinoConnection {
    constructor () {
        this._ws = null;
        this._connected = false;
        this._arduinoConnected = false;
        this._requestId = 0;
        this._pendingRequests = new Map();
        this._reportValues = {};
        this._reconnectTimer = null;

        this._connect();
    }

    get isConnected () {
        return this._connected && this._arduinoConnected;
    }

    _connect () {
        if (this._ws) {
            try {
                this._ws.close();
            } catch (_) {
                // ignore
            }
        }

        try {
            this._ws = new WebSocket(WS_URL);
        } catch (e) {
            this._scheduleReconnect();
            return;
        }

        this._ws.onopen = () => {
            this._connected = true;
        };

        this._ws.onmessage = event => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            this._handleMessage(msg);
        };

        this._ws.onclose = () => {
            this._connected = false;
            this._arduinoConnected = false;
            this._rejectAllPending('Disconnected');
            this._scheduleReconnect();
        };

        this._ws.onerror = () => {
            // onclose will fire after this
        };
    }

    _scheduleReconnect () {
        if (this._reconnectTimer) return;
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this._connect();
        }, RECONNECT_INTERVAL);
    }

    _handleMessage (msg) {
        if (msg.type === 'status') {
            this._arduinoConnected = msg.connected;
            return;
        }

        if (msg.type === 'report') {
            const key = `${msg.pinType}:${msg.pin}`;
            this._reportValues[key] = msg.value;
            return;
        }

        if (msg.id != null && this._pendingRequests.has(msg.id)) {
            const {resolve, reject} = this._pendingRequests.get(msg.id);
            this._pendingRequests.delete(msg.id);
            if (msg.type === 'error') {
                reject(new Error(msg.error));
            } else {
                resolve(msg);
            }
        }
    }

    _rejectAllPending (reason) {
        for (const [, {reject}] of this._pendingRequests) {
            reject(new Error(reason));
        }
        this._pendingRequests.clear();
    }

    send (msg) {
        return new Promise((resolve, reject) => {
            if (!this._connected) {
                reject(new Error('Not connected to bridge server'));
                return;
            }

            const id = ++this._requestId;
            this._pendingRequests.set(id, {resolve, reject});

            setTimeout(() => {
                if (this._pendingRequests.has(id)) {
                    this._pendingRequests.delete(id);
                    reject(new Error('Request timed out'));
                }
            }, REQUEST_TIMEOUT);

            this._ws.send(JSON.stringify(Object.assign({}, msg, {id})));
        });
    }

    sendNoWait (msg) {
        if (!this._connected) return;
        this._ws.send(JSON.stringify(Object.assign({}, msg, {id: ++this._requestId})));
    }

    getReportedValue (pinType, pin) {
        const key = `${pinType}:${pin}`;
        return this._reportValues[key] || 0;
    }

    subscribe (pin, pinType) {
        this.sendNoWait({type: 'subscribe', pin, pinType});
    }
}

const connection = new ArduinoConnection();

class Scratch3ArduinoBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._subscribedPins = new Set();
    }

    getInfo () {
        return {
            id: 'arduinoControl',
            name: 'Arduino',
            blockIconURI: blockIconURI,
            color1: '#00979D',
            color2: '#007A80',
            color3: '#005C5F',

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

            menus: {
                digitalPins: {
                    acceptReporters: true,
                    items: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
                },
                analogPins: {
                    acceptReporters: true,
                    items: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5']
                },
                pwmPins: {
                    acceptReporters: true,
                    items: ['3', '5', '6', '9', '10', '11']
                },
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
            }
        };
    }

    isConnected () {
        return connection.isConnected;
    }

    digitalWrite (args) {
        const pin = parseInt(args.PIN, 10);
        const value = parseInt(args.VALUE, 10);
        return connection.send({
            type: 'digitalWrite',
            pin,
            value: value !== 0
        }).catch(() => {});
    }

    digitalRead (args) {
        const pin = parseInt(args.PIN, 10);
        const subKey = `digital:${pin}`;

        if (!this._subscribedPins.has(subKey)) {
            this._subscribedPins.add(subKey);
            connection.subscribe(pin, 'digital');
        }

        return connection.getReportedValue('digital', pin);
    }

    analogRead (args) {
        const pin = args.PIN;
        const subKey = `analog:${pin}`;

        if (!this._subscribedPins.has(subKey)) {
            this._subscribedPins.add(subKey);
            connection.subscribe(pin, 'analog');
        }

        return connection.getReportedValue('analog', pin);
    }

    analogWrite (args) {
        const pin = parseInt(args.PIN, 10);
        const value = parseInt(args.VALUE, 10);
        return connection.send({
            type: 'analogWrite',
            pin,
            value
        }).catch(() => {});
    }

    servoWrite (args) {
        const pin = parseInt(args.PIN, 10);
        const angle = parseInt(args.ANGLE, 10);
        return connection.send({
            type: 'servoWrite',
            pin,
            angle
        }).catch(() => {});
    }

    whenDigitalPin (args) {
        const pin = parseInt(args.PIN, 10);
        const target = parseInt(args.VALUE, 10);
        const subKey = `digital:${pin}`;

        if (!this._subscribedPins.has(subKey)) {
            this._subscribedPins.add(subKey);
            connection.subscribe(pin, 'digital');
        }

        const current = connection.getReportedValue('digital', pin);
        return current === target;
    }

    mapValue (args) {
        const value = parseFloat(args.VALUE);
        const fromLow = parseFloat(args.FROMLOW);
        const fromHigh = parseFloat(args.FROMHIGH);
        const toLow = parseFloat(args.TOLOW);
        const toHigh = parseFloat(args.TOHIGH);

        if (fromHigh === fromLow) return toLow;
        return ((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow) + toLow;
    }
}

module.exports = Scratch3ArduinoBlocks;
