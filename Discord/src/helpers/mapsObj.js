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

export { getMapObj, getModesObj }