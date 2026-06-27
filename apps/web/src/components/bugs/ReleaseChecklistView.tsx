'use client'

import { useMemo, useState } from 'react'
import { Bug, ReleaseState, ReleasePlatformChecklist, ReleaseChecklistItem } from '@/lib/types'
import { CheckCircle2, Circle, Trash2, Plus, Rocket } from 'lucide-react'

type Platform = 'android' | 'ios'

interface ReleaseChecklistViewProps {
  bug: Bug
  canEdit: boolean
  onChange: (releaseState: ReleaseState) => void | Promise<void>
}

const PLATFORM_LABEL: Record<Platform, string> = {
  android: 'Android',
  ios: 'iOS'
}

const VERSION_LABEL: Record<Platform, string> = {
  android: 'Play Store version',
  ios: 'App Store version'
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

export default function ReleaseChecklistView({ bug, canEdit, onChange }: ReleaseChecklistViewProps) {
  const releaseState: ReleaseState = useMemo(
    () =>
      bug.releaseState ?? {
        platforms: [],
        checklists: {},
        versions: {}
      },
    [bug.releaseState]
  )

  // Local draft text for the "add manual item" input, keyed per platform.
  const [manualDrafts, setManualDrafts] = useState<Record<Platform, string>>({
    android: '',
    ios: ''
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
        [platform]: nextChecklist
      }
    }
    void onChange(nextState)
  }

  const handleToggleItem = (platform: Platform, itemId: string) => {
    if (!canEdit) return
    const checklist = releaseState.checklists[platform] ?? emptyChecklist()
    const nextCompleted = {
      ...checklist.completed,
      [itemId]: !checklist.completed[itemId]
    }
    updateChecklist(platform, { ...checklist, completed: nextCompleted })
  }

  const handleAddManual = (platform: Platform) => {
    if (!canEdit) return
    const text = manualDrafts[platform].trim()
    if (!text) return
    const checklist = releaseState.checklists[platform] ?? emptyChecklist()
    const newItem: ReleaseChecklistItem = { id: crypto.randomUUID(), text }
    updateChecklist(platform, {
      ...checklist,
      manual: [...checklist.manual, newItem]
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
      completed: nextCompleted
    })
  }

  const handleVersionChange = (platform: Platform, value: string) => {
    if (!canEdit) return
    const nextState: ReleaseState = {
      ...releaseState,
      versions: {
        ...releaseState.versions,
        [platform]: value
      }
    }
    void onChange(nextState)
  }

  if (platforms.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-sm text-gray-500">
        No release platforms configured for this release.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {platforms.map((platform) => {
        const checklist = releaseState.checklists[platform] ?? emptyChecklist()
        const ids = allItemIds(checklist)
        const total = ids.length
        const completed = ids.filter((id) => checklist.completed[id]).length
        const allDone = total > 0 && completed === total
        const versionValue = releaseState.versions[platform] ?? ''

        return (
          <div
            key={platform}
            className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            {/* Platform header + progress */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Rocket className="h-5 w-5 text-primary" />
                <span>{PLATFORM_LABEL[platform]}</span>
              </h3>
              <span className="text-sm font-medium text-gray-600">
                {completed} of {total} done
              </span>
            </div>

            {/* Template sections (read-only text, checkable) */}
            <div className="space-y-5">
              {checklist.template.map((section) => (
                <div key={section.id}>
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">
                    {section.title}
                  </h4>
                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const isDone = !!checklist.completed[item.id]
                      return (
                        <div
                          key={item.id}
                          className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                            isDone
                              ? 'bg-gray-50 border-gray-200'
                              : 'bg-white border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleItem(platform, item.id)}
                            disabled={!canEdit}
                            className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded disabled:cursor-not-allowed"
                          >
                            {isDone ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            {item.label && (
                              <span className="inline-block text-xs font-semibold text-gray-500 mr-2">
                                {item.label}
                              </span>
                            )}
                            <span
                              className={`text-sm ${
                                isDone ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Manual items (checkable + editable) */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  Additional testing items
                </h4>
                <div className="space-y-2">
                  {checklist.manual.map((item) => {
                    const isDone = !!checklist.completed[item.id]
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                          isDone
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleItem(platform, item.id)}
                          disabled={!canEdit}
                          className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded disabled:cursor-not-allowed"
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400 hover:text-blue-600" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm ${
                              isDone ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveManual(platform, item.id)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {checklist.manual.length === 0 && (
                    <p className="text-sm text-gray-400">No additional items yet.</p>
                  )}
                </div>

                {/* Add manual item */}
                {canEdit && (
                  <div className="flex items-center space-x-2 mt-3">
                    <input
                      type="text"
                      value={manualDrafts[platform]}
                      onChange={(e) =>
                        setManualDrafts((prev) => ({
                          ...prev,
                          [platform]: e.target.value
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddManual(platform)
                        }
                      }}
                      placeholder="Add a testing item…"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleAddManual(platform)}
                      disabled={!manualDrafts[platform].trim()}
                      className="flex items-center space-x-1 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Version field — only when all items complete */}
            {allDone && (
              <div className="mt-5 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {VERSION_LABEL[platform]}
                </label>
                <input
                  type="text"
                  defaultValue={versionValue}
                  disabled={!canEdit}
                  onBlur={(e) => {
                    if (e.target.value !== versionValue) {
                      handleVersionChange(platform, e.target.value)
                    }
                  }}
                  placeholder="e.g. 1.2.3"
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
