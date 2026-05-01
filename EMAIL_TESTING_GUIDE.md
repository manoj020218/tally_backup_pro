# Email Alerts System - Testing Guide

**Created**: May 1, 2026  
**Version**: 1.0  
**Status**: Ready for Testing

---

## 📋 Overview

This guide covers comprehensive testing of the Email Alerts feature for TallyBackup Pro. The system automatically sends email notifications when backups succeed or fail.

**Components to Test**:
1. Email Service (backend)
2. IPC Handlers (Electron communication)
3. UI Form (Settings screen)
4. Backup Integration (auto-trigger)
5. Email Delivery (SMTP/SendGrid)

---

## 🧪 Test Categories

### Category 1: Code Quality ✅
- [x] No syntax errors
- [x] No TypeScript/JSX errors
- [ ] Import paths validation
- [ ] Missing dependencies check

### Category 2: Backend Testing
- [ ] Email service initialization
- [ ] SMTP configuration validation
- [ ] SendGrid configuration validation
- [ ] Credential encryption/decryption
- [ ] IPC handlers respond correctly

### Category 3: Frontend Testing
- [ ] Settings screen loads
- [ ] Email form renders
- [ ] Form validation works
- [ ] Recipient list add/remove works
- [ ] Provider switching works
- [ ] Test email button works
- [ ] Settings save/load works

### Category 4: Integration Testing
- [ ] Email service auto-initializes on app start
- [ ] Settings persist across app restart
- [ ] Backup triggers email on success
- [ ] Backup triggers email on failure
- [ ] Email contains correct information

### Category 5: End-to-End Testing
- [ ] Full workflow: Configure → Test → Backup → Receive Email
- [ ] SMTP provider: Gmail
- [ ] SendGrid provider: Cloud delivery
- [ ] Error handling: Network failures
- [ ] Error handling: Invalid credentials

---

## 🚀 Quick Start Testing (15 minutes)

### Step 1: Verify Dependencies Installed
```bash
npm list nodemailer @sendgrid/mail
# Should show both packages installed
```

### Step 2: Start the App
```bash
npm start
# App should start without errors
```

### Step 3: Navigate to Settings
1. Open TallyBackup Pro
2. Click "Settings" in sidebar
3. Scroll to "📧 Email Alerts" section
4. Verify form is visible

### Step 4: Test SMTP Configuration (Gmail)

**Prerequisites**: Gmail account with 2FA and App Password

1. In Email Alerts section, select "SMTP (Gmail, Outlook, etc.)"
2. Fill in:
   - **From Email**: your-gmail@gmail.com
   - **Recipient Emails**: your-gmail@gmail.com (add yourself)
   - **SMTP Host**: smtp.gmail.com
   - **Port**: 587
   - **Username**: your-gmail@gmail.com
   - **Password**: `[Your Gmail App Password]`
   - Check: ✅ Backup Success
   - Check: ✅ Backup Failure

3. Click "🧪 Send Test Email"
4. **Expected Result**: Test email arrives in inbox within 10 seconds
5. Check email contains:
   - Header: "🧪 Test Email"
   - Features listed (Success alerts, Failure alerts, etc.)
   - Footer with Backup Pro branding

### Step 5: Test SendGrid Configuration (Optional)

**Prerequisites**: SendGrid account and API key

1. In Email Alerts section, select "SendGrid"
2. Fill in:
   - **From Email**: noreply@yourcompany.com
   - **Recipient Emails**: your-email@gmail.com (add yourself)
   - **API Key**: `[Your SendGrid API Key]`
   - Check: ✅ Backup Success
   - Check: ✅ Backup Failure

3. Click "✓ Save Settings"
4. Click "🧪 Send Test Email"
5. **Expected Result**: Test email arrives within 30 seconds

### Step 6: Test Real Backup Notification

1. Go to "Manual Backup" screen
2. Select a backup profile from dropdown
3. Click "▶ Start Backup"
4. Wait for backup to complete (success or failure)
5. **Expected Result**: Notification email arrives with:
   - Status (Success ✅ or Failure ❌)
   - Backup details (profile, size, duration, etc.)
   - Timestamp of completion

---

## 📊 Detailed Test Cases

### Test Case 1: SMTP Connection Validation
**Objective**: Verify SMTP credentials are validated before saving

**Steps**:
1. Go to Settings → Email Alerts
2. Select SMTP provider
3. Leave SMTP Host empty
4. Try to save
5. **Expected**: Error message "SMTP host is required"

**Acceptance Criteria**:
- ✓ Error message displays
- ✓ Settings not saved
- ✓ Form remains open

---

### Test Case 2: Recipient Email Validation
**Objective**: Verify email addresses are validated

**Steps**:
1. Add recipient: `invalid-email`
2. Try to save or send test
3. **Expected**: Error about invalid email format

**Acceptance Criteria**:
- ✓ Invalid email rejected
- ✓ User sees clear error message

---

### Test Case 3: Recipient List Management
**Objective**: Verify add/remove recipients works

