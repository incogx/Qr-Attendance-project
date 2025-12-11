# Attendance Management System

A comprehensive attendance tracking system with facial recognition, QR code scanning, and multi-role administration portal.

## 🏗️ Project Structure

```
Attendance-project/
├── Attendence-Admin-Portal/    # Web-based admin portal (React + TypeScript + Vite)
├── Facer_app/                   # Mobile app (React Native + Expo)
├── supabase/                    # Database functions and migrations
└── *.sql                        # Database setup scripts
```

## 📱 System Components

### 1. **Mobile App (Facer_app)**
React Native app with Expo for student attendance marking.

**Features:**
- 🔐 Student login/signup with authentication
- 📸 Facial recognition enrollment
- 📷 QR code scanner for attendance marking
- 📊 Personal attendance analytics
- 🔔 Notifications
- 👤 Profile management

**Key Technologies:**
- React Native + Expo
- Expo Camera for QR scanning
- Supabase for backend
- NativeWind for styling

**Main Screens:**
- `app/login.tsx` - Student login
- `app/signup.tsx` - Student registration
- `app/(tabs)/scanner.tsx` - QR code scanner for attendance
- `app/(tabs)/attendance.tsx` - View personal attendance
- `app/(tabs)/analytics.tsx` - Attendance statistics
- `app/(tabs)/profile.tsx` - Student profile

### 2. **Admin Portal (Attendence-Admin-Portal)**
Web-based portal for faculty, HOD, and admin roles.

**Features:**
- 🔐 Role-based access control (Faculty, HOD, Admin)
- 📊 Dashboard with analytics
- 👥 User management
- 📝 Class and student management
- ✅ Attendance approval workflow
- 📤 Export to Excel
- 💬 Messaging system for absent students

**Key Technologies:**
- React + TypeScript
- Vite for bundling
- TailwindCSS for styling
- Supabase for backend
- XLSX for Excel export

**User Roles:**
1. **Faculty** - Start sessions, mark attendance, submit to HOD
2. **HOD** - Review and approve/reject attendance submissions
3. **Admin** - Manage users, classes, view all attendance

## 🔄 Complete Attendance Workflow

### **Step 1: Faculty Starts Session**
1. Faculty logs into admin portal
2. Goes to "Generate QR & Take Attendance"
3. Enters class number (e.g., "373")
4. Clicks "Start Session"
5. System generates unique QR code with payload
6. QR code displayed on screen for students to scan

**Backend:**
```sql
-- Creates session record
INSERT INTO sessions (class_id, qr_payload, status)
VALUES (class_id, unique_code, 'ACTIVE');
```

### **Step 2: Students Scan QR Code**
1. Student opens mobile app
2. Goes to "Scanner" tab
3. Points camera at QR code on screen
4. App scans QR payload
5. Sends attendance request to edge function
6. System verifies session and marks attendance

**Backend Flow:**
```javascript
// Edge function: attendance-scan/index.ts
1. Validate QR code matches active session
2. Find student by reg_number
3. Check if already marked
4. Insert attendance record with status='PRESENT'
```

**Database:**
```sql
INSERT INTO attendance (student_id, class_id, session_id, status)
VALUES (student_id, class_id, session_id, 'PRESENT');
```

### **Step 3: Faculty Monitors & Adjusts**
1. Faculty sees real-time updates as students scan
2. Student roster shows:
   - ✅ **Present** (green) - Student scanned QR
   - ⏳ **Not Marked** (gray) - Student hasn't scanned
3. Faculty can click status badge to toggle:
   - Present → Absent
   - Absent → Present
4. Summary shows: Present, Absent, Not Marked counts

### **Step 4: Faculty Submits to HOD**
1. Faculty reviews final attendance
2. Clicks "Submit to HOD"
3. System creates approval request

