/**
 * Task Service
 * API calls for task management
 */

import { get, post, patch, del, ApiResponse } from './apiClient'
import { API_ENDPOINTS } from '../config/api'

export interface Task {
  taskId: string
  selectType: 'Normal' | 'Recursive'
  recursiveType?: 'Daily' | 'Weekly' | 'Monthly' | 'Annually'
  description: string
  assignedTo: string
  assignedBy: string
  support?: string[]
  startDate: string
  endDate: string
  priority: string
  estimatedHours: number
  actualHours?: number
  projectId?: string
  subprojectId?: string
  status: string
  attachments?: string
  relatedTasks?: string
  remarks?: string
  difficulties?: string
  timerTotalTime?: number
  createdAt: string
  updatedAt: string
}

export interface TaskSubTask {
  id: number
  parentTaskId: string
  description: string
  assignedTo: string
  status: 'Not Started' | 'In Progress' | 'Completed'
  isCompleted: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

/**
 * Get all tasks
 */
export const getAllTasks = async (): Promise<ApiResponse<Task[]>> => {
  return get<Task[]>(API_ENDPOINTS.TASKS)
}

/**
 * Get task by ID
 */
export const getTaskById = async (taskId: string): Promise<ApiResponse<Task>> => {
  return get<Task>(API_ENDPOINTS.TASK_BY_ID(taskId))
}

/**
 * Create new task
 */
export const createTask = async (taskData: Partial<Task>): Promise<ApiResponse<Task>> => {
  return post<Task>(API_ENDPOINTS.TASKS, taskData)
}

/**
 * Update task
 */
export const updateTask = async (
  taskId: string,
  updates: Partial<Task>
): Promise<ApiResponse<Task>> => {
  return patch<Task>(API_ENDPOINTS.TASK_BY_ID(taskId), updates)
}

/**
 * Delete task
 */
export const deleteTask = async (taskId: string): Promise<ApiResponse<void>> => {
  return del<void>(API_ENDPOINTS.TASK_BY_ID(taskId))
}

/**
 * Get tasks by employee ID
 */
export const getTasksByEmployeeId = async (
  employeeId: string
): Promise<ApiResponse<Task[]>> => {
  return get<Task[]>(API_ENDPOINTS.TASKS_BY_EMPLOYEE(employeeId))
}

/**
 * Get task subtasks
 */
export const getTaskSubtasks = async (
  taskId: string
): Promise<ApiResponse<TaskSubTask[]>> => {
  return get<TaskSubTask[]>(`/api/subtasks?parentTaskId=${taskId}`)
}

/**
 * Create task subtask
 */
export const createTaskSubtask = async (
  subtaskData: Partial<TaskSubTask>
): Promise<ApiResponse<TaskSubTask>> => {
  return post<TaskSubTask>('/api/subtasks', subtaskData)
}

/**
 * Update task subtask
 */
export const updateTaskSubtask = async (
  subtaskId: number,
  updates: Partial<TaskSubTask>
): Promise<ApiResponse<TaskSubTask>> => {
  return patch<TaskSubTask>(`/api/subtasks/${subtaskId}`, updates)
}

/**
 * Delete task subtask
 */
export const deleteTaskSubtask = async (
  subtaskId: number
): Promise<ApiResponse<void>> => {
  return del<void>(`/api/subtasks/${subtaskId}`)
}

