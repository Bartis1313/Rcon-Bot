class BasePlugin {
    constructor(bc, pluginName) {
        this.bc = bc;
        this.pluginName = pluginName;
    }

    /**
     * Registers an event listener for a specific event.
     * @param {string} eventName - The name of the event.
     * @param {function} handler - The function to handle the event.
     * 
     * This misses validation of event, any way to scrap all by one?
     */
    onEvent(eventName, handler) {
        this.bc.onEvent(eventName, handler);
    }

    /**
     * Executes raw ecent.
     * @param {string|string[]} command - The name of the event, array is name + possible arguments
     * @param {function} callback - The function to handle the exec response.
     */
    exec(command, callback) {
        if(this.bc.commands.includes(command.length ? command[0] : command)) {
            console.error(`${command[0]} is not a command!`);
            return;
        }

        this.bc.exec(command, callback);
    }
}

module.exports = BasePlugin;