**Backend:**
```sql
-- Update session status
UPDATE sessions SET status = 'SUBMITTED' WHERE id = session_id;

-- Create approval request
INSERT INTO approvals (session_id, submitted_by, status)
VALUES (session_id, faculty_id, 'PENDING');
```

### **Step 5: HOD Reviews & Approves**
1. HOD logs into admin portal
2. Goes to "Approvals" page
3. Sees list of pending submissions
4. Clicks on a submission to view details:
   - Session info (class, date, faculty)
   - Student list with register numbers and names
   - Present/Absent counts
5. Can toggle any student's status (Present ↔ Absent)
6. Adds optional comments
7. Clicks **"Approve"** or **"Reject"**

**Backend:**
```sql
-- Update approval
UPDATE approvals 
SET status = 'APPROVED', reviewed_by = hod_id, reviewed_at = NOW()
WHERE id = approval_id;

-- Update session
UPDATE sessions SET status = 'APPROVED' WHERE id = session_id;
```

### **Step 6: Admin Manages & Exports**
1. Admin views all approved attendance
2. Goes to "Attendance Management"
3. Filters by date, department, class
4. Clicks **"Excel"** button to export
5. Downloads formatted Excel file with:
   - Session details
   - Student attendance list
   - Present/Absent summary

**Excel Export Format:**
```
Attendance Report
Class: 373 - Data Structures
Instructor: Dr. Kumar
Date: 2025-12-11

Register No. | Student Name | Status  | Marked At
001          | John Doe     | PRESENT | 10:30 AM
002          | Jane Smith   | ABSENT  | -

Summary:
Present: 45
Absent: 5
Total: 50
```

### **Step 7: Messaging Absent Students**
1. Admin goes to "Messaging System"
2. System shows all absent students from approved sessions
3. Admin can:
   - Select individual students
   - Select all absent students
   - Compose message
   - Click "Send Messages"
4. Simple success alert shown (placeholder for future SMS/email)

## 🗄️ Database Schema

### **Core Tables**

#### `students`
```sql
- id (UUID, PK)
- reg_number (TEXT, UNIQUE)
- name (TEXT)
- email (TEXT)
- phone (TEXT)
- class_no (TEXT)
- department (TEXT)
- face_encoding (TEXT)
```

#### `classes`
```sql
- id (UUID, PK)
- class_no (TEXT)
- name (TEXT)
- instructor_name (TEXT)
- department (TEXT)
- faculty_id (UUID)
```

#### `sessions`
```sql
- id (UUID, PK)
- class_id (UUID, FK)
- qr_payload (TEXT)
- session_date (DATE)
- status (TEXT) -- ACTIVE, SUBMITTED, APPROVED, REJECTED
- created_at (TIMESTAMP)
```

#### `attendance`
```sql
- id (UUID, PK)
- student_id (UUID, FK)
- class_id (UUID, FK)
- session_id (UUID, FK)
- status (TEXT) -- PRESENT, ABSENT
- marked_at (TIMESTAMP)
```

#### `approvals`
```sql
- id (UUID, PK)
- session_id (UUID, FK)
- submitted_by (UUID, FK to profiles)
- reviewed_by (UUID, FK to profiles)
- status (TEXT) -- PENDING, APPROVED, REJECTED
- submitted_at (TIMESTAMP)
- reviewed_at (TIMESTAMP)
- comments (TEXT)
```

#### `profiles`
```sql
- id (UUID, PK, FK to auth.users)
- email (TEXT)
- full_name (TEXT)
- role (TEXT) -- ADMIN, HOD, FACULTY
- department (TEXT)
```

## 🔒 Security & RLS Policies

### **Row Level Security (RLS) Enabled**
All tables have RLS policies for role-based access:

- **Faculty**: Can create sessions, view own classes, submit approvals
- **HOD**: Can view/update approvals, view all sessions in department
- **Admin**: Full access to all tables
- **Students**: Can mark attendance, view own records

