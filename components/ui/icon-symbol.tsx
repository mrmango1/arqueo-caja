// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  'house.fill': 'home',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'arrow.up.right': 'north-east',
  'arrow.down.left': 'south-west',
  'arrow.down.right': 'south-east',
  'arrow.up.left': 'north-west',
  'xmark': 'close',
  'xmark.circle': 'cancel',
  'xmark.circle.fill': 'cancel',

  // Actions
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'minus': 'remove',
  'minus.circle.fill': 'remove-circle',
  'checkmark': 'check',
  'checkmark.circle': 'check-circle',
  'checkmark.circle.fill': 'check-circle',
  'pencil': 'edit',
  'trash': 'delete',
  'trash.fill': 'delete',

  // Business & Finance
  'building.columns': 'account-balance',
  'building.columns.fill': 'account-balance',
  'banknote': 'attach-money',
  'banknote.fill': 'attach-money',
  'dollarsign': 'attach-money',
  'dollarsign.circle': 'monetization-on',
  'dollarsign.circle.fill': 'monetization-on',
  'percent': 'percent',
  'chart.bar': 'bar-chart',
  'chart.bar.fill': 'bar-chart',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'chart.pie': 'pie-chart',
  'chart.pie.fill': 'pie-chart',
  'storefront': 'store',
  'storefront.fill': 'store',

  // People & Account
  'person': 'person',
  'person.fill': 'person',
  'person.badge.plus': 'person-add',
  'person.circle': 'account-circle',
  'person.circle.fill': 'account-circle',

  // Communication
  'envelope': 'email',
  'envelope.fill': 'email',
  'phone': 'phone',
  'phone.fill': 'phone',
  'bubble.left': 'chat',
  'bubble.left.fill': 'chat',

  // System & Settings
  'gearshape': 'settings',
  'gearshape.fill': 'settings',
  'lock': 'lock',
  'lock.fill': 'lock',
  'lock.open': 'lock-open',
  'lock.open.fill': 'lock-open',
  'lock.shield': 'security',
  'lock.shield.fill': 'security',
  'eye': 'visibility',
  'eye.fill': 'visibility',
  'eye.slash': 'visibility-off',
  'eye.slash.fill': 'visibility-off',
  'bell': 'notifications',
  'bell.fill': 'notifications',
  'speaker.wave.2': 'volume-up',
  'speaker.wave.2.fill': 'volume-up',

  // Time & History
  'clock': 'schedule',
  'clock.fill': 'schedule',
  'clock.arrow.circlepath': 'history',
  'calendar': 'calendar-today',
  'calendar.badge.clock': 'event',

  // Documents & Files
  'doc': 'description',
  'doc.fill': 'description',
  'doc.text': 'article',
  'doc.text.fill': 'article',
  'folder': 'folder',
  'folder.fill': 'folder',
  'note.text': 'note',
  'number': 'tag',

  // Status & Alerts
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',
  'info.circle': 'info',
  'info.circle.fill': 'info',
  'questionmark.circle': 'help',
  'questionmark.circle.fill': 'help',

  // Misc
  'circle': 'circle',
  'circle.fill': 'circle',
  'bolt': 'flash-on',
  'bolt.fill': 'flash-on',
  'star': 'star-border',
  'star.fill': 'star',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'bookmark': 'bookmark-border',
  'bookmark.fill': 'bookmark',
  'tag': 'label',
  'tag.fill': 'label',
  'arrow.right.circle.fill': 'arrow-circle-right',
  'rectangle.portrait.and.arrow.right': 'logout',

  // Deprecated (keeping for backwards compatibility)
  'chevron.left.forwardslash.chevron.right': 'code',
  'paperplane.fill': 'send',
} as IconMapping;

// Export the type for IconSymbolName
export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name];
  if (!mappedName) {
    console.warn(`IconSymbol: No mapping found for "${name}"`);
    return <MaterialIcons color={color} size={size} name="help" style={style} />;
  }
  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}
