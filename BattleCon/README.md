![BattleCon - BATTLEFIELD layer on node.js](https://raw.github.com/dcodeIO/BattleCon/master/BattleCon.png)
========================================
BattleCon is a Battlefield / Frostbite engine RCON layer built on top of nothing less than the excellent node.js
platform.

With BattleCon it's easy to create your very own server management interface, like automatic map votings, auto team
balancing, live player stats and more.

Running
-----
Set the configuration files properly.

Environment variable overrides for RCON connection.
RCON_HOST=127.0.0.1
RCON_PORT=47200
RCON_PASS=test
BATTLECON_PORT=3001

Usage
-----

#### Executing commands:

```js
var BattleCon = require("battlecon"),
    bc = new BattleCon("host", port, "pass").use("core");
    
bc.on("login", function() {
    bc.exec("version", function(err, res) {
        if (err) {
            console.log("Error: "+err);
            return;
        }
        console.log("version:", res);
    });
});

bc.connect(); // Connects and logs in
```

#### Processing (raw) server events:

```js
...
bc.on("event", function(evt) {
    console.log("Event:", evt);
});
```

Core
----
The core module implements common commands used between Frostbite-driven games, like logging in and out, version and
server info querying.

Modules
-------
Additionally, BattleCon supports game-specific modules, like the BF3 and BF4 modules. Loading modules is simple:

```js
...
var bc = new BattleCon("host", port, "pass").use("BF4");

...your logic...

bc.connect();
```

Currently, [the game modules](https://github.com/dcodeIO/BattleCon/tree/master/src/games) are quite basic and provide
basic functionality only. Feel free to extend them and send me a pull request!

Examples
--------
There is a simple example of how to use BattleCon, like reacting to server events and issuing commands:

* [example.js](https://github.com/dcodeIO/BattleCon/blob/master/example.js)

License
-------
Apache License, Version 2.0
