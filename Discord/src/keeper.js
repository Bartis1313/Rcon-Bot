import fetch from 'node-fetch';

async function fetchPlayerCounts(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(res => res.json())
        .then(json => {
            if (json.snapshot.status == "SUCCESS") {
                var totalPlayers = 0

                var snapshot = json.snapshot
                var teamInfos = snapshot.teamInfo
                totalPlayers += (["0"] in teamInfos ? count(teamInfos["0"].players) : 0)
                totalPlayers += (["1"] in teamInfos ? count(teamInfos["1"].players) : 0)
                totalPlayers += (["2"] in teamInfos ? count(teamInfos["2"].players) : 0)
                totalPlayers += (["3"] in teamInfos ? count(teamInfos["3"].players) : 0)
                totalPlayers += (["4"] in teamInfos ? count(teamInfos["4"].players) : 0)

                return totalPlayers
            }
            else {
                throw new Exception(`Invalid fetch status`)
            }
        });
}

async function fetchPlayerCounts_team_1(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(res => res.json())
        .then(json => {
            if (json.snapshot.status == "SUCCESS") {
                var totalPlayers = 0

                var snapshot = json.snapshot
                var teamInfos = snapshot.teamInfo

                totalPlayers += (["1"] in teamInfos ? count(teamInfos["1"].players) : 0)

                return totalPlayers
            }
            else {
                throw new Exception(`Invalid fetch status`)
            }
        });
}

async function fetchPlayerCounts_team_2(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(res => res.json())
        .then(json => {
            if (json.snapshot.status == "SUCCESS") {
                var totalPlayers = 0

                var snapshot = json.snapshot
                var teamInfos = snapshot.teamInfo

                totalPlayers += (["2"] in teamInfos ? count(teamInfos["2"].players) : 0)

                return totalPlayers
            }
            else {
                throw new Exception(`Invalid fetch status`)
            }
        });
}

async function fetchMaps(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(res => res.json())
        .then(json => {
            if (json.snapshot.status == 'SUCCESS') {
                let rawMap = json.snapshot.currentMap.split('/');
                let Map = rawMap[3];
                const maps = {
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
                    XP4_WalkerFactory: 'Giants of Karelia',
                    XP5_Night_01: 'Zavod: Graveyard Shift',
                    XP6_CMP: 'Operation Outbreak',
                    XP7_Valley: 'Dragon Valley 2015'
                };
                return maps[Map]
            } else {
                throw new Exception(`Invalid fetch status`);
            }
        });
}

async function fetchMax(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(res => res.json())
        .then(json => {
            if (json.snapshot.status == 'SUCCESS') {
                const maxp = json.snapshot.maxPlayers

                return maxp;
            } else {
                throw new Exception(`Invalid fetch status`);
            }
        });
}

async function fetchMode(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(res => res.json())
        .then(json => {
            if (json.snapshot.status == 'SUCCESS') {
                let modes = json.snapshot.gameMode
                const fixed = {
                    ConquestLarge: 'Conquest Large',
                    ConquestSmall: 'Conquest Small',
                    Domination: 'Domination',
                    Elimination: 'Defuse',
                    Obliteration: 'Obliteration',
                    RushLarge: 'Rush',
                    SquadDeathMatch: 'Squad Deathmatch',
                    TeamDeathMatch: 'Team Deathmatch',
                    SquadObliteration: 'Squad Obliteration',
                    GunMaster: 'Gun Master',
                };
                return fixed[modes]
            }
            else {
                throw new Exception(`Invalid fetch status`);
            }
        });
}

async function fetchInfo_1(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(response => response.data)
        .then(json => {
            if (json.snapshot.status == 'SUCCESS') {
                let totalPlayers_1;

                let snapshot = json.snapshot.teamInfo;
                totalPlayers_1 = (snapshot["1"].players);
                let result = [];
                for (const key in totalPlayers_1) {
                    let kills = totalPlayers_1[key].kills;
                    let deaths = totalPlayers_1[key].deaths;
                    let scores = totalPlayers_1[key].score;
                    let name = totalPlayers_1[key].name;

                    result.push(scores, kills, deaths, name);
                }
                return result
            }
            else {
                throw new Exception(`Invalid fetch status`);
            }
        })
}

async function fetchInfo_2(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(response => response.data)
        .then(json => {
            if (json.snapshot.status == 'SUCCESS') {
                let totalPlayers_2;

                let snapshot = json.snapshot.teamInfo;
                totalPlayers_2 = (snapshot["2"].players);
                let result = [];
                for (const key in totalPlayers_2) {
                    let kills = totalPlayers_2[key].kills;
                    let deaths = totalPlayers_2[key].deaths;
                    let scores = totalPlayers_2[key].score;
                    let name = totalPlayers_2[key].name;

                    result.push(scores, kills, deaths, name);
                }
                return result
            }
            else {
                throw new Exception(`Invalid fetch status`);
            }
        })
}

async function queue(guid) {
    return fetch(`https://keeper.battlelog.com/snapshot/${guid}`)
        .then(response => response.data)
        .then(json => {
            if (json.snapshot.status == 'SUCCESS') {
                let queue = json.snapshot.waitingPlayers;

                return queue;
            } else {
                throw new Exception(`Invalid fetch status`);
            }
        });
}


function count(obj, ignoreNull) {
    if (!obj) return 0;
    var c = 0;
    for (var _i in obj) {
        if (ignoreNull) {
            if (obj[_i] === null || obj[_i] === undefined) continue;
            c++;
        } else {
            c++;
        }
    }
    return c;
}

module.exports = { // for another file
    fetchPlayerCounts: fetchPlayerCounts,
    fetchMaps: fetchMaps,
    fetchMode: fetchMode,
    fetchMax: fetchMax,
    fetchInfo_1: fetchInfo_1,
    fetchInfo_2: fetchInfo_2,
    fetchPlayerCounts_team_1: fetchPlayerCounts_team_1,
    fetchPlayerCounts_team_2: fetchPlayerCounts_team_2,
    queue: queue
};