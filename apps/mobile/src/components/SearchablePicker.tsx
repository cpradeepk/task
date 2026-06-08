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
import { TextInput, IconButton } from 'react-native-paper'
import { useTheme } from '../contexts/ThemeContext'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { materialTypography, materialSpacing } from '../config/materialTheme'

interface SearchablePickerItem {
  label: string
  value: string
}

interface SearchablePickerProps {
  label: string
  placeholder?: string
  selectedValue: string
  onValueChange: (value: string) => void
  items: SearchablePickerItem[]
  disabled?: boolean
  required?: boolean
}

export const SearchablePicker: React.FC<SearchablePickerProps> = ({
  label,
  placeholder = 'Select an option',
  selectedValue,
  onValueChange,
  items,
  disabled = false,
  required = false,
}) => {
  const { colors, isDark } = useTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Reset search query when modal opens/closes
  const handleOpen = () => {
    if (!disabled) {
      setSearchQuery('')
      setModalVisible(true)
    }
  }

  // Find selected item label
  const selectedItemLabel = useMemo(() => {
    const item = items.find((i) => i.value === selectedValue)
    return item ? item.label : ''
  }, [selectedValue, items])

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, items])

  const handleSelect = (value: string) => {
    onValueChange(value)
    setModalVisible(false)
  }

  return (
    <View style={styles.container}>
      {/* Field Label */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label} {required && <Text style={{ color: colors.error }}>*</Text>}
      </Text>

      {/* Touchable Trigger representing the field */}
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
            { color: selectedItemLabel ? colors.text : colors.textTertiary },
          ]}
        >
          {selectedItemLabel || placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={22}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

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
              <IconButton
                icon="close"
                iconColor={colors.text}
                size={24}
                onPress={() => setModalVisible(false)}
              />
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
                const isSelected = item.value === selectedValue
                return (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      { borderBottomColor: colors.borderLight },
                      isSelected && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
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
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={20}
                        color={colors.primary}
                      />
                    )}
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
  searchContainer: {
    padding: 12,
  },
  searchInput: {
    height: 44,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
