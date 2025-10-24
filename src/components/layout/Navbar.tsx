'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { logout, getCurrentUser, getRoleDisplayName } from '@/lib/auth'
import { User as UserType } from '@/lib/types'
import {
  Menu,
  X,
  User,
  LogOut,
  Home,
  Plus,
  Calendar,
  Briefcase,
  BarChart3,
  Users,
  Settings,
  Clock,
  FileText,
  CheckSquare,
  Bug
} from 'lucide-react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)
    setCurrentUser(getCurrentUser())
  }, [])

  // Show skeleton navbar while loading to prevent flickering
  if (!isClient || !currentUser) {
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200 page-transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="h-8 w-8 bg-gray-200 rounded skeleton-pulse"></div>
                <div className="ml-2 h-6 w-24 bg-gray-200 rounded skeleton-pulse"></div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-20 bg-gray-200 rounded skeleton-pulse"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-full skeleton-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }



  const getNavigationItems = () => {
    const baseItems = [
      { href: '/dashboard', label: 'Dashboard', icon: Home }
    ]

    switch (currentUser.role) {
      case 'employee':
        return [
          ...baseItems,
          { href: '/tasks/create', label: 'Tasks', icon: Plus },
          { href: '/bugs', label: 'Bugs', icon: Bug },
          { href: '/leave/apply', label: 'Leave', icon: Calendar },
          { href: '/wfh/apply', label: 'WFH', icon: Briefcase },
          { href: '/my-applications', label: 'Applications', icon: FileText },
          { href: '/approvals', label: 'Approvals', icon: CheckSquare },
          { href: '/profile', label: 'Profile', icon: User }
        ]

      case 'management':
        return [
          ...baseItems,
          { href: '/tasks/create', label: 'Tasks', icon: Plus },
          { href: '/bugs', label: 'Bugs', icon: Bug },
          { href: '/leave/apply', label: 'Leave', icon: Calendar },
          { href: '/wfh/apply', label: 'WFH', icon: Briefcase },
          { href: '/my-applications', label: 'Applications', icon: FileText },
          { href: '/approvals', label: 'Approvals', icon: CheckSquare },
          { href: '/reports', label: 'Reports', icon: BarChart3 },
          { href: '/profile', label: 'Profile', icon: User }
        ]

      case 'top_management':
        return [
          ...baseItems,
          { href: '/tasks/create', label: 'Tasks', icon: Plus },
          { href: '/bugs', label: 'Bugs', icon: Bug },
          { href: '/reports', label: 'Reports', icon: BarChart3 },
          { href: '/approvals', label: 'Approvals', icon: Calendar },
          { href: '/profile', label: 'Profile', icon: User }
        ]

      case 'admin':
        return [
          ...baseItems,
          { href: '/bugs', label: 'Bugs', icon: Bug },
          { href: '/users', label: 'User Management', icon: Users },
          { href: '/settings', label: 'Settings', icon: Settings }
        ]

      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="h-10 w-10 flex items-center justify-center">
                <Image
                  src="/images/logos/amtariksha_icon.png"
                  alt="Amtariksha Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-black">Amtariksha</h1>
                <p className="text-xs text-gray-600">{getRoleDisplayName(currentUser.role)}</p>
              </div>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-black">{currentUser.name}</p>
              <p className="text-xs text-gray-600">{currentUser.employeeId}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-black hover:text-gray-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-black hover:text-primary"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Row - Desktop */}
        <div className="hidden md:block border-t border-gray-100">
          <div className="flex items-center justify-center space-x-1 py-3 overflow-x-auto scrollbar-hide">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${
                    isActive
                      ? 'bg-primary text-black shadow-lg border border-primary border-opacity-30 scale-105'
                      : 'text-gray-600 hover:text-black hover:bg-gray-50 hover:shadow-md'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.label.split(' ')[0]}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-black shadow-sm'
                        : 'text-gray-600 hover:text-black hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
