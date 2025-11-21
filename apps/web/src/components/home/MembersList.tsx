'use client'

import React from 'react'
import { User } from 'lucide-react'

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

export default function MembersList({ membersOnLeave, membersOnWFH }: MembersListProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Members on Leave */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    On Leave
                    <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {membersOnLeave.length}
                    </span>
                </h3>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {membersOnLeave.length > 0 ? (
                        membersOnLeave.map((member, idx) => (
                            <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-medium text-xs">
                                    {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                                    <p className="text-xs text-gray-500">{member.status}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No members on leave today
                        </div>
                    )}
                </div>
            </div>

            {/* Members on WFH */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Working From Home
                    <span className="ml-2 bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {membersOnWFH.length}
                    </span>
                </h3>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {membersOnWFH.length > 0 ? (
                        membersOnWFH.map((member, idx) => (
                            <div key={idx} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">
                                    {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                                    <p className="text-xs text-gray-500">{member.status}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No members on WFH today
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
