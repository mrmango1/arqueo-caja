const { withPodfile } = require('expo/config-plugins');

const withModularHeaders = (config) => {
    return withPodfile(config, (config) => {
        const podfileContent = config.modResults.contents;
        // Add use_modular_headers! if not present
        if (!podfileContent.includes('use_modular_headers!')) {
            config.modResults.contents = `use_modular_headers!\n${podfileContent}`;
        }
        return config;
    });
};

module.exports = withModularHeaders;
