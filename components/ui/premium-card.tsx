/**
 * Premium Card Component with Glassmorphism and Animations
 */

import { Animation, Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PremiumCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'glass' | 'elevated' | 'outlined' | 'gradient';
    onPress?: () => void;
    disabled?: boolean;
    padding?: keyof typeof Spacing | number;
    radius?: keyof typeof Radius | number;
    animated?: boolean;
}

export function PremiumCard({
    children,
    style,
    variant = 'default',
    onPress,
    disabled = false,
    padding = 'base',
    radius = 'lg',
    animated = true,
}: PremiumCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const paddingValue = typeof padding === 'number' ? padding : Spacing[padding];
    const radiusValue = typeof radius === 'number' ? radius : Radius[radius];

    const animatedStyle = useAnimatedStyle(() => {
        if (!animated) return {};

        return {
            transform: [{ scale: scale.value }],
            opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
        };
    });

    const handlePressIn = () => {
        if (onPress && animated) {
            scale.value = withSpring(0.98, Animation.spring.snappy);
            pressed.value = withSpring(1, Animation.spring.snappy);
        }
    };

    const handlePressOut = () => {
        if (onPress && animated) {
            scale.value = withSpring(1, Animation.spring.gentle);
            pressed.value = withSpring(0, Animation.spring.gentle);
        }
    };

    const getVariantStyle = (): ViewStyle => {
        switch (variant) {
            case 'glass':
                return {
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                };
            case 'elevated':
                return {
                    backgroundColor: colors.surfaceElevated,
                    ...Shadows.lg,
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                };
            case 'gradient':
                return {
                    backgroundColor: colors.surface,
                    ...Shadows.primary,
                };
            default:
                return {
                    backgroundColor: colors.surface,
                    ...Shadows.sm,
                };
        }
    };

    const cardStyle: ViewStyle = {
        borderRadius: radiusValue,
        padding: paddingValue,
        ...getVariantStyle(),
        ...(style as object),
    };

    const content = (
        <View style={{ flex: 1 }}>
            {children}
        </View>
    );

    // Glass variant with blur
    if (variant === 'glass' && Platform.OS === 'ios') {
        return (
            <AnimatedPressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || !onPress}
                style={[styles.card, cardStyle, animatedStyle]}
            >
                <BlurView
                    intensity={isDark ? 40 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    style={[StyleSheet.absoluteFill, { borderRadius: radiusValue }]}
                />
                <View style={styles.glassOverlay}>
                    {content}
                </View>
            </AnimatedPressable>
        );
    }

    if (onPress) {
        return (
            <AnimatedPressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={[styles.card, cardStyle, animatedStyle]}
            >
                {content}
            </AnimatedPressable>
        );
    }

    return (
        <Animated.View style={[styles.card, cardStyle, animatedStyle]}>
            {content}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        overflow: 'hidden',
    },
    glassOverlay: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: Radius.lg,
    },
});

export default PremiumCard;
