/**
 * ReleaseChecklistEditor (mobile)
 *
 * Per-sub-project release checklist template editor, mirroring the web
 * component apps/web/src/components/projects/ReleaseChecklistEditor.tsx.
 *
 * Lets an editor add/reorder/delete sections (each scoped to a platform:
 * common/android/ios) and add/reorder/delete items (label + text) within a
 * section. "Load default template" seeds the Swarg Food default.
 */
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, TextInput, Button, IconButton, SegmentedButtons } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  materialColors,
  materialTypography,
  materialSpacing,
} from '../config/materialTheme'
import {
  ReleaseChecklistItem,
  ReleaseChecklistSection,
  ReleaseChecklistTemplate,
} from '../types'
import { generateId } from '../utils/id'

interface ReleaseChecklistEditorProps {
  value: ReleaseChecklistTemplate
  onChange: (template: ReleaseChecklistTemplate) => void
  onLoadDefault?: () => void
}

type Platform = ReleaseChecklistSection['platform']

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'common', label: 'Common' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
]

function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}

export default function ReleaseChecklistEditor({
  value,
  onChange,
  onLoadDefault,
}: ReleaseChecklistEditorProps) {
  const sections = value.sections

  const updateSections = (next: ReleaseChecklistSection[]) => {
    onChange({ ...value, sections: next })
  }

  const addSection = () => {
    const section: ReleaseChecklistSection = {
      id: generateId('sec'),
      title: '',
      platform: 'common',
      items: [],
    }
    updateSections([...sections, section])
  }

  const updateSection = (
    sectionId: string,
    patch: Partial<Omit<ReleaseChecklistSection, 'id'>>
  ) => {
    updateSections(
      sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      )
    )
  }

  const removeSection = (sectionId: string) => {
    updateSections(sections.filter((section) => section.id !== sectionId))
  }

  const reorderSection = (index: number, direction: -1 | 1) => {
    updateSections(moveItem(sections, index, direction))
  }

  const addItem = (sectionId: string) => {
    const item: ReleaseChecklistItem = { id: generateId('item'), label: '', text: '' }
    updateSection(sectionId, {
      items: [...(sections.find((s) => s.id === sectionId)?.items ?? []), item],
    })
  }

  const updateItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<Omit<ReleaseChecklistItem, 'id'>>
  ) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    updateSection(sectionId, {
      items: section.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    })
  }

  const removeItem = (sectionId: string, itemId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    updateSection(sectionId, {
      items: section.items.filter((item) => item.id !== itemId),
    })
  }

  const reorderItem = (sectionId: string, index: number, direction: -1 | 1) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    updateSection(sectionId, { items: moveItem(section.items, index, direction) })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Define the release checklist (test cases + release steps) for this sub-project.
      </Text>

      <View style={styles.topActions}>
        {onLoadDefault && (
          <Button
            mode="outlined"
            compact
            onPress={onLoadDefault}
            textColor={materialColors.primary}
            style={styles.topActionBtn}
          >
            Load default template
          </Button>
        )}
        <Button
          mode="contained"
          compact
          icon="plus"
          onPress={addSection}
          buttonColor={materialColors.primary}
          style={styles.topActionBtn}
        >
          Add section
        </Button>
      </View>

      {sections.length === 0 && (
        <Text style={styles.emptyText}>
          No sections yet. Add a section or load the default template.
        </Text>
      )}

      {sections.map((section, sectionIndex) => (
        <View key={section.id} style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <TextInput
              mode="outlined"
              dense
              label="Section title"
              placeholder="e.g. Mandatory Test Cases"
              value={section.title}
              onChangeText={(text) => updateSection(section.id, { title: text })}
              style={styles.sectionTitleInput}
              outlineColor={materialColors.outline}
              activeOutlineColor={materialColors.primary}
            />
            <View style={styles.sectionControls}>
              <IconButton
                icon="arrow-up"
                size={18}
                disabled={sectionIndex === 0}
                onPress={() => reorderSection(sectionIndex, -1)}
                style={styles.controlIcon}
              />
              <IconButton
                icon="arrow-down"
                size={18}
                disabled={sectionIndex === sections.length - 1}
                onPress={() => reorderSection(sectionIndex, 1)}
                style={styles.controlIcon}
              />
              <IconButton
                icon="trash-can-outline"
                size={18}
                iconColor={materialColors.error}
                onPress={() => removeSection(section.id)}
                style={styles.controlIcon}
              />
            </View>
          </View>

          <SegmentedButtons
            value={section.platform}
            onValueChange={(val) =>
              updateSection(section.id, { platform: val as Platform })
            }
            density="small"
            buttons={PLATFORM_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
            style={styles.platformButtons}
          />

          {section.items.map((item, itemIndex) => (
            <View key={item.id} style={styles.itemCard}>
              <TextInput
                mode="outlined"
                dense
                placeholder="TC-01"
                value={item.label ?? ''}
                onChangeText={(text) =>
                  updateItem(section.id, item.id, { label: text })
                }
                style={styles.itemLabelInput}
                outlineColor={materialColors.outline}
                activeOutlineColor={materialColors.primary}
              />
              <TextInput
                mode="outlined"
                dense
                multiline
                placeholder="Describe the test case or release step"
                value={item.text}
                onChangeText={(text) =>
                  updateItem(section.id, item.id, { text })
                }
                style={styles.itemTextInput}
                outlineColor={materialColors.outline}
                activeOutlineColor={materialColors.primary}
              />
              <View style={styles.itemControls}>
                <IconButton
                  icon="arrow-up"
                  size={16}
                  disabled={itemIndex === 0}
                  onPress={() => reorderItem(section.id, itemIndex, -1)}
                  style={styles.controlIcon}
                />
                <IconButton
                  icon="arrow-down"
                  size={16}
                  disabled={itemIndex === section.items.length - 1}
                  onPress={() => reorderItem(section.id, itemIndex, 1)}
                  style={styles.controlIcon}
                />
                <IconButton
                  icon="trash-can-outline"
                  size={16}
                  iconColor={materialColors.error}
                  onPress={() => removeItem(section.id, item.id)}
                  style={styles.controlIcon}
                />
              </View>
            </View>
          ))}

          <Button
            mode="text"
            compact
            icon="plus"
            onPress={() => addItem(section.id)}
            textColor={materialColors.primary}
            style={styles.addItemBtn}
          >
            Add item
          </Button>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: materialSpacing.sm,
  },
  hint: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    marginBottom: materialSpacing.sm,
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: materialSpacing.sm,
    marginBottom: materialSpacing.md,
  },
  topActionBtn: {
    marginRight: materialSpacing.xs,
  },
  emptyText: {
    ...materialTypography.bodySmall,
    color: materialColors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: materialSpacing.md,
    borderWidth: 1,
    borderColor: materialColors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: materialColors.border,
    borderRadius: 8,
    padding: materialSpacing.sm,
    marginBottom: materialSpacing.md,
    backgroundColor: materialColors.surfaceVariant,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitleInput: {
    flex: 1,
    backgroundColor: materialColors.surface,
  },
  sectionControls: {
    flexDirection: 'row',
  },
  controlIcon: {
    margin: 0,
  },
  platformButtons: {
    marginVertical: materialSpacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: materialColors.surface,
    borderWidth: 1,
    borderColor: materialColors.border,
    borderRadius: 8,
    padding: materialSpacing.xs,
    marginBottom: materialSpacing.xs,
    gap: materialSpacing.xs,
  },
  itemLabelInput: {
    width: 72,
    backgroundColor: materialColors.surface,
  },
  itemTextInput: {
    flex: 1,
    backgroundColor: materialColors.surface,
  },
  itemControls: {
    justifyContent: 'flex-start',
  },
  addItemBtn: {
    alignSelf: 'flex-start',
  },
})
