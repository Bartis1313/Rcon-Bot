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
}

module.exports = BasePlugin;