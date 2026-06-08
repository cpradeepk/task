import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Accessibility labels
const TAB_LABELS = ['Feed', 'Tasks', 'Home', 'Dev', 'Menu'];

export default function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const activeIndex = state.index;

    // Theme-aware colors
    const activeColor = colors.primary;
    const inactiveColor = isDark ? '#8B95A3' : '#748c94';
    const bgColor = isDark ? '#1F2937' : '#FFFFFF';
    const borderColor = isDark ? '#2D3748' : '#E2E8F0';

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: bgColor,
                borderTopColor: borderColor,
                paddingBottom: Math.max(insets.bottom, 10),
            }
        ]}>
            <View style={styles.tabsRow}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = activeIndex === index;
                    const label = TAB_LABELS[index] || route.name;

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
                            accessibilityLabel={label}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isFocused }}
                        >
                            <View style={styles.iconContainer}>
                                {options.tabBarIcon?.({
                                    focused: isFocused,
                                    color: isFocused ? activeColor : inactiveColor,
                                    size: 24
                                })}
                                {isFocused && <View style={[styles.activeDot, { backgroundColor: activeColor }]} />}
                            </View>
                            <Text style={[
                                styles.tabLabel,
                                {
                                    color: isFocused ? activeColor : inactiveColor,
                                    fontWeight: isFocused ? '600' : '400',
                                }
                            ]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    tabsRow: {
        flexDirection: 'row',
        height: 60,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        width: 28,
        position: 'relative',
    },
    activeDot: {
        position: 'absolute',
        bottom: -4,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    tabLabel: {
        fontSize: 10,
        marginTop: 4,
    },
});
