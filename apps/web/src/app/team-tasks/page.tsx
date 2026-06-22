'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getTeamMembers } from '@/lib/auth'
import { hasTabAccess } from '@/lib/permissions'
import { QUERIES } from '@/lib/graphql-queries'
import { useProjectFilter } from '@/contexts/ProjectFilterContext'

import { Task, User } from '@/lib/types'
import { User as UserIcon, Clock, Calendar, BarChart3, Eye, Timer } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'

// Helper function to execute GraphQL queries
async function executeGraphQLQuery(query: string, variables: any) {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })

  const result = await response.json()
  if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL query failed')
  return result.data
}


export default function TeamTasks() {
  const { selectedProjectIds } = useProjectFilter()
  const [teamTasks, setTeamTasks] = useState<{[employeeId: string]: Task[]}>({})
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) {
      router.push('/')
      return
    }

    // Permission gate
    if (!hasTabAccess(currentUser, 'team_tasks')) {
      router.push('/dashboard')
      return
    }

    if (!initialized) {
      loadTeamTasks()
      setInitialized(true)
    }
  }, [currentUser, router, initialized, selectedProjectIds])

  // Reload team tasks when selected projects filter changes
  useEffect(() => {
    if (initialized) {
      loadTeamTasks()
    }
  }, [selectedProjectIds])

  // Separate effect to handle team member selection
  useEffect(() => {
    const initializeSelectedEmployee = async () => {
      if (currentUser && initialized) {
        try {
          let members = await getTeamMembers(currentUser.employeeId)
          if (selectedProjectIds && selectedProjectIds.length > 0) {
            members = members.filter(m => m.employeeId === currentUser.employeeId)
          }
          setTeamMembers(members)
          if (members.length > 0) {
            if (selectedEmployee === '' || !members.some(m => m.employeeId === selectedEmployee)) {
              setSelectedEmployee(members[0].employeeId)
            }
          } else {
            setSelectedEmployee('')
          }
        } catch (error) {
          console.error('Failed to get team members:', error)
        }
      }
    }

    initializeSelectedEmployee()
  }, [currentUser, initialized, selectedEmployee, selectedProjectIds])

  const loadTeamTasks = async () => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      let members = await getTeamMembers(currentUser.employeeId)
      if (selectedProjectIds && selectedProjectIds.length > 0) {
        members = members.filter(m => m.employeeId === currentUser.employeeId)
      }
      setTeamMembers(members)
      const tasksData: {[employeeId: string]: Task[]} = {}

      for (const member of members) {
        try {
          // Try GraphQL first
          try {
            console.log(`🔵 [Team Tasks] Attempting GraphQL query for ${member.employeeId}...`)
            const variables: any = {
              assignedTo: [member.employeeId]
            }
            if (selectedProjectIds && selectedProjectIds.length > 0) {
              variables.projectIds = selectedProjectIds
            }
            const data = await executeGraphQLQuery(QUERIES.GET_TASKS, variables)
            tasksData[member.employeeId] = data.tasks || []
            console.log(`✅ [Team Tasks] GraphQL successful: ${tasksData[member.employeeId].length} tasks`)
          } catch (graphqlError) {
            console.warn(`⚠️ [Team Tasks] GraphQL failed for ${member.employeeId}, falling back to REST:`, graphqlError)

            // Fallback to REST API
            const response = await fetch(`/api/tasks/user/${member.employeeId}`)
            if (response.ok) {
              const result = await response.json()
              let memberTasks = result.data || []
              if (selectedProjectIds && selectedProjectIds.length > 0) {
                memberTasks = memberTasks.filter((t: any) => t.projectId && selectedProjectIds.includes(t.projectId))
              }
              tasksData[member.employeeId] = memberTasks
              console.log(`✅ [Team Tasks] REST successful: ${tasksData[member.employeeId].length} tasks`)
            } else {
              tasksData[member.employeeId] = []
            }
          }
        } catch (error) {
          console.error(`Error loading tasks for ${member.employeeId}:`, error)
          tasksData[member.employeeId] = []
        }
      }

      setTeamTasks(tasksData)
    } catch (error) {
      console.error('Error loading team tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTeamTasks(prev => ({
      ...prev,
      [selectedEmployee]: prev[selectedEmployee].map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    }))
  }

  if (!currentUser) return null

  if (currentUser.role !== 'top_management' && currentUser.role !== 'admin') {
    return (
      <div>
        <Navbar />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  const selectedMember = teamMembers.find(member => member.employeeId === selectedEmployee)
  const selectedTasks = teamTasks[selectedEmployee] || []

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Team Tasks</h1>
          <p className="text-gray-600 mt-1">
            View and monitor tasks assigned to your team members
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Managing {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
            <p className="text-gray-600">You don&apos;t have any team members assigned to you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Team Members Sidebar */}
            <div className="lg:col-span-1">
              <div className="card">
                <h3 className="font-medium text-black mb-4">Team Members</h3>
                <div className="space-y-2">
                  {teamMembers.map((member) => {
                    const memberTasks = teamTasks[member.employeeId] || []
                    const activeTasks = memberTasks.filter(task => 
                      task.status === 'In Progress' || task.status === 'Yet to Start'
                    ).length
                    
                    return (
                      <button
                        key={member.employeeId}
                        onClick={() => setSelectedEmployee(member.employeeId)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedEmployee === member.employeeId
                            ? 'bg-primary bg-opacity-20 border border-primary'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium text-black">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.employeeId}</p>
                            <p className="text-xs text-gray-500">
                              {activeTasks} active task{activeTasks !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Tasks Content */}
            <div className="lg:col-span-3">
              {selectedMember ? (
                <div>
                  {/* Member Header */}
                  <div className="card mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <UserIcon className="h-8 w-8 text-gray-400" />
                        <div>
                          <h2 className="text-xl font-bold text-black">{selectedMember.name}</h2>
                          <p className="text-gray-600">{selectedMember.employeeId} • {selectedMember.department}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Tasks</p>
                        <p className="text-2xl font-bold text-black">{selectedTasks.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List */}
                  {selectedTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks</h3>
                      <p className="text-gray-600">This team member has no tasks assigned.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedTasks.map((task) => (
                        <div key={task.id} className="card">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {task.taskId}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  task.status === 'Done' ? 'bg-green-100 text-green-800' :
                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                  task.status === 'Delayed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.status}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  task.priority === 'U&I' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'NU&I' ? 'bg-orange-100 text-orange-800' :
                                  task.priority === 'U&NI' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                              <h3 className="font-medium text-black mb-2">{task.description}</h3>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Start Date</p>
                                  <p className="font-medium">{task.startDate}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">End Date</p>
                                  <p className="font-medium">{task.endDate}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Estimated</p>
                                  <p className="font-medium">{task.estimatedHours}h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Actual</p>
                                  <p className="font-medium">{task.actualHours || 0}h</p>
                                </div>
                              </div>

                              {task.remarks && (
                                <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                                  <strong>Remarks:</strong> {task.remarks}
                                </div>
                              )}

                              {task.difficulties && (
                                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                                  <strong>Difficulties:</strong> {task.difficulties}
                                </div>
                              )}
                            </div>
                            
                            {/* Task Actions */}
                            <div className="ml-4">
                              <button
                                onClick={() => handleTaskUpdate({ ...task, status: 'In Progress' })}
                                className="text-xs bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark transition-colors"
                              >
                                Update Status
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select Team Member</h3>
                  <p className="text-gray-600">Choose a team member from the sidebar to view their tasks.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
