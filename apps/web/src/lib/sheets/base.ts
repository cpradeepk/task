// Server-side only - do not use 'use client'

import { getSheetsClient } from './auth'
import { SHEETS_CONFIG, RETRY_CONFIG } from './config'

/**
 * Base class for Google Sheets operations
 */
export class BaseSheetsService {
  protected spreadsheetId: string
  protected sheetName: string
  protected range: string
  protected headers: string[]

  constructor(sheetName: keyof typeof SHEETS_CONFIG.SHEETS) {
    this.spreadsheetId = SHEETS_CONFIG.SPREADSHEET_ID
    this.sheetName = SHEETS_CONFIG.SHEETS[sheetName]
    this.range = SHEETS_CONFIG.RANGES[sheetName]
    this.headers = SHEETS_CONFIG.HEADERS[sheetName]
  }

  /**
   * Execute operation with retry logic
   */
  protected async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // Handle quota exceeded errors (429) with special logic
        if (error.code === 429 || (error.message && error.message.includes('quota exceeded'))) {
          console.warn(`Google Sheets quota exceeded (attempt ${attempt}/${RETRY_CONFIG.maxRetries})`)

          if (attempt === RETRY_CONFIG.maxRetries) {
            // On final attempt, throw a more user-friendly error
            throw new Error('Google Sheets quota exceeded. Please try again in a few minutes.')
          }

          // For quota errors, wait longer before retrying
          const quotaDelay = Math.pow(2, attempt) * 10000 // 20s, 40s, 80s for quota errors
          console.log(`Waiting ${quotaDelay/1000}s before retry due to quota limit...`)
          await new Promise(resolve => setTimeout(resolve, quotaDelay))
          continue
        }

        // Don't retry on authentication errors
        if (error.code === 401 || error.code === 403) {
          throw error
        }

        if (attempt === RETRY_CONFIG.maxRetries) {
          break
        }

        // Wait before retry with exponential backoff for other errors
        const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))

        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message)
      }
    }

    throw lastError!
  }

  /**
   * Initialize sheet with headers if it doesn't exist
   */
  async initializeSheet(): Promise<boolean> {
    try {
      const sheets = await getSheetsClient()
      
      // Check if sheet exists
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        fields: 'sheets.properties.title'
      })
      
      const sheetExists = spreadsheet.data.sheets?.some(
        sheet => sheet.properties?.title === this.sheetName
      )
      
      if (!sheetExists) {
        // Create the sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: this.sheetName
                }
              }
            }]
          }
        })
        
        console.log(`Created sheet: ${this.sheetName}`)
      }
      
      // Check if headers exist
      const headerRange = `${this.sheetName}!A1:${String.fromCharCode(64 + this.headers.length)}1`
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: headerRange
      })
      
      const existingHeaders = headerResponse.data.values?.[0] || []
      
      if (existingHeaders.length === 0) {
        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: headerRange,
          valueInputOption: 'RAW',
          requestBody: {
            values: [this.headers]
          }
        })

        console.log(`Added headers to sheet: ${this.sheetName}`)
      } else {
        // Check if headers match expected structure
        const headersMatch = this.headers.every((header, index) =>
          existingHeaders[index] === header
        )

        if (!headersMatch) {
          console.warn(`Headers mismatch in sheet ${this.sheetName}`)
          console.warn('Expected:', this.headers)
          console.warn('Found:', existingHeaders)

          // Update headers to match expected structure
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: headerRange,
            valueInputOption: 'RAW',
            requestBody: {
              values: [this.headers]
            }
          })

          console.log(`Updated headers in sheet: ${this.sheetName}`)
        }
      }
      
      return true
    } catch (error) {
      console.error(`Failed to initialize sheet ${this.sheetName}:`, error)
      return false
    }
  }

  /**
   * Get all data from the sheet
   */
  async getAllData(): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const sheets = await getSheetsClient()
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.range
      })
      
      const rows = response.data.values || []
      if (rows.length <= 1) return [] // No data rows (only headers or empty)
      
      // Convert rows to objects using headers
      const headers = rows[0]
      return rows.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = row[index] || ''
        })
        return obj
      })
    })
  }

  /**
   * Add new row to the sheet
   */
  async addRow(data: any): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const sheets = await getSheetsClient()
      
      // Convert object to array based on headers
      const values = this.headers.map(header => {
        const value = data[header]
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value)
        }
        return value?.toString() || ''
      })
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: this.range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      })
      
      return true
    })
  }

  /**
   * Update existing row by ID
   */
  async updateRow(id: string, data: any, idColumn: string = 'ID'): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const sheets = await getSheetsClient()
      
      // Find the row with the matching ID
      const allData = await this.getAllData()
      const rowIndex = allData.findIndex(row => row[idColumn] === id)
      
      if (rowIndex === -1) {
        throw new Error(`Row with ${idColumn} ${id} not found`)
      }
      
      // Convert object to array based on headers
      const values = this.headers.map(header => {
        const value = data[header]
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value)
        }
        return value?.toString() || ''
      })
      
      // Update the specific row (add 2 to account for header row and 0-based index)
      const rowNumber = rowIndex + 2
      const updateRange = `${this.sheetName}!A${rowNumber}:${String.fromCharCode(64 + this.headers.length)}${rowNumber}`
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      })
      
      return true
    })
  }

  /**
   * Delete row by ID
   */
  async deleteRow(id: string, idColumn: string = 'ID'): Promise<boolean> {
    return this.executeWithRetry(async () => {
      const sheets = await getSheetsClient()
      
      // Find the row with the matching ID
      const allData = await this.getAllData()
      const rowIndex = allData.findIndex(row => row[idColumn] === id)
      
      if (rowIndex === -1) {
        throw new Error(`Row with ${idColumn} ${id} not found`)
      }
      
      // Delete the row (add 1 to account for header row)
      const rowNumber = rowIndex + 1
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: await this.getSheetId(),
                dimension: 'ROWS',
                startIndex: rowNumber,
                endIndex: rowNumber + 1
              }
            }
          }]
        }
      })
      
      return true
    })
  }

  /**
   * Get sheet ID by name
   */
  private async getSheetId(): Promise<number> {
    const sheets = await getSheetsClient()
    
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets.properties'
    })
    
    const sheet = spreadsheet.data.sheets?.find(
      s => s.properties?.title === this.sheetName
    )
    
    if (!sheet?.properties?.sheetId) {
      throw new Error(`Sheet ${this.sheetName} not found`)
    }
    
    return sheet.properties.sheetId
  }
}
