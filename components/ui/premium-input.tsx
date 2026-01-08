/**
 * Premium Input Field Component
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Animation, BrandColors, Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

interface PremiumInputProps extends TextInputProps {
    label?: string;
    icon?: IconSymbolName;
    rightIcon?: IconSymbolName;
    onRightIconPress?: () => void;
    error?: string;
    hint?: string;
    containerStyle?: ViewStyle;
    variant?: 'default' | 'filled' | 'outlined';
    size?: 'sm' | 'md' | 'lg';
    prefix?: string;
    suffix?: string;
}

export function PremiumInput({
    label,
    icon,
    rightIcon,
    onRightIconPress,
    error,
    hint,
    containerStyle,
    variant = 'filled',
    size = 'md',
    prefix,
    suffix,
    ...textInputProps
}: PremiumInputProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const [isFocused, setIsFocused] = useState(false);
    const focusProgress = useSharedValue(0);
    const borderColor = useSharedValue(colors.inputBorder);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        focusProgress.value = withTiming(1, { duration: Animation.fast });
        textInputProps.onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        focusProgress.value = withTiming(0, { duration: Animation.fast });
        textInputProps.onBlur?.(e);
    };

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: error
            ? '#FF3B30'
            : interpolateColor(
                focusProgress.value,
                [0, 1],
                [colors.inputBorder, BrandColors.primary]
            ),
        borderWidth: focusProgress.value > 0.5 ? 2 : 1,
    }));

    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return { inputHeight: 44, fontSize: 14, iconSize: 16 };
            case 'lg':
                return { inputHeight: 60, fontSize: 18, iconSize: 22 };
            default:
                return { inputHeight: 52, fontSize: 16, iconSize: 18 };
        }
    };

    const sizeStyles = getSizeStyles();

    const getVariantStyles = (): ViewStyle => {
        switch (variant) {
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                };
            case 'filled':
            default:
                return {
                    backgroundColor: colors.inputBackground,
                    borderWidth: 1,
                    borderColor: 'transparent',
                };
        }
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[
                    styles.label,
                    { color: error ? '#FF3B30' : (isFocused ? BrandColors.primary : colors.textSecondary) }
                ]}>
                    {label}
                </Text>
            )}

            <AnimatedView
                style={[
                    styles.inputContainer,
                    getVariantStyles(),
                    { minHeight: sizeStyles.inputHeight },
                    animatedBorderStyle,
                    error && styles.inputError,
                ]}
            >
                {icon && (
                    <IconSymbol
                        name={icon}
                        size={sizeStyles.iconSize}
                        color={isFocused ? BrandColors.primary : colors.textTertiary}
                        style={styles.leftIcon}
                    />
                )}

                {prefix && (
                    <Text style={[styles.prefix, { fontSize: sizeStyles.fontSize, color: colors.text }]}>
                        {prefix}
                    </Text>
                )}

                <TextInput
                    {...textInputProps}
                    style={[
                        styles.input,
                        { fontSize: sizeStyles.fontSize, color: colors.text },
                        textInputProps.style,
                    ]}
                    placeholderTextColor={colors.inputPlaceholder}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />

                {suffix && (
                    <Text style={[styles.suffix, { color: colors.textSecondary }]}>
                        {suffix}
                    </Text>
                )}

                {rightIcon && (
                    <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightIcon}>
                        <IconSymbol
                            name={rightIcon}
                            size={sizeStyles.iconSize}
                            color={colors.textTertiary}
                        />
                    </Pressable>
                )}
            </AnimatedView>

            {(error || hint) && (
                <Text style={[
                    styles.helperText,
                    { color: error ? '#FF3B30' : colors.textTertiary }
                ]}>
                    {error || hint}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.base,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.base,
        overflow: 'hidden',
    },
    inputError: {
        borderColor: '#FF3B30',
        borderWidth: 1,
    },
    leftIcon: {
        marginRight: Spacing.sm,
    },
    rightIcon: {
        marginLeft: Spacing.sm,
        padding: Spacing.xs,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.sm,
        fontWeight: '500',
    },
    prefix: {
        fontWeight: '600',
        marginRight: Spacing.xs,
    },
    suffix: {
        fontWeight: '500',
        marginLeft: Spacing.xs,
    },
    helperText: {
        fontSize: 12,
        marginTop: Spacing.xs,
        marginLeft: Spacing.xs,
    },
});

export default PremiumInput;
