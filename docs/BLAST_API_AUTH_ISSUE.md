# Blast Motion API - Authentication Issue

## Current Situation

**Credentials Provided:**
- Username: `atlanticapi@blastmotion.com`
- Password: `atlanticsportsperformance`

**What's Happening:**
- ✅ HTTP request succeeds (200 OK)
- ❌ Returns HTML instead of JSON
- ❌ Getting Blast Connect web app page (v5.18.5)

**This means:**
The credentials work for authentication, BUT we're hitting the web application, not the API endpoint.

---

## Possible Causes

### **1. These are Web Login Credentials (Most Likely)**

The credentials you provided might be your **Blast Connect web login** (for logging into https://connect.blastmotion.com), not Consumer API credentials.

**Evidence:**
- HTTP 200 OK (auth works)
- Returning HTML web app
- Username format looks like a login email

**Solution:**
You need to request **Consumer API access** from Blast Motion separately.

---

### **2. Wrong API Endpoint**

The base URL might be different for the Consumer API.

**Currently using:**
```
https://api.blastconnect.com/api/v3/insights/external
```

**Alternatives to try:**
- `https://connect.blastmotion.com/api/v3/insights/external`
- `https://api.blastmotion.com/api/v3/insights/external`
- Different subdomain entirely

---

### **3. API Requires Different Auth Method**

The Consumer API might require:
- API keys (not username/password)
- OAuth tokens
- Session cookies
- Different auth header format

---

## What To Do Next

### **Option A: Contact Blast Motion Support (Recommended)**

**Email:** support@blastmotion.com

**Message Template:**
```
Subject: Consumer API Access for Atlantic Sports Performance

Hi Blast Motion Support,

We are building an integration with the Blast Connect Consumer API
and need help with authentication.

Account Details:
- Organization: Atlantic Sports Performance
- Login Email: atlanticapi@blastmotion.com
- Current Access: Blast Connect web interface

Questions:
1. Do we have Consumer API access enabled for our account?
2. Are the API credentials different from our web login?
3. What is the correct API base URL?
4. What authentication method should we use?

We've reviewed the API documentation at:
https://www.manula.com/manuals/blast-motion/blast-connect-consumer-api/

But need clarification on authentication setup.

Thank you!
```

---

### **Option B: Check Your Blast Connect Account**

1. Log into https://connect.blastmotion.com
2. Go to Settings or Account
3. Look for "API Access" or "Developer" section
4. Check if Consumer API is enabled
5. Look for API credentials/keys

---

### **Option C: Try Alternative URLs**

We can test different base URLs to see if one works:

**Test 1: Original Blast Motion domain**
```bash
https://connect.blastmotion.com/api/v3/insights/external
```

**Test 2: Different API subdomain**
```bash
https://api.blastmotion.com/api/v3/insights/external
```

**Test 3: No subdomain**
```bash
https://blastmotion.com/api/v3/insights/external
```

---

## Technical Details

### **Current Request:**
```
GET https://api.blastconnect.com/api/v3/insights/external
Headers:
  Authorization: Basic YXRsYW50aWNhcGlAYmxhc3Rtb3Rpb24uY29tOmF0bGFudGljc3BvcnRzcGVyZm9ybWFuY2U=
  Accept: application/json
  Content-Type: application/json
Parameters:
  date[]: 2025-10-22
  date[]: 2025-10-29
  roster: all
  search:
  page: 1
  per_page: 1
```

### **Current Response:**
```
Status: 200 OK
Content-Type: text/html (should be application/json)
Body: <!DOCTYPE html><html lang="en" ng-app="app">...
```

**This is the Blast Connect Angular web application, not the API.**

---

## Comparison with VALD Integration

**VALD (Working):**
- Has separate API credentials (Client ID + Secret)
- Uses OAuth2 authentication
- Different URL for API vs web app
- Clearly separated web login vs API access

**Blast Motion (Current Issue):**
- Using web login credentials
- HTTP Basic Auth
- Same domain returns web app
- Need clarification on API vs web access

---

## Next Steps

1. **Immediate:**
   - Contact Blast Motion support (use template above)
   - Ask specifically about Consumer API access
   - Request API credentials if different from web login

2. **While Waiting:**
   - Check your Blast Connect account for API settings
   - Ask your Blast Motion account rep
   - Look for any API documentation you received

3. **Alternative:**
   - We can continue building with mock data
   - Create the UI and functionality
   - Swap in real API once credentials work

---

## Questions for You

1. **Have you successfully used the Blast Motion Consumer API before?**
   - If yes, how did you authenticate?
   - What credentials did you use?

2. **What Blast Motion subscription do you have?**
   - Blast Connect only?
   - Blast Connect + Consumer API access?
   - Not sure?

3. **Do you have a Blast Motion account representative?**
   - If yes, they can help enable API access
   - If no, contact support@blastmotion.com

4. **Would you like to:**
   - A) Wait for API credentials from Blast Motion
   - B) Continue development with mock data
   - C) Try alternative authentication methods first

---

##Summary

**Problem:** Web login credentials don't work for Consumer API
**Cause:** Likely need separate API credentials/access
**Solution:** Contact Blast Motion to enable Consumer API access

**We're very close!** The infrastructure is 100% ready. We just need the right API credentials.

Let me know what you'd like to do next!
