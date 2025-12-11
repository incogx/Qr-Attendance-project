# Sathyabama Smart Attendance

A modern student attendance system with QR code scanning and face verification, built with React Native (Expo) and Supabase.

## Features

- Student authentication with registration number and password
- First-time signup with face capture for verification
- QR code scanning for attendance sessions
- Face verification (mock implementation)
- Real-time attendance tracking
- Student dashboard with statistics
- Secure data storage with Row Level Security

## Tech Stack

- **Frontend**: React Native (Expo), NativeWind (Tailwind CSS)
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Camera**: Expo Camera for QR scanning and face capture
- **Security**: Expo SecureStore for token storage

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the project root (or configure in your Expo environment):

```env
EXPO_PUBLIC_SUPABASE_URL=https://yddzfmwjijevnjyukogy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get your Supabase credentials from: https://supabase.com/dashboard/project/yddzfmwjijevnjyukogy/settings/api

### 2. Run Database Migrations

Run the migration file to add the `reg_number` field to the students table:

```sql
-- Migration: supabase/migrations/20251210000000_add_reg_number.sql
-- This adds the reg_number column for registration number authentication
```

### 3. Configure Supabase Auth

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Settings**
3. **Disable email confirmation** for development (or handle email confirmation in your app)
4. This allows users to sign up and be immediately authenticated

### 4. Create Test Student (Optional)

You can create a test student manually, or use the signup flow in the app:

```sql
-- Manual creation (if needed)
INSERT INTO students (id, email, name, roll_number, reg_number)
VALUES (
  'user_uuid_from_auth',
  'student@sathyabama.ac.in',
  'Rahul Kumar',
  'CSE2021001',
  'REG2021001'
);
```

### 3. Test QR Codes

Sample QR codes are already created. Use these values to test scanning:
- `QR_CSE301_2025_SESSION_001`
- `QR_CSE302_2025_SESSION_001`
- `QR_CSE303_2025_SESSION_001`
- `QR_CSE304_2025_SESSION_001`

To generate QR codes for testing:
1. Visit [QR Code Generator](https://www.qr-code-generator.com/)
2. Enter one of the QR payload values above
3. Download the QR code image
4. Display it on another device for scanning

## Usage

### First-Time Signup
1. Open the app
2. Click **Sign Up** on the login screen
3. Enter your:
   - Registration Number
   - Full Name
   - Email Address
   - Password (min 6 characters)
   - Confirm Password
4. Click **Sign Up**
5. You'll be redirected to capture your face
6. Position your face in the frame and capture
7. Your face data will be saved for future verification

### Login
1. Open the app
2. Enter your **Registration Number**
3. Enter your **Password**
4. Click **Sign In**
5. If you haven't captured your face yet, you'll be prompted to do so

### Mark Attendance
1. Navigate to the **Scan QR** tab
2. Grant camera permissions when prompted
3. Point the camera at a valid QR code
4. The app will automatically detect and validate the QR code
5. Position your face in the frame for verification
6. Capture your photo and verify
7. Attendance will be marked successfully

### View Dashboard
- See overall attendance percentage
- View total classes and attended count
- Check recent attendance records

## Database Schema

### Tables

- **students**: Student profiles linked to auth users
  - `reg_number`: Unique registration number (used for login)
  - `face_encoding`: Stored face data for verification
  - `roll_number`: Roll number (can be same as reg_number)
- **classes**: Course information
- **sessions**: Class sessions with QR codes
- **attendance**: Attendance records

### Security

All tables have Row Level Security (RLS) enabled:
- Students can only view and modify their own data
- QR validation happens server-side via RPC functions
- Face verification uses Edge Functions

## API Endpoints

### RPC Functions

#### `validate_qr(qr_data text)`
Validates QR code and returns session information.

#### `mark_attendance(p_student_id, p_class_id, p_session_id, p_method, p_confidence)`
Marks attendance for a student with verification.

### Edge Functions

#### `face-verify`
Mock face verification endpoint. Returns confidence score for face matching.

## Development

The app uses Expo's managed workflow. Camera features work on:
- Physical iOS/Android devices
- iOS Simulator (limited)
- Android Emulator (limited)

Web preview has limited camera support.

## Color Scheme

- Primary: `#771C32` (Maroon)
- Background: `#FFFFFF` (White)
- Muted: `#F3F4F6` (Light Gray)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)

## Accessibility

- WCAG AA compliant color contrast
- Keyboard navigation support
- Screen reader compatible
- Touch targets minimum 44x44px

## Privacy

- Face images are not permanently stored
- Only verification confidence scores are saved
- All data protected with RLS policies
- Secure token storage via Expo SecureStore
