const { withAppDelegate } = require('expo/config-plugins');

const withFirebaseConfiguration = (config) => {
    return withAppDelegate(config, (config) => {
        const { modResults } = config;
        if (modResults.language === 'swift') {
            let contents = modResults.contents;

            // 1. Ensure FirebaseCore is imported
            if (!contents.includes('import FirebaseCore')) {
                contents = contents.replace(/import Expo/, 'import Expo\nimport FirebaseCore');
            }

            // 2. Remove any existing Firebase configure blocks to start clean
            // Remove the @generated block if it exists
            contents = contents.replace(/\/\/ @generated begin @react-native-firebase\/app-didFinishLaunchingWithOptions[\s\S]*?\/\/ @generated end @react-native-firebase\/app-didFinishLaunchingWithOptions/g, '');

            // Remove any manual nil-checked blocks or naked calls
            contents = contents.replace(/if \(FirebaseApp\.app\(\) == nil\) \{[\s\S]*?FirebaseApp\.configure\(\)[\s\S]*?\}/g, '');
            contents = contents.replace(/FirebaseApp\.configure\(\)/g, '');

            // 3. Insert it at the absolute beginning of the didFinishLaunchingWithOptions function
            // This ensures it runs BEFORE any other module initialization (like RCTAppDependencyProvider)
            const firebaseInit = 'if (FirebaseApp.app() == nil) {\n      FirebaseApp.configure()\n    }';

            const searchPattern = /func application\([^{]*\) -> Bool \{/;
            contents = contents.replace(searchPattern, (match) => `${match}\n    ${firebaseInit}`);

            modResults.contents = contents;
        }
        return config;
    });
};

module.exports = withFirebaseConfiguration;
