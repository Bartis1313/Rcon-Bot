const fetch = require('node-fetch')

async function count(url) {
    return fetch(`${url}/count`, {
        method: "post",
        headers: {
            "Content-type": "application/json",
            "Accept": "application/json",
            "Accept-Charset": "utf-8"
        },
    })
        .then(response => response.json())
        .then(json => {
            let str = json.data.players.length;
            return (`Players: ${str}/64`)
        })
        .catch(err => {
            console.log(err)
            return ("Api error occured");
        })
}

module.exports = {
    count: count
}