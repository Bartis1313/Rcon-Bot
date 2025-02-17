/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
* Constructs a new BattleCon instance.
* @exports BattleCon
* @param {string} host Hostname or IP
* @param {number} port Port
* @param {string} pass RCON password
* @constructor
* @extends events.EventEmitter
*/

const EventEmitter = require('events');
const net = require('net');
const Message = require('./BattleCon/Message.js');

class BattleCon extends EventEmitter {
    /**
     * Constructs a new BattleCon instance.
     * @param {string} host Hostname or IP
     * @param {number} port Port
     * @param {string} pass RCON password
     */
    constructor(host, port, pass) {
        super();

        // connection parameters
        this.host = host;
        this.port = port;
        this.pass = pass;

        // reconnection
        this.reconnectInterval = 5_000;

        this.initConnection();
    }

    initConnection() {
        // connection state
        this.loggedIn = false;
        this.sock = null;
        this.id = 0x3fffffff;
        this.buf = null;
        this.buf = Buffer.alloc(0);
        this.cbs = {};
    }

    /**
     * Loads a game module.
     * @param {string|function(BattleCon)} gameModule Plugin to use
     * @param {*=} options Module options
     * @returns {BattleCon} this
     * @throws {Error} If the module could not be loaded
     */
    use(gameModule, options) {
        if (typeof gameModule === 'function') {
            gameModule(this, options);
        } else if (typeof gameModule === 'string' && /^[a-zA-Z0-9_\-]+$/.test(gameModule)) {
            require(`./games/${gameModule}.js`)(this, options);
        }
        return this;
    }

    /**
     * Connects and logs in to the server.
     * @param {function(Error)=} callback Callback
     */
    connect(callback) {
        if (this.sock !== null) return;

        this.sock = new net.Socket();
        let cbCalled = false;

        this.sock.on('error', (err) => {
            if (!this.loggedIn && callback && !cbCalled) {
                cbCalled = true;
                callback(err);
            }
            this.emit('error', err);
        });

        this.sock.on('close', () => {
            this.emit('close');

            clearInterval(this.timeoutInterval);

            setTimeout(() => {
                this.connect(callback);
            }, this.reconnectInterval);
        });

        this.sock.on('timeout', () => {
            console.error('socket timeout reached');
            this.disconnect();
        })

        this.sock.connect(this.port, this.host, () => {
            this.emit('connect');
            this.sock.on('data', this._gather.bind(this));
            if (this.login) this.login(callback);

            // for socker to not freeze
            this.timeoutInterval = setInterval(() => {
                this.exec('version', function (err, msg) {
                    if (err) {
                        const d = new Date();
                        console.log(`Error at ${d.toLocaleString()}`, err);
                    }
                });
            }, 10_000);
        });
    }

    /**
     * Disconnects from the server.
     */
    disconnect() {
        this.sock.end();
        this.sock.destroy();

        this.initConnection();
    }

    /**
     * Gathers more data.
     * @param {Buffer} chunk Chunk of data
     * @private
     */
    _gather(chunk) {
        this.buf = Buffer.concat([this.buf, chunk]);
        while (true) {
            if (this.buf.length < 8)
                return;
            const size = this.buf.readUInt32LE(4);
            if (this.buf.length < size)
                return;

            const data = this.buf.subarray(0, size);
            this.buf = this.buf.subarray(size);
            try {
                this._process(Message.decode(data));
            } catch (err) {
                this.emit('error', err);
            }
        }
    }

    /**
     * Processes the next message.
     * @param {Message} msg Message
     * @private
     */
    _process(msg) {
        if (msg.data.length === 0) {
            this.emit('error', new Error('Empty message received'));
            return;
        }
        if (msg.isFromServer()) {
            this.emit('event', msg);
        } else {
            this.emit('message', msg);
            if (this.cbs[`cb${msg.id}`]) {
                const callback = this.cbs[`cb${msg.id}`];
                delete this.cbs[`cb${msg.id}`];
                if (msg.data[0] === 'OK') {
                    callback(null, msg.data.slice(1));
                } else {
                    callback(new Error(msg.data.join(' ')));
                }
            }
        }
    }

    /**
     * Executes a command.
     * @param {string|Array<string>} command Command
     * @param {function(Error, Message=)=} callback Callback
     */
    exec(command, callback) {
        const msg = new Message(this.id, 0, command);
        if (typeof callback === 'function') {
            this.cbs[`cb${this.id}`] = callback;
        }
        try {
            this.emit('exec', msg); // May throw to abort
        } catch (aborted) {
            return;
        }
        this.sock.write(msg.encode());
        this.id = (this.id + 1) & 0x3fffffff;
    }

    /**
     * Tabulates a result containing columns and rows.
     * @param {Array<string>} res Result to tabulate
     * @param {number=} offset Offset to start at, defaults to 0
     * @returns {Array<Object<string, string>>}
     */
    static tabulate(res, offset = 0) {
        const nColumns = parseInt(res[offset], 10);
        const columns = [];
        for (let i = offset + 1; i <= offset + nColumns; i++) {
            columns.push(res[i]);
        }
        const nRows = parseInt(res[offset + nColumns + 1], 10);
        const rows = [];
        for (let n = 0, i = offset + nColumns + 2; n < nRows; n++) {
            const row = {};
            for (let j = 0; j < columns.length; j++) {
                row[columns[j]] = res[i++];
            }
            rows.push(row);
        }
        rows.columns = columns;
        return rows;
    }

    /**
     * Tabulates a result containing columns and rows.
     * @function
     * @param {Array<string>} res
     * @returns {Array<Object<string, string>>}
     */
    tabulate(res) {
        return BattleCon.tabulate(res);
    }
}

module.exports = BattleCon;