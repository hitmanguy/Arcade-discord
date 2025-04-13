"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleManager = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const promises_1 = require("fs/promises");
const LogManager_1 = require("./LogManager");
class ModuleManager {
    static async getAllModulePaths(directory) {
        const dirents = await (0, promises_1.readdir)(directory, { withFileTypes: true });
        const files = await Promise.all(dirents.map(async (dirent) => {
            const res = path_1.default.resolve(directory, dirent.name);
            if (dirent.isDirectory()) {
                return ModuleManager.getAllModulePaths(res);
            }
            else if (dirent.name.endsWith('.ts') || dirent.name.endsWith('.js')) {
                return res;
            }
            return null;
        }));
        return files.flat().filter((file) => file !== null);
    }
    static async importModule(modulePath) {
        try {
            return await Promise.resolve(`${modulePath}`).then(s => tslib_1.__importStar(require(s)));
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error importing module: ${modulePath}`, err);
            return null;
        }
    }
    static clearModuleCache(modulePath) {
        const resolvedPath = require.resolve(modulePath);
        if (require.cache[resolvedPath]) {
            delete require.cache[resolvedPath];
        }
    }
    static async clearModulesInDirectory(directory) {
        try {
            const dirents = await (0, promises_1.readdir)(directory, { withFileTypes: true });
            const clearPromises = dirents.map(async (dirent) => {
                const modulePath = path_1.default.resolve(directory, dirent.name);
                if (dirent.isDirectory()) {
                    await ModuleManager.clearModulesInDirectory(modulePath);
                }
                else if (dirent.name.endsWith('.ts') || dirent.name.endsWith('.js')) {
                    ModuleManager.clearModuleCache(modulePath);
                }
            });
            await Promise.all(clearPromises);
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error clearing modules in directory: ${directory}`, err);
        }
    }
}
exports.ModuleManager = ModuleManager;
//# sourceMappingURL=ModuleManager.js.map