### **Edge Functions**
- `attendance-scan`: Handles QR code validation and attendance marking
- Deployed at: `https://[project].supabase.co/functions/v1/attendance-scan`

## 🚀 Setup & Deployment

### **Prerequisites**
```bash
Node.js 18+
npm or yarn
Supabase account
Expo CLI (for mobile app)
```

### **Database Setup**
1. Run SQL scripts in order:
```bash
enable-rls-policies.sql       # Enable RLS and create policies
add-attendance-status.sql      # Add status column to attendance
setup-approvals-table.sql      # Create approvals workflow
```

2. Deploy edge functions:
```bash
cd supabase/functions
npx supabase functions deploy attendance-scan
```

### **Admin Portal Setup**
```bash
cd Attendence-Admin-Portal
npm install
npm run dev
```

**Environment Variables** (`.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Mobile App Setup**
```bash
cd Facer_app
npm install
npx expo start
```

**Environment Variables** (`.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📊 Key Features Implemented

### ✅ **Attendance Management**
- QR code generation for live sessions
- Real-time attendance tracking
- Manual status toggle (Present ↔ Absent)
- Approval workflow (Faculty → HOD → Approved)
- Excel export with detailed reports

### ✅ **User Management**
- Role-based access (Admin, HOD, Faculty, Student)
- User creation and assignment
- Department-based organization

### ✅ **Analytics**
- Present/Absent/Total counts
- Session-wise reports
- Student-wise attendance history

### ✅ **Messaging System**
- Fetch absent students from approved sessions
- Bulk selection
- Message composition (placeholder for SMS/email)

### ✅ **Mobile Features**
- QR code scanning
- Personal attendance view
- Profile management
- Notifications

## 🔧 Technologies Used

### **Frontend**
- React 18
- TypeScript
- TailwindCSS
- Vite
- React Router
- Lucide Icons
- XLSX (Excel export)

### **Mobile**
- React Native
- Expo SDK 52
- Expo Camera
- NativeWind
- Expo Router

### **Backend**
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Edge Functions (Deno)
- Row Level Security (RLS)

## 📱 Admin Portal Routes

```
/login              # Login page
/admin/*            # Admin portal
  /dashboard        # Overview & analytics
  /users            # User management
  /attendance       # Attendance management & export
  /messaging        # Messaging system
/hod/*              # HOD portal
  /approvals        # Review attendance submissions
/faculty/*          # Faculty portal
  /generate-qr      # Start session & generate QR
  /reports          # View attendance reports
```

## 🎯 Workflow Status Transitions

```
Session Status Flow:
ACTIVE → SUBMITTED → APPROVED/REJECTED

Approval Status Flow:
PENDING → APPROVED/REJECTED

Attendance Status:
PRESENT ↔ ABSENT (toggleable by Faculty/HOD)
```

## 📝 Important Notes

1. **QR Code Payload**: Must match exactly between session and scan
2. **Session Status**: Must be 'ACTIVE' for students to mark attendance
3. **Approval Required**: Attendance becomes final only after HOD approval
4. **Status Toggle**: Available to both Faculty and HOD before submission
5. **Excel Export**: Only available for approved attendance
6. **Messaging**: Currently shows success alert (awaiting SMS/email integration)

## 🐛 Known Issues & Future Enhancements

### **Planned Features**
- [ ] SMS/Email integration for messaging system
- [ ] Face recognition for attendance verification
- [ ] Attendance scheduling and auto-reminders
- [ ] Multi-class batch operations
- [ ] Student mobile app attendance history

### **Current Limitations**
- Messaging system shows alert only (no actual SMS/email)
- No automatic session timeout
- Manual session management required

## 📞 Support & Documentation

For issues or questions:
1. Check database policies in Supabase dashboard
2. Review edge function logs
3. Check browser console for errors
4. Verify `.env` files have correct Supabase credentials

---

**Last Updated**: December 11, 2025
**Version**: 1.0.0
