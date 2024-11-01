const getMapObj = (ver) => {
    switch (ver) {
        case 'BF4':
            return {
                MP_Abandoned: 'Zavod 311',
                MP_Damage: 'Lancang Dam',
                MP_Flooded: 'Flood Zone',
                MP_Journey: 'Golmud Railway',
                MP_Naval: 'Paracel Storm',
                MP_Prison: 'Operation Locker',
                MP_Resort: 'Hainan Resort',
                MP_Siege: 'Siege of Shanghai',
                MP_TheDish: 'Rogue Transmission',
                MP_Tremors: 'Dawnbreaker',
                XP1_001: 'Silk Road',
                XP1_002: 'Altai Range',
                XP1_003: 'Guilin Peaks',
                XP1_004: 'Dragon Pass',
                XP0_Caspian: 'Caspian Border 2014',
                XP0_Firestorm: 'Operation Firestorm 2014',
                XP0_Metro: 'Operation Metro 2014',
                XP0_Oman: 'Gulf of Oman 2014',
                XP2_001: 'Lost Islands',
                XP2_002: 'Nansha Strike',
                XP2_003: 'Wavebreaker',
                XP2_004: 'Operation Mortar',
                XP3_MarketPl: 'Pearl Market',
                XP3_Prpganda: 'Propaganda',
                XP3_UrbanGdn: 'Lumpini Garden',
                XP3_WtrFront: 'Sunken Dragon',
                XP4_Arctic: 'Operation Whiteout',
                XP4_SubBase: 'Hammerhead',
                XP4_Titan: 'Hangar 21',
                XP4_WlkrFtry: 'Giants of Karelia',
                XP5_Night_01: 'Zavod: Graveyard Shift',
                XP6_CMP: 'Operation Outbreak',
                XP7_Valley: 'Dragon Valley 2015'
            };
        case 'BF3':
            return {
                MP_001: 'Grand Bazaar',
                MP_003: 'Teheran Highway',
                MP_007: 'Caspian Border',
                MP_011: 'Seine Crossing',
                MP_012: 'Operation Firestorm',
                MP_013: 'Damavand Peak',
                MP_017: 'Noshahr Canals',
                MP_018: 'Kharg Island',
                MP_Subway: 'Operation Metro',
                XP1_001: 'Strike at Karkand',
                XP1_002: 'Gulf of Oman',
                XP1_003: 'Sharqi Peninsula',
                XP1_004: 'Wake Island',
                XP2_Factory: 'Scrapmetal',
                XP2_Office: 'Operation 925',
                XP2_Palace: 'Donya Fortress',
                XP2_Skybar: 'Ziba Tower',
                XP3_Alborz: 'Alborz Mountains',
                XP3_Desert: 'Bandar Desert',
                XP3_Shield: 'Armored Shield',
                XP3_Valley: 'Death Valley',
                XP4_FD: 'Markaz Monolith',
                XP4_Parl: 'Azadi Palace',
                XP4_Quake: 'Epicenter',
                XP4_Rubble: 'Talah Market',
                XP5_001: 'Operation Riverside',
                XP5_002: 'Nebandan Flats',
                XP5_003: 'Kiasar Railroad',
                XP5_004: 'Sabalan Pipeline'
            };
    }

    return '';
}

const getModesObj = () => {
    return {
        ConquestLarge0: 'Conquest Large',
        ConquestSmall0: 'Conquest Small',
        Domination0: 'Domination',
        Elimination0: 'Defuse',
        Obliteration: 'Obliteration',
        RushLarge0: 'Rush',
        SquadDeathMatch0: 'Squad Deathmatch',
        TeamDeathMatch0: 'Team Deathmatch',
        SquadObliteration0: 'Squad Obliteration',
        GunMaster0: 'Gun Master',
        Chainlink0: 'Chain Link',
        Capturetheflag0: 'Capture the flag',
        AirSuperiority0: 'Air Superiority',
        TankSuperiority0: 'Tank Superiority',
        Scavenger0: 'Scavenger',
        TeamDeathMatchC0: 'Team Deathmatch (Close Quarters)',
        ConquestAssaultSmall1: 'Assault #2',
        ConquestAssaultLarge0: 'Assault Large',
        ConquestAssaultSmall0: 'Assault Small',
        SquadRush0: 'Squad Rush'
    }
}

