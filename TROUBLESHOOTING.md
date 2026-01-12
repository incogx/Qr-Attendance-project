# "Function Failed to Start" - Troubleshooting Guide

## Error Screenshot
You're seeing: **"Function failed to start (please check logs)"**

---

## What This Error Means

The mobile app tried to send a QR scan to the Supabase edge function but something went wrong. This is a **catch-all error** - could be any of several issues.

---

## 🔍 How to Diagnose

### Step 1: Check Metro Bundler Console (Mobile)

Open the terminal running `npx expo start` and look for:

```
=== STARTING ATTENDANCE MARK ===
URL: https://mqnbcgatoppankntpmiu.supabase.co/functions/v1/validate-qr-scan
Supabase URL: https://mqnbcgatoppankntpmiu.supabase.co
Has session: true
Session user: [user-id]
Token type: string
Token length: 200+ (should be long JWT)

=== RESPONSE RECEIVED ===
Response status: [status-code]
Response statusText: [text]
Response ok: [true/false]
```

### Step 2: Look for Error Details

Search the console for:
- `=== JSON PARSE ERROR ===` → Server response is malformed
- `=== QR scan error:` → Network/fetch error
- `Error name:` → Type of error
- `Error message:` → Specific problem

---

## Common Issues & Solutions

### Issue 1: No Response Received (Network Error)
**Console shows**: `QR scan error: Network request failed`

**Causes**:
- ❌ Device not connected to internet
- ❌ Can't reach supabase.co
- ❌ VPN/firewall blocking

**Fix**:
```
1. Check device has internet
2. Try accessing https://mqnbcgatoppankntpmiu.supabase.co in browser
3. If browser works but app doesn't: Check .env file
4. Verify: EXPO_PUBLIC_SUPABASE_URL=https://mqnbcgatoppankntpmiu.supabase.co
```

### Issue 2: Invalid Response Format
**Console shows**: `=== JSON PARSE ERROR ===`

**Causes**:
- ❌ Edge function crashed
- ❌ Function returned HTML error page
- ❌ Supabase API issue

**Fix**:
```
1. Go to Supabase Dashboard
2. Functions → validate-qr-scan → Logs
3. Look for errors
4. Check if function is deployed
5. Check QR_SIGNING_SECRET is set
```

### Issue 3: Response Status 401/403
**Console shows**: `Response status: 401` or `403`

**Causes**:
- ❌ Student not logged in properly
- ❌ Auth token expired
- ❌ Missing Authorization header

**Fix**:
```
1. Logout and login again
2. Check console: "Token length: 200+" (should be long)
3. Verify: session.access_token exists
4. Try scanning again
```

### Issue 4: Response Status 500
**Console shows**: `Response status: 500`

**Causes**:
- ❌ Edge function has error
- ❌ Database connection issue
- ❌ Missing environment variables

**Fix**:
```
1. Check Supabase Dashboard → Functions → validate-qr-scan
2. Look at Logs tab
3. Check for errors
4. Verify these secrets are set:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - QR_SIGNING_SECRET
```

---

## 📋 Diagnostic Checklist

Run through this checklist:

### Network
- [ ] Phone connected to WiFi/mobile data
- [ ] Can open https://mqnbcgatoppankntpmiu.supabase.co in browser
- [ ] No VPN or corporate firewall blocking

### Configuration
- [ ] `.env` file exists in `Facer_app/`
- [ ] Contains: `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Contains: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Values match your Supabase project

### App State
- [ ] Student successfully logged in
- [ ] No auth errors during login
- [ ] Can see "Scan QR Code" screen
- [ ] Camera permission granted

### Supabase
- [ ] `generate-qr-token` function deployed
- [ ] `validate-qr-scan` function deployed
- [ ] Both functions show "OK" status
- [ ] Check Functions → Logs tab for errors
- [ ] Check if QR_SIGNING_SECRET is set

---

## 🛠️ Detailed Logging Output

The app now logs every step. Here's what each piece means:

```
=== SCANNER COMPONENT MOUNTED ===
Supabase URL: https://...supabase.co       ← Should match your project
Supabase URL valid: true                    ← Should be true
Supabase Anon Key exists: true              ← Should be true
Student authenticated: true                 ← Should be true

