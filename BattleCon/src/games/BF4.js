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

/**
 * Loads the BF4 module.
 * @param {!BattleCon} bc
 */
module.exports = function (bc) {

    // Extends BF (common)
    bc.use("BF");

    // BF3 / BF4
    const gameModes = {
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
    };

    bc.gameModes = gameModes;

    const gameMaps = {
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

    bc.gameMaps = gameMaps;
};
