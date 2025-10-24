/**
 * Centralized department constants for the EassyLife application
 * This ensures consistency across all department dropdowns and selections
 */

export const DEPARTMENTS = [
  'Frontend - iOS',
  'Frontend - Android',
  'Frontend - Webapp',
  'Traditional Marketing',
  'Admin panel',
  'Backend - Node js',
  'Server config',
  'Frontend - SP Webapp',
  'Digital Marketing',
  'Creatives',
  'Technology',
  'Mar-Tech',
  'Frontend - Flutter',
  'Frontend - UBAR',
  'Backend - UBAR',
  'Management',
  'Design',
  'Brand Partnerships',
  'Finance',
  'Customer grievances',
  'CRM',
  'Operations',
  'Finances',
  'CEO',
  'Team Leader',
  'HR'
] as const

export type Department = typeof DEPARTMENTS[number]

/**
 * Helper function to check if a string is a valid department
 */
export const isValidDepartment = (department: string): department is Department => {
  return DEPARTMENTS.includes(department as Department)
}

/**
 * Helper function to get department options for dropdowns
 */
export const getDepartmentOptions = () => {
  return DEPARTMENTS.map(dept => ({
    value: dept,
    label: dept
  }))
}
