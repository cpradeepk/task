'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Sun, Clock } from 'lucide-react'
import { DateUtils } from '@/lib/dateUtils'

interface HolidayCalendarProps {
  month?: number // 0-11 (January = 0)
  year?: number
  showUpcoming?: boolean
}

interface HolidayInfo {
  date: Date
  type: 'sunday' | 'saturday_2nd' | 'saturday_4th'
  description: string
}

export default function HolidayCalendar({
  month,
  year,
  showUpcoming = false
}: HolidayCalendarProps) {
  const [holidays, setHolidays] = useState<HolidayInfo[]>([])
  const [workingDays, setWorkingDays] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(0)
  const [currentYear, setCurrentYear] = useState(2024)

  // Initialize client-side values
  useEffect(() => {
    const now = new Date()
    setCurrentMonth(month ?? now.getMonth())
    setCurrentYear(year ?? now.getFullYear())
  }, [month, year])

  useEffect(() => {
    calculateHolidays()
  }, [currentMonth, currentYear])

  const calculateHolidays = () => {
    const holidayList: HolidayInfo[] = []
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    let workingDayCount = 0

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const dayOfWeek = date.getDay()

      if (DateUtils.isHoliday(date)) {
        let type: 'sunday' | 'saturday_2nd' | 'saturday_4th' = 'sunday'
        let description = ''

        if (dayOfWeek === 0) {
          type = 'sunday'
          description = 'Sunday'
        } else if (dayOfWeek === 6) {
          const weekOfMonth = Math.ceil(day / 7)
          if (weekOfMonth === 2) {
            type = 'saturday_2nd'
            description = '2nd Saturday'
          } else if (weekOfMonth === 4) {
            type = 'saturday_4th'
            description = '4th Saturday'
          }
        }

        if (description) {
          holidayList.push({ date, type, description })
        }
      } else {
        workingDayCount++
      }
    }

    setHolidays(holidayList)
    setWorkingDays(workingDayCount)
  }

  const getUpcomingHolidays = () => {
    const today = new Date()
    const upcoming: HolidayInfo[] = []
    
    // Check next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      
      if (DateUtils.isHoliday(date)) {
        const dayOfWeek = date.getDay()
        let description = ''
        let type: 'sunday' | 'saturday_2nd' | 'saturday_4th' = 'sunday'

        if (dayOfWeek === 0) {
          type = 'sunday'
          description = 'Sunday'
        } else if (dayOfWeek === 6) {
          const weekOfMonth = Math.ceil(date.getDate() / 7)
          if (weekOfMonth === 2) {
            type = 'saturday_2nd'
            description = '2nd Saturday'
          } else if (weekOfMonth === 4) {
            type = 'saturday_4th'
            description = '4th Saturday'
          }
        }

        if (description) {
          upcoming.push({ date, type, description })
        }
      }
    }

    return upcoming.slice(0, 5) // Return next 5 holidays
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMonthName = () => {
    return new Date(currentYear, currentMonth).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long'
    })
  }

  const getHolidayIcon = (type: string) => {
    switch (type) {
      case 'sunday':
        return <Sun className="h-4 w-4 text-yellow-600" />
      case 'saturday_2nd':
      case 'saturday_4th':
        return <Calendar className="h-4 w-4 text-blue-600" />
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />
    }
  }

  const getHolidayColor = (type: string) => {
    switch (type) {
      case 'sunday':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'saturday_2nd':
      case 'saturday_4th':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (showUpcoming) {
    const upcomingHolidays = getUpcomingHolidays()
    
    return (
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-black">Upcoming Holidays</h3>
        </div>

        {upcomingHolidays.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No holidays in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingHolidays.map((holiday, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${getHolidayColor(holiday.type)}`}
              >
                <div className="flex items-center space-x-3">
                  {getHolidayIcon(holiday.type)}
                  <div>
                    <div className="font-medium">{holiday.description}</div>
                    <div className="text-sm opacity-75">{formatDate(holiday.date)}</div>
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {Math.ceil((holiday.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-black">Holiday Calendar</h3>
        </div>
        <div className="text-sm text-gray-600">
          {getMonthName()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Working Days</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-1">{workingDays}</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">Holidays</span>
          </div>
          <div className="text-2xl font-bold text-red-900 mt-1">{holidays.length}</div>
        </div>
      </div>

      {holidays.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No holidays this month</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="font-medium text-black mb-3">Holiday List</h4>
          {holidays.map((holiday, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getHolidayColor(holiday.type)}`}
            >
              <div className="flex items-center space-x-3">
                {getHolidayIcon(holiday.type)}
                <div>
                  <div className="font-medium">{holiday.description}</div>
                  <div className="text-sm opacity-75">{formatDate(holiday.date)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
