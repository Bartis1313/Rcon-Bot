module.exports = class RoundReport extends BasePlugin {
    constructor(bc) {
        super(bc, "RoundReport");

        if (!process.env.DISCORD_ROUND)
            return;

        this.playerData = {};
        this.roundStartTime = null;
        this.roundEndTime = null;
        this.statInterval = null;
        this.scores = []; // round end tickets

        this.onKillHandler = this.onKillHandler.bind(this);
        this.onSpawnHandler = this.onSpawnHandler.bind(this);
        this.onLeaveHandler = this.onLeaveHandler.bind(this);
        this.onRoundStartHandler = this.onRoundStartHandler.bind(this);
        this.onRoundOverTeamScoresHandler = this.onRoundOverTeamScoresHandler.bind(this);

        this.onEvent("player.onKill", this.onKillHandler);
        this.onEvent("player.onSpawn", this.onSpawnHandler);
        this.onEvent("player.onLeave", this.onLeaveHandler);
        this.onEvent("server.onLevelLoaded", this.onRoundStartHandler);
        this.onEvent("server.onRoundOverTeamScores", this.onRoundOverTeamScoresHandler);

        // ininitally...
        if (!this.statInterval) {
            this.statInterval = setInterval(async () => { await this._updatePlayerStats(); }, 5000);
        }
    }

    async onRoundStartHandler() {
        this.roundStartTime = Date.now();

        if (!this.statInterval) {
            this.statInterval = setInterval(async () => { await this._updatePlayerStats(); }, 5000);
        }
    }

    async onKillHandler([killerName, victimName, weaponName, isHeadshot]) {
        isHeadshot = isHeadshot === "true";
        if (weaponName === "Death") {
            weaponName = "Vehicle";
        }

        if (!killerName || !victimName) return;

        if (!this.playerData[killerName]) {
            this.playerData[killerName] = this._createPlayerDataObject();
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

    async onSpawnHandler([name, team]) {
        if (!name) return;

        if (!this.playerData[name]) {
            this.playerData[name] = this._createPlayerDataObject();
        }

        const player = this.playerData[name];
        const now = Date.now();

        if (!player.joinTime) {
            player.joinTime = now;
        }

        if (player.leave) {
            player.leave = false;
            player.currentSessionStart = now;
        }
        else if (!player.currentSessionStart) {
            player.currentSessionStart = now;
        }

        player.team = team;
    }

    async onLeaveHandler([name, info]) {
        if (!name || !this.playerData[name]) return;

        const player = this.playerData[name];
        const now = Date.now();

        if (player.currentSessionStart) {
            player.totalTimePlayed += (now - player.currentSessionStart);
            player.currentSessionStart = null;
        }

        player.leave = true;
        player.leaveTime = now;
    }

    async onRoundOverTeamScoresHandler([n, ...data]) {
        try {
            this.endTickets = n = parseInt(n, 10); // number of scores
            const scores = data.slice(0, n).map(score => Math.round(parseFloat(score)));
            this.scores = scores;

            this.roundEndTime = Date.now();

            // clear it before
            clearInterval(this.statInterval);
            this.statInterval = null;

            await this._updatePlayerStats();
            this._finalizePlayerTimes();

            const { embed, fullReport } = await this.generateRoundReport();
            await this.sendDiscordReport(embed, fullReport);

            this._cleanup();
        } catch (error) {
            console.error("Error in onRoundOverHandler:", error);
        }
    }

    _getBestWeapon(weapons) {
        let sortedWeapons = Object.entries(weapons)
            .map(([weapon, stats]) => ({ name: weapon, kills: stats.kills }))
            .sort((a, b) => b.kills - a.kills);

        if (sortedWeapons.length === 0) return "N/A";

        const best = sortedWeapons[0];
        if (best.name === "Vehicle" && sortedWeapons.length > 1) {
            return `Vehicle(${best.kills})/${sortedWeapons[1].name}(${sortedWeapons[1].kills})`;
        }

        return `${best.name} (${best.kills})`;
    }

    async generateRoundReport() {
        const teams = {};
        const allPlayers = [];
        const now = Date.now();

        for (const [name, data] of Object.entries(this.playerData)) {
            if (data.team === undefined || data.team === 0) continue;

            const serverKills = parseInt(data.stats?.kills) || 0;
            const serverDeaths = parseInt(data.stats?.deaths) || 0;
            const score = parseInt(data.stats?.score) || 0;

            let totalTimePlayedMs = data.totalTimePlayed;

            if (!data.leave && data.currentSessionStart) {
                totalTimePlayedMs += (now - data.currentSessionStart);
            }

            const timePlayed = totalTimePlayedMs / 60000;

            let kpm = '0.00';
            if (timePlayed > 0) {
                kpm = (serverKills / timePlayed).toFixed(2);
            }

            const kd = serverDeaths > 0
                ? (serverKills / serverDeaths).toFixed(2)
                : serverKills.toFixed(2);

            const hsPercent = data.kills > 0
                ? `${((data.headshots / data.kills) * 100).toFixed(1)}%`
                : '0.0%';

            const bestWeapon = this._getBestWeapon(data.weapons);
            const timePlayedFormatted = this.formatTime(timePlayed * 60);

            const playerInfo = {
                name,
                score,
                kd,
                kpm,
                serverKills,
                serverDeaths,
                hsPercent,
                bestWeapon,
                left: data.leave || false,
                team: data.team,
                timePlayed: timePlayedFormatted
            };

            if (!teams[data.team]) teams[data.team] = [];
            teams[data.team].push(playerInfo);

            allPlayers.push(playerInfo);
        }

        const dataInfo = await this._getInfo();

        const embedFields = [];
        embedFields.push({
            name: "Round Duration",
            value: this.formatTime(this.getRoundDuration()),
            inline: true
        });

        embedFields.push({
            name: dataInfo.name,
            value: `${dataInfo.MapName} | ${dataInfo.ModeName}`,
            inline: true
        });

        embedFields.push({
            name: `Tickets`,
            value: `${this.scores.join(':')}`,
            inline: true
        });

        embedFields.push({
            name: "Total Players",
            value: `${allPlayers.length}`,
            inline: true
        });

        const totalKills = Object.values(this.playerData).reduce((sum, player) =>
            sum + (parseInt(player.stats?.kills, 10) || 0), 0
        );
        embedFields.push({
            name: "Total Kills",
            value: `${totalKills}`,
            inline: true
        });

        const factions = await this._getFactions();
        for (const [team, players] of Object.entries(teams)) {
            players.sort((a, b) => b.score - a.score);
            const topPlayers = players.slice(0, 5); // top 5 because discord limits...

            embedFields.push({
                name: `Team ${team} (${factions[team - 1]}) (${players.length} players${players.length > 5 ? `, showing top 5` : ``})`,
                value: `Top players sorted by score`,
                inline: false
            });

            topPlayers.forEach((player, index) => {
                const fieldTitle = `#${index + 1}: ${player.name}${player.left ? ' †' : ''}`;
                const fieldValue = [
                    `Score: **${player.score}**`,
                    `K/D: **${player.kd}** (${player.serverKills} / ${player.serverDeaths})`,
                    `KPM: **${player.kpm}**`,
                    `HS%: **${player.hsPercent}**`,
                    `Weapon: **${player.bestWeapon}**`
                ].join(' | ');

                embedFields.push({
                    name: fieldTitle,
                    value: fieldValue,
                    inline: false
                });
            });

            // push alignment
            if (topPlayers.length % 3 !== 0) {
                embedFields.push({
                    name: "\u200B",
                    value: "\u200B",
                    inline: true
                });
            }
        }

        let fullReport = "ROUND REPORT - COMPLETE PLAYER STATISTICS\n";
        fullReport += "============================================\n\n";
        fullReport += `${dataInfo.name}\n${dataInfo.MapName} | ${dataInfo.ModeName}\n`
        fullReport += `Tickets: ${this.scores.join(':')}\n`
        fullReport += `Round Duration: ${this.formatTime(this.getRoundDuration())}\n\n`;

        for (const [team, players] of Object.entries(teams)) {
            fullReport += `TEAM ${team} (${factions[team - 1]})\n`;
            fullReport += "Name                   | Score | Kills | Deaths | K/D    | KPM   | HS%    | Time  | Best Weapon\n";
            fullReport += "-----------------------+-------+-------+--------+--------+-------+--------+-------+-------------\n";

            players.forEach((player, index) => {
                const name = `${player.name}${player.left ? ' (Left)' : ''}`.padEnd(22).slice(0, 22);
                const score = player.score.toString().padStart(5);
                const kills = (this.playerData[player.name].stats?.kills || "0").toString().padStart(5);
                const deaths = (this.playerData[player.name].stats?.deaths || "0").toString().padStart(6);
                const kd = player.kd.padStart(6);
                const kpm = player.kpm.padStart(5);
                const hs = player.hsPercent.padStart(6);
                const time = player.timePlayed.padStart(5);
                const weapon = player.bestWeapon;

                fullReport += `${name} | ${score} | ${kills} | ${deaths} | ${kd} | ${kpm} | ${hs} | ${time} | ${weapon}\n`;
            });

            fullReport += "\n\n";
        }

        fullReport += "OVERALL STATISTICS\n";
        fullReport += "=================\n";
        fullReport += `Total Players: ${allPlayers.length}\n`;

        const totalHeadshots = Object.values(this.playerData).reduce((sum, player) => sum + player.headshots, 0);
        const overallHSPercentage = totalKills > 0 ? ((totalHeadshots / totalKills) * 100).toFixed(1) : '0.0';

        fullReport += `Total Kills: ${totalKills}\n`;
        fullReport += `Total Headshots: ${totalHeadshots} (${overallHSPercentage}%)\n`;

        embedFields.push({
            name: "Info",
            value: "† = Left before round end",
            inline: false
        });

        const embed = {
            title: "Round Report Summary",
            color: 0x0099ff,
            fields: embedFields,
            footer: {
                text: "See attached file for complete statistics"
            },
            timestamp: new Date()
        };

        return { embed, fullReport };
    }

    async sendDiscordReport(embed, fullReport) {
        try {
            const reportBuffer = Buffer.from(fullReport, 'utf8');

            const formData = {
                payload_json: JSON.stringify({
                    embeds: [embed]
                }),
                files: [
                    {
                        name: `round_report_${Date.now()}.txt`,
                        content: reportBuffer
                    }
                ]
            };

            await this.sendToDiscordWebhook(formData);

            console.log("Round report sent to Discord successfully");
        } catch (error) {
            console.error("Error sending report to Discord:", error);
        }
    }

    async sendToDiscordWebhook(formData) {
        try {
            const form = new FormData();
            form.append('payload_json', formData.payload_json);
            const fileBuffer = formData.files[0].content;
            const fileName = formData.files[0].name;

            const blob = new Blob([fileBuffer], { type: 'text/plain' });
            form.append('file', blob, fileName);

            const webhookUrl = process.env.DISCORD_ROUND;
            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: form
            });

            if (!response.ok) {
                throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.error('Error sending webhook:', error);
        }
    }

    _createPlayerDataObject() {
        return {
            weapons: {},                // object of weapons vehicles etc..
            joinTime: null,             // first join time
            currentSessionStart: null,  // tracks the start of the current session
            totalTimePlayed: 0,         // accumulates total time played across sessions
            kills: 0,                   // tracked in listPlayers stats
            headshots: 0,               // general hs
            team: undefined,            // team ID
            leave: false,               // has player left?
            leaveTime: null,            // if left, at what time?
            stats: null                 // store all kills, death here
        };
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getRoundDuration() {
        if (!this.roundStartTime) return 0;
        const endTime = this.roundEndTime || Date.now();
        return (endTime - this.roundStartTime) / 1000;
    }

    _cleanup() {
        this.playerData = {};
        this.roundStartTime = null;
        this.roundEndTime = null;
        this.scores = [];
    }

    async _updatePlayerStats() {
        const _players = await this.exec(["listPlayers", "all"]);
        const stats = this.bc.tabulate(_players);

        for (const [name, data] of Object.entries(this.playerData)) {
            const playerStat = stats.find(stat => stat.name === name);
            if (playerStat) {
                this.playerData[name].stats = playerStat;
            }
        }
    }

    async _getInfo() {
        try {
            const msg = await this.exec("serverInfo");
            return {
                name: msg[0],
                ModeName: this.bc.gameModes[msg[3]],
                MapName: this.bc.gameMaps[msg[4]]
            }
        } catch (error) {
            console.error('Error fetching server info:', error);
            return null;
        }
    }

    async _getFactions() {
        // only bf4 supports, so return eraly for bf3
        if (process.env.GAME === "BF3") {
            return [
                'US',
                'RU',
                'US', // sqdm works like this?
                'RU'
            ]
        }
        const factions = await this.exec("vars.teamFactionOverride");

        const factionMap = new Map([
            ['0', 'US'],
            ['1', 'RU'],
            ['2', 'CH']
        ]);
        return [
            factionMap.get(factions[0]),
            factionMap.get(factions[1]),
            factionMap.get(factions[2]),
            factionMap.get(factions[3]),
        ];
    }

    _finalizePlayerTimes() {
        const now = Date.now();

        for (const [name, data] of Object.entries(this.playerData)) {
            if (!data.leave && data.currentSessionStart) {
                data.totalTimePlayed += (now - data.currentSessionStart);
                data.currentSessionStart = null;
            }
        }
    }
}