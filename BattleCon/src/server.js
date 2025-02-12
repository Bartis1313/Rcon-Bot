const express = require("express");
const bodyParser = require("body-parser");
import BattleConClient from "./BattleConClient"
const docsData = require("../eadocs/commands.json");

const client = new BattleConClient(process.env.RCON_HOST, process.env.RCON_PORT, process.env.RCON_PASS, process.env.GAME)
client.connect()

let serverName = null;
const serverNameUpdater = (req, res, next) => {
    client.serverInfo()
        .then((response) => {
            serverName = response[0]
        })
        .catch(err => {

            serverName = null
        })

    next()
}

const app = express();
app.use(serverNameUpdater)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = app.listen(process.env.BATTLECON_PORT || 3000, () => {
    console.log(`Server running on port ${process.env.BATTLECON_PORT || 3000}`);
});

// const checkClientVersion = () => {
//     client.version()
//         .catch((err) => {
//             console.error("Error in client.version():", err);
//             process.exit(1);
//         });
// };

// setTimeout(() => {
//     setInterval(() => {
//         checkClientVersion();
//     }, 10000);
// }, 60000);

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated')
    })
})

const path = require("path");

app.all('/', (req, res) => {
    //console.log('requested shi');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get("/serverName", (req, res, next) => {
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: null });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});


app.get("/version", (req, res, next) => {
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});

app.get("/serverInfo", (req, res, next) => {
    client.serverInfo()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});


app.post("/admin/kill", (req, res, next) => {
    let playerName = req.body.playerName;

    client.killPlayer(playerName)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});

app.post("/admin/kick", (req, res, next) => {
    let playerName = req.body.playerName;
    let reason = req.body.reason;

    client.kickPlayer(playerName, reason)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});

app.post("/admin/ban", (req, res, next) => {
    let banType = req.body.banType;
    let playerName = req.body.playerName;
    let timeout = req.body.timeout;
    let reason = req.body.reason;

    client.banPlayer(banType, playerName, timeout, reason)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});
app.post("/reservedslots", (req, res, next) => {
    let soldierName = req.body.soldierName;

    client.vipPlayer(soldierName)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});

app.get("/players", (req, res, next) => {
    client.listPlayers()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});

app.get("/team", (req, res, next) => {
    client.team(req.query.id)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});

app.get("/serverfps", (req, res, next) => {
    client.serverFPS()

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.get("/listOfMaps", (req, res, next) => {
    const isPretty = req.query.pretty ? req.query.pretty === 'true' : false;

    client.listOfMaps()

        .then((response) => {
            const formattedResponse = {
                totalMaps: parseInt(response[0]),   // map count
                unknown: parseInt(response[1]),     // ???
                maps: []                            // map, mode, rounds
            };

            for (let i = 2; i < response.length; i += 3) {
                formattedResponse.maps.push([
                    isPretty ? client.getPrettyMap(response[i]) : response[i],
                    isPretty ? client.getPrettyMode(response[i + 1]) : response[i + 1],
                    parseInt(response[i + 2]) // rounds
                ]);
            }
            res.json({ status: "OK", server: serverName, data: formattedResponse });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/setMapIndex", (req, res, next) => {
    const indexNum = req.body.indexNum;
    client.setNextMap(indexNum)

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.get("/printBans", (req, res, next) => {
    client.printBanList()

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/admin/unban", (req, res, next) => {
    let banType = req.body.banType;
    let banId = req.body.banId;
    client.unban(banType, banId)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.get("/getInfo", (req, res, next) => {
    client.getAllInfo()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.get("/getIndices", (req, res, next) => {
    client.getMapIndices()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/switchPlayer", (req, res, next) => {
    let playerName = req.body.playerName;
    let teamId = req.body.teamId;
    let squadId = req.body.squadId;
    let force = req.body.force
    client.switchPlayer(playerName, teamId, squadId, force)

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/admin/sayall", (req, res, next) => {
    let what = req.body.what;
    client.adminSayall(what)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response })
        })
        .catch(err => {
            console.log(err)
            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/admin/psay", (req, res, next) => {
    let what = req.body.what;
    let playerName = req.body.playerName;
    client.adminSayPlayer(what, playerName)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response })
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/admin/yellall", (req, res, next) => {
    let what = req.body.what;
    let duration = req.body.duration;
    client.adminYellall(what, duration)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response })
        })
        .catch(err => {
            console.log(err)
            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/admin/pyell", (req, res, next) => {
    let what = req.body.what;
    let duration = req.body.duration;
    let playerName = req.body.playerName;
    client.adminYellPlayer(what, duration, playerName)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response })
        })
        .catch(err => {
            console.log(err)
            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/admin/sayall", (req, res, next) => {
    let what = req.body.what;
    client.adminSayall(what)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response })
        })
        .catch(err => {
            console.log(err)
            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/custom", (req, res, next) => {
    let command = req.body.command;
    let params = req.body.params;

    client.customCommand(command, params)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response })
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.get("/getMapIndices", (req, res, next) => {
    client.getMapIndices()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.get("/getMapsModesRaw", (req, res, next) => {
    const maps = client.getMapsRaw();
    const modes = client.getModesRaw();

    const isPretty = req.body?.pretty;

    res.json({ status: "OK", server: serverName, data: { maps, modes } });
})

app.get("/getCommands", (req, res, next) => {
    const commands = client.getCommands()

    res.json({ status: "OK", server: serverName, data: commands });
})

app.get("/getDocs", (req, res, next) => {

    res.json({ status: "OK", server: serverName, data: docsData });
})

app.get("/isOkay", (req, res, next) => {
    const isBusy = client.isBusy();
    if (isBusy) {
        res.status(400).send({ status: "FAILED", server: serverName, error: "Server is in reconnecting state" });
    }

    // now check if somehow socket is stuck
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: null });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err });
        })
})