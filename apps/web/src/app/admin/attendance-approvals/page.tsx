'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { User } from '@/lib/types'
import ConditionalNavbar from '@/components/layout/ConditionalNavbar'
import { Check, X, Eye, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AttendanceRequest {
    id: string
    userId: string
    attendanceDate: string
    requestType: string
    originalTime: string | null
    newTime: string
    reason: string | null
    status: string
    createdAt: string
    user: {
        employeeId: string
        name: string
        department: string
        role: string
    }
}

const PENDING_ATTENDANCE_REQUESTS_QUERY = `
  query PendingAttendanceRequests {
    pendingAttendanceRequests {
      id
      userId
      attendanceDate
      requestType
      originalTime
      newTime
      reason
      status
      createdAt
      user {
        employeeId
        name
        department
        role
      }
    }
  }
`

const APPROVE_REQUEST_MUTATION = `
  mutation ApproveAttendanceRequest($requestId: ID!) {
    approveAttendanceRequest(requestId: $requestId) {
      id
      status
    }
  }
`

const REJECT_REQUEST_MUTATION = `
  mutation RejectAttendanceRequest($requestId: ID!) {
    rejectAttendanceRequest(requestId: $requestId) {
      id
      status
    }
  }
`

export default function AttendanceApprovalsPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [pendingRequests, setPendingRequests] = useState<AttendanceRequest[]>([])
    const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null)
    const router = useRouter()

    useEffect(() => {
        const user = getCurrentUser()
        if (!user) {
            router.push('/')
            return
        }
        if (!['admin', 'management', 'top_management'].includes(user.role)) {
            router.push('/admin/attendance')
            return
        }
        setCurrentUser(user)
        setIsLoading(false)
        fetchPendingRequests()
    }, [router])

    const fetchPendingRequests = async () => {
        try {
            const response = await fetch('/api/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: PENDING_ATTENDANCE_REQUESTS_QUERY })
            })
            const data = await response.json()
            if (data.data?.pendingAttendanceRequests) {
                setPendingRequests(data.data.pendingAttendanceRequests)
            }
        } catch (error) {
            console.error('Error fetching pending requests:', error)
        }
    }

    const handleApprove = async (requestId: string) => {
        if (!confirm('Approve this attendance edit request?')) return

        try {
            const response = await fetch('/api/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: APPROVE_REQUEST_MUTATION,
                    variables: { requestId }
                })
            })

            const data = await response.json()
            if (data.data?.approveAttendanceRequest) {
                alert('Request approved successfully')
                fetchPendingRequests()
                setSelectedRequest(null)
            } else {
                alert('Failed to approve request: ' + (data.errors?.[0]?.message || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error approving request:', error)
            alert('Failed to approve request')
        }
    }

    const handleReject = async (requestId: string) => {
        if (!confirm('Reject this attendance edit request?')) return

        try {
            const response = await fetch('/api/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: REJECT_REQUEST_MUTATION,
                    variables: { requestId }
                })
            })

            const data = await response.json()
            if (data.data?.rejectAttendanceRequest) {
                alert('Request rejected')
                fetchPendingRequests()
                setSelectedRequest(null)
            } else {
                alert('Failed to reject request: ' + (data.errors?.[0]?.message || 'Unknown error'))
            }
        } catch (error) {
            console.error('Error rejecting request:', error)
            alert('Failed to reject request')
        }
    }

    const getRequestTypeLabel = (type: string) => {
        switch (type) {
            case 'SIGN_IN_EDIT': return 'Sign In Edit'
            case 'SIGN_OUT_EDIT': return 'Sign Out Edit'
            case 'MISSING_ENTRY': return 'Missing Entry'
            default: return type
        }
    }

    const getRequestTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'SIGN_IN_EDIT': return 'bg-blue-100 text-blue-800'
            case 'SIGN_OUT_EDIT': return 'bg-purple-100 text-purple-800'
            case 'MISSING_ENTRY': return 'bg-orange-100 text-orange-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner h-32 w-32"></div>
            </div>
        )
    }

    if (!currentUser) {
        return null
    }

    return (
        <>
            <ConditionalNavbar />
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Attendance Edit Approvals</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Review and approve attendance edit requests from employees
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {pendingRequests.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p className="text-lg font-medium">No pending requests</p>
                                <p className="text-sm mt-1">All attendance edit requests have been reviewed</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Employee
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Request Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                New Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Submitted
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendingRequests.map((request) => (
                                            <tr key={request.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{request.user.name}</div>
                                                    <div className="text-sm text-gray-500">{request.user.department}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${getRequestTypeBadgeColor(request.requestType)}`}>
                                                        {getRequestTypeLabel(request.requestType)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {request.attendanceDate}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(request.newTime).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedRequest(request)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="View details"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(request.id)}
                                                            className="text-green-600 hover:text-green-800"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(request.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="Reject"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Request Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">Employee</p>
                                <p className="font-medium">{selectedRequest.user.name}</p>
                                <p className="text-sm text-gray-600">{selectedRequest.user.department} - {selectedRequest.user.role}</p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Request Type</p>
                                <span className={`inline-block px-2 py-1 text-sm font-medium rounded ${getRequestTypeBadgeColor(selectedRequest.requestType)}`}>
                                    {getRequestTypeLabel(selectedRequest.requestType)}
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Attendance Date</p>
                                <p className="font-medium">{selectedRequest.attendanceDate}</p>
                            </div>

                            {selectedRequest.originalTime && (
                                <div>
                                    <p className="text-sm text-gray-500">Original Time</p>
                                    <p className="font-medium">{new Date(selectedRequest.originalTime).toLocaleString()}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-500">New Time</p>
                                <p className="font-medium">{new Date(selectedRequest.newTime).toLocaleString()}</p>
                            </div>

                            {selectedRequest.reason && (
                                <div>
                                    <p className="text-sm text-gray-500">Reason</p>
                                    <p className="whitespace-pre-wrap">{selectedRequest.reason}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm text-gray-500">Submitted</p>
                                <p className="font-medium">{formatDistanceToNow(new Date(selectedRequest.createdAt), { addSuffix: true })}</p>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(selectedRequest.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleApprove(selectedRequest.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
