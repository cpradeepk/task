// Client-side test suite

import { dataService } from './index'
import { User, Task, LeaveApplication, WFHApplication } from '../types'

/**
 * Test suite for Google Sheets integration
 */
export class SheetsTestSuite {
  private testResults: { [key: string]: boolean } = {}
  private errors: string[] = []

  /**
   * Run all tests
   */
  async runAllTests(): Promise<{ success: boolean; results: any; errors: string[] }> {
    console.log('🧪 Starting Google Sheets Integration Tests...')
    
    try {
      // Test 1: Basic connectivity
      await this.testConnectivity()
      
      // Test 2: User operations
      await this.testUserOperations()
      
      // Test 3: Task operations
      await this.testTaskOperations()
      
      // Test 4: Leave application operations
      await this.testLeaveOperations()
      
      // Test 5: WFH application operations
      await this.testWFHOperations()
      
      // Test 6: Error handling
      await this.testErrorHandling()
      
      const success = Object.values(this.testResults).every(result => result)
      
      console.log('🧪 Test Results:', this.testResults)
      if (this.errors.length > 0) {
        console.error('🚨 Test Errors:', this.errors)
      }
      
      return {
        success,
        results: this.testResults,
        errors: this.errors
      }
    } catch (error) {
      this.errors.push(`Test suite failed: ${error}`)
      return {
        success: false,
        results: this.testResults,
        errors: this.errors
      }
    }
  }

  /**
   * Test basic connectivity
   */
  private async testConnectivity(): Promise<void> {
    try {
      console.log('🔗 Testing connectivity...')
      
      // Test getting users (should work with fallback)
      const users = await dataService.getAllUsers()
      this.testResults['connectivity'] = Array.isArray(users)
      
      if (!this.testResults['connectivity']) {
        this.errors.push('Failed to get users - connectivity issue')
      }
    } catch (error) {
      this.testResults['connectivity'] = false
      this.errors.push(`Connectivity test failed: ${error}`)
    }
  }

  /**
   * Test user operations
   */
  private async testUserOperations(): Promise<void> {
    try {
      console.log('👤 Testing user operations...')
      
      // Test getting all users
      const users = await dataService.getAllUsers()
      this.testResults['users_get_all'] = Array.isArray(users) && users.length > 0
      
      // Test getting user by ID (admin should always exist)
      const adminUser = await dataService.getUserByEmployeeId('admin-001')
      this.testResults['users_get_by_id'] = adminUser !== null && adminUser.employeeId === 'admin-001'
      
      // Test authentication
      const authResult = await dataService.authenticateUser('admin-001', '1234')
      this.testResults['users_authentication'] = authResult !== null
      
      // Test team members (should return empty array for admin)
      const teamMembers = await dataService.getTeamMembers('admin-001')
      this.testResults['users_team_members'] = Array.isArray(teamMembers)
      
    } catch (error) {
      this.testResults['users_get_all'] = false
      this.testResults['users_get_by_id'] = false
      this.testResults['users_authentication'] = false
      this.testResults['users_team_members'] = false
      this.errors.push(`User operations test failed: ${error}`)
    }
  }

  /**
   * Test task operations
   */
  private async testTaskOperations(): Promise<void> {
    try {
      console.log('📋 Testing task operations...')
      
      // Test getting all tasks
      const tasks = await dataService.getAllTasks()
      this.testResults['tasks_get_all'] = Array.isArray(tasks)
      
      // Test getting tasks by user
      const userTasks = await dataService.getTasksByUser('AM-0001')
      this.testResults['tasks_get_by_user'] = Array.isArray(userTasks)
      
      // Test task utility functions
      if (tasks.length > 0) {
        const firstTask = tasks[0]
        const isOwner = dataService.isTaskOwner(firstTask, firstTask.assignedTo)
        const isSupporter = dataService.isTaskSupporter(firstTask, 'different-user')
        
        this.testResults['tasks_utility_functions'] = isOwner === true && isSupporter === false
      } else {
        this.testResults['tasks_utility_functions'] = true // No tasks to test with
      }
      
      // Test task ID generation
      const taskId = dataService.generateTaskId()
      this.testResults['tasks_id_generation'] = typeof taskId === 'string' && taskId.startsWith('JSR-')
      
    } catch (error) {
      this.testResults['tasks_get_all'] = false
      this.testResults['tasks_get_by_user'] = false
      this.testResults['tasks_utility_functions'] = false
      this.testResults['tasks_id_generation'] = false
      this.errors.push(`Task operations test failed: ${error}`)
    }
  }

