'use client'

import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  ReleaseChecklistItem,
  ReleaseChecklistSection,
  ReleaseChecklistTemplate,
} from '@/lib/types'

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

const PLATFORM_BADGE: Record<Platform, string> = {
  common: 'bg-gray-100 text-gray-700',
  android: 'bg-green-100 text-green-700',
  ios: 'bg-blue-100 text-blue-700',
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'

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
      id: crypto.randomUUID(),
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
    const item: ReleaseChecklistItem = { id: crypto.randomUUID(), label: '', text: '' }
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Define the release checklist (test cases + release steps) for this sub-project.
        </p>
        <div className="flex items-center gap-2">
          {onLoadDefault && (
            <button
              type="button"
              onClick={onLoadDefault}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Load default template
            </button>
          )}
          <button
            type="button"
            onClick={addSection}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add section
          </button>
        </div>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-gray-400 italic border border-dashed border-gray-300 rounded-lg p-4 text-center">
          No sections yet. Add a section or load the default template.
        </p>
      )}

      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                className={`${inputClass} sm:col-span-2`}
                placeholder="Section title (e.g. Mandatory Test Cases)"
              />
              <select
                value={section.platform}
                onChange={(e) =>
                  updateSection(section.id, { platform: e.target.value as Platform })
                }
                className={inputClass}
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => reorderSection(sectionIndex, -1)}
                disabled={sectionIndex === 0}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                title="Move section up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => reorderSection(sectionIndex, 1)}
                disabled={sectionIndex === sections.length - 1}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                title="Move section down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeSection(section.id)}
                className="p-1.5 text-red-500 hover:text-red-700"
                title="Remove section"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_BADGE[section.platform]}`}
          >
            {PLATFORM_OPTIONS.find((o) => o.value === section.platform)?.label}
          </span>

          <div className="space-y-2">
            {section.items.map((item, itemIndex) => (
              <div key={item.id} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-2">
                <input
                  type="text"
                  value={item.label ?? ''}
                  onChange={(e) => updateItem(section.id, item.id, { label: e.target.value })}
                  className={`${inputClass} w-24 flex-shrink-0`}
                  placeholder="TC-01"
                />
                <textarea
                  value={item.text}
                  onChange={(e) => updateItem(section.id, item.id, { text: e.target.value })}
                  className={`${inputClass} flex-1`}
                  placeholder="Describe the test case or release step"
                  rows={2}
                />
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => reorderItem(section.id, itemIndex, -1)}
                    disabled={itemIndex === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move item up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderItem(section.id, itemIndex, 1)}
                    disabled={itemIndex === section.items.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move item down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(section.id, item.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Remove item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem(section.id)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-4 w-4" /> Add item
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
