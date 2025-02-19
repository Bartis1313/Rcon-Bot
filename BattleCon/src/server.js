const express = require("express");
const bodyParser = require("body-parser");
import BattleConClient from "./BattleConClient"

const docsData = require("../eadocs/commands.json");
const typesData = require("../eadocs/types.json");

const client = new BattleConClient(process.env.RCON_HOST, process.env.RCON_PORT, process.env.RCON_PASS, process.env.GAME)
client.connect();

const serverNameUpdater = (req, res, next) => {
    client.serverInfo()
        .then(response => {
            req.serverName = response[0];
        })
        .catch(() => {
            req.serverName = null;
        })
        .finally(() => next());
}

const handleError = (err, res) => {
    const date = new Date();
    console.error(`[API] ${date.toLocaleString()} in ${new Error().stack}`, err);
    res.status(400).json({ status: "FAILED", server: req.serverName, error: String(err) });
}

const clientChecker = (req, res, next) => {
    client.isBusy()
        .then(isBusy => {
            if (isBusy) {
                handleError("client is busy", res);
                return;
            }
            next();
        })
        .catch(err => {
            handleError(err, res);
        });
};

// use if you expose for public api use
const validateParams = (params) => {
    return (req, res, next) => {
        const missingParams = params.filter(param => !req.body[param] || req.body[param].trim() === "");

        if (missingParams.length > 0) {
            return handleError(`missing or invalid parameters: ${missingParams.join(", ")}`, res);
        }

        next();
    };
}

const app = express();

app.use(serverNameUpdater);
app.use(clientChecker);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const server = app.listen(process.env.BATTLECON_PORT || 3000, () => {
    console.log(`Server running on port ${process.env.BATTLECON_PORT || 3000}`);
})

app.get("/serverName", (req, res, next) => {
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: null });
        })
        .catch(err => {
            handleError(err, res);
        })
});


app.get("/version", (req, res, next) => {
    client.version()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});

app.get("/serverInfo", (req, res, next) => {
    client.serverInfo()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});


app.post("/admin/kill", (req, res, next) => {
    let playerName = req.body.playerName;

    client.killPlayer(playerName)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});

app.post("/admin/kick", (req, res, next) => {
    let playerName = req.body.playerName;
    let reason = req.body.reason;

    client.kickPlayer(playerName, reason)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});

app.post("/admin/ban", (req, res, next) => {
    let banType = req.body.banType;
    let banId = req.body.banId;
    let timeout = req.body.timeout;
    let reason = req.body.reason;

    client.banPlayer(banType, banId, timeout, reason)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});
app.post("/reservedslots", (req, res, next) => {
    let soldierName = req.body.soldierName;

    client.vipPlayer(soldierName)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});

app.get("/players", (req, res, next) => {
    client.listPlayers()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});

app.get("/team", (req, res, next) => {
    client.team(req.query.id)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
});

app.get("/serverfps", (req, res, next) => {
    client.serverFPS()

        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
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
            res.json({ status: "OK", server: req.serverName, data: formattedResponse });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/setMapIndex", (req, res, next) => {
    const indexNum = req.body.indexNum;
    client.setNextMap(indexNum)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.get("/printBans", (req, res, next) => {
    client.printBanList()

        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/unban", (req, res, next) => {
    let banType = req.body.banType;
    let banId = req.body.banId;
    client.unban(banType, banId)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.get("/getInfo", (req, res, next) => {
    client.getAllInfo()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.get("/getIndices", (req, res, next) => {
    client.getMapIndices()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/switchPlayer", (req, res, next) => {
    let playerName = req.body.playerName;
    let teamId = req.body.teamId;
    let squadId = req.body.squadId;
    let force = req.body.force
    client.switchPlayer(playerName, teamId, squadId, force)

        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/sayall", (req, res, next) => {
    let what = req.body.what;
    client.adminSayall(what)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/say", (req, res, next) => {
    let what = req.body.what;
    let sub = req.body.sub;
    client.adminSayall(what, sub)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/psay", (req, res, next) => {
    let what = req.body.what;
    let playerName = req.body.playerName;
    client.adminSayPlayer(what, playerName)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/yellall", (req, res, next) => {
    let what = req.body.what;
    let duration = req.body.duration;
    client.adminYellall(what, duration)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/pyell", (req, res, next) => {
    let what = req.body.what;
    let duration = req.body.duration;
    let playerName = req.body.playerName;
    client.adminYellPlayer(what, duration, playerName)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/admin/sayall", (req, res, next) => {
    let what = req.body.what;
    client.adminSayall(what)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.post("/custom", (req, res, next) => {
    let command = req.body.command;
    let params = req.body.params;

    client.customCommand(command, params)
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response })
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.get("/getMapIndices", (req, res, next) => {
    client.getMapIndices()
        .then((response) => {
            res.json({ status: "OK", server: req.serverName, data: response });
        })
        .catch(err => {
            handleError(err, res);
        })
})

app.get("/getMapsModesRaw", (req, res, next) => {
    const maps = client.getMapsRaw();
    const modes = client.getModesRaw();

    res.json({ status: "OK", server: req.serverName, data: { maps, modes } });
})

app.get("/getCommands", (req, res, next) => {
    const commands = client.getCommands()

    res.json({ status: "OK", server: req.serverName, data: commands });
})

app.get("/getDocs", (req, res, next) => {

    res.json({ status: "OK", server: req.serverName, data: docsData });
})

app.get("/getTypes", (req, res, next) => {

    res.json({ status: "OK", server: req.serverName, data: typesData });
})

app.get("/isOkay", (req, res, next) => {
    client.isBusy()
        .then(isBusy => {
            if (isBusy) {
                handleError("Server is in reconnecting state", res);
                return;
            }

            // now check if somehow socket is stuck
            client.version()
                .then(response => {
                    res.json({ status: "OK", server: req.serverName, data: null });
                })
                .catch(err => {
                    handleError(err, res);
                });
        })
        .catch(err => {
            handleError(err, res);
        });
});
