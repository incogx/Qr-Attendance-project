# Tomorrow's Task List - Live Attendance Testing

## Pre-Test Setup (Do First Thing in Morning)

### 1. Database Preparation
- [ ] Add test students in Supabase `student_profiles` table (at least 5 students)
  - Register numbers: Use actual format (e.g., 43732001, 43732002, etc.)
  - Class: Use actual class number (e.g., 373)
- [ ] Verify faculty profile exists in `profiles` table with role = FACULTY
- [ ] Insert test class in `classes` table linked to faculty

### 2. System Verification
- [ ] Start dev server and verify no console errors
- [ ] Login as faculty user
- [ ] Navigate to `/faculty/generate-qr` - confirm page loads
- [ ] Test "Start Session" with test class number
- [ ] Verify students list appears with "Not Marked" status

## Live Class Test Workflow

### 3. Faculty Attendance Session
- [ ] Faculty enters actual class number
- [ ] Click "Start Session" 
- [ ] Verify QR code displays with session token
- [ ] Verify all enrolled students show in roster
- [ ] Test manual "Mark Present" button for 1-2 students

### 4. Student Mobile Scan (Manual Test)
- [ ] Open browser DevTools console
- [ ] Use test scan function for each student:
  ```javascript
  // Copy from mobileScanAPI.ts testScan function
  ```
- [ ] Verify each scan updates student status to PRESENT in real-time
- [ ] Check auto-refresh (every 3 seconds) works

### 5. Submit & HOD Approval Flow
- [ ] Click "Submit to HOD" button
- [ ] Confirm all unmarked students auto-marked ABSENT
- [ ] Verify success message appears
- [ ] Logout faculty, login as HOD
- [ ] Navigate to `/hod/approvals`
- [ ] Verify pending approval appears in list
- [ ] Click on approval to view details
- [ ] Verify attendance summary (present/absent counts)
- [ ] Test approve flow
- [ ] Verify approval status updates

## Post-Test Verification

### 6. Database Checks
- [ ] Check `attendance_sessions` - verify status = APPROVED
- [ ] Check `attendance_marks` - verify all students have records
- [ ] Check `attendance_approvals` - verify status = APPROVED
- [ ] Verify timestamps are correct

### 7. Edge Cases to Test
- [ ] Try starting session for class with no students
- [ ] Try marking same student twice (should update, not duplicate)
- [ ] Try submitting already submitted session
- [ ] Try scanning after session submitted
- [ ] Test HOD reject flow (optional)

## Issues to Document
- [ ] Note any errors in console
- [ ] Screenshot any UI issues
- [ ] Record timing issues (polling, delays)
- [ ] Note any confusing UX
- [ ] List missing features discovered

## Next Steps (If Time Permits)
- [ ] Integrate real QR code library (qrcode.react)
- [ ] Add QR code download as PNG
- [ ] Build actual mobile scan endpoint
- [ ] Add faculty view of past sessions
- [ ] Add attendance reports/analytics
- [ ] Set up RLS (Row Level Security) policies in Supabase
