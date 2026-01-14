const { withAppDelegate } = require('expo/config-plugins');

const withFirebaseConfiguration = (config) => {
    return withAppDelegate(config, (config) => {
        const { modResults } = config;
        if (modResults.language === 'swift') {
            const contents = modResults.contents;
            const firebaseConfigure = 'FirebaseApp.configure()';

            // Check if the file already contains the safe check
            if (!contents.includes('if (FirebaseApp.app() == nil) {')) {
                // Replace the naked configure call with the safe one
                // We look for the auto-generated comment block if possible, or just the line
                modResults.contents = contents.replace(
                    firebaseConfigure,
                    `if (FirebaseApp.app() == nil) {\n      ${firebaseConfigure}\n    }`
                );
            }
        }
        return config;
    });
};

module.exports = withFirebaseConfiguration;