const sayAll = (connection, str) => {
    return new Promise((resolve, reject) => {
        connection.exec(["admin.say", str, "all"], (err, msg) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const factionScript = async (connection) => {
    if (process.env.FACTIONS) {
        const Teams = {
            0: "US",
            1: "RU",
            2: "CN"
        };

        let Team1 = 0, Team2 = 0;

        const TeamUS = 0;
        const TeamRU = 1;
        const TeamCH = 2;

        const maps = [];
        let index = -1;

        const mapListPromise = new Promise((resolve, reject) => {
            connection.exec("mapList.list", function (err, msg) {
                if (err) {
                    return reject(err);
                }
                const data = msg;
                for (let i = 0; i < data.length; i++) {
                    if (!isNaN(data[i])) {
                        continue;
                    }

                    const mapName = data[i];
                    const modeName = data[i + 1];

                    maps.push({ mapName: mapName, modeName: modeName });
                    i++;
                }
                resolve();
            });
        });

        const mapIndicesPromise = new Promise((resolve, reject) => {
            connection.exec("mapList.getMapIndices", function (err, msg) {
                if (err) {
                    return reject(err);
                }
                index = msg[1];
                resolve();
            });
        });

        await Promise.all([mapListPromise, mapIndicesPromise]);

        if (maps.length === 0) return;
        if (index === -1) return;
        const mapObj = { mapName: maps[index].mapName, modeName: maps[index].modeName };

        switch (mapObj.mapName) {
            case "MP_Abandoned": // Zavod 311
                Team1 = TeamUS;
                Team2 = TeamRU;
                break;
            case "MP_Damage": // Lancang Dam
                Team1 = TeamRU;
                Team2 = TeamCH;
                break;
            case "MP_Flooded": // Flood Zone
                Team1 = TeamUS;
                Team2 = TeamUS;
                break;
            case "MP_Journey": // Golmud Railway
                Team1 = TeamRU;
                Team2 = TeamCH;
                break;
            case "MP_Naval": // Paracel Storm
                Team1 = TeamUS;
                Team2 = TeamCH;
                break;
            case "MP_Prison": // Operation Locker
                Team1 = TeamUS;
                Team2 = TeamRU;
                break;
            case "MP_Resort": // Hainan Resort
                Team1 = TeamUS;
                Team2 = TeamCH;
                break;
            case "MP_Siege": // Siege of Shanghai
                Team1 = TeamUS;
                Team2 = TeamUS;
                break;
            case "MP_TheDish": // Rogue Transmission
                Team1 = TeamRU;
                Team2 = TeamCH;
                break;
            case "MP_Tremors": // Dawnbreaker
                Team1 = TeamUS;
                Team2 = TeamCH;
                break;
            case "XP1_001": // Silk Road
            case "XP1_002": // Altai Range
            case "XP1_004": // Dragon Pass
            case "XP2_003": // Wavebreaker
            case "XP3_WtrFront": // Sunken Dragon
            case "XP4_Arctic": // Operation Whiteout
            case "XP4_SubBase": // Hammerhead
            case "XP4_WlkrFtry": // Giants of Karelia
            case "XP4_Titan": // Hangar 21
            case "XP7_Valley": // Dragon Valley 2015
                Team1 = TeamUS;
                Team2 = TeamUS;
                break;
            case "XP1_003": // Guilin Peaks
                Team1 = TeamUS;
                Team2 = TeamRU;
                break;
            case "XP0_Caspian": // Caspian Border 2014
            case "XP0_Firestorm": // Operation Firestorm 2014
            case "XP0_Metro": // Operation Metro 2014
            case "XP0_Oman": // Gulf of Oman 2014
                Team1 = TeamRU;
                Team2 = TeamUS;
                break;
            case "XP2_001": // Lost Islands
            case "XP2_002": // Nansha Strike
            case "XP2_004": // Operation Mortar
                Team1 = TeamUS;
                Team2 = TeamCH;
                break;
            case "XP3_MarketPl": // Pearl Market
            case "XP3_UrbanGdn": // Lumpini Garden
                Team1 = TeamUS;
                Team2 = TeamRU;
                break;
            case "XP3_Prpganda": // Propaganda
            case "XP5_Night_01": // Zavod: Graveyard Shift
            case "XP6_CMP": // Operation Outbreak
                Team1 = TeamRU;
                Team2 = TeamRU;
                break;
        }

        if (mapObj.modeName.includes("Rush")) {
            Team1 = TeamCH;
            Team2 = TeamRU;
        }

        connection.exec(`vars.teamFactionOverride 1 ${Team1.toString()}`, async function (err, msg) {

        });

        connection.exec(`vars.teamFactionOverride 2 ${Team2.toString()}`, async function (err, msg) {

        });

        await sleep(7000);

        await sayAll(connection, `Setting factions to ${Teams[Team1]} vs ${Teams[Team2]} on next round...`);
    }
}

const fastMapSwitchScript = async (connection) => {
    if (!process.env.FAST_MAP) return;

    ticketsScript(connection, true);
    factionScript(connection);

    sayAll(connection, `Next map in 15s...`);

    await sleep(15000);

    connection.exec(`mapList.runNextRound`, async function (err, msg) {

    });
}

const joinLogScript = async (connection, name, guid) => {
    let playerCount = -1;
    let maxPlayers = -1;
    let currentPing = -1;

    await new Promise((resolve, reject) => {
        connection.exec("serverInfo", function (err, msg) {
            if (err) {
                return reject(err);
            }

            playerCount = msg[1];
            resolve();
        });
    });

    await new Promise((resolve, reject) => {
        connection.exec("vars.maxPlayers", function (err, msg) {
            if (err) {
                return reject(err);
            }

            maxPlayers = msg;
            resolve();
        });
    });

    await new Promise((resolve, reject) => {
        connection.on("pb.message", async (message) => {
            if (message.includes(`Player GUID Computed`) && message.includes(name)) {
                connection.exec(`player.ping ${name}`, (err, msg) => {
                    if (err) {
                        return reject(err);
                    }

                    currentPing = msg[1];
                    resolve();
                });
            }
        });
    });

    if (playerCount === -1) return;
    if (maxPlayers === -1) return;
    if (currentPing === -1) return;

    if (currentPing === 65535) currentPing = -1;

    const message = {
        embeds: [
            {
                title: `${name} joined the server`,
                fields: [
                    {
                        name: 'EA GUID',
                        value: guid,
                        inline: true,
                    },
                    {
                        name: 'Ping',
                        value: currentPing.toString(),
                        inline: true,
                    },
                    {
                        name: 'Players',
                        value: `${playerCount.toString()}/${maxPlayers.toString()}`,
                        inline: true,
                    },
                ].filter(field => field !== null), // Filter out null fields
                color: 0x3498DB // Light blue
            }
        ]
    };

    fetch("", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Failed to send message to the webhook:', response.status, response.statusText);
            }
        })
        .catch((error) => {
            console.error('Error:', error, message);
        });
}

const ticketsScript = async (connection, isSay = false) => {
    if (!process.env.TICKETS) return;

    const maps = [];
    let index = -1;
    let playerCount = -1;

    const mapListPromise = new Promise((resolve, reject) => {
        connection.exec("mapList.list", function (err, msg) {
            if (err) {
                return reject(err);
            }
            const data = msg;
            for (let i = 0; i < data.length; i++) {
                if (!isNaN(data[i])) {
                    continue;
                }

                const mapName = data[i];
                const modeName = data[i + 1];

                maps.push({ mapName: mapName, modeName: modeName });
                i++;
            }
            resolve();
        });
    });

    const mapIndicesPromise = new Promise((resolve, reject) => {
        connection.exec("mapList.getMapIndices", function (err, msg) {
            if (err) {
                return reject(err);
            }
            index = msg[1];
            resolve();
        });
    });

    const serverInfoPromise = new Promise((resolve, reject) => {
        connection.exec("serverInfo", function (err, msg) {
            if (err) {
                return reject(err);
            }

            playerCount = msg[1];
            resolve();
        });
    });

    await Promise.all([mapListPromise, mapIndicesPromise, serverInfoPromise]);

    if (maps.length === 0) return;
    if (index === -1) return;
    if (playerCount === -1) return;

    const mapObj = { mapName: maps[index].mapName, modeName: maps[index].modeName };

    let tickets = 100;

    if (mapObj.modeName == "ConquestLarge0") {
        if (playerCount <= 29) {
            tickets = 100;
        }
        if (playerCount >= 45) {
            tickets = 125;
        }
    }
    else if (mapObj.modeName == "ConquestSmall0") {
        if (playerCount <= 29) {
            tickets = 150;
        }
        if (playerCount >= 45) {
            tickets = 200;
        }
    }
    else if (mapObj.modeName == "RushLarge0") {

        if (playerCount <= 29) {
            tickets = 150;
        }
        if (playerCount >= 45) {
            tickets = 250;
        }
    }

    if (isSay) sayAll(connection, `Tickets ${tickets}%`);

    for (let i = 0; i < 10; i++) {
        // I guess
        (async () => {
            connection.exec(`vars.gameModeCounter ${tickets}`, function (err, msg) {

            });
        })();

        await sleep(1000);
    }
}

const tickrateScript = async (connection, chat) => {
    if (process.env.GAME !== 'BF4') return;

    if (!chat.startsWith("Next Map: ")) return;

    ticketsScript(connection, false);

    if (process.env.TICKRATE) {
        const maps40 = ["MP_Resort", "MP_Naval", "MP_Damage", "XP0_Oman", "XP2_001", "XP2_002", "XP2_003", "XP2_004"];

        const maps = [];
        let index = -1;
        let playerCount = -1;

        const mapListPromise = new Promise((resolve, reject) => {
            connection.exec("mapList.list", function (err, msg) {
                if (err) {
                    return reject(err);
                }
                const data = msg;
                for (let i = 0; i < data.length; i++) {
                    if (!isNaN(data[i])) {
                        continue;
                    }

                    const mapName = data[i];
                    const modeName = data[i + 1];

                    maps.push({ mapName: mapName, modeName: modeName });
                    i++;
                }
                resolve();
            });
        });

        const mapIndicesPromise = new Promise((resolve, reject) => {
            connection.exec("mapList.getMapIndices", function (err, msg) {
                if (err) {
                    return reject(err);
                }
                index = msg[1];
                resolve();
            });
        });

        const serverInfoPromise = new Promise((resolve, reject) => {
            connection.exec("serverInfo", function (err, msg) {
                if (err) {
                    return reject(err);
                }

                playerCount = msg[21];
                resolve();
            });
        });

        await Promise.all([mapListPromise, mapIndicesPromise, serverInfoPromise]);

        if (maps.length === 0) return;
        if (index === -1) return;
        if (playerCount === -1) return;

        const mapObj = { mapName: maps[index].mapName, modeName: maps[index].modeName };

        let tick = 60;

        for (const m of maps40) {
            if (mapObj.mapName == m) {
                tick = 40;
                break;
            }
        }

        await sleep(1000);

        connection.exec(`vars.OutHighFrequency ${tick}`, async function (err, msg) {

        });
    }
}

const playerData = {};

const handleOnKill = (killerName, victimName, weaponName, isHeadshot) => {

    if (!killerName) return;
    if (!victimName) return;

    if (!playerData[killerName]) {
        playerData[killerName] = { weapons: {}, joinTime: null, kills: 0, deaths: 0, headshots: 0 };
    }

    if (!playerData[victimName]) {
        playerData[victimName] = { weapons: {}, joinTime: null, kills: 0, deaths: 0, headshots: 0 };
    }

    const weapon = weaponName.split('/').pop();
    if (!playerData[killerName].weapons[weapon]) {
        playerData[killerName].weapons[weapon] = { kills: 0, headshots: 0 };
    }

    playerData[killerName].weapons[weapon].kills += 1;
    playerData[killerName].kills += 1;

    if (isHeadshot) {
        playerData[killerName].weapons[weapon].headshots += 1;
        playerData[killerName].headshots += 1;
    }
}

const handleOnSpawn = (playerName, team) => {
    if (!playerName) return;

    if (!playerData[playerName]) {
        playerData[playerName] = { weapons: {}, joinTime: null, kills: 0, deaths: 0, headshots: 0, team };
    }

    if (!playerData[playerName].joinTime) {
        playerData[playerName].joinTime = Date.now();
    }
}

const handleOnLeave = (playerName) => {
    if (playerData[playerName]) {
        delete playerData[playerName];
    }
}

const handleOnDisconnect = () => {
    playerData = {};
}

const generateRoundEndWebhook = async (connection) => {

    let players = [];

    await new Promise((resolve, reject) => {
        connection.listPlayers((err, playersA) => {
            if (err) {
                return reject(err);
            }

            players = playersA.filter(player => player.teamId !== '0');

            resolve();
        });
    });

    const teams = players.reduce((acc, player) => {
        if (!acc[player.teamId]) acc[player.teamId] = [];
        acc[player.teamId].push(player);
        return acc;
    }, {});

    for (const teamId in teams) {
        teams[teamId].sort((a, b) => b.score - a.score);
        teams[teamId] = teams[teamId].slice(0, 5);
    }

    const fields = Object.entries(teams).flatMap(([teamId, teamPlayers]) => {
        return teamPlayers.map((player, index) => {
            const playerStats = playerData[player.name] || {};

            const bestWeapon = Object.entries(playerStats.weapons || {})
                .reduce((best, [weapon, stats]) => {
                    return stats.kills > (best.kills || 0) ? { name: weapon, kills: stats.kills, headshots: stats.headshots } : best;
                }, {});

            const timePlayed = playerStats.joinTime ? (Date.now() - playerStats.joinTime) / 60000 : 0; // Minutes
            const kpm = timePlayed > 0 ? (player.kills / timePlayed).toFixed(2) : "N/A";
            const headshotRate = bestWeapon.kills > 0 ? ((bestWeapon.headshots / bestWeapon.kills) * 100).toFixed(1) : "0";

            return {
                name: `#${index + 1} - ${player.name} (Team ${teamId})`,
                value: `
**Score**: ${player.score}
**K/D**: ${player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills}
**KPM**: ${kpm} | **HS%**: ${headshotRate}%
**Best Weapon**: ${bestWeapon.name || "N/A"} (${bestWeapon.kills || 0} kills)
                `,
                inline: true
            };
        });
    });

    try {
        const response = await fetch("", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: "Round Summary Bot",
                embeds: [
                    {
                        title: "Round End Summary",
                        description: "Top 5 Players per Team",
                        color: 3447003,
                        fields: fields,
                        timestamp: new Date().toISOString()
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to send round end summary: ${response.statusText}`);
        }

        console.log("Round end summary sent successfully.");
    } catch (error) {
        console.error("Failed to send round end summary:", error);
    }
};

export {
    ticketsScript, tickrateScript, fastMapSwitchScript, joinLogScript,
    handleOnKill, handleOnSpawn, handleOnLeave, handleOnDisconnect, generateRoundEndWebhook
};