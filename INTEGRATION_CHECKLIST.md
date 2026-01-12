# App-Portal Integration Checklist

## Overview
This document covers the complete integration between:
- **Facer_app** (Mobile - React Native/Expo)
- **Attendence-Admin-Portal** (Web - React/Vite)
- **Supabase Backend** (Edge Functions, Database, Auth)

---

## ✅ Backend Configuration

### Edge Functions Status
- [x] `generate-qr-token` - Deployed ✓
  - TTL: 15 seconds (increased from 5s)
  - Rotation: Every 5 seconds (configurable)
  
- [x] `validate-qr-scan` - Deployed ✓
  - Grace period: 3 seconds (for time sync)
  - Returns: `{ success: true, message: "Attendance marked" }`

### Supabase Project
- **URL**: `https://mqnbcgatoppankntpmiu.supabase.co`
- **Anon Key**: Configured in both apps
- **Service Role Key**: Used only server-side in edge functions

---

## 📱 Mobile App (Facer_app) Integration

### Configuration Files
✓ `.env` file configured:
```
EXPO_PUBLIC_SUPABASE_URL=https://mqnbcgatoppankntpmiu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_BASE=https://mqnbcgatoppankntpmiu.supabase.co/functions/v1
```

### Supabase Client
- **File**: `Facer_app/lib/supabase.ts`
- **Status**: ✓ Properly configured with ExpoStorage adapter
- **Exports**: `supabase`, `supabaseUrl`, `supabaseAnonKey`

### Scanner Component Flow
**File**: `Facer_app/app/(tabs)/scanner.tsx`

**Process:**
1. User scans QR code → `handleBarCodeScanned()`
2. Biometric check (Face ID / Fingerprint)
3. Get auth session from Supabase
4. Payload: `{ token: "qr_string" }`
5. POST to `validate-qr-scan` edge function
6. Response: `{ success: true, message: "..." }` or `{ error: "..." }`

**Error Handling:**
- Response parsing errors → "Server returned invalid response"
- Expired tokens → "Token expired"
- Already used → "Token already used"
- Auth failures → "Please log in again"

### Recent Updates
✓ Enhanced error logging for debugging:
```tsx
- Added response status logging
- Added response headers logging  
- Added parse error handling
- Added stack traces for exceptions
```

---

## 🖥️ Admin Portal (Web) Integration

### Configuration Files
✓ `Attendence-Admin-Portal/src/lib/supabase.ts`
- Uses VITE environment variables
- Type-safe Database types
- Automatic RLS handling

### QR Generation Page
**File**: `Attendence-Admin-Portal/src/components/faculty/GenerateQRPage.tsx`

**Process:**
1. Faculty selects class and starts session
2. `fetchLiveQrToken()` → calls `generate-qr-token` function
3. Token rotates every 5 seconds (from `qr_rotation_seconds`)
4. Displays countdown: "Token valid for Xs"
5. Auto-advances to next token when expired

### Updated Display
✓ Updated UI labels:
- "Refreshes every Xs" (QR visual rotation)
- "Token valid for Xs" (actual countdown)
- "Students have 15s to scan each token" (clarification)

---

## 🔄 Complete Integration Flow

### Attendance Marking Flow
```
Faculty                  Student              Supabase
   |                        |                    |
   |-- Create Session ----->|                    |
   |                        |-- Fetch Token ---->|
   |                        |<--- Token (15s) ---|
   |                        |                    |
   |               [QR Display - 5s rotation]    |
   |                        |                    |
   |                   [Biometric Auth]          |
   |                        |-- Scan QR ------->|
   |                        |   (with token)     |
   |                        |<--- Success -------|
   |<-- Real-time update -- |                    |
   |  (attendance marked)    |                    |
```

### Timing Analysis
- **QR Validity**: 15 seconds (provides buffer)
- **Grace Period**: 3 seconds (handles time sync)
- **Biometric Auth**: ~1-2 seconds
- **Network Latency**: ~1-2 seconds
- **Total Safe Window**: 15 + 3 = 18 seconds

---

## 🧪 Testing Checklist

