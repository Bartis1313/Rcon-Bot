module.exports = class ExamplePluginSecond extends BasePlugin {
    constructor(bc) {
        super(bc, "ExamplePluginSecond");

        this.onEvent("player.onJoin", ([name, uid]) => {
            //console.log("Basic basic join :)")
        });
    }
};