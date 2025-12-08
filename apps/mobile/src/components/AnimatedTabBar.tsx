
import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
    runOnJS,
} from 'react-native-reanimated';
import { useTabBar } from '../context/TabBarContext';

const { width } = Dimensions.get('window');
// Configuration
const TAB_HEIGHT = 60;
const TAB_ITEM_WIDTH = (width - 60) / 5; // Width of a single tab item
const HALF_BAR_WIDTH = (TAB_ITEM_WIDTH * 2) + 20; // 2 tabs + padding

const SHADOW_STYLES = Platform.select({
    ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    android: { elevation: 8 },
});

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { isTabBarHidden, showTabBar } = useTabBar();
    const activeIndex = state.index;

    // We assume 5 tabs: [0, 1] [2-Home] [3, 4]
    // Left Group: 0, 1
    // Right Group: 3, 4
    // Center: 2

    // Animation:
    // When isTabBarHidden -> 1:
    // Left Group moves to Left Edge (-X)
    // Right Group moves to Right Edge (+X)
    // Center Group fades out / scales down
    // "Handle" appearances are essentially the collapsed groups sticking out.

    // Helper to render a specific tab
    const renderTab = (index: number) => {
        const route = state.routes[index];
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
            const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
            }
        };

        return (
            <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
            >
                {options.tabBarIcon?.({
                    focused: isFocused,
                    color: isFocused ? '#FF5722' : '#748c94',
                    size: 24
                })}
            </TouchableOpacity>
        );
    };

    // --- ANIMATED STYLES ---

    // Better Approach:
    // Render LeftHalf, Center, RightHalf. 
    // LeftHalf moves -X. RightHalf moves +X. Center fades.

    // Calculate how much each half needs to move to appear as a handle at the edge
    // The total width of the bar when open is (TAB_ITEM_WIDTH * 5) + (margin between parts)
    // Let's assume the total width of the visible bar is (width - 40)
    // Each half is TAB_ITEM_WIDTH * 2. Center is TAB_HEIGHT.
    // Total width = (TAB_ITEM_WIDTH * 2) + TAB_HEIGHT + (TAB_ITEM_WIDTH * 2) + 2*marginHorizontal
    // Let's simplify: the total width of the three components when together is roughly (width - 40).
    // We want the left edge of the left component to go to the screen's left edge + some padding (e.g., 10px).
    // The center of the screen is width/2.
    // The center of the left half is at (width/2 - (TAB_ITEM_WIDTH * 2) - TAB_HEIGHT/2 - marginHorizontal).
    // To move the left half to the left edge (e.g., 10px from screen edge), its center needs to be at (TAB_ITEM_WIDTH * 2)/2 + 10 = TAB_ITEM_WIDTH + 10.
    // So, the translateX for the left half is (TAB_ITEM_WIDTH + 10) - (current center X of left half).
    // This is complex. Let's use a simpler approach: move it relative to its current position.
    // The current layout is centered.
    // Left half is at `x = (width / 2) - (total_bar_width / 2)`.
    // We want it to move to `x = 10`.
    // So, `translateX = 10 - ((width / 2) - (total_bar_width / 2))`.
    // Let's assume total_bar_width is `width - 40`.
    // `translateX = 10 - (width / 2 - (width - 40) / 2) = 10 - (width / 2 - width / 2 + 20) = 10 - 20 = -10`.
    // This is for the left edge of the left half.
    // The `halfContainer` has `width: TAB_ITEM_WIDTH * 2`.
    // So, to move its left edge to `10`, its center needs to be at `10 + (TAB_ITEM_WIDTH * 2) / 2 = 10 + TAB_ITEM_WIDTH`.
    // The initial center of the left half is `width / 2 - (TAB_ITEM_WIDTH * 2) / 2 - TAB_HEIGHT / 2 - 5` (approx).
    // Let's just use a fixed value that looks good.
    const moveDistance = (width / 2) - (TAB_ITEM_WIDTH * 2 / 2) - 10; // Distance from center of screen to left edge of left half, minus 10px padding.

    const leftHalfStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(isTabBarHidden.value ? -moveDistance : 0, { damping: 14 }) }
        ],
        // When hidden, we want it to look like a handle
        // Maybe change border radius?
    }));

    const rightHalfStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: withSpring(isTabBarHidden.value ? moveDistance : 0, { damping: 14 }) }
        ]
    }));

    const centerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: withTiming(isTabBarHidden.value ? 0 : 1) }
        ],
        opacity: withTiming(isTabBarHidden.value ? 0 : 1)
    }));

    // Active Indicator Logic? 
    // If we split, the indicator must follow. 
    // We can put an indicator inside LeftHalf and RightHalf separately 
    // or just highlight the icon.
    // For simplicity with "Split", specific pill indicator is hard.
    // Let's use icon color change (Or a small dot).
    // User requested "orange sliding active state indicator".
    // This implies a shared background.
    // If the bar splits, the background must split? 
    // Okay, let's put an indicator in EACH half that is only visible if that half has active tab.

    // Indices in Left: 0, 1. Indices in Right: 3, 4. Center: 2.
    const isLeftActive = activeIndex < 2;
    const isRightActive = activeIndex > 2;
    // Calculate position within the subgroup
    const leftIndicatorPos = useSharedValue(0);
    const rightIndicatorPos = useSharedValue(0);
    const centerIndicatorOpacity = useSharedValue(0);

    useEffect(() => {
        if (activeIndex < 2) {
            leftIndicatorPos.value = withSpring(activeIndex * TAB_ITEM_WIDTH, { damping: 15, stiffness: 100 });
            centerIndicatorOpacity.value = withTiming(0);
        } else if (activeIndex > 2) {
            rightIndicatorPos.value = withSpring((activeIndex - 3) * TAB_ITEM_WIDTH, { damping: 15, stiffness: 100 });
            centerIndicatorOpacity.value = withTiming(0);
        } else {
            // Center active
            centerIndicatorOpacity.value = withTiming(1);
        }
    }, [activeIndex]);

    const leftIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: leftIndicatorPos.value }],
        opacity: withTiming(isLeftActive ? 1 : 0)
    }));

    const rightIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: rightIndicatorPos.value }],
        opacity: withTiming(isRightActive ? 1 : 0)
    }));

    const centerIndicatorStyle = useAnimatedStyle(() => ({
        opacity: centerIndicatorOpacity.value
    }));


    return (
        <View style={styles.rootContainer} pointerEvents="box-none">

            {/* Main Wrapper */}
            <View style={styles.barWrapper} pointerEvents="box-none">

                {/* LEFT HALF */}
                <Animated.View style={[styles.halfContainer, styles.leftContainer, leftHalfStyle]}>
                    {/* Active Indicator (Left) */}
                    <Animated.View style={[styles.activeIndicator, leftIndicatorStyle]} />

                    <View style={styles.tabsRow}>
                        {renderTab(0)}
                        {renderTab(1)}
                    </View>

                    {/* Overlay to catch taps when hidden/collapsed acting as a "Handle" area extension - Placed LAST to be on TOP */}
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            { zIndex: 999 },
                            useAnimatedStyle(() => ({
                                pointerEvents: isTabBarHidden.value === 1 ? 'auto' : 'none'
                            }))
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => { runOnJS(showTabBar)(); }}
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                        />
                    </Animated.View>
                </Animated.View>

                {/* CENTER HOME BUTTON */}
                <Animated.View style={[styles.centerContainer, centerStyle]}>
                    <Animated.View style={[styles.activeIndicator, { width: '100%' }, centerIndicatorStyle]} />
                    {renderTab(2)}
                </Animated.View>

                {/* RIGHT HALF */}
                <Animated.View style={[styles.halfContainer, styles.rightContainer, rightHalfStyle]}>
                    {/* Active Indicator (Right) */}
                    <Animated.View style={[styles.activeIndicator, rightIndicatorStyle]} />

                    <View style={styles.tabsRow}>
                        {renderTab(3)}
                        {renderTab(4)}
                    </View>

                    {/* Overlay to catch taps when hidden/collapsed - Placed LAST to be on TOP */}
                    {/* Overlay to catch taps when hidden/collapsed - Placed LAST to be on TOP */}
                    <Animated.View
                        style={[
                            StyleSheet.absoluteFill,
                            { zIndex: 999 },
                            useAnimatedStyle(() => ({
                                pointerEvents: isTabBarHidden.value === 1 ? 'auto' : 'none'
                            }))
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => { runOnJS(showTabBar)(); }}
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                        />
                    </Animated.View>
                </Animated.View>

            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    barWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // We compose the bar from parts
    },
    halfContainer: {
        height: TAB_HEIGHT,
        width: TAB_ITEM_WIDTH * 2,
        backgroundColor: '#fff',
        borderRadius: 30,
        overflow: 'hidden',
        ...SHADOW_STYLES,
        marginHorizontal: 5,
    },
    leftContainer: {
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
    },
    rightContainer: {
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    centerContainer: {
        width: TAB_ITEM_WIDTH, // Match other items
        height: TAB_HEIGHT,
        borderRadius: 20, // Match indicator radius
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        marginHorizontal: 5,
        // Removed elevation to flatten it
    },
    tabsRow: {
        flexDirection: 'row',
        flex: 1,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        width: TAB_ITEM_WIDTH,
        height: TAB_HEIGHT,
        backgroundColor: 'rgba(255, 87, 34, 0.15)', // Light Orange pill
        borderRadius: 20,
    },
});

