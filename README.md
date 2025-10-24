# EassyLife Task Management System

A comprehensive Job Status Report (EassyLife) and Task Management System built with Next.js 15, TypeScript, and Tailwind CSS. This application provides role-based task management, leave applications, work-from-home requests, and detailed reporting capabilities.

## 🚀 Features

### Core Functionality
- **Role-Based Authentication**: Employee, Management, Top Management, and Admin roles
- **Task Management**: Create, assign, track, and update tasks with recursive options
- **Leave Management**: Apply for and approve various types of leave
- **Work From Home**: Request and manage WFH applications
- **Comprehensive Reports**: Daily performance, monthly summaries, and team overviews
- **User Management**: Admin panel for managing users and permissions
- **Profile Management**: Users can update their personal information
- **🆔 Employee ID Card**: Digital ID card with print/download functionality

### Technical Features
- **Modern UI/UX**: Built with Tailwind CSS and modern design principles
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Local Storage**: Data persistence with backup/restore functionality
- **Type Safety**: Full TypeScript implementation
- **Component Architecture**: Reusable React components
- **Future-Ready**: Prepared for Google Sheets integration

## 🛠️ Technology Stack

- **Framework**: Next.js 15.3.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Icons**: Lucide React
- **State Management**: React hooks with Local Storage
- **Data Storage**: Browser Local Storage (Google Sheets integration planned)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web_app_new_next
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔐 Login Credentials

### Admin Access
| Role | Employee ID | Password | Description |
|------|-------------|----------|-------------|
| Admin | admin-001 | 1234 | System administrator (hardcoded) |

### Employee Access
All employee accounts are managed through Google Sheets integration:
- Employee IDs follow the format: EL-0001, EL-0002, etc.
- Passwords are stored in the Google Sheets userDetails
- User data is dynamically loaded from Google Sheets
- No hardcoded employee accounts (Google Sheets is the single source of truth)

## 📱 User Roles & Permissions

### Employee
- View personal dashboard with task statistics
- Create and update own tasks
- Apply for leave and work-from-home
- Update personal profile
- View task history and status
- View and print employee ID card

### Management
- All employee permissions
- View team reports and analytics
- Approve/reject leave and WFH applications
- Create tasks for team members
- Access team task overview

### Top Management
- View comprehensive reports and analytics
- Access all system data and statistics
- Strategic overview of organizational performance
- Advanced reporting capabilities

### Admin
- Full system access and control
- User management (add, edit, deactivate users)
- System settings and configuration
- Data backup and restore
- Access to all features and reports

## 🏗️ Project Structure

```
web_app_new_next/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── tasks/              # Task management
│   │   ├── leave/              # Leave applications
│   │   ├── wfh/                # Work from home
│   │   ├── reports/            # Reports and analytics
│   │   ├── users/              # User management (Admin)
│   │   ├── profile/            # User profile
│   │   ├── approvals/          # Management approvals
│   │   └── settings/           # System settings
│   ├── components/             # Reusable React components
│   │   ├── auth/               # Authentication components
│   │   ├── dashboard/          # Dashboard components
│   │   ├── layout/             # Layout components
│   │   ├── tasks/              # Task-related components
│   │   ├── users/              # User management components
│   │   └── ui/                 # UI utility components
│   └── lib/                    # Utility functions and types
│       ├── auth.ts             # Authentication logic
│       ├── data.ts             # Data management
│       ├── reports.ts          # Report generation
│       ├── storage.ts          # Storage abstraction
│       └── types.ts            # TypeScript definitions
├── public/                     # Static assets
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project documentation
```

## 🎨 Design System

### Colors
- **Primary**: Blue palette (#3b82f6 family) for main actions and branding
- **Secondary**: Gray palette for neutral elements and text
- **Status Colors**: Green (success), Red (error), Yellow (warning), Blue (info)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Font Weights**: 300, 400, 500, 600, 700

### Components
- **Cards**: Consistent spacing and shadow system
- **Buttons**: Primary and secondary variants with hover states
- **Forms**: Unified input styling with focus states
- **Badges**: Status and priority indicators
- **Navigation**: Responsive navigation with role-based menu items

## 📊 Data Structure

### Users
- Employee ID, Name, Email, Phone, Department
- Role-based permissions and access control
- Manager relationships and reporting structure
- Warning counts and status tracking

### Tasks
- Unique task IDs with EassyLife prefix
- Normal and recursive task types
- Priority levels (Urgent/Important matrix)
- Status tracking and time logging
- Assignment and delegation capabilities

### Applications
- Leave applications with approval workflow
- Work-from-home requests with flexible options
- Status tracking and approval history
- Manager approval and remarks system

## ✅ Current Features

### Google Sheets Integration (Implemented)
- ✅ Real-time data synchronization
- ✅ Existing userDetails sheet compatibility
- ✅ Automatic backup to Google Drive
- ✅ Collaborative data management
- ✅ API-based data exchange
- ✅ Dynamic user authentication from sheets
- ✅ Single source of truth (no hardcoded data except admin)

### 🆔 Employee ID Card System (Implemented)
- ✅ **Digital ID Card**: Professional employee identification card
- ✅ **Complete Employee Details**: Name, ID, department, role, contact info
- ✅ **Print Functionality**: Print-ready ID card with proper dimensions (3.375" x 2.125")
- ✅ **PDF Download**: Save ID card as PDF for digital storage
- ✅ **QR Code Integration**: Unique QR code for each employee
- ✅ **Professional Design**: Company branding with EassyLife logo
- ✅ **Responsive Modal**: Clean, modern ID card viewer interface
- ✅ **Print Optimization**: CSS optimized for physical card printing

## 🔄 Future Enhancements

### Additional Features
- Email notifications for approvals
- Calendar integration for leave/WFH
- Advanced analytics and insights
- Mobile app development
- Multi-language support

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Static Export
```bash
npm run build
npm run export
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation and user guides

## 🙏 Acknowledgments

- Built with Next.js and React
- Styled with Tailwind CSS
- Icons by Lucide React
- Typography by Google Fonts (Inter)
- Inspired by modern task management systems

---

**Version**: 1.0.0  
**Last Updated**: June 2025  
**Developed by**: EassyLife Development Team
# Updated by prathameassyserve
