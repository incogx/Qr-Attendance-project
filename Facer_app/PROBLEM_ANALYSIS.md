# Problem Analysis - Sathyabama Smart Attendance System

## Executive Summary
This React Native/Expo app has multiple critical issues preventing it from functioning correctly. The main problems are:
1. **Authentication system is completely broken** - Not using Supabase Auth properly
2. **Database schema mismatches** - TypeScript types don't match actual database structure
3. **Security vulnerabilities** - Passwords stored in plain text, direct database queries
4. **API inconsistencies** - Multiple table name mismatches throughout the codebase
5. **Missing context properties** - Code references properties that don't exist in AuthContext

---

## 1. CRITICAL: Authentication System Issues

### 1.1 AuthContext.tsx - Major Problems

**Problem:** The authentication system is not using Supabase Auth at all. It's doing direct database queries and storing passwords in plain text.

**Issues:**
- ❌ Using `localStorage` instead of `AsyncStorage` or `SecureStore` (won't work in React Native)
- ❌ Storing passwords in plain text in the database
- ❌ Comparing passwords directly in JavaScript (security vulnerability)
- ❌ Not using Supabase Auth (`supabase.auth.signIn()`, `supabase.auth.signUp()`)
- ❌ Missing `session` property in context (but used in login.tsx, face-capture.tsx, index.tsx)
- ❌ Missing `refreshStudent` function (but used in face-capture.tsx)
- ❌ `signUp` function signature doesn't match what signup.tsx is calling
- ❌ No session management or token refresh

**Current Code Issues:**
```typescript
// ❌ WRONG: Direct database query with plain text password
const { data, error } = await supabase
  .from("students")
  .select("*")
  .eq("reg_number", reg)
  .maybeSingle();
if (data.password !== password) throw new Error("Incorrect password");

// ❌ WRONG: Using localStorage in React Native
localStorage.setItem("student", JSON.stringify(data));
```

**Should be:**
```typescript
// ✅ CORRECT: Use Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});
```

---

### 1.2 signup.tsx - Function Signature Mismatch

**Problem:** Calling `signUp` with 8 separate parameters, but AuthContext expects a single object.

**Current Call:**
```typescript
await signUp(
  regNumber.trim(),
  password,
  name.trim(),
  email.trim().toLowerCase(),
  phone.trim(),
  department,
  classNumber.trim(),
  section.trim()
);
```

**AuthContext Expects:**
```typescript
signUp: (data: any) => Promise<void>;
```

**Fix Required:** Either update AuthContext to accept 8 parameters OR update signup.tsx to pass an object.

---

### 1.3 login.tsx - Missing Context Properties

**Problem:** Uses `session` and `student` from `useAuth()`, but:
- `session` is not defined in AuthContext interface
- `student` exists but may not be properly loaded

**Code:**
```typescript
const { signIn, session, student, loading: authLoading } = useAuth();
```

**Fix Required:** Add `session` to AuthContext and properly integrate with Supabase Auth.

---

### 1.4 face-capture.tsx - Missing Functions

**Problem:** Uses `refreshStudent()` which doesn't exist in AuthContext.

**Code:**
```typescript
const { student, session, loading: authLoading, refreshStudent } = useAuth();
```

**Fix Required:** Add `refreshStudent` function to AuthContext.

---

## 2. Database Schema Mismatches

### 2.1 TypeScript Types vs Actual Database

**Problem:** `lib/supabase.ts` defines types for tables that don't match what the code uses.

**Defined in types:**
- `student_profiles` (with `register_no`, `face_enrolled`, etc.)
- `attendance_marks` (with `register_no`, `status`, etc.)
- `attendance_sessions` (with `qr_token`, etc.)

**Actually used in code:**
- `students` table (with `reg_number`, `face_encoding`, etc.)
- `attendance` table (different structure)
- `sessions` table (different structure)
- `classes` table (different structure)

**Files Affected:**
- All files using `.from('students')` - no TypeScript type safety
- All files using `.from('attendance')` - no TypeScript type safety
- scanner.tsx, analytics.tsx, profile.tsx, index.tsx, attendance.tsx

---

### 2.2 Missing Table Definitions

**Tables used but not defined in TypeScript:**
- `students` - Used extensively but not in Database type
- `attendance` - Used in multiple files but not defined
- `sessions` - Used but structure differs from `attendance_sessions`
- `classes` - Used but structure differs from defined type

---

## 3. Security Vulnerabilities

### 3.1 Plain Text Password Storage

**Critical Issue:** Passwords are stored in plain text in the database.

**Location:** `contexts/AuthContext.tsx`
```typescript
// ❌ SECURITY RISK: Password stored in plain text
if (data.password !== password) throw new Error("Incorrect password");
```

**Fix:** Use Supabase Auth which handles password hashing automatically.

---

### 3.2 Direct Database Authentication

**Issue:** Bypassing Supabase Auth means:
- No password hashing
- No session tokens
- No secure token storage
- No automatic token refresh
- No password reset functionality

---

## 4. API/Table Name Inconsistencies

### 4.1 Table Name Mismatches

**Code uses:**
- `students` table
- `attendance` table  
- `sessions` table
- `classes` table

**Types define:**
- `student_profiles` table
- `attendance_marks` table
- `attendance_sessions` table
- `classes` table (structure mismatch)

**Files with mismatches:**
- `app/(tabs)/scanner.tsx` - queries `attendance` table
- `app/(tabs)/analytics.tsx` - queries `attendance`, `sessions`, `classes`
- `app/(tabs)/profile.tsx` - queries `attendance`, `sessions`, `classes`
- `app/(tabs)/attendance.tsx` - queries `attendance` table
- `app/(tabs)/index.tsx` - queries `attendance`, `sessions` tables

---

## 5. Missing Features/Implementations

### 5.1 AuthContext Missing Properties

**Missing from interface:**
- `session: Session | null` - Used in multiple files
- `refreshStudent: () => Promise<void>` - Used in face-capture.tsx
- `authLoading: boolean` - Used in multiple files (has `loading` but not `authLoading`)

---

### 5.2 Supabase RPC Functions

**Used but may not exist:**
- `validate_qr(qr_data text)` - Used in face-verify.tsx
- `mark_attendance(...)` - Used in face-verify.tsx

**Need to verify:** These functions exist in Supabase database.

---

## 6. React Native Compatibility Issues

### 6.1 localStorage Usage

**Problem:** `localStorage` is a web API, not available in React Native.

**Location:** `contexts/AuthContext.tsx`
```typescript
const saved = localStorage.getItem("student");
localStorage.setItem("student", JSON.stringify(data));
localStorage.removeItem("student");
```

**Fix:** Use `AsyncStorage` from `@react-native-async-storage/async-storage` or `SecureStore` from `expo-secure-store`.

---

## 7. Type Safety Issues

### 7.1 Missing Type Definitions

**Problem:** Many database queries have no type safety because tables aren't defined in `Database` type.

**Example:**
```typescript
// No type checking - could be wrong table name or columns
const { data } = await supabase
  .from('students')  // Not in Database type
  .select('*');
```

---

## 8. Code Quality Issues

### 8.1 Inconsistent Error Handling

**Problem:** Some files have good error handling, others don't.

**Examples:**
- `login.tsx` - Good error normalization
- `signup.tsx` - Basic error handling
- `face-capture.tsx` - Good error handling
- `scanner.tsx` - Minimal error handling

---

### 8.2 Missing Loading States

**Problem:** Some operations don't show loading states properly.

---

## Priority Fix Order

### 🔴 CRITICAL (Must Fix First)
1. **Fix AuthContext** - Implement proper Supabase Auth
2. **Remove plain text passwords** - Use Supabase Auth password hashing
3. **Fix localStorage** - Replace with AsyncStorage/SecureStore
4. **Add missing context properties** - session, refreshStudent, authLoading

### 🟡 HIGH (Fix Next)
5. **Fix database type definitions** - Match actual database schema
6. **Fix signUp function signature** - Match usage in signup.tsx
7. **Verify RPC functions exist** - validate_qr, mark_attendance

### 🟢 MEDIUM (Can Fix Later)
8. **Standardize error handling** - Consistent across all files
9. **Add missing loading states** - Better UX
10. **Code cleanup** - Remove unused code, improve consistency

---

## Recommended Solution Approach

1. **Phase 1: Authentication Overhaul**
   - Rewrite AuthContext to use Supabase Auth properly
   - Update login.tsx to use email/password auth
   - Update signup.tsx to use Supabase Auth signup
   - Add session management
   - Add refreshStudent function

2. **Phase 2: Database Schema Alignment**
   - Update TypeScript types to match actual database
   - Or update database to match types (if types are correct)
   - Verify all table names and columns

3. **Phase 3: Security Hardening**
   - Remove all plain text password storage
   - Implement proper session management
   - Add token refresh logic

4. **Phase 4: Testing & Validation**
   - Test authentication flow
   - Test face capture flow
   - Test QR scanning flow
   - Test attendance marking

---

## Files That Need Changes

### Critical Changes Required:
1. `contexts/AuthContext.tsx` - Complete rewrite
2. `app/login.tsx` - Update to use new auth
3. `app/signup.tsx` - Update to use new auth
4. `lib/supabase.ts` - Update Database types

### Moderate Changes:
5. `app/face-capture.tsx` - Verify refreshStudent usage
6. `app/face-verify.tsx` - Verify RPC function calls
7. All files in `app/(tabs)/` - Verify table names match database

---

## Testing Checklist

After fixes, test:
- [ ] User can sign up with email/password
- [ ] User can log in with email/password
- [ ] Session persists across app restarts
- [ ] Face capture saves to database
- [ ] QR code scanning works
- [ ] Face verification works
- [ ] Attendance marking works
- [ ] Dashboard shows correct data
- [ ] No localStorage errors in React Native
- [ ] No plain text passwords in database

