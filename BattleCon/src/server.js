var config = require("config")
var express = require("express");
var bodyParser = require("body-parser");
var app = express();
import BattleConClient from "./BattleConClient"


var serverName = null
var client = new BattleConClient(process.env.RCON_HOST || config.host, process.env.RCON_PORT || config.port, process.env.RCON_PASS || config.pass)

client.connect()

var serverNameUpdater = function (req, res, next) {
    if (!serverName) {
        client.serverInfo()
            .then((response) => {
                serverName = response[0]
            })
            .catch(err => {

                serverName = null
            })
    }

    next()
}


app.use(serverNameUpdater)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.listen(process.env.BATTLECON_PORT || 3000, () => {
    console.log(`Server running on port ${process.env.BATTLECON_PORT || 3000}`);
});

// this will run always, if error then new process is generated
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated')
    })
})

app.get("/serverName", (req, res, next) => {
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: null });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server name.' })
        })
});


app.get("/version", (req, res, next) => {
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server version.' })
        })
});

app.get("/serverInfo", (req, res, next) => {
    client.serverInfo()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server information.' })
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
    let banId = req.body.banId;
    let timeout = req.body.timeout;
    let banReason = req.body.banReason;

    client.banPlayer(banType, banId, timeout, banReason)
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
});
app.post("/reservedslots", (req, res, next) => {
    try {
        let soldierName = req.body.soldierName;

        client.vipPlayer(soldierName)
            .then((response) => {
                res.json({ status: "OK", server: serverName, data: response });
            })
            .catch(err => {

                res.status(400).send({ status: "FAILED", server: serverName, error: err })
            })
    }
    catch (err) {
        console.log(err)
    }
});

app.get("/players", (req, res, next) => {
    try {
        client.listPlayers()
            .then((response) => {
                res.json({ status: "OK", server: serverName, data: response });
            })
            .catch(err => {

                res.status(400).send({ status: "FAILED", server: serverName, error: err })
            })
    }
    catch (err) {

    }
});

app.post("/count", (req, res, next) => {
    try {
        client.listPlayers()
            .then((response) => {
                res.json({ status: "OK", server: serverName, data: response });
            })
            .catch(err => {

                res.status(400).send({ status: "FAILED", server: serverName, error: err })
            })
    }
    catch (err) {

    }
});



app.post("/team_1", (req, res, next) => {
    client.team_1()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server players.' })
        })
});

app.post("/team_2", (req, res, next) => {
    client.team_2()

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server players.' })
        })
});

app.post("/serverfps", (req, res, next) => {
    client.serverFPS()

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server name.' })
        })
})

app.post("/listOfMaps", (req, res, next) => {
    client.listOfMaps()

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request server map list.' })
        })
})

app.post("/setMapIndex", (req, res, next) => {

    let indexNum = req.body.indexNum
    client.setNextMap(indexNum)

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to set index for next map.' })
        })
})

app.post("/printBans", (req, res, next) => {
    client.printBanList()

        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: 'Failed to request banlist.' })
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

app.post("/getInfo", (req, res, next) => {
    client.getAllInfo()
        .then((response) => {
            res.json({ status: "OK", server: serverName, data: response });
        })
        .catch(err => {

            res.status(400).send({ status: "FAILED", server: serverName, error: err })
        })
})

app.post("/getIndices", (req, res, next) => {
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

