let pendingEnforceMatch = null;
let waitingForBanned = false;

module.exports = class ExamplePlugin extends BasePlugin {
    static dependencies = ["axios", "lodash"]; // use any module we want, here not used, but possible :)

    constructor(bc) {
        super(bc, "ExamplePlugin");

        this.onEvent("player.onJoin", ([name, uid]) => {
            //console.log(`[${this.pluginName}] Player joined: ${name} (UID: ${uid})`);

            const axios = require("axios");
            // and then we use some api...
        });

        this.onEvent("player.onChat", ([name, text, ...subset]) => {
            if (text.toLowerCase().includes("admin decision") || text.toLowerCase().includes("admindecision")) {
                console.log("ADM case ", text, " SUBSET", subset);
            }

            if(text.includes("ACI Live")) {
                console.log("ACI case ", text);
            }

            // console.log("Subset", subset);
            //console.log(`[${this.pluginName}] ${name} said: ${text}`);

            if (name !== 'Server') return;

            let playerNameSay = '';
            if (subset[0] === 'player') { // or even check squad? who does provide info like that?
                playerNameSay = subset[1];
            }

            const fixedText = playerNameSay ? `${playerNameSay} ${text}` : text;

            const youKickedRegex = fixedText.match(/([A-Za-z0-9-]+): You KICKED (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]*).*?for (.+)/);
            // this will show in bans, therefore we'll log only rejoin attempts
            const kickedRegex = fixedText.match(/(\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) KICKED by (\S+) for (.+)/);
            const enforceMatch = fixedText.match(/Enforcing (\S+(?: \(.+?\))? ban) on (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) for (.+)/);
            const bannedMatch = fixedText.match(/(\S+) BANNED for (.+?) \[(perm|\d{1,2}[wdhms](?:\d{1,2}[wdhms]?)*)\](?:\[([^\]]+)\])/);
            const bannedMatch2 = fixedText.match(/BANNED for (.+?) \[([^\]]+)\]\[([^\]]+)\]/);

            if (youKickedRegex) {

                console.log("youKickedRegex", youKickedRegex);
                //console.log("text", fixedText);
            }
            if (kickedRegex) {
                console.log("kickedRegex", kickedRegex);
                //console.log("text", fixedText);
            }

            if (bannedMatch2) {
                //console.log("bannedMatch2", bannedMatch2);
            }
            if (enforceMatch) {
                //console.log("enforceMatch", enforceMatch);
                //console.log("text", fixedText);
            }
            if (bannedMatch) {
                //console.log("bannedMatch", bannedMatch);
                //console.log("text", fixedText);
            }

            if (enforceMatch) {

                // temp temp
                //console.log("enforematch text: ", fixedText);

                pendingEnforceMatch = enforceMatch;
                waitingForBanned = true;
                return; // stop there, we dont have issuer yet
            }


            if (waitingForBanned) {


                if (bannedMatch) { // we are doing it that way, because the bannedMatch will be executed many times, the enforce not
                    let duration;
                    let reason = pendingEnforceMatch[3];
                    duration = bannedMatch[3];
                    let kicker = bannedMatch[4];


                    let kicked = playerNameSay;

                    console.log("bannedMatch", bannedMatch);
                    console.log("pendingEnforceMatch", pendingEnforceMatch);

                    waitingForBanned = false;
                    pendingEnforceMatch = null;


                    console.log(`Name: ${kicked} Reason: ${reason} Duration: ${duration} By: ${kicker}`);
                }

            }



            // exec
            // this.exec('version', (err, msg) => {
            //     err ? console.warn("Error version: ", err) : console.log("Raw version response: ", msg);
            // });
        });

        // We can load this as well
        this.onEvent("player.onChat", ([name, text]) => {
            //console.log(`[${this.pluginName}] [Secondary] ${name} mentioned: "${text}"`);
        });
    }
};