/**
 * Permissions Management Page
 * Restricted to: admin role and user AM-0001
 * Allows managing role-based permissions and user-specific overrides
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { getCurrentUser } from '@/lib/auth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  Shield,
  Users,
  User as UserIcon,
  Check,
  X,
  AlertTriangle,
  Save,
  RotateCcw,
  Eye,
  Plus,
  Edit,
  Trash2,
  CheckCircle
} from 'lucide-react'

interface RolePermission {
  id: number
  role: string
  featureKey: string
  featureName: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean
}

interface PermissionMatrix {
  [role: string]: {
    [featureKey: string]: {
      canView: boolean
      canCreate: boolean
      canEdit: boolean
      canDelete: boolean
      canApprove: boolean
    }
  }
}

const ROLES = ['admin', 'top_management', 'management', 'employee']
const ROLE_LABELS: { [key: string]: string } = {
  admin: 'Admin',
  top_management: 'Top Management',
  management: 'Management',
  employee: 'Employee'
}

const PERMISSION_TYPES = [
  { key: 'canView', label: 'View', icon: Eye, color: 'blue' },
  { key: 'canCreate', label: 'Create', icon: Plus, color: 'green' },
  { key: 'canEdit', label: 'Edit', icon: Edit, color: 'yellow' },
  { key: 'canDelete', label: 'Delete', icon: Trash2, color: 'red' },
  { key: 'canApprove', label: 'Approve', icon: CheckCircle, color: 'purple' }
]

export default function PermissionsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [matrix, setMatrix] = useState<PermissionMatrix>({})
  const [features, setFeatures] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('admin')
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Only admin and AM-0001 can access this page
    if (user.role !== 'admin' && user.employeeId !== 'AM-0001') {
      router.push('/dashboard')
      return
    }

    setCurrentUser(user)
    loadPermissions()
  }, [router])

  const loadPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/permissions?type=all')
      const data = await response.json()

      if (data.success) {
        setPermissions(data.data)
        buildMatrix(data.data)
      }
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildMatrix = (perms: RolePermission[]) => {
    const newMatrix: PermissionMatrix = {}
    const featureSet = new Set<string>()

    perms.forEach(perm => {
      if (!newMatrix[perm.role]) {
        newMatrix[perm.role] = {}
      }

      newMatrix[perm.role][perm.featureKey] = {
        canView: perm.canView,
        canCreate: perm.canCreate,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
        canApprove: perm.canApprove
      }

      featureSet.add(perm.featureKey)
    })

    setMatrix(newMatrix)
    setFeatures(Array.from(featureSet).sort())
  }

  const togglePermission = (role: string, featureKey: string, permType: string) => {
    const newMatrix = { ...matrix }
    if (!newMatrix[role]) newMatrix[role] = {}
    if (!newMatrix[role][featureKey]) {
      newMatrix[role][featureKey] = {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false
      }
    }

    newMatrix[role][featureKey] = {
      ...newMatrix[role][featureKey],
      [permType]: !newMatrix[role][featureKey][permType as keyof typeof newMatrix[typeof role][typeof featureKey]]
    }

    setMatrix(newMatrix)
    setHasChanges(true)
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      setSaveMessage('')

      // Save all changes for the selected role
      const rolePerms = matrix[selectedRole]
      if (!rolePerms) return

      for (const featureKey of Object.keys(rolePerms)) {
        await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-role',
            role: selectedRole,
            featureKey,
            permissions: rolePerms[featureKey]
          })
        })
      }

      setSaveMessage('Changes saved successfully!')
      setHasChanges(false)
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Failed to save changes:', error)
      setSaveMessage('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    loadPermissions()
    setHasChanges(false)
  }

  const getFeatureName = (featureKey: string): string => {
    const perm = permissions.find(p => p.featureKey === featureKey)
    return perm?.featureName || featureKey
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900">Permissions Management</h1>
              </div>
              <p className="text-gray-600">
                Manage role-based permissions for features and pages
              </p>
            </div>

            {hasChanges && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetChanges}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>

          {saveMessage && (
            <div className={`mt-4 p-3 rounded-lg ${saveMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {saveMessage}
            </div>
          )}
        </div>

        {/* Role Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role to Edit:
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRole === role
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Feature
                  </th>
                  {PERMISSION_TYPES.map(permType => (
                    <th
                      key={permType.key}
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <permType.icon className={`h-4 w-4 text-${permType.color}-500`} />
                        <span>{permType.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {features.map((featureKey, idx) => {
                  const rolePerms = matrix[selectedRole]?.[featureKey] || {
                    canView: false,
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                    canApprove: false
                  }

                  return (
                    <tr key={featureKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit">
                        {getFeatureName(featureKey)}
                      </td>
                      {PERMISSION_TYPES.map(permType => {
                        const isEnabled = rolePerms[permType.key as keyof typeof rolePerms]
                        return (
                          <td key={permType.key} className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => togglePermission(selectedRole, featureKey, permType.key)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                isEnabled
                                  ? `bg-${permType.color}-100 text-${permType.color}-600 hover:bg-${permType.color}-200`
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                              title={`${isEnabled ? 'Disable' : 'Enable'} ${permType.label}`}
                            >
                              {isEnabled ? (
                                <Check className="h-5 w-5" />
                              ) : (
                                <X className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Permission Types:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>View:</strong> Can access and view the feature/page</li>
                <li><strong>Create:</strong> Can create new items</li>
                <li><strong>Edit:</strong> Can edit existing items</li>
                <li><strong>Delete:</strong> Can delete items</li>
                <li><strong>Approve:</strong> Can approve items (for approval workflows)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

