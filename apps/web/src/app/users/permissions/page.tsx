'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { useRouter } from 'next/navigation'
import {
    Loader2,
    Save,
    Search,
    Filter,
    Check,
    X,
    AlertCircle,
    Shield,
    RotateCcw
} from 'lucide-react'
import { QUERIES, MUTATIONS } from '@/lib/graphql-queries'
import { AVAILABLE_TABS, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions'
import { User } from '@/lib/types'
import { getCurrentUser } from '@/lib/auth'

// Define types locally if not available in shared types yet
interface UserWithPermissions extends User {
    tabPermissions?: string[]
}

export default function PermissionsPage() {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({})
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    // Fetch users
    const { data, loading, error, refetch } = useQuery<{ users: UserWithPermissions[] }>(gql(QUERIES.GET_USERS), {
        fetchPolicy: 'network-only'
    })

    // Update user mutation
    const [updateUser] = useMutation(gql(MUTATIONS.UPDATE_USER))

    useEffect(() => {
        const user = getCurrentUser()
        if (!user) {
            router.push('/')
            return
        }
        // Only admins should access this page
        if (user.role !== 'admin') {
            router.push('/home')
            return
        }
        setCurrentUser(user)
    }, [router])

    // Filter users
    const users: UserWithPermissions[] = data?.users || []
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.employeeId.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesRole = roleFilter === 'all' || user.role === roleFilter

        return matchesSearch && matchesRole
    })

    // Handle permission toggle
    const handleTogglePermission = (employeeId: string, tabKey: string, currentPermissions: string[] | undefined, userRole: string) => {
        // Determine effective permissions for this user
        // If user has custom permissions (in pendingChanges or from DB), use those
        // Otherwise, start with default role permissions

        let effectivePermissions: string[]

        if (pendingChanges[employeeId]) {
            effectivePermissions = [...pendingChanges[employeeId]]
        } else if (currentPermissions && currentPermissions.length > 0) {
            effectivePermissions = [...currentPermissions]
        } else {
            // If no custom permissions, they have the default role permissions
            effectivePermissions = [...(DEFAULT_ROLE_PERMISSIONS[userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [])]
        }

        // Toggle the tab
        if (effectivePermissions.includes(tabKey)) {
            effectivePermissions = effectivePermissions.filter(k => k !== tabKey)
        } else {
            effectivePermissions.push(tabKey)
        }

        // Update pending changes
        setPendingChanges(prev => ({
            ...prev,
            [employeeId]: effectivePermissions
        }))
    }

    // Check if a user has access to a tab (considering pending changes)
    const hasAccess = (user: UserWithPermissions, tabKey: string) => {
        // Check pending changes first
        if (pendingChanges[user.employeeId]) {
            return pendingChanges[user.employeeId].includes(tabKey)
        }

        // Check user specific permissions from DB
        if (user.tabPermissions && user.tabPermissions.length > 0) {
            return user.tabPermissions.includes(tabKey)
        }

        // Fallback to role defaults
        const roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || []
        return roleDefaults.includes(tabKey)
    }

    // Check if permission is customized (different from role default)
    const isCustomized = (user: UserWithPermissions) => {
        if (pendingChanges[user.employeeId]) return true
        return !!(user.tabPermissions && user.tabPermissions.length > 0)
    }

    // Reset changes for a user
    const handleReset = (employeeId: string) => {
        const newPending = { ...pendingChanges }
        delete newPending[employeeId]
        setPendingChanges(newPending)
    }

    // Save all changes
    const handleSave = async () => {
        setSaveStatus('saving')
        setErrorMessage('')

        try {
            const promises = Object.entries(pendingChanges).map(([employeeId, permissions]) => {
                return updateUser({
                    variables: {
                        employeeId,
                        input: {
                            tabPermissions: permissions
                        }
                    }
                })
            })

            await Promise.all(promises)

            setSaveStatus('success')
            setPendingChanges({})
            refetch()

            setTimeout(() => {
                setSaveStatus('idle')
            }, 3000)
        } catch (err: any) {
            console.error('Error saving permissions:', err)
            setSaveStatus('error')
            setErrorMessage(err.message || 'Failed to save permissions')
        }
    }

    if (loading || !currentUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-red-500">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Error loading users</p>
                <p className="text-sm">{error.message}</p>
            </div>
        )
    }

    const uniqueRoles = Array.from(new Set(users.map(u => u.role)))

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Shield className="h-6 w-6 mr-2 text-primary" />
                            Permissions Manager
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage tab access for users. User-specific permissions override role defaults.
                        </p>
                    </div>

                    <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                        {Object.keys(pendingChanges).length > 0 && (
                            <div className="flex items-center text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                <AlertCircle className="h-4 w-4 mr-1.5" />
                                {Object.keys(pendingChanges).length} user(s) modified
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={Object.keys(pendingChanges).length === 0 || saveStatus === 'saving'}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${Object.keys(pendingChanges).length === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : saveStatus === 'saving'
                                    ? 'bg-primary/70 cursor-wait'
                                    : 'bg-primary hover:bg-primary/90 shadow-sm'
                                }`}
                        >
                            {saveStatus === 'saving' ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : saveStatus === 'success' ? (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
                            />
                        </div>

                        <div className="w-full md:w-64 relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm appearance-none bg-white"
                            >
                                <option value="all">All Roles</option>
                                {uniqueRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {saveStatus === 'error' && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        {errorMessage}
                    </div>
                )}

                {/* Permissions Matrix */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[250px]">
                                        User
                                    </th>
                                    {AVAILABLE_TABS.map(tab => (
                                        <th key={tab.key} scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                                            <div className="flex flex-col items-center">
                                                <span>{tab.label}</span>
                                            </div>
                                        </th>
                                    ))}
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={AVAILABLE_TABS.length + 2} className="px-6 py-12 text-center text-gray-500">
                                            No users found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => {
                                        const isModified = !!pendingChanges[user.employeeId]

                                        return (
                                            <tr key={user.employeeId} className={`hover:bg-gray-50 transition-colors ${isModified ? 'bg-amber-50/30' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 group-hover:bg-gray-50">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                            <div className="flex items-center mt-1">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin'
                                                                    ? 'bg-purple-100 text-purple-800'
                                                                    : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {user.role}
                                                                </span>
                                                                {isCustomized(user) && (
                                                                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                        Custom
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {AVAILABLE_TABS.map(tab => {
                                                    const checked = hasAccess(user, tab.key)

                                                    return (
                                                        <td key={tab.key} className="px-4 py-4 whitespace-nowrap text-center">
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => handleTogglePermission(user.employeeId, tab.key, user.tabPermissions, user.role)}
                                                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                                                                />
                                                            </div>
                                                        </td>
                                                    )
                                                })}

                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white z-10 group-hover:bg-gray-50">
                                                    {isModified && (
                                                        <button
                                                            onClick={() => handleReset(user.employeeId)}
                                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                                            title="Reset changes"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
