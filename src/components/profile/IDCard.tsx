'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { User } from '@/lib/types'
import { getRoleDisplayName } from '@/lib/auth'
import {
  CreditCard,
  Download,
  Printer,
  QrCode,
  Building,
  Mail,
  Phone,
  Calendar,
  Shield,
  X
} from 'lucide-react'

interface IDCardProps {
  user: User
}

export default function IDCard({ user }: IDCardProps) {
  const [showModal, setShowModal] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const generateQRData = () => {
    return `EassyLife-${user.employeeId}-${user.name}-${user.department}`
  }

  const handlePrint = () => {
    const printContent = document.getElementById('id-card-print')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Employee ID Card - ${user.name}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: Arial, sans-serif; 
                  background: white;
                }
                .id-card-print {
                  width: 3.375in;
                  height: 2.125in;
                  border: 2px solid #FFA301;
                  border-radius: 12px;
                  padding: 16px;
                  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  margin: 0 auto;
                  position: relative;
                  overflow: hidden;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 12px; 
                  border-bottom: 1px solid #e5e7eb;
                  padding-bottom: 8px;
                }
                .company-name { 
                  font-size: 14px; 
                  font-weight: bold; 
                  color: #FFA301; 
                  margin-bottom: 2px;
                }
                .card-title { 
                  font-size: 10px; 
                  color: #6b7280; 
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                .employee-info { 
                  display: flex; 
                  align-items: center; 
                  gap: 12px;
                }
                .avatar { 
                  width: 48px; 
                  height: 48px; 
                  background: #FFA301; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  color: black; 
                  font-weight: bold; 
                  font-size: 16px;
                  flex-shrink: 0;
                }
                .details { 
                  flex: 1; 
                  min-width: 0;
                }
                .name { 
                  font-size: 12px; 
                  font-weight: bold; 
                  color: #111827; 
                  margin-bottom: 2px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .employee-id { 
                  font-size: 10px; 
                  color: #6b7280; 
                  margin-bottom: 4px;
                  font-family: monospace;
                }
                .department { 
                  font-size: 9px; 
                  color: #374151; 
                  margin-bottom: 2px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .role { 
                  font-size: 8px; 
                  background: #f3f4f6; 
                  color: #374151; 
                  padding: 2px 6px; 
                  border-radius: 4px; 
                  display: inline-block;
                  text-transform: uppercase;
                  letter-spacing: 0.3px;
                }
                .footer { 
                  position: absolute; 
                  bottom: 8px; 
                  left: 16px; 
                  right: 16px; 
                  text-align: center; 
                  font-size: 7px; 
                  color: #9ca3af;
                }
                .qr-placeholder {
                  position: absolute;
                  top: 16px;
                  right: 16px;
                  width: 32px;
                  height: 32px;
                  border: 1px solid #d1d5db;
                  border-radius: 4px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 8px;
                  color: #6b7280;
                  background: white;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .id-card-print { margin: 0; box-shadow: none; }
                }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
        printWindow.close()
      }
    }
  }

  const handleDownload = () => {
    // For now, we'll trigger print which can be saved as PDF
    // In a real implementation, you might want to use a library like html2canvas or jsPDF
    handlePrint()
  }

  return (
    <>
      {/* ID Card Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-orange-500 hover:to-primary text-black font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
      >
        <CreditCard className="h-5 w-5" />
        <span>View ID Card</span>
      </button>

      {/* ID Card Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black">Employee ID Card</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* ID Card Preview */}
              <div className="flex justify-center mb-6">
                <div 
                  id="id-card-print"
                  className="id-card-print w-80 h-48 border-2 border-primary rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 shadow-lg relative overflow-hidden"
                >
                  {/* Company Header */}
                  <div className="flex items-center justify-center mb-3 border-b border-gray-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <Image
                        src="/images/logos/eassylife.png"
                        alt="EassyLife Logo"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                      <div className="text-leftError: API request failed: 500
    at GoogleSheetsDataService.executeApiCall (webpack-internal:///(app-pages-browser)/./src/lib/sheets/index.ts:29:23)
    at async handleLeaveApproval (webpack-internal:///(app-pages-browser)/./src/app/approvals/page.tsx:117:25)">
                        <div className="text-lg font-bold text-primary">EassyLife</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Employee Identification</div>
                      </div>
                    </div>
                  </div>

                  {/* Employee Info */}
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-black truncate">{user.name}</div>
                      <div className="text-xs text-gray-600 font-mono">{user.employeeId}</div>
                      <div className="text-xs text-gray-700 truncate">{user.department}</div>
                      <div className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded mt-1">
                        {getRoleDisplayName(user.role)}
                      </div>
                    </div>

                    {/* QR Code Placeholder */}
                    <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-white flex-shrink-0">
                      <QrCode className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="absolute bottom-2 left-4 right-4 text-center text-xs text-gray-400">
                    Valid from {formatDate(user.createdAt)}
                  </div>
                </div>
              </div>

              {/* Employee Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-black mb-4">Employee Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-black">Employee ID</div>
                      <div className="text-sm text-gray-600 font-mono">{user.employeeId}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-black">Department</div>
                      <div className="text-sm text-gray-600">{user.department}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-black">Email</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-black">Phone</div>
                      <div className="text-sm text-gray-600">{user.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-black">Join Date</div>
                      <div className="text-sm text-gray-600">{formatDate(user.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-medium text-black">Role</div>
                      <div className="text-sm text-gray-600">{getRoleDisplayName(user.role)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 bg-primary hover:bg-orange-500 text-black font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print ID Card</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download as PDF</span>
                </button>
              </div>

              {/* QR Code Info */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">QR Code Data</div>
                    <div className="text-xs text-blue-700 font-mono break-all">{generateQRData()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
