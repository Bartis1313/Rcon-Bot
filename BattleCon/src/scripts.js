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

const ticketsScript = async (connection) => {
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

                const mapName = getMapObj('BF4')[data[i]];
                const modeName = getModesObj('BF4')[data[i + 1]];

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

    let tickets = 100;

    if (mapObj.modeName == "Conquest Large") {
        if (playerCount <= 29) {
            tickets = 100;
        }
        if (playerCount >= 45) {
            tickets = 125;
        }
    }
    else if (mapObj.modeName == "Conquest Small") {
        if (playerCount <= 29) {
            tickets = 150;
        }
        if (playerCount >= 45) {
            tickets = 200;
        }
    }
    else if (mapObj.modeName == "Rush") {

        if (playerCount <= 29) {
            tickets = 150;
        }
        if (playerCount >= 45) {
            tickets = 250;
        }
    }

    const sayAll = (str) => {
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

    connection.exec(`vars.gameModeCounter ${tickets}`, async function (err, msg) {
        await sayAll(`Tickets: ${tickets}%`);
    });
}

const tickrateScript = async (chat) => {
    if (process.env.GAME !== 'BF4') return;

    if (!chat.startsWith("Next Map: ")) return;

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

    for(const m of maps40) {
        if(mapObj.mapName == m) {
            tick = 40;
            break;
        }
    }

    connection.exec(`vars.OutHighFrequency ${tick}`, async function (err, msg) {
        
    });
}

export { ticketsScript, tickrateScript };