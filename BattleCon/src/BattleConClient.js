import BattleCon from "../src/BattleCon";

global.BasePlugin = require("./basePlugin"); // so you dont have to require it in plugins
const { loadPlugins } = require("./pluginLoader");

class BattleConClient {
  constructor(host, port, password, game) {
    this._connection = new BattleCon(host, port, password).use(game);
    this.initialize();

    this.isBusyState = false;
  }

  initialize() {
    const connection = this._connection;
    connection.on("connect", () => console.log(`# Connected to ${connection.host}:${connection.port}`));
    connection.on("login", () => {
      this.isBusyState = false;
      console.log("# Login successful");
    });
    connection.on("ready", () => {
      this.executeCommand("version").then(msg => {
        console.log(`# Server is running ${msg[0]}, version ${msg[1]}`);
        loadPlugins(this._connection);
      }).catch(err => console.error(err));
    });
    connection.on("close", () => {
      this.isBusyState = true;
      console.log(`# Disconnect at: ${new Date().toLocaleString()}`);
    });
    connection.on("error", err => console.error(`# Error: ${err.message}`, err.stack));
  }

  executeCommand(command, params = []) {
    return new Promise((resolve, reject) => {
      this._connection.exec([command, ...params], (err, msg) => err ? reject(err.message) : resolve(msg));
    });
  }

  // define methods

  isBusy() {
    return this.isBusyState;
  }

  getMapsRaw() {
    return this._connection.gameMaps;
  }

  getModesRaw() {
    return this._connection.gameModes;
  }

  getPrettyMap(map) {
    return this._connection.gameMaps[map] || "Map not found";
  }

  getPrettyMode(mode) {
    return this._connection.gameModes[mode] || "Mode not found";
  }

  async connect() {
    this._connection.connect();
  }

  async version() {
    return this.executeCommand("version");
  }

  async serverInfo() {
    return this.executeCommand("serverInfo");
  }

  async killPlayer(playerName) {
    if (!playerName) throw new Error('Player name is required.');
    return this.executeCommand("admin.killPlayer", [playerName]).then(() =>
      ({ playerName }));
  }

  async kickPlayer(playerName, reason = null) {
    if (!reason) reason = "Kicked by administrator";
    if (!playerName) throw new Error('Player name is required.');
    return this.executeCommand("admin.kickPlayer", [playerName, reason]).then(() =>
      ({ playerName, reason }));
  }

  async banPlayer(banType, banId, timeout, reason = null) {
    if (!reason) reason = "Banned by admin";

    if (!banType || !banId || !timeout) throw new Error('Ban Type, Ban ID, and Timeout are required.');

    let command = ["banList.add", banType, banId];
    if (timeout === "perm") {
      command.push("perm");
    } else if (timeout.startsWith("seconds") || timeout.startsWith("rounds")) {
      let [type, value] = timeout.split(' ');
      command.push(type, value);
    }

    command.push(reason);
    return this.executeCommand(...command).then(() =>
      this.executeCommand("banList.save")
    ).then(() =>
      ({ banType, banId, timeout, reason }));
  }

  async vipPlayer(soldierName) {
    if (!soldierName) throw new Error('Player name is required.');
    return this.executeCommand("reservedSlotsList.add", [soldierName]).then(() =>
      this.executeCommand("reservedSlotsList.save")
    ).then(() =>
      ({ soldierName }));
  }

  async listPlayers() {
    const connection = this._connection;
    return new Promise((resolve, reject) => {
      connection.listPlayers((err, players) => {
        err ? reject(err.message) : resolve({ players });
      });
    });
  }

  async team(number) {
    return this.executeCommand("listPlayers", ["team", number.toString()]).then(players =>
      ({ players: BattleCon.tabulate(players) }));
  }

  async serverFPS() {
    return this.executeCommand("vars.serverTickTime");
  }

  async listOfMaps() {
    return this.executeCommand("mapList.list");
  }

  async setNextMap(indexNum) {
    if (indexNum == null) throw new Error("Index is required.");
    return this.executeCommand("mapList.setNextMapIndex", [indexNum.toString()]).then(() =>
      ({ indexNum }));
  }

  async printBanList() {
    return this.executeCommand("banList.list");
  }

  async unban(banType, banId) {
    if (!banType || !banId) throw new Error('type of unban is required.');
    return this.executeCommand("banList.remove", [banType, banId]).then(() =>
      ({ banType, banId }));
  }

  async getAllInfo() {
    return this.executeCommand("serverInfo");
  }

  async getMapIndices() {
    return this.executeCommand("mapList.getMapIndices");
  }

  async switchPlayer(playerName, teamId, squadId, force) {
    if (!playerName || !teamId || !squadId || !force) throw new Error("Not enough arguments");
    return this.executeCommand("admin.movePlayer", [playerName, teamId, squadId, force]).then(() =>
      ({ playerName, teamId, squadId, force }));
  }

  async adminSayall(what) {
    if (!what) throw new Error('admin say failed.');
    return this.executeCommand("admin.say", [what, "all"]).then(() =>
      ({ what }));
  }

  async adminSay(what, sub) {
    if (!what) throw new Error('admin say failed.');
    return this.executeCommand("admin.say", [what, sub]).then(() =>
      ({ what, sub }));
  }

  async adminYellall(what, duration) {
    if (!what || duration < 0) throw new Error('admin yell failed.');
    return this.executeCommand("admin.yell", [what, (duration >>> 0).toString(), "all"]).then(() =>
      ({ what, duration }));
  }

  async adminSayPlayer(what, playerName) {
    if (!what || !playerName) throw new Error('admin say failed.');
    return this.executeCommand("admin.say", [what, "player", playerName]).then(() =>
      ({ what, playerName }));
  }

  async adminYellPlayer(what, duration, playerName) {
    if (!what || !playerName || duration < 0) throw new Error('admin yell failed.');
    return this.executeCommand("admin.yell", [what, (Number(duration) >>> 0).toString(), "player", playerName]).then(() =>
      ({ what, duration, playerName }));
  }

  async customCommand(command, params = []) {
    if (!command) throw new Error('command name is required.');
    return this.executeCommand(command, params);
  }

  async getCommands() {
    return this._connection.commands;
  }
}

export default BattleConClient;