### Pre-Test Setup
- [ ] Supabase functions deployed (`generate-qr-token`, `validate-qr-scan`)
- [ ] Admin portal running (`npm run dev`)
- [ ] Mobile app running (`npm run dev`)
- [ ] Biometric setup on test device
- [ ] Logged in as both faculty and student

### Test Scenarios

#### Test 1: Quick Scan (Optimal)
- [ ] Faculty starts session
- [ ] Wait for QR to display
- [ ] Student scans immediately
- [ ] Biometric authenticates
- [ ] ✓ Attendance marked successfully
- [ ] Status updates in real-time

#### Test 2: Token Rotation Boundary
- [ ] Faculty starts session
- [ ] Wait until QR starts rotating
- [ ] Student scans during rotation
- [ ] ✓ Should still work (within 15s + 3s grace)

#### Test 3: Slow Network
- [ ] Simulate slow network (DevTools throttle)
- [ ] Student scans QR
- [ ] Biometric authenticates
- [ ] Wait 3-5 seconds for response
- [ ] ✓ Should succeed (within grace period)

#### Test 4: Expired Token
- [ ] Wait 18+ seconds after QR issued
- [ ] Student scans very old token
- [ ] ✓ Should show "Token expired"

#### Test 5: Double Scan Prevention
- [ ] Student scans same QR
- [ ] Marks attendance ✓
- [ ] Student scans same QR again
- [ ] ✓ Should reject with "Token already used"

---

## 🔍 Debugging Guide

### If Attendance Not Marked:

1. **Check Mobile Logs**
   ```
   Open Metro bundler console
   Look for: "Sending attendance payload: ..."
   Look for: "Calling endpoint: ..."
   Look for: "Response:" (check status code)
   ```

2. **Check Response Status**
   - `200` + `{ success: true }` = Success
   - `400` + `{ error: "Token expired" }` = Token too old
   - `401` + `{ error: "Unauthorized" }` = Auth issue
   - `409` + `{ error: "Token already used" }` = Already marked

3. **Check Network**
   - Ensure device can reach `mqnbcgatoppankntpmiu.supabase.co`
   - Check CORS headers (should allow *)
   - Verify Authorization header sent correctly

4. **Check Supabase Edge Function**
   - Go to Supabase Dashboard → Functions → validate-qr-scan
   - Check Logs tab for execution details
   - Verify function status is "OK"

### If "Function failed to start":
- This usually means a fetch/network error
- Enhanced logging now captures stack trace
- Check: Is Supabase reachable? Is Auth token valid?

---

## 📋 Configuration Matrix

| Component | Mobile | Web | Backend |
|-----------|--------|-----|---------|
| Supabase URL | ✓ .env | ✓ .env | Built-in |
| Auth Key | ✓ .env | ✓ .env | Built-in |
| Service Key | N/A | N/A | ✓ Secret |
| Edge Functions | ✓ Calls | ✓ Calls | ✓ Hosted |
| RLS Policies | ✓ Enforced | ✓ Enforced | ✓ Enforced |

---

## 🚀 Deployment Checklist

### Before Production
- [ ] All edge functions deployed
- [ ] Environment variables set correctly
- [ ] Biometric permissions configured (app.json)
- [ ] CORS properly configured
- [ ] Error handling tested
- [ ] Performance under load tested

### Monitoring
- Check Supabase edge function logs regularly
- Monitor attendance success rate
- Track "Token expired" errors
- Monitor response times

---

## 📞 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Token expired | Network too slow | Increased from 5s to 15s ✓ |
| Double marking | Token reused | Check scan logs, ensure dedup works |
| Auth failed | Token invalid | Ensure user logged in, token fresh |
| CORS error | Invalid headers | Check Content-Type, Authorization |
| Function error | Syntax/runtime | Check Supabase function logs |

---

## ✨ Next Steps

1. **Test with actual devices** (not just simulator)
2. **Monitor scan logs** for patterns
3. **Collect user feedback** on success rate
4. **Adjust grace period** if needed (currently 3s)
5. **Consider increasing TTL further** if still seeing issues

---

**Last Updated**: January 12, 2026
**TTL Configuration**: 15 seconds + 3 second grace period = 18 second safe window
