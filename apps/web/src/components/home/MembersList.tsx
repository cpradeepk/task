'use client'

import React from 'react'
import { Plane, Home } from 'lucide-react'

interface Member {
    user: {
        employeeId: string
        name: string
        role: string
    }
    status: string
}

interface MembersListProps {
    membersOnLeave: Member[]
    membersOnWFH: Member[]
}

function MemberAvatar({ name, variant }: { name: string; variant: 'leave' | 'wfh' }) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const bgClass = variant === 'leave' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'

    return (
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-semibold text-xs ${bgClass} flex-shrink-0`}>
            {initials}
        </div>
    )
}

function MemberRow({ member, variant }: { member: Member; variant: 'leave' | 'wfh' }) {
    return (
        <div className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-default">
            <MemberAvatar name={member.user.name} variant={variant} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{member.user.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{member.user.role || member.status}</p>
            </div>
            {variant === 'leave' && member.status && (
                <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-md whitespace-nowrap flex-shrink-0">
                    {member.status}
                </span>
            )}
        </div>
    )
}

function EmptyState({ message, variant }: { message: string; variant: 'leave' | 'wfh' }) {
    const Icon = variant === 'leave' ? Plane : Home
    const iconBg = variant === 'leave' ? 'bg-red-50' : 'bg-blue-50'
    const iconColor = variant === 'leave' ? 'text-red-300' : 'text-blue-300'

    return (
        <div className="flex flex-col items-center justify-center py-8">
            <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-3`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <p className="text-xs text-gray-400 font-medium">{message}</p>
        </div>
    )
}

export default function MembersList({ membersOnLeave, membersOnWFH }: MembersListProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Members on Leave */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-4 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                <Plane className="h-4 w-4 text-red-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900">On Leave</h3>
                        </div>
                        <span className="min-w-[24px] h-6 flex items-center justify-center bg-red-50 text-red-600 text-xs font-bold px-2 rounded-lg">
                            {membersOnLeave.length}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-gray-100"></div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                    {membersOnLeave.length > 0 ? (
                        <div className="space-y-0.5">
                            {membersOnLeave.map((member, idx) => (
                                <MemberRow key={idx} member={member} variant="leave" />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No members on leave today" variant="leave" />
                    )}
                </div>
            </div>

            {/* Members on WFH */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-4 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Home className="h-4 w-4 text-blue-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900">Working From Home</h3>
                        </div>
                        <span className="min-w-[24px] h-6 flex items-center justify-center bg-blue-50 text-blue-600 text-xs font-bold px-2 rounded-lg">
                            {membersOnWFH.length}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-gray-100"></div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                    {membersOnWFH.length > 0 ? (
                        <div className="space-y-0.5">
                            {membersOnWFH.map((member, idx) => (
                                <MemberRow key={idx} member={member} variant="wfh" />
                            ))}
                        </div>
                    ) : (
                        <EmptyState message="No members on WFH today" variant="wfh" />
                    )}
                </div>
            </div>
        </div>
    )
}
