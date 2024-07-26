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

var events = require("events"),
    net = require("net"),
    Message = require("./BattleCon/Message.js");

/**
* Constructs a new BattleCon instance.
* @exports BattleCon
* @param {string} host Hostname or IP
* @param {number} port Port
* @param {string} pass RCON password
* @constructor
* @extends events.EventEmitter
*/
class BattleCon extends events.EventEmitter {
    constructor(host, port, pass) {
        super();
        this.host = host;
        this.port = port;
        this.pass = pass;
        this.timeoutInterval = null;
        this.responseTimeout = null;
        this.loggedIn = false;
        this.sock = null;
        this.id = 0x3fffffff;
        this.buf = Buffer.alloc(0);
        this.cbs = {};
    }

    static Message = Message;

    use(gameModule, options) {
        if (typeof gameModule === 'function') {
            gameModule(this, options);
        } else if (typeof gameModule === 'string' && /^[a-zA-Z0-9_\-]+$/.test(gameModule)) {
            require("./games/" + gameModule + ".js")(this, options);
        }
        return this;
    }

    connect(callback) {
        if (this.sock !== null) return;
        this.sock = new net.Socket();

        this.sock.setTimeout(20000, () => {
            console.log("Timeout reached");
            this.sock.end();
            this.sock.destroy();
            this.sock = null;
            this.emit("close");
        });

        let cbCalled = false;

        this.sock.on("error", (err) => {
            console.log("Socket error:", err);
            if (!this.loggedIn && callback && !cbCalled) {
                cbCalled = true;
                callback(err);
            }
            this.emit("error", err);
        });

        this.sock.on("close", () => {
            console.log("Socket closed");
            this.emit("close");
            this.sock = null;
            clearInterval(this.timeoutInterval);
            clearTimeout(this.responseTimeout);
        });

        this.sock.connect(this.port, this.host, () => {
            console.log("Socket connected");
            this.emit("connect");
            this.sock.on("data", this._gather.bind(this));
            if (this.login) this.login(callback);

            clearInterval(this.timeoutInterval);
            this.timeoutInterval = setInterval(() => {
                this.exec('version', (err, msg) => {
                    if (err) {
                        console.log("Exec version error:", err);
                    } else if (!msg) {
                        console.log("No response to version command");
                        this._handleNoResponse();
                    }

                    if(msg) {
                        console.log('msg: ', msg);
                    }
                });

                clearTimeout(this.responseTimeout);
                this.responseTimeout = setTimeout(() => {
                    console.log("No response within the timeout period, reconnecting...");
                    this._handleNoResponse();
                }, 10000);
            }, 10000);
        });
    }

    disconnect() {
        if (this.sock !== null) {
            this.sock.end();
            this.sock.destroy();
        }
    }

    _gather(chunk) {
        clearTimeout(this.responseTimeout);
        this.buf = Buffer.concat([this.buf, chunk]);
        while (true) {
            if (this.buf.length < 8) return;
            const size = this.buf.readUInt32LE(4);
            if (this.buf.length < size) return;
            const data = this.buf.slice(0, size);
            this.buf = this.buf.slice(size);
            try {
                this._process(Message.decode(data));
            } catch (err) {
                console.log("Error processing message:", err);
                this.emit("error", err);
            }
        }
    }

    _process(msg) {
        if (msg.data.length === 0) {
            this.emit("error", "Empty message received");
            return;
        }
        if (msg.isFromServer()) {
            this.emit("event", msg);
        } else {
            this.emit("message", msg);
            const callback = this.cbs["cb" + msg.id];
            if (callback) {
                delete this.cbs["cb" + msg.id];
                if (msg.data[0] === "OK") {
                    callback(null, msg.data.slice(1));
                } else {
                    callback(new Error(msg.data.join(' ')));
                }
            }
        }
    }

    exec(command, callback) {
        const msg = new Message(this.id, 0, command);
        if (typeof callback === 'function') {
            this.cbs["cb" + this.id] = callback;
        }
        try {
            this.emit("exec", msg); // May throw to abort
        } catch (aborted) {
            return;
        }
        this.sock.write(msg.encode());
        this.id = (this.id + 1) & 0x3fffffff;
    }

    _handleNoResponse() {
        console.log("Handling no response, closing and reconnecting...");
        this.disconnect();
        setTimeout(() => {
            this.connect();
        }, 1000); // Wait 1 second before reconnecting
    }

    static tabulate(res, offset = 0) {
        const nColumns = parseInt(res[offset], 10);
        const columns = [];
        let i = offset + 1; // Declare i here

        for (; i <= nColumns; i++) {
            columns.push(res[i]);
        }

        const nRows = parseInt(res[i], 10);
        const rows = [];
        i++; // Move to the next element after column names

        for (let n = 0; n < nRows; n++) {
            const row = {};
            for (let j = 0; j < columns.length; j++) {
                row[columns[j]] = res[i++];
            }
            rows.push(row);
        }

        rows.columns = columns;
        return rows;
    }

    tabulate(res, offset) {
        return BattleCon.tabulate(res, offset);
    }
}

module.exports = BattleCon;