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
 * Loads the BF3 module.
 * @param {!BattleCon} bc
 */
module.exports = (bc) => {

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
        SquadRush0: 'Squad Rush',
        CaptureTheFlag0: "CTF",
    };

    bc.gameModes = gameModes;

    const gameMaps = {
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

    bc.gameMaps = gameMaps;
};
