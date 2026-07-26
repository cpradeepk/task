/**
 * Company switcher (mobile).
 *
 * Renders nothing unless the signed-in user belongs to more than one company,
 * so the common single-company case gains no clutter. Mirrors the web
 * component in apps/web/src/components/layout/CompanySwitcher.tsx.
 *
 * Switching re-issues the session token server-side and persists it, then calls
 * onSwitched so the host screen can reload — data from the previous company
 * must not remain on screen.
 */

import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { getMyCompanies, switchCompany, getActiveCompanyId } from '../services/companyService'
import type { CompanyMembership } from '../types'

interface CompanySwitcherProps {
  /** Called after a successful switch so the caller can refetch its data. */
  onSwitched?: () => void
}

export default function CompanySwitcher({ onSwitched }: CompanySwitcherProps) {
  const [companies, setCompanies] = useState<CompanyMembership[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [list, active] = await Promise.all([getMyCompanies(), getActiveCompanyId()])
      if (cancelled) return
      setCompanies(list)
      setActiveCompanyId(active || list.find((c) => c.isDefault)?.companyId || null)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelect = async (companyId: string) => {
    if (companyId === activeCompanyId || isSwitching) {
      setIsOpen(false)
      return
    }

    setIsSwitching(true)
    const result = await switchCompany(companyId)
    setIsSwitching(false)
    setIsOpen(false)

    if (!result.success) {
      Alert.alert('Could not switch', result.error || 'Please try again.')
      return
    }

    setActiveCompanyId(companyId)
    onSwitched?.()
  }

  // Nothing to choose between — don't show a control for a non-decision.
  if (companies.length < 2) return null

  const active = companies.find((c) => c.companyId === activeCompanyId) || companies[0]

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setIsOpen(true)}
        disabled={isSwitching}
        accessibilityRole="button"
        accessibilityLabel={`Active company: ${active?.name}. Tap to switch.`}
      >
        <View style={styles.triggerText}>
          <Text style={styles.label}>Company</Text>
          <Text style={styles.value} numberOfLines={1}>
            {active?.name}
          </Text>
        </View>
        {isSwitching ? <ActivityIndicator size="small" /> : <Text style={styles.chevron}>▾</Text>}
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Switch company</Text>
            <FlatList
              data={companies}
              keyExtractor={(item) => item.companyId}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => handleSelect(item.companyId)}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {item.code}
                      {item.companyRole === 'company_admin' ? ' · Admin' : ''}
                    </Text>
                  </View>
                  {item.companyId === activeCompanyId && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  triggerText: { flex: 1, marginRight: 12 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  value: { fontSize: 16, fontWeight: '600', color: '#111827' },
  chevron: { fontSize: 16, color: '#6B7280' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24, maxHeight: '60%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  rowText: { flex: 1, marginRight: 12 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rowMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  check: { fontSize: 16, color: '#4F46E5', fontWeight: '700' },
})
