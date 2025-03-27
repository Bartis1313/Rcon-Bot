module.exports = class TimeLimiter extends BasePlugin {
    constructor(bc) {
        super(bc, "TimeLimiter");

        if (!process.env.TIME_LIMIT)
            return;

        this.timeCtf = 50;
        this.defaultTime = 100;

        this.onRoundOverHandler = this.onRoundOverHandler.bind(this);
        this.onEvent("server.onRoundOver", this.onRoundOverHandler);
    }

    async onRoundOverHandler() {
        const [currentIdx, nextIdx] = await this.exec("mapList.getMapIndices");
        const maps = await this.exec("mapList.list");

        const formattedResponse = {
            totalMaps: parseInt(maps[0]),   // map count
            unknown: parseInt(maps[1]),     // ???
            maps: []                        // map, mode, rounds
        };

        for (let i = 2; i < maps.length; i += 3) {
            formattedResponse.maps.push([
                maps[i], // map
                maps[i + 1], // mode
                parseInt(maps[i + 2]) // rounds
            ]);
        }

        if (formattedResponse.maps[nextIdx][1] === "CaptureTheFlag0") {
            await this.exec(["vars.roundTimeLimit", this.timeCtf.toString()]);
        }
        else {
            await this.exec(["vars.roundTimeLimit", this.defaultTime.toString()]);
        }
    }
};
