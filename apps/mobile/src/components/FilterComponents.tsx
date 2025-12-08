import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, Switch, TextInput, List, IconButton, useTheme, Divider, Surface } from 'react-native-paper'
import { materialColors, materialTypography, materialSpacing } from '../config/materialTheme'

// Header Component
export const FilterHeader = ({ title, onClose }: { title: string; onClose?: () => void }) => {
    const theme = useTheme()
    return (
        <View style={styles.headerContainer}>
            <Text style={[materialTypography.titleLarge, { flex: 1, fontWeight: 'bold' }]}>{title}</Text>
            {onClose && (
                <IconButton icon="close" size={24} onPress={onClose} />
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
    const theme = useTheme()
    return (
        <View style={styles.searchContainer}>
            <TextInput
                mode="outlined"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                left={<TextInput.Icon icon="magnify" />}
                style={styles.searchInput}
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
    const theme = useTheme()
    return (
        <View style={styles.toggleContainer}>
            <View style={styles.toggleLabelRow}>
                {icon && <IconButton icon={icon} size={20} style={{ margin: 0, marginRight: 8 }} />}
                <Text style={materialTypography.bodyLarge}>{label}</Text>
            </View>
            <Switch value={value} onValueChange={onValueChange} color={materialColors.primary} />
        </View>
    )
}

// Dropdown/Accordion Section Component
interface FilterSectionProps {
    title: string;
    count?: number; // Show count of selected items
    children: React.ReactNode;
    expanded?: boolean;
    onPress?: () => void;
}

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
    const theme = useTheme()

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
                    borderBottomColor: materialColors.outline,
                    backgroundColor: materialColors.surface
                }
            ]}
            titleStyle={[
                styles.accordionTitle,
                label ? { color: materialColors.primary, fontWeight: 'bold' } : {}
            ]}
            left={props => <List.Icon {...props} icon="chevron-down" style={{ marginRight: 0 }} />}
            right={props => null} // Hide default arrow to control position if needed, or keep default
        >
            <View style={styles.accordionContent}>
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
        backgroundColor: materialColors.surface,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: materialSpacing.sm,
        paddingHorizontal: materialSpacing.sm,
        backgroundColor: materialColors.surface, // Or transparent
        marginBottom: materialSpacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: materialColors.outline,
    },
    toggleLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accordionHeader: {
        backgroundColor: materialColors.surface,
        paddingVertical: 0,
    },
    accordionTitle: {
        ...materialTypography.bodyLarge,
        fontWeight: '600',
    },
    accordionDesc: {
        color: materialColors.textSecondary,
    },
    accordionDescActive: {
        color: materialColors.primary,
        fontWeight: 'bold',
    },
    accordionContent: {
        padding: materialSpacing.sm,
        backgroundColor: materialColors.background, // Slightly different bg for content
    }
})
