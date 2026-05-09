'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { logout, getCurrentUser, getRoleDisplayName } from '@/lib/auth'
import { User as UserType } from '@/lib/types'
import { hasTabAccess } from '@/lib/permissions'
import NotificationBell from './NotificationBell'
import {
  Menu,
  X,
  User,
  LogOut,
  Home,
  Briefcase,
  Bug,
  CheckSquare,
  Calendar,
  FileText,
  ChevronDown,
  Laptop,
  Settings,
  Users,
  Shield,
  FolderKanban,
  ListTodo,
  Code,
  UserCog,
  MessageSquare,
  ClipboardCheck,
  Trash2,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    setIsClient(true)
    setCurrentUser(getCurrentUser())
  }, [])

  // Navigation Structure with permission keys
  const allNavigationItems = [
    {
      label: 'Home',
      href: '/home',
      icon: Home,
      key: 'home'
    },
    {
      label: 'Feed',
      href: '/feed',
      icon: MessageSquare,
      key: 'feed',
      children: [
        { label: 'Show Feed', href: '/feed', icon: MessageSquare, key: 'feed' },
        { label: 'Create Post', href: '/feed?create=true', icon: FileText, key: 'feed' },
      ]
    },
    {
      label: 'Work',
      icon: Briefcase,
      key: 'work_group', // Virtual key for grouping
      children: [
        { label: 'Dashboard', href: '/dashboard', icon: Briefcase, key: 'home' }, // Dashboard usually accessible with home or specific key
        { label: 'Your Work', href: '/your-work', icon: ListTodo, key: 'your_work' },
        { label: 'Team Tasks', href: '/team-tasks', icon: Users, key: 'team_tasks' },
        { label: 'Tasks', href: '/tasks', icon: CheckSquare, key: 'tasks' },
        { label: 'Development', href: '/bugs', icon: Bug, key: 'bugs' },
      ]
    },
    {
      label: 'Attendance',
      icon: Calendar,
      key: 'attendance_group', // Virtual key
      children: [
        { label: 'Leave', href: '/leave/apply', icon: Calendar, key: 'leaves' },
        { label: 'WFH', href: '/wfh/apply', icon: Laptop, key: 'wfh' },
        { label: 'Applications', href: '/my-applications', icon: FileText, key: 'leaves' }, // Grouped with leaves
      ]
    },
    {
      label: 'Admin',
      icon: Shield,
      key: 'admin_group',
      children: [
        { label: 'Projects', href: '/projects', icon: FolderKanban, key: 'projects' },
        { label: 'User Management', href: '/users', icon: UserCog, key: 'user_management' },
        { label: 'Feed Topics', href: '/feed-topics', icon: MessageSquare, key: 'feed_topics' },
        { label: 'Approvals', href: '/approvals', icon: ClipboardCheck, key: 'approvals' },
        { label: 'Settings', href: '/admin/settings', icon: Settings, key: 'settings' },
        { label: 'Deleted Items', href: '/deleted-items', icon: Trash2, key: 'deleted_items' },
        { label: 'Reports', href: '/reports', icon: BarChart3, key: 'reports' },
      ]
    },
    {
      label: 'Account',
      href: '/profile',
      icon: User,
      key: 'profile' // Always accessible
    }
  ]

  // Filter navigation items based on permissions
  const navigationItems = allNavigationItems.map(item => {
    // If it has children, filter them
    if (item.children) {
      const filteredChildren = item.children.filter(child =>
        // If key is provided, check access. If not, assume accessible (or handle otherwise)
        child.key ? hasTabAccess(currentUser, child.key) : true
      )

      // If no children left, return null (unless it's a group that should show empty? No, hide it)
      if (filteredChildren.length === 0) return null

      return { ...item, children: filteredChildren }
    }

    // If it's a direct link
    // 'profile' is always accessible
    if (item.key === 'profile') return item

    // Check access for other items
    if (item.key && hasTabAccess(currentUser, item.key)) {
      return item
    }

    return null
  }).filter(Boolean) as typeof allNavigationItems

  // Calculate active sub-items
  const activeSubItems = navigationItems.find(item => item.label === activeCategory)?.children || []

  // Detect overflow in sub-menu
  useEffect(() => {
    const checkOverflow = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current
        setHasOverflow(scrollWidth > clientWidth)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [activeSubItems])

  // Determine active category based on pathname or hover
  useEffect(() => {
    if (!activeCategory) {
      const currentItem = navigationItems.find(item =>
        item.children?.some(child => pathname === child.href)
      )
      if (currentItem) {
        setActiveCategory(currentItem.label)
      }
    }
  }, [pathname, navigationItems])

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

  return (
    <nav
      className="sticky top-0 z-[99999] bg-white shadow-sm border-b border-gray-200 backdrop-blur-sm bg-white/95"
      onMouseLeave={() => {
        // Reset to current path's category on leave, or keep null if top level
        const currentItem = navigationItems.find(item =>
          item.children?.some(child => pathname === child.href)
        )
        setActiveCategory(currentItem ? currentItem.label : null)
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link href="/home" className="flex items-center space-x-3">
              <div className="h-10 flex items-center justify-center">
                <Image
                  src="/images/logos/amtariksha_logo.png"
                  alt="Amtariksha Logo"
                  width={160}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="border-l border-gray-300 pl-3 ml-1">
                <p className="text-xs text-gray-600 font-medium">{getRoleDisplayName(currentUser.role)}</p>
              </div>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-black">{currentUser.name}</p>
              <p className="text-xs text-gray-600">{currentUser.employeeId}</p>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

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
          <div className="flex flex-col">
            {/* Level 1: Main Categories */}
            <div className="flex items-center justify-center space-x-1 py-3 overflow-x-auto scrollbar-hide">
              {navigationItems.map((item) => {
                const Icon = item.icon
                // Active if it's the current category being hovered/viewed OR if one of its children is active (and no other category is hovered)
                const isActive = activeCategory === item.label || (!activeCategory && item.href === pathname)

                return (
                  <div
                    key={item.label}
                    onMouseEnter={() => setActiveCategory(item.label)}
                    className="relative"
                  >
                    {item.children ? (
                      <button
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${isActive
                          ? 'bg-primary text-black shadow-lg border border-primary border-opacity-30 scale-105'
                          : 'text-gray-600 hover:text-black hover:bg-gray-50 hover:shadow-md'
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                        <span className="lg:hidden">{item.label.split(' ')[0]}</span>
                        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} />
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap transform hover:scale-105 ${isActive
                          ? 'bg-primary text-black shadow-lg border border-primary border-opacity-30 scale-105'
                          : 'text-gray-600 hover:text-black hover:bg-gray-50 hover:shadow-md'
                          }`}
                        onMouseEnter={() => setActiveCategory(null)} // Clear sub-menu when hovering a leaf item
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                        <span className="lg:hidden">{item.label.split(' ')[0]}</span>
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Level 2: Sub-menu (Horizontal Accordion) */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50 rounded-b-lg ${activeSubItems.length > 0 ? 'max-h-16 opacity-100 border-t border-gray-200' : 'max-h-0 opacity-0'
                }`}
            >
              <div className="relative group px-8">
                {/* Left Scroll Button - only show when overflow */}
                {hasOverflow && (
                  <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-primary hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}

                <div
                  ref={scrollContainerRef}
                  className={`flex items-center space-x-6 py-2 overflow-x-auto scrollbar-hide scroll-smooth ${hasOverflow ? 'justify-start' : 'justify-center'
                    }`}
                >
                  {activeSubItems.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${isChildActive
                          ? 'text-primary-600 bg-white shadow-sm'
                          : 'text-gray-600 hover:text-black hover:bg-white/50'
                          }`}
                      >
                        <ChildIcon className="h-3.5 w-3.5" />
                        <span>{child.label}</span>
                      </Link>
                    )
                  })}
                </div>

                {/* Right Scroll Button - only show when overflow */}
                {hasOverflow && (
                  <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-white rounded-full shadow-md text-gray-500 hover:text-primary hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu (Expanded) */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 pb-24">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = item.href ? pathname === item.href : item.children?.some(child => pathname === child.href)

                if (item.children) {
                  const isExpanded = activeCategory === item.label
                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        onClick={() => setActiveCategory(isExpanded ? null : item.label)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                          ? 'bg-primary text-black shadow-sm'
                          : 'text-gray-600 hover:text-black hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon
                            const isChildActive = pathname === child.href
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isChildActive
                                  ? 'bg-primary text-black shadow-sm'
                                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
                                  }`}
                                onClick={() => setIsMenuOpen(false)}
                              >
                                <ChildIcon className="h-4 w-4" />
                                <span>{child.label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
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

      {/* Bottom Tab Bar (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-[99999] flex justify-between items-center safe-area-bottom">
        <Link
          href="/feed"
          className={`flex flex-col items-center p-2 ${pathname === '/feed' ? 'text-primary' : 'text-gray-500'}`}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-[10px] mt-1">Feed</span>
        </Link>

        <Link
          href="/tasks"
          className={`flex flex-col items-center p-2 ${pathname === '/tasks' ? 'text-primary' : 'text-gray-500'}`}
        >
          <CheckSquare className="h-6 w-6" />
          <span className="text-[10px] mt-1">Tasks</span>
        </Link>

        <Link
          href="/home"
          className="flex flex-col items-center justify-center -mt-8"
        >
          <div className={`flex items-center justify-center h-14 w-14 rounded-full shadow-lg ${pathname === '/home' || pathname === '/dashboard' ? 'bg-primary text-white' : 'bg-white text-primary border border-gray-200'}`}>
            <Home className="h-7 w-7" />
          </div>
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </Link>

        <Link
          href="/bugs"
          className={`flex flex-col items-center p-2 ${pathname === '/bugs' ? 'text-primary' : 'text-gray-500'}`}
        >
          <Bug className="h-6 w-6" />
          <span className="text-[10px] mt-1">Dev</span>
        </Link>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center p-2 ${isMenuOpen ? 'text-primary' : 'text-gray-500'}`}
        >
          <Menu className="h-6 w-6" />
          <span className="text-[10px] mt-1">Menu</span>
        </button>
      </div>
    </nav>
  )
}
