'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

interface Option {
    value: string
    label: string
    icon?: React.ReactNode
}

interface MultiSelectProps {
    label: string
    options: Option[]
    selectedValues: string[]
    onChange: (values: string[]) => void
    placeholder?: string
    className?: string
}

export default function MultiSelect({
    label,
    options,
    selectedValues,
    onChange,
    placeholder = 'Select options',
    className = ''
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value))
        } else {
            onChange([...selectedValues, value])
        }
    }

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) {
            onChange([])
        } else {
            onChange(options.map(o => o.value))
        }
    }

    const getDisplayValue = () => {
        if (selectedValues.length === 0) return placeholder
        if (selectedValues.length === options.length) return 'All'
        if (selectedValues.length === 1) {
            return options.find(o => o.value === selectedValues[0])?.label || selectedValues[0]
        }
        return `${selectedValues.length} selected`
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-3 pr-10 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
            >
                <span className="block truncate text-gray-700 font-medium">
                    {getDisplayValue()}
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {/* Action Row */}
                    <div className="flex justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-20">
                        <button
                            type="button"
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            onClick={handleSelectAll}
                        >
                            {selectedValues.length === options.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <button
                            type="button"
                            className="text-xs font-medium text-gray-500 hover:text-gray-700"
                            onClick={() => onChange([])}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Options */}
                    {options.map((option) => {
                        const isSelected = selectedValues.includes(option.value)
                        return (
                            <div
                                key={option.value}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50 flex items-center ${isSelected ? 'bg-blue-50/50 text-blue-900' : 'text-gray-900'}`}
                                onClick={() => toggleOption(option.value)}
                            >
                                <div className="flex items-center">
                                    <div className={`mr-3 h-4 w-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    {option.icon && <span className="mr-2 flex-shrink-0">{option.icon}</span>}
                                    <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                        {option.label}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
