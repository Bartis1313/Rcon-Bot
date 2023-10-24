var config = require("config")

const getVer = (url) => {
    const match = url.match(/\d+/);
    if(match) {
        const num = parseInt(match[0], 10);
        
        let vers = [];
        if (process.env.BATTLECON_GAMES) {
            vers = process.env.BATTLECON_GAMES.split(',')
        }

        return vers[num - 1];
    }

    return '';
}

export default getVer