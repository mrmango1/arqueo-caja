/**
 * Empty State Component
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { BounceIn, FadeIn } from 'react-native-reanimated';
import { AnimatedButton } from './animated-button';

interface EmptyStateProps {
    icon: IconSymbolName;
    iconColor?: string;
    title: string;
    description: string;
    action?: {
        label: string;
        onPress: () => void;
        icon?: IconSymbolName;
    };
    style?: ViewStyle;
}

export function EmptyState({
    icon,
    iconColor = '#FF6B00',
    title,
    description,
    action,
    style,
}: EmptyStateProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            style={[styles.container, style]}
        >
            <Animated.View
                entering={BounceIn.delay(200)}
                style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}
            >
                <IconSymbol name={icon} size={40} color={iconColor} />
            </Animated.View>

            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
                {description}
            </Text>

            {action && (
                <View style={styles.actionContainer}>
                    <AnimatedButton
                        title={action.label}
                        onPress={action.onPress}
                        icon={action.icon}
                        iconPosition="right"
                        variant="primary"
                        size="lg"
                        fullWidth
                    />
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xxl,
    },
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: Radius.xxl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },
    actionContainer: {
        width: '100%',
        marginTop: Spacing.xl,
    },
});

export default EmptyState;
