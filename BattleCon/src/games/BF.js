/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * Loads the BF (common) module.
 * @param {!BattleCon} bc
 */
module.exports = function (bc) {
    // Extends core
    bc.use("core");

    const eventListeners = {};

    /**
     * Registers an event listener for a specific event type.
     * @param {string} eventName - The name of the event.
     * @param {function} handler - The function to handle the event.
     */
    bc.onEvent = (eventName, handler) => {
        if (!eventListeners[eventName]) {
            eventListeners[eventName] = [];
        }
        eventListeners[eventName].push(handler);
    };

    /**
     * Handles incoming messages dynamically.
     * @param {Object} msg - The incoming message.
     */
    bc.on("event", (msg) => {
        const [eventName, ...data] = msg.data;

        if (eventListeners[eventName]) {
            for (const listener of eventListeners[eventName]) {
                try {
                    listener(data);
                } catch (err) {
                    console.error(`Error in event "${eventName}":`, err);
                }
            }
        } else {
            // console.warn(`No handlers registered for event "${eventName}"`);
        }
    });
};