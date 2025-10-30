# How to Get Your Blast Motion API Credentials

## What You Need

To complete the Blast Motion integration, you need **3 pieces of information**:

1. **API Username** - Provided by Blast Motion for API access
2. **API Password** - Provided by Blast Motion for API access
3. **Academy ID** (optional) - Your organization's ID in Blast Connect

---

## Where to Find Them

### **Option 1: Check Your Email**

Search your email for messages from Blast Motion containing:
- "API credentials"
- "Consumer API"
- "API access"
- "Blast Connect API"

The email should contain your username and password.

---

### **Option 2: Check Your Blast Connect Account**

1. Log into Blast Connect: https://connect.blastmotion.com
2. Go to **Settings** or **Account**
3. Look for **API Access** or **Developer** section
4. Your credentials may be listed there

---

### **Option 3: Contact Blast Motion Support**

If you can't find your credentials, contact Blast Motion:

**Email:** support@blastmotion.com

**What to Say:**
```
Subject: API Credentials Request for Atlantic Sports Performance

Hi Blast Motion Support,

We are integrating the Blast Connect Consumer API into our athlete
management platform and need our API credentials.

Organization: Atlantic Sports Performance
Account Email: [your Blast Connect login email]

Please provide:
- API Username
- API Password
- Academy ID (if applicable)

Thank you!
```

---

### **Option 4: Check with Your Blast Motion Account Rep**

If you have a dedicated Blast Motion account representative:
- Contact them directly
- Ask for "Consumer API credentials"
- Mention you're building an integration

---

## How to Know If You Have API Access

**You have API access if:**
- ✅ You pay for Blast Connect subscription (not just the app)
- ✅ You've requested/purchased API access from Blast
- ✅ You have multiple athletes using Blast sensors regularly
- ✅ You're an organization/academy (not individual athlete)

**You might need to request API access if:**
- ❌ You only use the Blast Baseball/Softball mobile app
- ❌ You're an individual athlete/coach
- ❌ You've never heard of "Consumer API"

---

## What the Credentials Look Like

**Username:**
- Usually your organization name or email
- Example: `atlanticsportsperformance` or `asp@email.com`

**Password:**
- Random string or organization-specific password
- Example: `Abc123XYZ!` or `MySecurePass2025`

**Academy ID:**
- Usually a number (e.g., `3761`)
- OR a UUID (e.g., `12345678-1234-1234-1234-123456789abc`)

---

## Once You Have Them

1. **Update `.env.local`:**
   ```
   BLAST_MOTION_USERNAME=your_real_username
   BLAST_MOTION_PASSWORD=your_real_password
   BLAST_MOTION_ACADEMY_ID=your_academy_id
   ```

2. **Test the connection:**
   ```bash
   npx tsx scripts/test-blast-motion-connection.ts
   ```

3. **If it works, you'll see:**
   ```
   ✅ Connection: Working
   ✅ Found X players
   ✅ Found Y swings
   ```

4. **Then deploy the database:**
   - Open Supabase SQL Editor
   - Run `scripts/create-blast-motion-schema.sql`
   - Verify tables created

5. **Move to Phase 2:**
   - Build sync endpoints
   - Create admin UI
   - Link athletes
   - Start syncing data!

---

## Troubleshooting

### **"I can log into Blast Connect but API doesn't work"**
- Blast Connect login ≠ API credentials
- They are separate authentication systems
- You need to specifically request API access

### **"I don't know my Academy ID"**
- It's optional for most API calls
- You can usually leave it blank
- Test without it first

### **"Connection still fails with real credentials"**
- Verify username/password are correct (no typos)
- Check if credentials have expired
- Ensure your IP isn't blocked
- Contact Blast support

### **"Do I need to pay extra for API access?"**
- Depends on your Blast Connect subscription
- Some plans include API access
- Others require upgrade or add-on
- Check with Blast Motion sales/support

---

## Alternative: Demo/Test Account

If you want to test the integration without real data:

**We can:**
1. Create mock data generators
2. Build the UI with fake swings
3. Test the full workflow
4. Swap in real API later

**Benefits:**
- Continue development immediately
- See how it will work
- Test UI/UX
- No waiting for credentials

**Downside:**
- Won't sync real athlete data
- Can't verify API integration works

---

## Need Help?

If you're stuck or unsure, let me know:
- Whether you have a Blast Connect subscription
- What your use case is (academy, team, individual)
- If you've used Blast's API before

I can help you figure out the best path forward!

---

## Summary

**What you gave me:** `atlanticsportsperformance` / `atlanticsportsperformance`
- ❌ These are for viewing the API **documentation**
- ❌ They won't work for actual API calls

**What you need:** Your organization's actual API credentials
- ✅ Provided by Blast Motion when you sign up for API access
- ✅ Different from your Blast Connect login
- ✅ Required to make API requests

**Next step:** Find or request your real credentials!