**Steps**:
1. Add recipient: `user1@gmail.com`
2. Add recipient: `user2@gmail.com`
3. Add recipient: `user3@gmail.com`
4. Remove middle recipient (`user2@gmail.com`)
5. **Expected**: List shows [user1, user3]

**Acceptance Criteria**:
- ✓ Add button works
- ✓ Remove (×) button works
- ✓ List updates correctly
- ✓ Duplicate emails rejected

---

### Test Case 4: Settings Persistence
**Objective**: Verify settings saved and loaded correctly

**Steps**:
1. Configure SMTP with:
   - Provider: SMTP
   - From: test@gmail.com
   - Recipients: [user@gmail.com]
   - Notifications: Success ✓, Failure ✓
2. Click "✓ Save Settings"
3. Close app completely
4. Restart app
5. Go back to Settings
6. **Expected**: All settings are restored

**Acceptance Criteria**:
- ✓ Form shows exact same values
- ✓ No re-configuration needed

---

### Test Case 5: Encryption of Credentials
**Objective**: Verify passwords/API keys are encrypted in database

**Steps**:
1. Configure with SMTP password: `MyPassword123`
2. Click "✓ Save Settings"
3. Check database: `SELECT * FROM settings WHERE key='emailSettings'`
4. **Expected**: Value is encrypted (JSON with iv, authTag, ciphertext)

**Acceptance Criteria**:
- ✓ Plain password NOT visible in DB
- ✓ Encrypted data is valid JSON
- ✓ Decryption works (test email sends)

---

### Test Case 6: Test Email Button
**Objective**: Verify test email sends successfully

**Steps**:
1. Configure SMTP with valid Gmail credentials
2. Add recipient: your-email@gmail.com
3. Click "🧪 Send Test Email"
4. Check inbox
5. **Expected**: Email arrives with test content

**Acceptance Criteria**:
- ✓ Button shows "Sending..." while processing
- ✓ Success message displays: "Test email sent to..."
- ✓ Email arrives in inbox
- ✓ Email template is beautiful and professional

---

### Test Case 7: Backup Success Email
**Objective**: Verify email is sent when backup completes successfully

**Steps**:
1. Configure email settings (SMTP or SendGrid)
2. Go to Manual Backup
3. Select any profile
4. Click "▶ Start Backup"
5. Wait for "Backup completed successfully" message
6. Check email inbox
7. **Expected**: Success email arrives with backup details

**Acceptance Criteria**:
- ✓ Email arrives within 2 minutes
- ✓ Subject: "✅ Backup Successful: [Profile Name]"
- ✓ Shows: Profile name, backup type, size, duration
- ✓ Completion timestamp shown
- ✓ Email is beautifully formatted

**Expected Email Content**:
```
✅ Backup Completed Successfully

Profile: [Name]
Type: [Full/Incremental]
Size: [XX MB]
Duration: [XX seconds]
Completed: [Date Time]

Your backup is scheduled automatically...
```

---

### Test Case 8: Backup Failure Email
**Objective**: Verify email is sent when backup fails

**Steps**:
1. Configure email settings
2. Disconnect Tally application or stop it
3. Go to Manual Backup
4. Select any profile
5. Click "▶ Start Backup"
6. Wait for error
7. Check email inbox
8. **Expected**: Failure email arrives with error details

**Acceptance Criteria**:
- ✓ Email arrives within 2 minutes
- ✓ Subject: "❌ Backup Failed: [Profile Name]"
- ✓ Shows: Error message, timestamp
- ✓ Suggests troubleshooting steps
- ✓ Email template clearly indicates failure

---

### Test Case 9: Disabled Alerts
**Objective**: Verify no email sent when alerts disabled

**Steps**:
1. Configure and enable email alerts
2. Verify test email sends ✓
3. Disable alerts: Uncheck "Enable Email Alerts"
4. Click "✓ Save Settings"
5. Trigger a backup (success)
6. Wait 2 minutes
7. **Expected**: NO email received

**Acceptance Criteria**:
- ✓ No email arrives
- ✓ Backup still completes normally
- ✓ Disabling doesn't break backup process

---

### Test Case 10: Selective Notifications
**Objective**: Verify only selected notification types are sent

**Steps**:
1. Configure alerts
2. Enable: ✓ Backup Success
3. Disable: ☐ Backup Failure
4. Trigger successful backup
5. **Expected**: Success email arrives
6. Now configure to disable success, enable failure
7. Disconnect Tally and trigger backup (fails)
8. **Expected**: Failure email arrives

**Acceptance Criteria**:
- ✓ Only enabled notifications send
- ✓ Disabled notifications don't send

---

## 🔧 Testing Environment Setup

### For Gmail Testing

1. Create/Use Gmail account
2. Enable 2-Step Verification
3. Generate App Password:
   - Go to: https://myaccount.google.com/app-passwords
   - Select "Mail" and "Windows Computer"
   - Copy password (16 characters, spaces removed)
4. Use this password in SMTP Password field

### For SendGrid Testing

