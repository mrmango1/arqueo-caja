/**
 * Premium Action Grid - Modern button grid with animations
 */

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Animation, Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ActionItem {
    id: string;
    label: string;
    icon: IconSymbolName;
    color: string;
    onPress: () => void;
    badge?: string;
}

interface ActionGridProps {
    actions: ActionItem[];
    columns?: 2 | 3 | 4;
    style?: ViewStyle;
    compact?: boolean;
}

function ActionButton({
    item,
    index,
    compact,
    itemWidth,
}: {
    item: ActionItem;
    index: number;
    compact: boolean;
    itemWidth: number;
}) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const handlePressIn = () => {
        scale.value = withSpring(0.92, Animation.spring.snappy);
        rotation.value = withSpring(-2, Animation.spring.snappy);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, Animation.spring.bouncy);
        rotation.value = withSpring(0, Animation.spring.gentle);
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 60).springify()}
            style={[{ width: itemWidth }, animatedStyle]}
        >
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.actionBtn,
                    {
                        backgroundColor: colors.surface,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.10,
                        shadowRadius: 2,
                        elevation: 4,
                    },
                    compact && styles.actionBtnCompact,
                ]}
            >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: `${item.color}15`, borderRadius: Radius.xl }]} />
                <View style={[styles.iconWrapper]}>
                    <IconSymbol name={item.icon} size={compact ? 24 : 28} color={item.color} />
                </View>
                <Text style={[
                    styles.actionLabel,
                    { color: isDark ? '#fff' : '#000' },
                    compact && styles.actionLabelCompact,
                ]} numberOfLines={1}>
                    {item.label}
                </Text>
                {
                    item.badge && (
                        <View style={[styles.badge, { backgroundColor: item.color }]}>
                            <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                    )
                }
            </AnimatedPressable>
        </Animated.View >
    );
}

export function ActionGrid({
    actions,
    columns = 4,
    style,
    compact = false,
}: ActionGridProps) {
    const containerPadding = Spacing.lg * 2;
    const gap = Spacing.sm;
    const itemWidth = (SCREEN_WIDTH - containerPadding - (gap * (columns - 1))) / columns;

    return (
        <View style={[styles.container, style]}>
            {actions.map((item, index) => (
                <ActionButton
                    key={item.id}
                    item={item}
                    index={index}
                    compact={compact}
                    itemWidth={itemWidth}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    actionBtn: {
        borderRadius: Radius.xl,
        paddingVertical: Spacing.base,
        paddingHorizontal: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnCompact: {
        paddingVertical: Spacing.md,
    },
    iconWrapper: {
        width: 52,
        height: 52,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    actionLabelCompact: {
        fontSize: 12,
    },
    badge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Radius.sm,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
});

export default ActionGrid;
