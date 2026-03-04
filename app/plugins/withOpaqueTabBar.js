const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Config plugin that forces ALL iOS tab bars to use an opaque scrollEdgeAppearance.
 *
 * Uses UIAppearance proxy so it applies globally to any UITabBar instance,
 * regardless of where it sits in the view hierarchy (works with NativeTabs).
 */
function withOpaqueTabBar(config) {
  return withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;

    const fixCode = `
    // [withOpaqueTabBar] Force opaque tab bar to prevent scroll-edge transparency
    let tabBarAppearance = UITabBarAppearance()
    tabBarAppearance.configureWithOpaqueBackground()
    tabBarAppearance.backgroundColor = UIColor(red: 253.0/255.0, green: 248.0/255.0, blue: 245.0/255.0, alpha: 1.0)
    UITabBar.appearance().standardAppearance = tabBarAppearance
    UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
`;

    // Insert near the top of didFinishLaunchingWithOptions, before the react native setup
    const insertPoint = 'let delegate = ReactNativeDelegate()';

    if (contents.includes(insertPoint)) {
      config.modResults.contents = contents.replace(
        insertPoint,
        fixCode + '\n    ' + insertPoint
      );
    }

    return config;
  });
}

module.exports = withOpaqueTabBar;