=== STARTING ATTENDANCE MARK ===
URL: https://...supabase.co/functions/v1/validate-qr-scan  ← Correct URL
Supabase URL: https://...supabase.co        ← Used for endpoint
Has session: true                           ← Student logged in
Session user: 123e4567-e89b-12d3-a456...   ← User ID
Token type: string                          ← Should be string
Token length: 250                           ← Should be 100-300

Sending attendance payload: {"token": "eyJ..."}  ← QR data
Calling endpoint: https://...validate-qr-scan   ← Where it's sending

=== RESPONSE RECEIVED ===
Response status: 200                        ← 200=success, 401=auth, 500=error
Response statusText: OK                     ← Status description
Response ok: true                           ← Should be true for success
Response headers: {
  contentType: application/json             ← Should be JSON
  contentLength: 150                        ← Response size
}

Parsed response: {"success": true, "message": "Attendance marked"}  ← Success!
```

---

## 🔧 Testing the Connection

### Test 1: Verify Configuration
Add this to your browser console while testing:
```javascript
// Check if you can reach Supabase
fetch('https://mqnbcgatoppankntpmiu.supabase.co', {
  method: 'GET',
  headers: {'Content-Type': 'application/json'}
})
.then(r => r.status)
.then(s => console.log('Status:', s))
.catch(e => console.error('Error:', e.message))
```

### Test 2: Direct Function Call
In Supabase Dashboard:
1. Go to Functions → validate-qr-scan
2. Click "Invoke" button
3. Add test payload:
```json
{
  "token": "test.token.here"
}
```
4. See if function responds (it might error, but should respond)

---

## 📞 If Still Stuck

### Gather This Information
1. **Full console output** during the scan attempt
2. **Supabase function logs** (Dashboard → Functions → Logs)
3. **Response status code** from Response
4. **Your Supabase project URL** (first part only)
5. **Any error messages** from the logs

### Check These Files
```
.env                          ← Verify URLs & keys exist
lib/supabase.ts               ← Check exports
app/(tabs)/scanner.tsx        ← Check endpoint URL construction
```

### Verify Deployment
```bash
# Check if functions are deployed:
supabase functions list

# Check function logs:
supabase functions get validate-qr-scan
```

---

## ✅ Success Indicators

If everything is working:
- ✅ Logs show all steps smoothly
- ✅ Response status: 200
- ✅ Response shows: `{ success: true, message: "..." }`
- ✅ Alert shows: "Attendance marked successfully"
- ✅ No errors in console
- ✅ No errors in Supabase logs

---

## 🚨 Quick Fixes to Try

1. **Clear cache & reload**
   ```bash
   # In the expo terminal: Press 'r' to reload
   ```

2. **Logout and login again**
   - Clears cached auth tokens
   - Gets fresh authentication

3. **Check internet**
   ```bash
   ping 8.8.8.8  # Should respond
   ```

4. **Verify .env file**
   ```bash
   cd Facer_app
   cat .env  # Should show EXPO_PUBLIC_SUPABASE_URL
   ```

5. **Redeploy functions**
   ```bash
   supabase functions deploy validate-qr-scan generate-qr-token
   ```

---

## 📊 Status Codes Reference

| Code | Meaning | Likely Cause |
|------|---------|--------------|
| 200 | Success | ✅ Works! |
| 400 | Bad Request | QR format wrong, session not found |
| 401 | Unauthorized | Auth token missing or invalid |
| 403 | Forbidden | User role not allowed |
| 404 | Not Found | Function doesn't exist |
| 500 | Server Error | Function crashed |
| Timeout | No response | Network unreachable |

---

## 💡 Pro Tips

1. **Check Metro console FIRST** before looking elsewhere
2. **The new logging shows exactly where it failed**
3. **Supabase logs show server-side errors**
4. **Network tab shows HTTP status codes**
5. **Status 200 + JSON parse error = function returned HTML instead of JSON**

---

## Next Steps

1. Open Expo Metro console
2. Attempt to scan QR
3. Look for `=== STARTING ATTENDANCE MARK ===` section
4. Note the response status
5. Check corresponding section above
6. Apply the fix

---

**Enhanced Logging Version**: 1.0  
**Created**: January 12, 2026  
**For Error**: "Function failed to start (please check logs)"

---

The app will now tell you **exactly** what went wrong instead of a generic error message!
