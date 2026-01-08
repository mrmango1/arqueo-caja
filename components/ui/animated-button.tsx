/**
 * Animated Button Component with Premium Effects
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Animation, BrandColors, Colors, Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, Text, TextStyle, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconSymbolName;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    haptic?: boolean;
    style?: ViewStyle;
}

export function AnimatedButton({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    haptic = true,
    style,
}: AnimatedButtonProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const handlePressIn = () => {
        scale.value = withSpring(0.96, Animation.spring.snappy);
        pressed.value = withSpring(1, Animation.spring.snappy);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, Animation.spring.gentle);
        pressed.value = withSpring(0, Animation.spring.gentle);
    };

    const handlePress = () => {
        if (haptic) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        // Add a subtle bounce
        scale.value = withSequence(
            withSpring(0.95, { damping: 10, stiffness: 400 }),
            withSpring(1, { damping: 15, stiffness: 300 })
        );
        onPress();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: interpolate(pressed.value, [0, 1], [1, 0.92]),
    }));

    const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
        switch (size) {
            case 'sm':
                return {
                    container: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
                    text: { fontSize: 14, fontWeight: '600' },
                    iconSize: 16,
                };
            case 'lg':
                return {
                    container: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
                    text: { fontSize: 17, fontWeight: '700' },
                    iconSize: 22,
                };
            default:
                return {
                    container: { paddingVertical: Spacing.base, paddingHorizontal: Spacing.lg },
                    text: { fontSize: 16, fontWeight: '600' },
                    iconSize: 20,
                };
        }
    };

    const getVariantStyles = (): {
        container: ViewStyle;
        text: TextStyle;
        iconColor: string;
        useGradient: boolean;
        gradientColors?: readonly [string, string];
    } => {
        switch (variant) {
            case 'secondary':
                return {
                    container: { backgroundColor: colors.inputBackground },
                    text: { color: colors.text },
                    iconColor: colors.text,
                    useGradient: false,
                };
            case 'outline':
                return {
                    container: {
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderColor: BrandColors.primary
                    },
                    text: { color: BrandColors.primary },
                    iconColor: BrandColors.primary,
                    useGradient: false,
                };
            case 'ghost':
                return {
                    container: { backgroundColor: 'transparent' },
                    text: { color: BrandColors.primary },
                    iconColor: BrandColors.primary,
                    useGradient: false,
                };
            case 'danger':
                return {
                    container: {},
                    text: { color: '#FFFFFF' },
                    iconColor: '#FFFFFF',
                    useGradient: true,
                    gradientColors: Gradients.error,
                };
            case 'success':
                return {
                    container: {},
                    text: { color: '#FFFFFF' },
                    iconColor: '#FFFFFF',
                    useGradient: true,
                    gradientColors: Gradients.success,
                };
            default:
                return {
                    container: {},
                    text: { color: '#FFFFFF' },
                    iconColor: '#FFFFFF',
                    useGradient: true,
                    gradientColors: Gradients.primary,
                };
        }
    };

    const sizeStyles = getSizeStyles();
    const variantStyles = getVariantStyles();

    const containerStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: Radius.lg,
        ...sizeStyles.container,
        ...variantStyles.container,
        ...(fullWidth && { width: '100%' }),
        ...(disabled && { opacity: 0.5 }),
        ...(style as object),
    };

    const textStyle: TextStyle = {
        ...sizeStyles.text,
        ...variantStyles.text,
    };

    const iconContent = icon && !loading && (
        <IconSymbol
            name={icon}
            size={sizeStyles.iconSize}
            color={variantStyles.iconColor}
        />
    );

    const loadingContent = loading && (
        <ActivityIndicator
            size="small"
            color={variantStyles.text.color as string}
        />
    );

    const buttonContent = (
        <>
            {iconPosition === 'left' && (loadingContent || iconContent)}
            <Text style={textStyle}>{title}</Text>
            {iconPosition === 'right' && (loadingContent || iconContent)}
        </>
    );

    if (variantStyles.useGradient) {
        return (
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                style={[
                    animatedStyle,
                    { borderRadius: Radius.lg, overflow: 'hidden' },
                    variant === 'primary' && Shadows.primary,
                    variant === 'success' && Shadows.success,
                    variant === 'danger' && Shadows.error,
                ]}
            >
                <LinearGradient
                    colors={variantStyles.gradientColors as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={containerStyle}
                >
                    {buttonContent}
                </LinearGradient>
            </AnimatedPressable>
        );
    }

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={[containerStyle, animatedStyle]}
        >
            {buttonContent}
        </AnimatedPressable>
    );
}

export default AnimatedButton;
