const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const BasePlugin = require("./basePlugin");

// Global map to store plugin information: plugin name -> last modified time
const loadedPlugins = new Map();

/**
 * Dynamically install a module if it is missing in the plugin's directory.
 * @param {string} moduleName - The name of the module to check and install.
 * @param {string} pluginDir - The path to the plugin directory.
 */
function ensureModuleInstalled(moduleName, pluginDir) {
    try {
        // Check if the module is already installed locally in the plugin directory
        require.resolve(path.join(pluginDir, 'node_modules', moduleName));
        console.log(`[Dynamic Loader] Module "${moduleName}" is already installed in plugin directory.`);
    } catch (err) {
        console.log(`[Dynamic Loader] Installing missing module: "${moduleName}" in plugin directory...`);
        try {
            // Install the module locally in the plugin directory using npm
            execSync(`npm install ${moduleName} --prefix ${pluginDir}`, { stdio: "inherit" });
            console.log(`[Dynamic Loader] Successfully installed "${moduleName}" in plugin directory.`);
        } catch (installErr) {
            console.error(`[Dynamic Loader] Failed to install "${moduleName}" in plugin directory:`, installErr);
            throw installErr;
        }
    }
}

/**
 * Loads a plugin from its directory, checking if it needs to be reloaded.
 * @param {Object} bc - The BattleCon client or your main application context.
 * @param {string} pluginDir - The directory of the plugin.
 * @param {string} pluginName - The name of the plugin.
 * @returns {boolean} - Returns true if the plugin was successfully loaded or reloaded, false otherwise.
 */
function loadPlugin(bc, pluginDir, pluginName) {
    const pluginMainFile = path.join(pluginDir, 'plugin.js');  // Assuming the main plugin file is `plugin.js`

    try {
        const packageJsonPath = path.join(pluginDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const pluginPackage = require(packageJsonPath);
            const dependencies = pluginPackage.dependencies || {};
            for (const dep in dependencies) {
                ensureModuleInstalled(dep, pluginDir);
            }
        }

        const PluginClass = require(pluginMainFile);

        // Check if the plugin extends BasePlugin
        if (PluginClass.prototype instanceof BasePlugin) {
            // If it's a new plugin or it has been modified, load it
            const pluginStat = fs.statSync(pluginMainFile);
            if (!loadedPlugins.has(pluginName) || loadedPlugins.get(pluginName) !== pluginStat.mtimeMs) {
                new PluginClass(bc); // Initialize the plugin
                loadedPlugins.set(pluginName, pluginStat.mtimeMs); // Store the last modified time
                console.log(`Loaded plugin: ${pluginName}`);
                return true;
            } else {
                console.log(`Plugin "${pluginName}" is already loaded and unchanged.`);
                return false;
            }
        } else {
            console.warn(`Skipped plugin "${pluginName}" as it does not extend BasePlugin.`);
            return false;
        }
    } catch (err) {
        console.error(`Failed to load plugin "${pluginName}":`, err);
        return false;
    }
}

/**
 * Reloads the plugins, only loading those that have changed or are new.
 * @param {Object} bc - The BattleCon client or your main application context.
 * @param {string} folderPath - The path to the plugins directory.
 */
function reloadPlugins(bc, folderPath = "../plugins") {
    const absolutePath = path.resolve(__dirname, folderPath);

    try {
        const pluginDirs = fs.readdirSync(absolutePath).filter(file => fs.statSync(path.join(absolutePath, file)).isDirectory());

        pluginDirs.forEach((pluginName) => {
            const pluginDir = path.join(absolutePath, pluginName);
            loadPlugin(bc, pluginDir, pluginName);
        });
    } catch (err) {
        console.error(`Failed to read plugins folder: ${absolutePath}`, err);
    }
}

/**
 * Loads a single plugin by its name.
 * @param {Object} bc - The BattleCon client or your main application context.
 * @param {string} pluginName - The name of the plugin to load.
 * @param {string} folderPath - The directory to search for plugins.
 * @returns {boolean} - Returns true if the plugin was successfully loaded, false otherwise.
 */
function loadSinglePlugin(bc, pluginName, folderPath = "../plugins") {
    const absolutePath = path.resolve(__dirname, folderPath);
    const pluginDir = path.join(absolutePath, pluginName);

    if (fs.existsSync(pluginDir) && fs.statSync(pluginDir).isDirectory()) {
        return loadPlugin(bc, pluginDir, pluginName);
    } else {
        console.error(`Plugin "${pluginName}" does not exist in the directory "${folderPath}".`);
        return false;
    }
}

module.exports = { loadPlugins: reloadPlugins, loadSinglePlugin };