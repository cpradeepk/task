'use client'

/**
 * Company switcher.
 *
 * Most people belong to exactly one company and never see this — it renders
 * nothing unless there is a genuine choice to make. Consultants and platform
 * staff who span several companies use it to re-scope their session.
 *
 * Switching re-issues the auth token server-side (/api/companies/switch), which
 * verifies membership; the company is never taken from the client on trust.
 * A full reload follows so every cached list is refetched under the new scope
 * rather than showing the previous tenant's data.
 */

import { useEffect, useState } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

interface CompanyOption {
  companyId: string
  name: string
  code: string
  companyRole: 'company_admin' | 'member'
  isDefault: boolean
}

export default function CompanySwitcher() {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch('/api/companies')
        if (!response.ok) return
        const result = await response.json()
        if (cancelled || !result.success) return

        setCompanies(result.data || [])
        const current = getCurrentUser() as { companyId?: string } | null
        setActiveCompanyId(
          current?.companyId ||
            (result.data || []).find((c: CompanyOption) => c.isDefault)?.companyId ||
            null
        )
      } catch {
        // The switcher is non-essential chrome; stay silent and render nothing.
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const switchTo = async (companyId: string) => {
    if (companyId === activeCompanyId || isSwitching) return
    setIsSwitching(true)
    try {
      const response = await fetch('/api/companies/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ companyId }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        alert(result.error || 'Could not switch company')
        return
      }
      // Refresh the stored user so client-side checks see the new scope, then
      // reload so no list keeps rendering the previous company's rows.
      localStorage.setItem('jsr_current_user', JSON.stringify(result.data))
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch company:', error)
      alert('Could not switch company')
    } finally {
      setIsSwitching(false)
    }
  }

  // Nothing to choose between — don't add chrome for a decision that isn't one.
  if (companies.length < 2) return null

  const active = companies.find((c) => c.companyId === activeCompanyId) || companies[0]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-[10rem] truncate">{active?.name || 'Company'}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <ul
            role="listbox"
            className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {companies.map((company) => (
              <li key={company.companyId} role="option" aria-selected={company.companyId === activeCompanyId}>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    switchTo(company.companyId)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-900">{company.name}</span>
                    <span className="block text-xs text-gray-500">
                      {company.code}
                      {company.companyRole === 'company_admin' ? ' · Admin' : ''}
                    </span>
                  </span>
                  {company.companyId === activeCompanyId && (
                    <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
