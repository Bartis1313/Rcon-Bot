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
     * Executes a raw command.
     * @param {string|string[]} command - The name of the command, array is name + possible arguments
     * @returns {Promise<any>} - A promise that resolves with the command response.
     */
    async exec(command) {
        const cmdName = Array.isArray(command) ? command[0] : command;
        if (!this.bc.commands.includes(cmdName)) {
            console.error(`${cmdName} is not a valid command!`);
            return Promise.reject(new Error(`${cmdName} is not a valid command!`));
        }

        try {
            return new Promise((resolve, reject) => {
                this.bc.exec(command, (err, msg) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(msg);
                    }
                });
            });
        } catch (error) {
            console.error('Error executing command:', error);
            throw error;
        }
    }
}

module.exports = BasePlugin;