1. Create SendGrid account: https://sendgrid.com
2. Get API Key:
   - Go to Settings → API Keys
   - Create new key with "Mail Send" access
   - Copy full key
3. Use in SendGrid API Key field

### For Local Testing

1. Use Mailtrap or similar service:
   - Visit: https://mailtrap.io
   - Get SMTP credentials
   - Use in SMTP Configuration

---

## 🐛 Debugging Guide

### Issue: "Email service not configured"
**Cause**: Settings not saved or email service failed to initialize
**Solution**: 
1. Check Settings → Email Alerts exists
2. Fill all required fields
3. Click "✓ Save Settings"
4. Verify success message appears
5. Restart app and check again

### Issue: Test email sends but real backups don't
**Cause**: Email service initialized but backup integration not working
**Solution**:
1. Check backup engine calls email service
2. Verify backup engine is using updated code
3. Check console logs for errors

### Issue: "SMTP authentication failed"
**Cause**: Wrong credentials or app-specific requirements
**Solution**:
1. For Gmail: Use App Password, not regular password
2. For Outlook: Use full email address as username
3. Test in external email client first

### Issue: "SendGrid API key invalid"
**Cause**: Wrong API key or insufficient permissions
**Solution**:
1. Double-check copied key has no extra spaces
2. Verify key has "Mail Send" permission
3. Check key not revoked in dashboard

### Issue: Emails arrive in spam folder
**Cause**: Sender reputation or SPF/DKIM not configured
**Solution**:
1. Mark emails as "Not Spam"
2. For production: Setup SPF, DKIM, DMARC records
3. Use consistent "From" email address

---

## ✅ Sign-Off Checklist

### Backend (Developer)
- [ ] All syntax errors resolved
- [ ] Import paths correct
- [ ] Email service initializes without errors
- [ ] IPC handlers respond to test calls
- [ ] Credentials encrypted in database
- [ ] Backup engine integration works

### Frontend (UI/UX)
- [ ] Settings screen renders
- [ ] Form validation prevents invalid data
- [ ] Test email button works
- [ ] Settings save/load correctly
- [ ] Error messages are clear and helpful
- [ ] No console errors

### Integration
- [ ] Email on backup success
- [ ] Email on backup failure
- [ ] Email on test sends
- [ ] Emails contain correct information
- [ ] Encrypted credentials work after restart
- [ ] No performance impact on backups

### Email Quality
- [ ] Email templates render correctly
- [ ] Success emails professional and informative
- [ ] Failure emails helpful with troubleshooting
- [ ] Test emails verify configuration
- [ ] All recipient emails receive

---

## 📈 Performance Metrics

**Expected Performance**:
- Test email send: < 5 seconds (SMTP), < 30 seconds (SendGrid)
- Backup + email: < 500ms additional (non-blocking)
- Settings save: < 1 second
- App startup with email: < 2 seconds additional

**Acceptable Ranges**:
- Email send timing: Depends on provider
- Backup impact: Negligible (async, non-blocking)
- UI responsiveness: No perceptible delay

---

## 📝 Test Results Template

Use this to document your test runs:

```
Test Date: ___________
Tester: ___________
Email Provider: [ ] SMTP [ ] SendGrid
Test Email: ___________
Backup Profile: ___________

Test Case 1 (Quick Start): _____ PASS / FAIL
Test Case 2 (SMTP Validation): _____ PASS / FAIL
Test Case 3 (Recipient Management): _____ PASS / FAIL
Test Case 4 (Settings Persistence): _____ PASS / FAIL
Test Case 5 (Encryption): _____ PASS / FAIL
Test Case 6 (Test Email): _____ PASS / FAIL
Test Case 7 (Backup Success): _____ PASS / FAIL
Test Case 8 (Backup Failure): _____ PASS / FAIL
Test Case 9 (Disabled Alerts): _____ PASS / FAIL
Test Case 10 (Selective Notifications): _____ PASS / FAIL

Overall Result: _____ ALL PASS / SOME FAIL / BLOCKED

Issues Found:
1. ____________________________
2. ____________________________
3. ____________________________

Notes:
_________________________________
_________________________________
```

---

## 🎯 Testing Success Criteria

**All tests must pass for release**:
1. ✓ No syntax/runtime errors
2. ✓ Settings page loads and saves
3. ✓ Test email sends successfully
4. ✓ Settings persist across restart
5. ✓ Backup success triggers email
6. ✓ Backup failure triggers email
7. ✓ Email templates look professional
8. ✓ No performance degradation
9. ✓ Error messages are helpful
10. ✓ Credentials remain encrypted

---

## 🚀 Next Steps After Testing

If **ALL PASS**:
1. Mark feature as complete ✅
2. Commit to version control
3. Move to next feature (QA matrix, code signing, etc.)
4. Prepare release notes

If **SOME FAIL**:
1. Document issues
2. Create bug tickets
3. Fix bugs
4. Re-test affected areas
5. Return to full test suite

---

**Happy Testing!** 🧪✉️

For questions or issues, refer to session memory at: `/memories/session/EMAIL_ALERTS_PLAN.md`
