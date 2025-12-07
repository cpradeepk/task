import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSharedValue, SharedValue, withTiming, withSpring, Easing } from 'react-native-reanimated';

interface TabBarContextType {
    isTabBarHidden: SharedValue<number>;
    setTabBarHidden: (hidden: boolean) => void;
    showTabBar: () => void;
    hideTabBar: () => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const TabBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isTabBarHidden = useSharedValue(0); // 0 = visible, 1 = hidden

    const setTabBarHidden = useCallback((hidden: boolean) => {
        'worklet';
        isTabBarHidden.value = withTiming(hidden ? 1 : 0, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
    }, []);

    const showTabBar = useCallback(() => {
        isTabBarHidden.value = withTiming(0, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
    }, []);

    const hideTabBar = useCallback(() => {
        isTabBarHidden.value = withTiming(1, {
            duration: 300,
            easing: Easing.in(Easing.cubic),
        });
    }, []);

    return (
        <TabBarContext.Provider value={{ isTabBarHidden, setTabBarHidden, showTabBar, hideTabBar }}>
            {children}
        </TabBarContext.Provider>
    );
};

export const useTabBar = () => {
    const context = useContext(TabBarContext);
    if (!context) {
        throw new Error('useTabBar must be used within a TabBarProvider');
    }
    return context;
};

// Hook for scrollable screens to control tab bar
export const useTabBarControl = () => {
    const { showTabBar, hideTabBar } = useTabBar();
    const lastContentOffset = useSharedValue(0);
    const isHidden = useSharedValue(0);

    const handleScroll = useCallback((event: any) => {
        'worklet';
        const currentOffset = event.contentOffset.y;
        const diff = currentOffset - lastContentOffset.value;

        // Ignore bounces
        if (currentOffset <= 0) {
            if (isHidden.value === 1) {
                runOnJS(showTabBar)();
                isHidden.value = 0;
            }
            return;
        }

        if (diff > 20 && isHidden.value === 0) {
            runOnJS(hideTabBar)();
            isHidden.value = 1;
        } else if (diff < -20 && isHidden.value === 1) {
            runOnJS(showTabBar)();
            isHidden.value = 0;
        }

        lastContentOffset.value = currentOffset;
    }, []);

    return { handleScroll };
};

import { runOnJS } from 'react-native-reanimated';
