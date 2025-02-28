module.exports = class RoundReport extends BasePlugin {
    constructor(bc) {
        super(bc, "RoundReport (test)");

        this.playerData = {};

        // this.onKillHandler = this.onKillHandler.bind(this);
        // this.onEvent("player.onKill", this.onKillHandler);

        // this.onSpawnHandler = this.onSpawnHandler.bind(this);
        // this.onEvent("player.onSpawn", this.onSpawnHandler);

        // this.onRoundOverHandler = this.onRoundOverHandler.bind(this);
        // this.onEvent("server.onRoundOver", this.onRoundOverHandler);
    }

    // collect details of kills
    async onKillHandler([killerName, victimName, weaponName, isHeadshot]) {
        if (!killerName) return;
        if (!victimName) return;

        if (!this.playerData[killerName]) {
            this.playerData[killerName] = { weapons: {}, joinTime: null, kills: 0, deaths: 0, headshots: 0 };
        }

        if (!this.playerData[victimName]) {
            this.playerData[victimName] = { weapons: {}, joinTime: null, kills: 0, deaths: 0, headshots: 0 };
        }

        const weapon = weaponName.split('/').pop();
        if (!this.playerData[killerName].weapons[weapon]) {
            this.playerData[killerName].weapons[weapon] = { kills: 0, headshots: 0 };
        }

        this.playerData[killerName].weapons[weapon].kills += 1;
        this.playerData[killerName].kills += 1;

        if (isHeadshot) {
            this.playerData[killerName].weapons[weapon].headshots += 1;
            this.playerData[killerName].headshots += 1;
        }
    }

    // count the time on server as first spawn
    async onSpawnHandler([name, team]) {
        if (!name) return;

        if (!this.playerData[name]) {
            this.playerData[name] = { weapons: {}, joinTime: null, kills: 0, deaths: 0, headshots: 0, team };
        }

        if (!playerData[name].joinTime) {
            this.playerData[name].joinTime = Date.now();
        }
    }

    // still save these players, mark them who left and backup their stats
    async onLeaveHandler([name, info]) {
        const players = await this.exec(["listPlayers", "all"]);

        const playerStats = bc.tabulate(players).find(val => val.name == name);

        this.playerData[name].leave = true;
        this.playerData[name].stats = playerStats;
    }

    async onRoundOverHandler() {
        const _players = await this.exec(["listPlayers", "all"]);
        const stats = bc.tabulate(_players);

        for (const stat of stats) {
            this.playerData[stat.name].stats = stat;
        }

        // now after it's done...
        this._cleanup();
    }

    _getBestWeapon(weapons) {
        return Object.entries(weapons)
            .reduce((best, [weapon, stats]) =>
                stats.kills > (best.kills || 0) ? { name: weapon, kills: stats.kills } : best
                , { name: "N/A", kills: 0 }).name;
    }

    async generateRoundReportEmbed() {
        const teams = {};

        for (const [name, data] of Object.entries(this.playerData)) {
            if (data.team === 0) continue;

            const serverKills = parseInt(data.stats?.kills) || 0;
            const serverDeaths = parseInt(data.stats?.deaths) || 0;
            const score = parseInt(data.stats?.score) || 0;

            const timePlayed = (Date.now() - (data.joinTime || Date.now())) / 60000;
            const kpm = timePlayed > 0 ? (serverKills / timePlayed).toFixed(2) : 'N/A';

            const kd = serverDeaths > 0
                ? (serverKills / serverDeaths).toFixed(2)
                : serverKills > 0 ? '∞' : '0.00';

            const hsPercent = data.kills > 0
                ? `${((data.headshots / data.kills) * 100).toFixed(1)}%`
                : 'N/A';

            const bestWeapon = this._getBestWeapon(data.weapons);

            if (!teams[data.team]) teams[data.team] = [];
            teams[data.team].push({
                name,
                score,
                kd,
                kpm,
                hsPercent,
                bestWeapon,
                left: data.leave || false
            });
        }

        let description = "";
        for (const [team, players] of Object.entries(teams)) {
            players.sort((a, b) => b.score - a.score);

            description += `**Team ${team}**\n\`\`\`md\n`;
            description += "#  Name                Score    KD     KPM    HS%   Best Weapon\n";
            description += "-------------------------------------------------------------\n";

            players.forEach((player, index) => {
                const rank = (index + 1).toString().padStart(2);
                const name = `${player.name}${player.left ? ' (Left)' : ''}`.padEnd(18).slice(0, 18);
                const score = player.score.toString().padStart(5);
                const kd = player.kd.padStart(5);
                const kpm = player.kpm.padStart(6);
                const hs = player.hsPercent.padStart(5);
                const weapon = player.bestWeapon.padEnd(12).slice(0, 12);

                description += `${rank}. ${name} ${score} ${kd} ${kpm} ${hs} ${weapon}\n`;
            });

            description += "```\n\n";
        }

        return {
            title: "Round Report Summary",
            color: 0x0099ff,
            description: description || "No players recorded.",
            fields: [
                {
                    name: "Battle report",
                    value: "KD = Kills/Deaths\nKPM = Kills per Minute\nHS = Headshot %\nBest Weapon = Most used weapon by kills"
                }
            ],
            footer: { text: "Players marked with (Left) disconnected before round end" },
            timestamp: new Date()
        };
    }

    _cleanup() {
        this.playerData = {};
    }
}