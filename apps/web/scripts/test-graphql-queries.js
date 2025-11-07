/**
 * Test GraphQL queries to verify the server is working correctly
 * Run this after starting the Next.js dev server
 */

async function testGraphQLQuery(query, variables = {}, operationName = 'TestQuery') {
  try {
    const response = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables, operationName })
    })

    const result = await response.json()
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2))
      return { success: false, errors: result.errors }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('=' .repeat(70))
  console.log('TESTING GRAPHQL QUERIES')
  console.log('='.repeat(70) + '\n')

  // Test 1: Simple users query
  console.log('1️⃣  Testing simple users query...')
  const usersResult = await testGraphQLQuery(`
    query GetUsers {
      users {
        employeeId
        name
        email
        role
      }
    }
  `, {}, 'GetUsers')
  
  if (usersResult.success) {
    console.log(`   ✅ Users query successful (${usersResult.data.users.length} users)`)
  } else {
    console.log('   ❌ Users query failed')
  }

  // Test 2: Bugs query with nested user data
  console.log('\n2️⃣  Testing bugs query with nested user data...')
  const bugsResult = await testGraphQLQuery(`
    query GetBugs {
      bugs {
        bugId
        description
        status
        severity
        assignedTo
        assignedToUser {
          employeeId
          name
          email
        }
        assignedByUser {
          employeeId
          name
        }
        reportedByUser {
          employeeId
          name
        }
      }
    }
  `, {}, 'GetBugs')
  
  if (bugsResult.success) {
    console.log(`   ✅ Bugs query successful (${bugsResult.data.bugs.length} bugs)`)
    
    // Check if nested user data is loaded
    const bugsWithUsers = bugsResult.data.bugs.filter(b => b.assignedToUser !== null)
    console.log(`   ℹ️  ${bugsWithUsers.length} bugs have assignedToUser data`)
  } else {
    console.log('   ❌ Bugs query failed')
  }

  // Test 3: Tasks query with nested user data
  console.log('\n3️⃣  Testing tasks query with nested user data...')
  const tasksResult = await testGraphQLQuery(`
    query GetTasks {
      tasks {
        taskId
        description
        status
        assignedTo
        assignedToUser {
          employeeId
          name
        }
        assignedByUser {
          employeeId
          name
        }
      }
    }
  `, {}, 'GetTasks')
  
  if (tasksResult.success) {
    console.log(`   ✅ Tasks query successful (${tasksResult.data.tasks.length} tasks)`)
    
    // Check if nested user data is loaded
    const tasksWithUsers = tasksResult.data.tasks.filter(t => t.assignedToUser !== null)
    console.log(`   ℹ️  ${tasksWithUsers.length} tasks have assignedToUser data`)
  } else {
    console.log('   ❌ Tasks query failed')
  }

  // Test 4: Projects query
  console.log('\n4️⃣  Testing projects query...')
  const projectsResult = await testGraphQLQuery(`
    query GetProjects {
      projects {
        projectId
        projectName
        description
      }
    }
  `, {}, 'GetProjects')
  
  if (projectsResult.success) {
    console.log(`   ✅ Projects query successful (${projectsResult.data.projects.length} projects)`)
  } else {
    console.log('   ❌ Projects query failed')
  }

  // Summary
  console.log('\n' + '='.repeat(70))
  const allTests = [usersResult, bugsResult, tasksResult, projectsResult]
  const passedTests = allTests.filter(r => r.success).length
  const totalTests = allTests.length
  
  if (passedTests === totalTests) {
    console.log(`✅ ALL TESTS PASSED (${passedTests}/${totalTests})`)
  } else {
    console.log(`⚠️  SOME TESTS FAILED (${passedTests}/${totalTests} passed)`)
  }
  console.log('='.repeat(70))
}

// Check if dev server is running
fetch('http://localhost:3000/api/graphql')
  .then(() => {
    console.log('✅ Dev server is running\n')
    runTests()
  })
  .catch(() => {
    console.error('❌ Dev server is not running!')
    console.error('Please start the dev server first: npm run dev')
    process.exit(1)
  })

