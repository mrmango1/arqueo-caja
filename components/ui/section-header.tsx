/**
 * Section Header Component
 */

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconSymbol, IconSymbolName } from './icon-symbol';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        onPress: () => void;
        icon?: IconSymbolName;
    };
    icon?: IconSymbolName;
    iconColor?: string;
    style?: ViewStyle;
}

export function SectionHeader({
    title,
    subtitle,
    action,
    icon,
    iconColor,
    style,
}: SectionHeaderProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    return (
        <View style={[styles.container, style]}>
            <View style={styles.left}>
                {icon && (
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor || colors.text}15` }]}>
                        <IconSymbol name={icon} size={14} color={iconColor || colors.text} />
                    </View>
                )}
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
                    )}
                </View>
            </View>

            {action && (
                <Pressable
                    onPress={action.onPress}
                    style={({ pressed }) => [
                        styles.actionButton,
                        pressed && { opacity: 0.7 }
                    ]}
                    hitSlop={8}
                >
                    <Text style={styles.actionText}>{action.label}</Text>
                    {action.icon && (
                        <IconSymbol name={action.icon} size={14} color="#FF6B00" />
                    )}
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
    },
    actionText: {
        color: '#FF6B00',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default SectionHeader;
