/**
 * ReleaseChecklistView (mobile)
 *
 * Per-platform release checklist for a release work-item, mirroring the web
 * component apps/web/src/components/bugs/ReleaseChecklistView.tsx.
 *
 * For each selected platform it renders:
 *   - a header with completion progress ("X of Y done")
 *   - read-only template sections (checkable items snapshotted at creation)
 *   - an editable list of "additional testing items" (manual items)
 *   - a store-version field that appears only when every item is complete
 *
 * State changes are bubbled up via `onChange(nextReleaseState)`; the parent
 * screen persists them (REST PATCH).
 */
import React, { useMemo, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text, TextInput, Button, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  materialColors,
  materialTypography,
  materialSpacing,
} from '../config/materialTheme'
import {
  ReleaseState,
  ReleasePlatformChecklist,
  ReleaseChecklistItem,
} from '../types'
import { Bug } from '../services/bugService'
import { generateId } from '../utils/id'

type Platform = 'android' | 'ios'

interface ReleaseChecklistViewProps {
  bug: Bug
  canEdit: boolean
  onChange: (releaseState: ReleaseState) => void | Promise<void>
}

const PLATFORM_LABEL: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS',
}

const VERSION_LABEL: Record<Platform, string> = {
  android: 'Play Store version',
  ios: 'App Store version',
}

/** Default empty checklist so older release states without a platform entry still render. */
function emptyChecklist(): ReleasePlatformChecklist {
  return { template: [], manual: [], completed: {} }
}

/** All item ids (template + manual) for a platform checklist. */
function allItemIds(checklist: ReleasePlatformChecklist): string[] {
  const templateIds = checklist.template.flatMap((section) =>
    section.items.map((item) => item.id)
  )
  const manualIds = checklist.manual.map((item) => item.id)
  return [...templateIds, ...manualIds]
}

