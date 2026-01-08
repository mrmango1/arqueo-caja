/**
 * Stat Card Component - For displaying key metrics
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Animation, BrandColors, Colors, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: IconSymbolName;
    iconColor?: string;
    iconBackground?: string;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    variant?: 'default' | 'gradient' | 'outlined';
    gradientColors?: readonly [string, string];
    onPress?: () => void;
    style?: ViewStyle;
    delay?: number;
    suffix?: string;
    prefix?: string;
    compact?: boolean;
}

export function StatCard({
    title,
    value,
    icon,
    iconColor = BrandColors.primary,
    iconBackground,
    trend,
    variant = 'default',
    gradientColors = Gradients.primary,
    onPress,
    style,
    delay = 0,
    suffix,
    prefix,
    compact = false,
}: StatCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const scale = useSharedValue(1);

    const handlePressIn = () => {
        if (onPress) {
            scale.value = withSpring(0.97, Animation.spring.snappy);
        }
    };

    const handlePressOut = () => {
        if (onPress) {
            scale.value = withSpring(1, Animation.spring.gentle);
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const getTrendIcon = () => {
        if (!trend) return null;
        const trendIcon = trend.direction === 'up'
            ? 'arrow.up.right'
            : trend.direction === 'down'
                ? 'arrow.down.right'
                : 'minus';
        const trendColor = trend.direction === 'up'
            ? '#34C759'
            : trend.direction === 'down'
                ? '#FF3B30'
                : colors.textTertiary;

        return (
            <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
                <IconSymbol name={trendIcon} size={12} color={trendColor} />
                <Text style={[styles.trendText, { color: trendColor }]}>
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                </Text>
            </View>
        );
    };

    const containerStyles: ViewStyle = {
        ...styles.container,
        ...(compact && styles.containerCompact),
        ...(variant === 'outlined' && {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
        }),
        ...(variant === 'default' && {
            backgroundColor: colors.surface,
            ...Shadows.sm,
        }),
        ...(style as object),
    };

    const content = (
        <>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[
                        styles.title,
                        { color: variant === 'gradient' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                    ]}>
                        {title}
                    </Text>
                    <View style={styles.valueRow}>
                        {prefix && (
                            <Text style={[
                                styles.prefix,
                                { color: variant === 'gradient' ? '#fff' : colors.text }
                            ]}>
                                {prefix}
                            </Text>
                        )}
                        <Text style={[
                            styles.value,
                            { color: variant === 'gradient' ? '#fff' : colors.text },
                            compact && styles.valueCompact,
                        ]}>
                            {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
                        </Text>
                        {suffix && (
                            <Text style={[
                                styles.suffix,
                                { color: variant === 'gradient' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                            ]}>
                                {suffix}
                            </Text>
                        )}
                    </View>
                </View>

                {icon && (
                    <View style={[
                        styles.iconContainer,
                        { backgroundColor: iconBackground || `${iconColor}15` }
                    ]}>
                        <IconSymbol
                            name={icon}
                            size={compact ? 20 : 24}
                            color={variant === 'gradient' ? '#fff' : iconColor}
                        />
                    </View>
                )}
            </View>

            {trend && getTrendIcon()}
        </>
    );

    // Extract flex/layout styles for outer container
    const outerStyle: ViewStyle = {};
    if (style?.flex !== undefined) outerStyle.flex = style.flex;
    if (style?.flexGrow !== undefined) outerStyle.flexGrow = style.flexGrow;
    if (style?.flexShrink !== undefined) outerStyle.flexShrink = style.flexShrink;
    if (style?.width !== undefined) outerStyle.width = style.width;
    if (style?.minWidth !== undefined) outerStyle.minWidth = style.minWidth;
    if (style?.maxWidth !== undefined) outerStyle.maxWidth = style.maxWidth;

    if (variant === 'gradient') {
        return (
            <Animated.View
                entering={FadeInDown.delay(delay).springify()}
                style={[animatedStyle, outerStyle]}
            >
                <AnimatedPressable
                    onPress={onPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={!onPress}
                    style={{ flex: 1 }}
                >
                    <LinearGradient
                        colors={gradientColors as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[containerStyles, Shadows.primary, { flex: 1 }]}
                    >
                        {content}
                    </LinearGradient>
                </AnimatedPressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={[animatedStyle, outerStyle]}
        >
            <AnimatedPressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!onPress}
                style={[containerStyles, { flex: 1 }]}
            >
                {content}
            </AnimatedPressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: Radius.xl,
        padding: Spacing.lg,
    },
    containerCompact: {
        padding: Spacing.base,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: Spacing.xs,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    prefix: {
        fontSize: 22,
        fontWeight: '300',
        marginRight: 2,
    },
    value: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    valueCompact: {
        fontSize: 22,
    },
    suffix: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        marginTop: Spacing.md,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default StatCard;
