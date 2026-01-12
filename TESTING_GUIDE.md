# Mobile-Portal Integration: Quick Test Guide

## What Changed?
✅ Token TTL: 5 seconds → **15 seconds**  
✅ Grace period added: **3 seconds** (for time sync)  
✅ Enhanced error logging in mobile app

**Result**: Students now have ~18 seconds to scan and authenticate (instead of 5 seconds)

---

## Quick Start Test

### Step 1: Start Services
```bash
# Terminal 1: Admin Portal
cd Attendence-Admin-Portal
npm run dev

# Terminal 2: Mobile App (Expo)
cd Facer_app
npm run dev

# Terminal 3: Monitor functions (Optional)
# Supabase Dashboard → Functions → validate-qr-scan → Logs
```

### Step 2: Faculty Side (Web Browser)
1. Open `http://localhost:5173`
2. Login as Faculty
3. Navigate to "Create Attendance" 
4. Select Class 353 (or any class)
5. Click "Start Session"
6. ✅ QR code should display with countdown

### Step 3: Student Side (Mobile/Expo Go)
1. Open Expo Go app on phone
2. Scan Expo QR from terminal
3. Wait for app to load
4. Login as Student
5. Go to "Scanner" tab
6. Point camera at QR code
7. When prompted: Use biometric (Face ID / Fingerprint)
8. ✅ Should mark attendance in 1-3 seconds

### Step 4: Verify
- [ ] Faculty portal shows student marked ✓
- [ ] Mobile shows "Success - Attendance marked"
- [ ] Check scan logs on Supabase dashboard

---

## Understanding the Error Message

If you see: **"Function failed to start (please check logs)"**

This means:
- Fetch request to edge function failed
- Network connectivity issue likely
- Or response parsing failed

**New logging will show:**
```
Response status: 200
Response headers: {...}
Response: { success: true, message: "..." }
```

---

## Real-World Test: Slow Network Scenario

1. **Use DevTools Network Throttling:**
   - Chrome DevTools → Network tab
   - Select "Slow 3G" from dropdown

2. **Then perform scan:**
   - Faculty displays QR
   - Student scans (will take 5-8 seconds now)
   - ✅ Should still work (18 second window)

3. **Without slow network:**
   - Same test should complete in <2 seconds

---

## Token Timing Breakdown

```
T=0s    Token issued (valid from 0-15s + 3s grace = 0-18s)
T=5s    QR visually rotates (faculty sees new QR)
        But old token still valid!

Student scans at T=3s:
  T=3.0s - Student starts biometric auth
  T=3.2s - Biometric completes
  T=3.5s - Scan request sent to server
  T=4.2s - Server validates token
  ✅ Token valid (T=4.2s < 18s limit)

Student scans at T=17s (late):
  T=17.0s - Biometric auth
  T=17.2s - Biometric completes  
  T=17.5s - Request sent
  T=18.2s - Server checks: 18.2 < 18.0? NO
  ❌ Token expired (outside grace window)
```

---

## Monitoring During Test

### Mobile Console (Expo Metro)
```
LOG  Sending attendance payload: {...}
LOG  Calling endpoint: https://...validate-qr-scan
LOG  Response status: 200
LOG  Response: { success: true, message: "..." }
```

### Web Console (Faculty Portal)
- Check DevTools → Console
- Look for any network errors
- Verify "Student updated" messages

### Supabase Dashboard
- Functions → validate-qr-scan → Logs
- Should show successful invocations
- Check execution time (should be <500ms)

---

## What to Check If Issues Arise

### Issue: "Token expired" immediately
- Check time sync between your phone and server
- Grace period helps, but if still failing:
  - Increase `graceWindow` from 3000ms to 5000ms
  - Increase token TTL from 15000ms to 20000ms

### Issue: "Unauthorized" 
- Student not logged in
- Auth token expired
- Solution: Logout and login again

### Issue: "Session not found"
- Faculty stopped the session
- Different faculty's session
- Solution: Start a new session

### Issue: "Token already used"
- Student scanned twice within same window
- Expected behavior (prevents double marking)
- Solution: Faculty manually marks if needed

---

## Success Indicators

After deployment, you should see:
- ✅ Token valid for 15 seconds (shown in countdown)
- ✅ 18-second safe window (15s + 3s grace)
- ✅ Students can scan during QR rotation (5-second window)
- ✅ Attendance marks within 1-3 seconds normally
- ✅ Slower networks still succeed (within 18s window)
- ✅ "Token expired" errors should be rare (<1%)

---

## Adjustable Parameters

If you need to further tune:

### In `generate-qr-token/index.ts` (line ~142):
```typescript
const expiresAt = new Date(issuedAt.getTime() + 15000); // Change to 20000 for 20s
```

### In `validate-qr-scan/index.ts` (lines ~149, 188):
```typescript
const graceWindow = 3000; // Change to 5000 for 5s grace period
```

Then redeploy:
```bash
supabase functions deploy generate-qr-token validate-qr-scan
```

---

## Expected Behavior Comparison

| Scenario | Before (5s) | After (15s + 3s) |
|----------|------------|------------------|
| Quick scan | ✅ Works | ✅ Works |
| During QR rotation | ❌ Often fails | ✅ Reliably works |
| Slow network (3G) | ❌ Fails | ✅ Works |
| Double scan | ❌ Sometimes marks twice | ✅ Prevented |
| Token expiry errors | 🔴 Common | 🟢 Rare |

---

## Next: Production Rollout

Once testing is successful:
1. Deploy to Vercel (admin portal)
2. Build and distribute Expo app
3. Monitor error rates for first week
4. Collect user feedback
5. Adjust if needed

---

**Test checklist version**: 1.0  
**Configuration**: 15s TTL + 3s grace period  
**Last updated**: January 12, 2026