export default function ReleaseChecklistView({
  bug,
  canEdit,
  onChange,
}: ReleaseChecklistViewProps) {
  const releaseState: ReleaseState = useMemo(
    () =>
      bug.releaseState ?? {
        platforms: [],
        checklists: {},
        versions: {},
      },
    [bug.releaseState]
  )

  // Local draft text for the "add manual item" input, keyed per platform.
  const [manualDrafts, setManualDrafts] = useState<Record<Platform, string>>({
    android: '',
    ios: '',
  })
  // Local draft text for the version field, keyed per platform.
  const [versionDrafts, setVersionDrafts] = useState<Record<Platform, string>>({
    android: '',
    ios: '',
  })

  const platforms = releaseState.platforms ?? []

  /** Immutable helper: replace one platform's checklist and call onChange. */
  const updateChecklist = (
    platform: Platform,
    nextChecklist: ReleasePlatformChecklist
  ) => {
    const nextState: ReleaseState = {
      ...releaseState,
      checklists: {
        ...releaseState.checklists,
        [platform]: nextChecklist,
      },
    }
    void onChange(nextState)
  }

  const handleToggleItem = (platform: Platform, itemId: string) => {
    if (!canEdit) return
    const checklist = releaseState.checklists[platform] ?? emptyChecklist()
    const nextCompleted = {
      ...checklist.completed,
      [itemId]: !checklist.completed[itemId],
    }
    updateChecklist(platform, { ...checklist, completed: nextCompleted })
  }

  const handleAddManual = (platform: Platform) => {
    if (!canEdit) return
    const text = (manualDrafts[platform] ?? '').trim()
    if (!text) return
    const checklist = releaseState.checklists[platform] ?? emptyChecklist()
    const newItem: ReleaseChecklistItem = { id: generateId('m'), text }
    updateChecklist(platform, {
      ...checklist,
      manual: [...checklist.manual, newItem],
    })
    setManualDrafts((prev) => ({ ...prev, [platform]: '' }))
  }

  const handleRemoveManual = (platform: Platform, itemId: string) => {
    if (!canEdit) return
    const checklist = releaseState.checklists[platform] ?? emptyChecklist()
    const nextManual = checklist.manual.filter((item) => item.id !== itemId)
    const nextCompleted = { ...checklist.completed }
    delete nextCompleted[itemId]
    updateChecklist(platform, {
      ...checklist,
      manual: nextManual,
      completed: nextCompleted,
    })
  }

  const handleVersionChange = (platform: Platform, value: string) => {
    if (!canEdit) return
    const nextState: ReleaseState = {
      ...releaseState,
      versions: {
        ...releaseState.versions,
        [platform]: value,
      },
    }
    void onChange(nextState)
  }

  if (platforms.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          No release platforms configured for this release.
        </Text>
      </View>
    )
  }

  const renderItemRow = (
    platform: Platform,
    item: ReleaseChecklistItem,
    isDone: boolean,
    isManual: boolean
  ) => (
    <View
      key={item.id}
      style={[styles.itemRow, isDone ? styles.itemRowDone : styles.itemRowOpen]}
    >
      <TouchableOpacity
        onPress={() => handleToggleItem(platform, item.id)}
        disabled={!canEdit}
        style={styles.checkButton}
      >
        <MaterialCommunityIcons
          name={isDone ? 'check-circle' : 'checkbox-blank-circle-outline'}
          size={22}
          color={isDone ? materialColors.success : materialColors.textTertiary}
        />
      </TouchableOpacity>
      <View style={styles.itemTextWrap}>
        <Text style={[styles.itemText, isDone && styles.itemTextDone]}>
          {item.label ? (
            <Text style={styles.itemLabel}>{item.label}  </Text>
          ) : null}
          {item.text}
        </Text>
      </View>
      {isManual && canEdit && (
        <IconButton
          icon="trash-can-outline"
          size={18}
          iconColor={materialColors.error}
          onPress={() => handleRemoveManual(platform, item.id)}
          style={styles.deleteIcon}
        />
      )}
    </View>
  )

  return (
    <View>
      {platforms.map((platform) => {
        const checklist = releaseState.checklists[platform] ?? emptyChecklist()
        const ids = allItemIds(checklist)
        const total = ids.length
        const completed = ids.filter((id) => checklist.completed[id]).length
        const allDone = total > 0 && completed === total
        const versionValue =
          versionDrafts[platform] !== ''
            ? versionDrafts[platform]
            : releaseState.versions[platform] ?? ''

        return (
          <View key={platform} style={styles.platformCard}>
            {/* Platform header + progress */}
            <View style={styles.platformHeader}>
              <View style={styles.platformTitleWrap}>
                <MaterialCommunityIcons
                  name="rocket-launch-outline"
                  size={20}
                  color={materialColors.primary}
                />
                <Text style={styles.platformTitle}>
                  {PLATFORM_LABEL[platform]}
                </Text>
              </View>
              <Text style={styles.progress}>
                {completed} of {total} done
              </Text>
            </View>

            {/* Template sections (read-only text, checkable) */}
            {checklist.template.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item) =>
                  renderItemRow(
                    platform,
                    item,
                    !!checklist.completed[item.id],
                    false
                  )
                )}
              </View>
            ))}

            {/* Manual items (checkable + editable) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional testing items</Text>
              {checklist.manual.map((item) =>
                renderItemRow(
                  platform,
                  item,
                  !!checklist.completed[item.id],
                  true
                )
              )}
              {checklist.manual.length === 0 && (
                <Text style={styles.noItemsText}>No additional items yet.</Text>
              )}

              {canEdit && (
                <View style={styles.addRow}>
                  <TextInput
                    mode="outlined"
                    dense
                    placeholder="Add a testing item…"
                    value={manualDrafts[platform]}
                    onChangeText={(text) =>
                      setManualDrafts((prev) => ({ ...prev, [platform]: text }))
                    }
                    onSubmitEditing={() => handleAddManual(platform)}
                    style={styles.addInput}
                    outlineColor={materialColors.outline}
                    activeOutlineColor={materialColors.primary}
                  />
                  <Button
                    mode="contained"
                    compact
                    onPress={() => handleAddManual(platform)}
                    disabled={!(manualDrafts[platform] ?? '').trim()}
                    buttonColor={materialColors.primary}
                    style={styles.addButton}
                  >
                    Add
                  </Button>
                </View>
              )}
            </View>

            {/* Version field — only when all items complete */}
            {allDone && (
              <View style={styles.versionWrap}>
                <Text style={styles.versionLabel}>{VERSION_LABEL[platform]}</Text>
                <TextInput
                  mode="outlined"
                  dense
                  placeholder="e.g. 1.2.3"
                  value={versionValue}
                  disabled={!canEdit}
                  onChangeText={(text) =>
                    setVersionDrafts((prev) => ({ ...prev, [platform]: text }))
                  }
                  onBlur={() => {
                    const draft = versionDrafts[platform]
                    if (draft !== '' && draft !== (releaseState.versions[platform] ?? '')) {
                      handleVersionChange(platform, draft)
                    }
                  }}
                  style={styles.versionInput}
                  outlineColor={materialColors.outline}
                  activeOutlineColor={materialColors.primary}
                />
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  emptyCard: {
    padding: materialSpacing.lg,
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: materialColors.border,
  },
  emptyText: {
    ...materialTypography.bodyMedium,
    color: materialColors.textSecondary,
  },
  platformCard: {
    backgroundColor: materialColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: materialColors.border,
    padding: materialSpacing.md,
    marginBottom: materialSpacing.md,
  },
  platformHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: materialSpacing.sm,
    marginBottom: materialSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: materialColors.border,
  },
  platformTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: materialSpacing.xs,
  },
  platformTitle: {
    ...materialTypography.titleMedium,
    fontWeight: '600',
    color: materialColors.text,
    marginLeft: materialSpacing.xs,
  },
  progress: {
    ...materialTypography.bodySmall,
    color: materialColors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: materialSpacing.md,
  },
  sectionTitle: {
    ...materialTypography.labelLarge,
    fontWeight: '600',
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: materialSpacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: materialSpacing.xs,
  },
  itemRowDone: {
    backgroundColor: materialColors.surfaceVariant,
    borderColor: materialColors.border,
  },
  itemRowOpen: {
    backgroundColor: materialColors.surface,
    borderColor: materialColors.border,
  },
  checkButton: {
    marginTop: 1,
    marginRight: materialSpacing.sm,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemText: {
    ...materialTypography.bodyMedium,
    color: materialColors.text,
  },
  itemTextDone: {
    color: materialColors.textSecondary,
    textDecorationLine: 'line-through',
  },
  itemLabel: {
    ...materialTypography.bodySmall,
    fontWeight: '700',
    color: materialColors.textSecondary,
  },
  noItemsText: {
    ...materialTypography.bodySmall,
    color: materialColors.textTertiary,
    fontStyle: 'italic',
  },
  deleteIcon: {
    margin: 0,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: materialSpacing.sm,
    gap: materialSpacing.sm,
  },
  addInput: {
    flex: 1,
    backgroundColor: materialColors.surface,
  },
  addButton: {
    alignSelf: 'center',
  },
  versionWrap: {
    marginTop: materialSpacing.sm,
    paddingTop: materialSpacing.md,
    borderTopWidth: 1,
    borderTopColor: materialColors.border,
  },
  versionLabel: {
    ...materialTypography.labelLarge,
    color: materialColors.text,
    marginBottom: materialSpacing.xs,
  },
  versionInput: {
    backgroundColor: materialColors.surface,
  },
})
