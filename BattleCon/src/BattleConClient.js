import BattleCon from "../src/BattleCon";
import { webHookKickSenderBF4, webHookKickSenderBF3, webHookPB } from './webHook.js'
import {
  ticketsScript, ticketsChat, factionScript, tickrateScript
} from './scripts.js'

class BattleConClient {
  constructor(host, port, password) {
    this._connection = new BattleCon(host, port, password).use(process.env.GAME);
    this.playerMap = new Map();
    this.initialize();
    this.inEndRound = false;
  }

  initialize() {
    let reconnectInterval = null;
    const connection = this._connection
    let version = '';

    connection.on("connect", () => {
      console.log("# Connected to " + connection.host + ":" + connection.port);
      if (reconnectInterval !== null) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    });

    connection.on("login", () => {
      console.log("# Login successful");
    });

    connection.on("ready", () => {
      // Execute raw commands:
      connection.exec("version", (err, msg) => {
        console.log("# Server is running " + msg[0] + ", version " + msg[1]);
        version = msg[1];
      });

      // Execute module commands (core.js):
      connection.serverInfo((err, info) => {

      });

      connection.on("event", (msg) => {
        //console.log("event", msg);
      });

      connection.listPlayers((err, players) => {
        console.log("There are " + players.length + " connected players");
      });
    });

    connection.on("player.disconnect", (name, reason) => {
      webHookKickSenderBF4(connection, name, reason);
    });

    connection.on("close", () => {
      const date = new Date();
      console.log(`Disconnect: ${date.toLocaleString()}`);
      handleOnDisconnect();
    });

    connection.on("event", function (msg) {
      //console.log("# " + msg.data.join(' '));
    });

    connection.on("error", (err) => {
      console.log("# Error: " + err.message, err.stack);
    });

    connection.on("player.chat", (name, text, subset) => {
      //console.log("# " + name + " -> " + subset.join(' ') + ": " + text);
      webHookKickSenderBF3(connection, name, text, subset, this.playerMap);

      ticketsChat(connection, text);
      tickrateScript(connection, true, text);
    });

    connection.on("server.roundOver", () => {
      this.inEndRound = true;

      factionScript(connection);
      ticketsScript(connection, true);
    })

    connection.on("server.onLevelLoaded", () => {
      this.inEndRound = false;
    })

    connection.on("pb.message", (msg) => {
      //console.log(msg)
      webHookPB(connection, version, msg);
    });

    connection.on("player.join", (name, guid) => {
      this.playerMap.set(name, guid);

      //joinLogScript(connection, name, guid);
    })

    connection.on("player.spawn", (name, team) => {

      //handleOnSpawn(name, team);
    })

    connection.on("player.leave", (name, info) => {
      //handleOnLeave(name);
    })

    connection.on("player.kill", (killerName, victimName, weaponName, isHeadshot) => {
      //handleOnKill(killerName, victimName, weaponName, isHeadshot);
    })

    connection.on("player.leave", (name) => {
      this.playerMap.delete(name);
    })
  }

  connect() {
    this._connection.connect(); // Connects and logs in
  }

  version() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("version", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }

  serverInfo() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("serverInfo", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }

