/**
 * Transaction List Item with Swipe Actions
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TransactionItemProps {
    id: string;
    title: string;
    subtitle?: string;
    amount: number;
    type: 'income' | 'expense';
    icon: IconSymbolName;
    iconColor: string;
    commission?: number;
    voided?: boolean;
    timestamp?: string;
    onPress?: () => void;
    onLongPress?: () => void;
    index?: number;
    style?: ViewStyle;
}

export function TransactionItem({
    id,
    title,
    subtitle,
    amount,
    type,
    icon,
    iconColor,
    commission,
    voided = false,
    timestamp,
    onPress,
    onLongPress,
    index = 0,
    style,
}: TransactionItemProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const scale = useSharedValue(1);

    const handlePressIn = () => {
        if (onPress || onLongPress) {
            scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handleLongPress = () => {
        if (!voided && onLongPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onLongPress();
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const amountColor = voided
        ? colors.textQuaternary
        : type === 'income'
            ? '#34C759'
            : '#FF3B30';

    return (
        <Animated.View
            entering={FadeInRight.delay(index * 40).springify()}
            style={animatedStyle}
        >
            <AnimatedPressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onLongPress={handleLongPress}
                delayLongPress={400}
                disabled={voided && !onPress}
                style={[
                    styles.container,
                    { backgroundColor: colors.surface },
                    voided && { opacity: 0.5 },
                    style,
                ]}
            >
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: voided ? colors.backgroundTertiary : `${iconColor}15` }
                ]}>
                    <IconSymbol
                        name={voided ? 'xmark.circle.fill' : icon}
                        size={18}
                        color={voided ? colors.textQuaternary : iconColor}
                    />
                </View>

                <View style={styles.content}>
                    <Text
                        style={[
                            styles.title,
                            { color: colors.text },
                            voided && styles.voidedText,
                        ]}
                        numberOfLines={1}
                    >
                        {title}{voided ? ' (Anulada)' : ''}
                    </Text>
                    {(subtitle || timestamp) && (
                        <Text style={[styles.subtitle, { color: colors.textTertiary }]} numberOfLines={1}>
                            {subtitle}{subtitle && timestamp ? ' • ' : ''}{timestamp}
                        </Text>
                    )}
                </View>

                <View style={styles.amountContainer}>
                    <Text
                        style={[
                            styles.amount,
                            { color: amountColor },
                            voided && styles.voidedText,
                        ]}
                    >
                        {type === 'income' ? '+' : '-'}${Math.abs(amount).toFixed(2)}
                    </Text>
                    {!voided && commission !== undefined && commission > 0 && (
                        <Text style={styles.commission}>+${commission.toFixed(2)}</Text>
                    )}
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Radius.md,
        gap: Spacing.md,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
    },
    commission: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF6B00',
        marginTop: 2,
    },
    voidedText: {
        textDecorationLine: 'line-through',
    },
});

export default TransactionItem;
