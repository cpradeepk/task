import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TextInput, IconButton, Chip } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { materialTypography, materialSpacing } from '../config/materialTheme'

interface MultiSelectPickerItem {
  label: string
  value: string
}

interface MultiSelectPickerProps {
  label: string
  placeholder?: string
  selectedValues: string[]
  onValuesChange: (values: string[]) => void
  items: MultiSelectPickerItem[]
  disabled?: boolean
  required?: boolean
}

export const MultiSelectPicker: React.FC<MultiSelectPickerProps> = ({
  label,
  placeholder = 'Select options',
  selectedValues,
  onValuesChange,
  items,
  disabled = false,
  required = false,
}) => {
  const { colors } = useTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleOpen = () => {
    if (!disabled) {
      setSearchQuery('')
      setModalVisible(true)
    }
  }

  // Get labels for selected items
  const selectedLabels = useMemo(() => {
    return selectedValues
      .map((val) => items.find((i) => i.value === val)?.label)
      .filter(Boolean)
  }, [selectedValues, items])

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, items])

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onValuesChange(selectedValues.filter((v) => v !== value))
    } else {
      onValuesChange([...selectedValues, value])
    }
  }

  const handleClearAll = () => {
    onValuesChange([])
  }

  return (
    <View style={styles.container}>
      {/* Field Label */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label} {required && <Text style={{ color: colors.error }}>*</Text>}
      </Text>

      {/* Touchable Trigger */}
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={disabled ? 1 : 0.7}
        style={[
          styles.fieldTrigger,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          disabled && styles.disabledField,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.fieldText,
            { color: selectedLabels.length > 0 ? colors.text : colors.textTertiary },
          ]}
        >
          {selectedLabels.length > 0
            ? `${selectedLabels.length} selected`
            : placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={22}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Selected chips */}
      {selectedLabels.length > 0 && (
        <View style={styles.chipsContainer}>
          {selectedLabels.map((labelText, index) => (
            <Chip
              key={selectedValues[index]}
              onClose={() => handleToggle(selectedValues[index])}
              style={[styles.chip, { backgroundColor: colors.primaryLight }]}
              textStyle={{ color: colors.primary, fontSize: 12 }}
              closeIconAccessibilityLabel="Remove"
            >
              {labelText}
            </Chip>
          ))}
        </View>
      )}

      {/* Modal Dialog */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {label.replace(/[\\*\\:]/g, '').trim()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {selectedValues.length > 0 && (
                  <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                    <Text style={{ color: colors.error, fontSize: 14 }}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <IconButton
                  icon="check"
                  iconColor={colors.primary}
                  size={24}
                  onPress={() => setModalVisible(false)}
                />
              </View>
            </View>

            {/* Selected count */}
            <View style={[styles.countBar, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {selectedValues.length} of {items.length} selected
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                mode="outlined"
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                left={<TextInput.Icon icon="magnify" color={colors.textSecondary} />}
                style={[styles.searchInput, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                placeholderTextColor={colors.textTertiary}
                activeOutlineColor={colors.primary}
                outlineColor={colors.border}
              />
            </View>

            {/* List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              renderItem={({ item }) => {
                const isSelected = selectedValues.includes(item.value)
                return (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      { borderBottomColor: colors.borderLight },
                      isSelected && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => handleToggle(item.value)}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={[
                        styles.listItemText,
                        { color: colors.text },
                        isSelected && {
                          color: colors.primary,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ color: colors.textSecondary }}>
                    No results found
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: materialSpacing.md,
  },
  fieldLabel: {
    ...materialTypography.labelLarge,
    marginBottom: materialSpacing.xs,
  },
  fieldTrigger: {
    height: 50,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledField: {
    opacity: 0.5,
  },
  fieldText: {
    ...materialTypography.bodyLarge,
    flex: 1,
    marginRight: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  chip: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '75%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...materialTypography.titleLarge,
    fontWeight: 'bold',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    padding: 12,
  },
  searchInput: {
    height: 44,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  listItemText: {
    ...materialTypography.bodyLarge,
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
})
