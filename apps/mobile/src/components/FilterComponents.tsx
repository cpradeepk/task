import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, Switch, TextInput, List, IconButton, Divider, Surface } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'

// Header Component
export const FilterHeader = ({ title, onClose }: { title: string; onClose?: () => void }) => {
    const { colors } = useTheme()
    return (
        <View style={styles.headerContainer}>
            <Text style={[materialTypography.titleLarge, { flex: 1, fontWeight: 'bold', color: colors.text }]}>{title}</Text>
            {onClose && (
                <IconButton icon="close" size={24} onPress={onClose} iconColor={colors.text} />
            )}
        </View>
    )
}

// Search Component
export const FilterSearch = ({
    value,
    onChangeText,
    placeholder = "Search..."
}: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}) => {
    const { colors } = useTheme()
    return (
        <View style={styles.searchContainer}>
            <TextInput
                mode="outlined"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                left={<TextInput.Icon icon="magnify" color={colors.textSecondary} />}
                style={[styles.searchInput, { backgroundColor: colors.surfaceVariant }]}
                textColor={colors.text}
                placeholderTextColor={colors.textTertiary}
                activeOutlineColor={colors.primary}
                outlineColor={colors.border}
                dense
            />
        </View>
    )
}

// Toggle Component (e.g., My Bugs)
export const FilterToggle = ({
    label,
    value,
    onValueChange,
    icon
}: {
    label: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    icon?: string;
}) => {
    const { colors } = useTheme()
    return (
        <View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleLabelRow}>
                {icon && <IconButton icon={icon} size={20} style={{ margin: 0, marginRight: 8 }} iconColor={colors.textSecondary} />}
                <Text style={[materialTypography.bodyLarge, { color: colors.text }]}>{label}</Text>
            </View>
            <Switch value={value} onValueChange={onValueChange} color={colors.primary} />
        </View>
    )
}

// Dropdown/Accordion Section Component
export const FilterSection = ({
    title,
    count = 0,
    label, // Optional override for title (e.g. selected value)
    children,
    expanded,
    onPress
}: {
    title: string;
    count?: number;
    label?: string; // New prop for showing selected value
    children: React.ReactNode;
    expanded: boolean;
    onPress: () => void;
}) => {
    const { colors } = useTheme()

    // If a specific label is provided (like "Project: Alpha"), use it.
    // Otherwise use title.
    const displayTitle = label || title;

    return (
        <List.Accordion
            title={displayTitle}
            description={!label && count > 0 ? `${count} selected` : undefined}
            expanded={expanded}
            onPress={onPress}
            style={[
                styles.accordionHeader,
                {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.surface
                }
            ]}
            titleStyle={[
                styles.accordionTitle,
                { color: colors.text },
                label ? { color: colors.primary, fontWeight: 'bold' } : {}
            ]}
            descriptionStyle={{ color: colors.textSecondary }}
            left={props => <List.Icon {...props} icon="chevron-down" style={{ marginRight: 0 }} color={colors.textSecondary} />}
            right={props => null} // Hide default arrow to control position if needed, or keep default
        >
            <View style={[styles.accordionContent, { backgroundColor: colors.background }]}>
                {children}
            </View>
        </List.Accordion>
    )
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: materialSpacing.md,
        paddingHorizontal: materialSpacing.xs
    },
    searchContainer: {
        marginBottom: materialSpacing.md,
    },
    searchInput: {
        // Background color is handled dynamically in style prop now
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: materialSpacing.sm,
        paddingHorizontal: materialSpacing.sm,
        marginBottom: materialSpacing.sm,
        borderRadius: 8,
        borderWidth: 1,
    },
    toggleLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accordionHeader: {
        paddingVertical: 0,
    },
    accordionTitle: {
        ...materialTypography.bodyLarge,
        fontWeight: '600',
    },
    accordionDesc: {
        // Handled dynamically
    },
    accordionDescActive: {
        fontWeight: 'bold',
    },
    accordionContent: {
        padding: materialSpacing.sm,
    }
})