  killPlayer(playerName) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!playerName) reject('Player name is required.')

      connection.exec(["admin.killPlayer", playerName], function (err, msg) {
        err ? reject(err.message) : resolve({ playerName: playerName })
      });
    })
  }

  kickPlayer(playerName, reason) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!playerName) reject('Player name is required.')
      reason = reason ? reason : "Kicked by administrator"

      connection.exec(["admin.kickPlayer", playerName, reason], function (err, msg) {
        err ? reject(err.message) : resolve({ playerName: playerName, reason: reason })
      });
    })
  }

  banPlayer(banType, playerName, timeout, reason) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!banType) reject('Ban Type is required.')
      if (!playerName) reject('Ban ID is required.')
      if (!timeout) reject('Timeout is required.')
      let banTimeoutType = timeout
      let banTimeout = null

      let command = ["banList.add", banType, playerName]

      if (timeout === "perm") command.push("perm")
      else if (timeout.startsWith("seconds") || timeout.startsWith("rounds")) {
        let parts = timeout.split(' ')
        banTimeoutType = parts[0]
        banTimeout = parts[1]

        command.push(parts[0])
        command.push(parts[1])
      }

      reason = reason ? reason : "Banned by admin"
      command.push(reason)

      connection.exec(command, function (err, msg) {
        if (err) reject(err.message)

        connection.exec(["banList.save"], function (err, msg) {
          err ? reject(err.message) : resolve({
            banType: banType,
            playerName: playerName,
            banTimeoutType: banTimeoutType,
            banTimeout: banTimeout,
            reason: reason
          })
        });
      });
    })
  }
  vipPlayer(soldierName) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!soldierName) reject('Player name is required.')

      connection.exec(["reservedSlotsList.add", soldierName], function (err, msg) {
        err ? reject(err.message) : resolve({ soldierName: soldierName })
      });
      connection.exec(["reservedSlotsList.save"], function (err, msg) {
        err ? reject(err.message) : resolve({ soldierName: soldierName })
      });
    })
  }

  listPlayers() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.listPlayers(function (err, players) {
        err ? reject(err.message) : resolve({ players: players })
      });
    })
  }

  team_1() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.team_1(function (err, players) {
        for (var i = 0; i < players.length; i++) {
        }
        err ? reject(err.message) : resolve({ players: players })
      });
    })
  }

  team_2() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.team_2(function (err, players) {
        for (var i = 0; i < players.length; i++) {
        }
        err ? reject(err.message) : resolve({ players: players })
      });
    })
  }
  serverFPS() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("vars.serverTickTime", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }
  listOfMaps() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("mapList.list", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }
  setNextMap(indexNum) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!indexNum) reject('Index is required.')

      connection.exec(["mapList.setNextMapIndex", indexNum], function (err, msg) {
        err ? reject(err.message) : resolve({ indexNum: indexNum })
      });
    })
  }
  // use offset for more bans
  printBanList() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("banList.list", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }
  unban(banType, banId) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!banType || !banId) reject('type of unban is required.')

      connection.exec(["banlist.remove", banType, banId], function (err, msg) {
        err ? reject(err.message) : resolve({ banType: banType, banId: banId })
      });
    })
  }
  getAllInfo() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("serverInfo", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }
  getMapIndices() {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      connection.exec("mapList.getMapIndices", function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }
  switchPlayer(playerName, teamId, squadId, force) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!playerName || !teamId ||
        !squadId || !force) {
        reject("Not enough arguments")
      }
      connection.exec(["admin.movePlayer", playerName, teamId, squadId, force], function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      })
    })
  }
  adminSayall(what) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!what) reject('admin say failed.')
      connection.exec(["admin.say", what, "all"], function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }

  adminYellall(what, duration) {
    let connection = this._connection
    if (duration < 0) duration = 0;
    let d = duration >>> 0;
    return new Promise(function (resolve, reject) {
      if (!what || !duration) reject('admin yell failed.')
      connection.exec(["admin.yell", what, d.toString(), "all"], function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }

  adminSayPlayer(what, playerName) {
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!what || !playerName) reject('admin say failed.')
      let player = "player";
      connection.exec(["admin.say", what, player, playerName], function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }

  adminYellPlayer(what, duration, playerName) {
    let du = Number(duration);
    if (du < 0) du = 0;
    let d = du >>> 0;
    let connection = this._connection
    return new Promise(function (resolve, reject) {
      if (!what || !playerName) reject('admin yell failed.')
      let player = "player";
      connection.exec(["admin.yell", what, d.toString(), player, playerName], function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    })
  }

  customCommand(command, params) {
    let connection = this._connection;
    return new Promise(function (resolve, reject) {
      if (!command) reject('command name is required.');

      let arr = [];
      arr.push(command);

      if (params.length) {
        for (const el of params) {
          arr.push(el); // and arguments if any
        }
      }

      connection.exec(arr, function (err, msg) {
        err ? reject(err.message) : resolve(msg)
      });
    });
  }

}


export default BattleConClient