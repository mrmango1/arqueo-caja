const { withXcodeProject, withInfoPlist } = require('expo/config-plugins');

/**
 * This plugin fixes the fastlane "same file" error that occurs when
 * the app name contains special/accented characters (like "Cuadre Fácil").
 * 
 * It ensures:
 * 1. PRODUCT_NAME in Xcode build settings uses only ASCII characters
 * 2. CFBundleName also uses ASCII to match the product name
 * 3. CFBundleDisplayName keeps the accented name (what users see)
 */

const ASCII_PRODUCT_NAME = 'CuadreFacil';

const withAsciiProductName = (config) => {
    // First, modify Info.plist to ensure CFBundleName is ASCII
    config = withInfoPlist(config, (config) => {
        // Keep display name with accent, but use ASCII for bundle name
        config.modResults.CFBundleName = ASCII_PRODUCT_NAME;

        // Ensure display name is set with the accented version
        if (!config.modResults.CFBundleDisplayName) {
            config.modResults.CFBundleDisplayName = 'Cuadre Fácil';
        }

        return config;
    });

    // Then, modify Xcode project build settings
    config = withXcodeProject(config, async (config) => {
        const xcodeProject = config.modResults;

        // Get all build configurations
        const configurations = xcodeProject.pbxXCBuildConfigurationSection();

        for (const key in configurations) {
            if (typeof configurations[key].buildSettings !== 'undefined') {
                const buildSettings = configurations[key].buildSettings;

                // Check if this is the app target (not Pods)
                // The app target has INFOPLIST_FILE pointing to the app's Info.plist
                if (buildSettings.INFOPLIST_FILE) {
                    const infoPlistPath = buildSettings.INFOPLIST_FILE;
                    // Check if this is the main app target (not a framework or extension)
                    if (typeof infoPlistPath === 'string' &&
                        !infoPlistPath.includes('Pods') &&
                        !infoPlistPath.includes('Tests')) {
                        // Set PRODUCT_NAME to ASCII-only version
                        buildSettings.PRODUCT_NAME = `"${ASCII_PRODUCT_NAME}"`;
                    }
                }
            }
        }

        return config;
    });

    return config;
};

module.exports = withAsciiProductName;