  /**
   * Test leave application operations
   */
  private async testLeaveOperations(): Promise<void> {
    try {
      console.log('🏖️ Testing leave operations...')
      
      // Test getting all leave applications
      const leaves = await dataService.getAllLeaveApplications()
      this.testResults['leaves_get_all'] = Array.isArray(leaves)
      
      // Test getting leave applications by user
      const userLeaves = await dataService.getLeaveApplicationsByUser('AM-0001')
      this.testResults['leaves_get_by_user'] = Array.isArray(userLeaves)
      
    } catch (error) {
      this.testResults['leaves_get_all'] = false
      this.testResults['leaves_get_by_user'] = false
      this.errors.push(`Leave operations test failed: ${error}`)
    }
  }

  /**
   * Test WFH application operations
   */
  private async testWFHOperations(): Promise<void> {
    try {
      console.log('🏠 Testing WFH operations...')
      
      // Test getting all WFH applications
      const wfhs = await dataService.getAllWFHApplications()
      this.testResults['wfh_get_all'] = Array.isArray(wfhs)
      
      // Test getting WFH applications by user
      const userWFHs = await dataService.getWFHApplicationsByUser('AM-0001')
      this.testResults['wfh_get_by_user'] = Array.isArray(userWFHs)
      
    } catch (error) {
      this.testResults['wfh_get_all'] = false
      this.testResults['wfh_get_by_user'] = false
      this.errors.push(`WFH operations test failed: ${error}`)
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    try {
      console.log('⚠️ Testing error handling...')
      
      // Test getting user with invalid ID
      const invalidUser = await dataService.getUserByEmployeeId('INVALID-ID')
      this.testResults['error_handling_invalid_user'] = invalidUser === null
      
      // Test authentication with invalid credentials
      const invalidAuth = await dataService.authenticateUser('invalid', 'invalid')
      this.testResults['error_handling_invalid_auth'] = invalidAuth === null
      
    } catch (error) {
      this.testResults['error_handling_invalid_user'] = false
      this.testResults['error_handling_invalid_auth'] = false
      this.errors.push(`Error handling test failed: ${error}`)
    }
  }

  /**
   * Test data consistency
   */
  async testDataConsistency(): Promise<boolean> {
    try {
      console.log('🔍 Testing data consistency...')
      
      // Get data from multiple sources and compare
      const users1 = await dataService.getAllUsers()
      const users2 = await dataService.getAllUsers()
      
      const tasks1 = await dataService.getAllTasks()
      const tasks2 = await dataService.getAllTasks()
      
      const usersConsistent = JSON.stringify(users1) === JSON.stringify(users2)
      const tasksConsistent = JSON.stringify(tasks1) === JSON.stringify(tasks2)
      
      return usersConsistent && tasksConsistent
    } catch (error) {
      console.error('Data consistency test failed:', error)
      return false
    }
  }

  /**
   * Performance test
   */
  async testPerformance(): Promise<{ [key: string]: number }> {
    const results: { [key: string]: number } = {}
    
    try {
      console.log('⚡ Testing performance...')
      
      // Test user operations performance
      const userStart = performance.now()
      await dataService.getAllUsers()
      results.users_get_all = performance.now() - userStart
      
      // Test task operations performance
      const taskStart = performance.now()
      await dataService.getAllTasks()
      results.tasks_get_all = performance.now() - taskStart
      
      // Test authentication performance
      const authStart = performance.now()
      await dataService.authenticateUser('admin-001', '1234')
      results.authentication = performance.now() - authStart
      
      console.log('⚡ Performance results (ms):', results)
      
    } catch (error) {
      console.error('Performance test failed:', error)
    }
    
    return results
  }
}

// Export singleton instance
export const sheetsTestSuite = new SheetsTestSuite()
