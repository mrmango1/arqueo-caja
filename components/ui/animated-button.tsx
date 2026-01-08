/**
 * Animated Button Component with Premium Effects
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Animation, BrandColors, Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
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
    } => {
        switch (variant) {
            case 'secondary':
                return {
                    container: { backgroundColor: colors.inputBackground },
                    text: { color: colors.text },
                    iconColor: colors.text,
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
                };
            case 'ghost':
                return {
                    container: { backgroundColor: 'transparent' },
                    text: { color: BrandColors.primary },
                    iconColor: BrandColors.primary,
                };
            case 'danger':
                return {
                    container: { backgroundColor: '#EF4444' }, // Red 500
                    text: { color: '#FFFFFF' },
                    iconColor: '#FFFFFF',
                };
            case 'success':
                return {
                    container: { backgroundColor: '#10B981' }, // Emerald 500
                    text: { color: '#FFFFFF' },
                    iconColor: '#FFFFFF',
                };
            default:
                return {
                    container: { backgroundColor: BrandColors.primary },
                    text: { color: '#FFFFFF' },
                    iconColor: '#FFFFFF',
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

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={[
                containerStyle,
                animatedStyle,
                variant === 'primary' && Shadows.primary,
                variant === 'success' && Shadows.success,
                variant === 'danger' && Shadows.error,
            ]}
        >
            {buttonContent}
        </AnimatedPressable>
    );
}

export default AnimatedButton;
