'use client'

import React from 'react'
import { Clock, Calendar, Briefcase, Home } from 'lucide-react'

interface SummaryCardsProps {
    averageWorkHours: string
    onTimeArrivalPercentage: number
    leaveBalance: number
    wfhBalance: number
}

export default function SummaryCards({
    averageWorkHours,
    onTimeArrivalPercentage,
    leaveBalance,
    wfhBalance
}: SummaryCardsProps) {
    const cards = [
        {
            title: 'Avg Work Hours',
            value: averageWorkHours,
            icon: Clock,
            color: 'blue',
            bg: 'bg-blue-50',
            text: 'text-blue-600'
        },
        {
            title: 'On Time Arrival',
            value: `${onTimeArrivalPercentage}%`,
            icon: Calendar,
            color: 'green',
            bg: 'bg-green-50',
            text: 'text-green-600'
        },
        {
            title: 'Leave Balance',
            value: leaveBalance,
            icon: Briefcase,
            color: 'purple',
            bg: 'bg-purple-50',
            text: 'text-purple-600'
        },
        {
            title: 'WFH Balance',
            value: wfhBalance,
            icon: Home,
            color: 'orange',
            bg: 'bg-orange-50',
            text: 'text-orange-600'
        }
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:scale-[1.02]">
                    <div className={`${card.bg} p-3 rounded-xl`}>
                        <card.icon className={`h-6 w-6 ${card.text}`} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{card.title}</p>
                        <p className="text-xl font-bold text-gray-900">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}
