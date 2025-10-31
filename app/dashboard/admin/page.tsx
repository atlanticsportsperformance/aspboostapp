'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AthleteViewTypesTab from '@/components/dashboard/admin/athlete-view-types-tab';
import ForcePlatesTab from '@/components/dashboard/admin/force-plates-tab';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<any>(null);

  // General Settings
  const [orgName, setOrgName] = useState('Atlantic Sports Performance');
  const [timezone, setTimezone] = useState('America/New_York');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  // Data & Privacy
  const [dataRetention, setDataRetention] = useState('forever');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
  }

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));

    setMessage('Settings saved successfully!');
    setLoading(false);

    setTimeout(() => setMessage(''), 3000);
  };

  // Main category tabs
  const [activeCategory, setActiveCategory] = useState<'connected' | 'coming-soon'>('connected');

  // Subtabs for each category
  const connectedTabs = [
    { id: 'athlete-view-types', label: 'Athlete View Types', icon: '🏃' },
    { id: 'force-plates', label: 'Force Plates', icon: '📊' },
  ];

  const comingSoonTabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'team', label: 'Team & Access', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'data', label: 'Data & Privacy', icon: '🔒' },
    { id: 'integration', label: 'Integrations', icon: '🔗' },
    { id: 'automation', label: 'Automation', icon: '🤖' },
    { id: 'billing', label: 'Billing', icon: '💳' },
  ];

  const tabs = activeCategory === 'connected' ? connectedTabs : comingSoonTabs;

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your organization preferences and configuration</p>
        </div>

        {/* Main Category Tabs */}
        <div className="mb-4">
          <div className="inline-flex rounded-lg bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => {
                setActiveCategory('connected');
                setActiveTab('athlete-view-types');
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeCategory === 'connected'
                  ? 'bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ✅ Active Settings
            </button>
            <button
              onClick={() => {
                setActiveCategory('coming-soon');
                setActiveTab('general');
              }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeCategory === 'coming-soon'
                  ? 'bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚧 Coming Soon
            </button>
          </div>
        </div>

        {/* Subtabs */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {/* Subtab Navigation */}
          <div className="border-b border-white/10 bg-white/5">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#9BDDFF] text-white bg-white/5'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 lg:p-8">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Date Format
                        </label>
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <h4 className="text-sm font-semibold text-white mb-3">Display Preferences</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">Show percentile rankings by default</span>
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">Auto-sync VALD data daily</span>
                      <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Athlete View Types */}
            {activeTab === 'athlete-view-types' && <AthleteViewTypesTab />}

            {/* Force Plates */}
            {activeTab === 'force-plates' && <ForcePlatesTab />}

            {/* Team & Access Control */}
            {activeTab === 'team' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Team Members & Roles</h3>

                  <div className="mb-6">
                    <button className="px-4 py-2 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all">
                      + Invite Team Member
                    </button>
                  </div>

                  {/* Role Permissions Matrix */}
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/10">
                      <h4 className="text-white font-medium">Permission Levels</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-4 gap-4 text-xs text-gray-400 font-medium pb-2 border-b border-white/10">
                        <div>Permission</div>
                        <div className="text-center">Coach</div>
                        <div className="text-center">Admin</div>
                        <div className="text-center">Owner</div>
                      </div>

                      {[
                        { name: 'View Athletes', coach: true, admin: true, owner: true },
                        { name: 'Edit Athletes', coach: true, admin: true, owner: true },
                        { name: 'Delete Athletes', coach: false, admin: true, owner: true },
                        { name: 'Manage Staff', coach: false, admin: true, owner: true },
                        { name: 'View Reports', coach: true, admin: true, owner: true },
                        { name: 'Billing Access', coach: false, admin: false, owner: true },
                        { name: 'VALD Sync', coach: false, admin: true, owner: true },
                      ].map((perm, i) => (
                        <div key={i} className="grid grid-cols-4 gap-4 text-sm py-2">
                          <div className="text-white">{perm.name}</div>
                          <div className="text-center">
                            {perm.coach ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </div>
                          <div className="text-center">
                            {perm.admin ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </div>
                          <div className="text-center">
                            {perm.owner ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Session Management */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Security Settings</h4>
                    <div className="space-y-3">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm">Session Timeout</span>
                          <select className="px-3 py-1.5 bg-white/10 border border-white/10 rounded text-white text-sm">
                            <option>30 minutes</option>
                            <option>1 hour</option>
                            <option>4 hours</option>
                            <option>24 hours</option>
                            <option>Never</option>
                          </select>
                        </div>
                        <p className="text-xs text-gray-400">Automatically log out inactive users</p>
                      </div>

                      <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                          <p className="text-xs text-gray-400 mt-1">Require 2FA for all admin users</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5 rounded" />
                      </label>

                      <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">IP Whitelist</p>
                          <p className="text-xs text-gray-400 mt-1">Restrict access to specific IP addresses</p>
                        </div>
                        <input type="checkbox" className="w-5 h-5 rounded" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">Email Notifications</p>
                        <p className="text-xs text-gray-400 mt-1">Receive important updates via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">Workout Reminders</p>
                        <p className="text-xs text-gray-400 mt-1">Notify athletes before scheduled workouts</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={workoutReminders}
                        onChange={(e) => setWorkoutReminders(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">Weekly Performance Reports</p>
                        <p className="text-xs text-gray-400 mt-1">Get weekly summaries of athlete progress</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={weeklyReports}
                        onChange={(e) => setWeeklyReports(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Branding */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">White Label Branding</h3>

                  {/* Logo Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3">
                        Organization Logo
                      </label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-[#9BDDFF]/50 transition-colors cursor-pointer">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] rounded-lg mx-auto mb-3 flex items-center justify-center">
                          <span className="text-black font-bold text-3xl">A</span>
                        </div>
                        <p className="text-white text-sm mb-1">Click to upload logo</p>
                        <p className="text-gray-400 text-xs">PNG, JPG up to 5MB</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3">
                        Favicon
                      </label>
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-[#9BDDFF]/50 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] rounded mx-auto mb-3 flex items-center justify-center">
                          <span className="text-black font-bold text-lg">A</span>
                        </div>
                        <p className="text-white text-sm mb-1">Upload favicon</p>
                        <p className="text-gray-400 text-xs">ICO, PNG 32x32px</p>
                      </div>
                    </div>
                  </div>

                  {/* Brand Colors */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Brand Colors</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: 'Primary', color: '#9BDDFF' },
                        { name: 'Secondary', color: '#7BC5F0' },
                        { name: 'Accent', color: '#B0E5FF' },
                        { name: 'Background', color: '#0A0A0A' },
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-10 h-10 rounded-lg border border-white/20"
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <div>
                              <p className="text-white text-sm font-medium">{item.name}</p>
                              <p className="text-gray-400 text-xs font-mono">{item.color}</p>
                            </div>
                          </div>
                          <button className="w-full px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors">
                            Change
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Domain */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Custom Domain</h4>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="app.yourdomain.com"
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                        />
                        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                          Verify
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
                        Point your domain's DNS to: <span className="text-white font-mono">cname.aspboost.com</span>
                      </p>
                    </div>
                  </div>

                  {/* Email Branding */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Email Templates</h4>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-white">Use Custom Email Footer</p>
                          <p className="text-xs text-gray-400 mt-1">Include your branding in notification emails</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                      </label>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Email From Name
                        </label>
                        <input
                          type="text"
                          defaultValue="Atlantic Sports Performance"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data & Privacy */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Data & Privacy</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Data Retention Period
                      </label>
                      <select
                        value={dataRetention}
                        onChange={(e) => setDataRetention(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#9BDDFF]"
                      >
                        <option value="forever">Keep Forever</option>
                        <option value="5years">5 Years</option>
                        <option value="3years">3 Years</option>
                        <option value="1year">1 Year</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        How long to keep deleted athlete and workout data
                      </p>
                    </div>

                    <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">Anonymous Analytics</p>
                        <p className="text-xs text-gray-400 mt-1">Help improve the platform with usage data</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={analyticsEnabled}
                        onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <h4 className="text-sm font-semibold text-white mb-3">Data Export</h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Download all your organization's data in CSV or JSON format
                  </p>
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Export All Data
                  </button>
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integration' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Third-Party Integrations</h3>

                  <div className="space-y-4">
                    {/* VALD Integration */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#9BDDFF] to-[#7BC5F0] rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-black font-bold">V</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">VALD Performance</h4>
                            <p className="text-sm text-gray-400 mt-1">Sync force plate test data automatically</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
                                Connected
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                          Disconnect
                        </button>
                      </div>
                      <div className="space-y-3 pl-16">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">API Key</label>
                          <input
                            type="password"
                            defaultValue="••••••••••••••••"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Organization ID</label>
                          <input
                            type="text"
                            placeholder="vald-org-123456"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                          <span className="text-xs text-gray-400">Auto-sync daily at 6:00 AM</span>
                        </label>
                      </div>
                    </div>

                    {/* Blast Motion */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-400 font-bold text-2xl">⚾</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Blast Motion</h4>
                            <p className="text-sm text-gray-400 mt-1">Import swing metrics and bat speed data</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">
                                Not Connected
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg text-sm font-medium transition-colors">
                          Connect
                        </button>
                      </div>
                      <div className="space-y-3 pl-16">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">API Key</label>
                          <input
                            type="password"
                            placeholder="Enter Blast Motion API key"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Team ID</label>
                          <input
                            type="text"
                            placeholder="blast-team-id"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* TrackMan */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-red-400 font-bold text-2xl">📡</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">TrackMan</h4>
                            <p className="text-sm text-gray-400 mt-1">Sync pitch tracking and hitting data</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">
                                Not Connected
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg text-sm font-medium transition-colors">
                          Connect
                        </button>
                      </div>
                      <div className="space-y-3 pl-16">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Username</label>
                          <input
                            type="text"
                            placeholder="TrackMan username"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Password</label>
                          <input
                            type="password"
                            placeholder="TrackMan password"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Organization</label>
                          <input
                            type="text"
                            placeholder="trackman-org-id"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rapsodo */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-400 font-bold text-2xl">⚾</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Rapsodo</h4>
                            <p className="text-sm text-gray-400 mt-1">Import pitching and hitting analytics</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">
                                Not Connected
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-[#9BDDFF] hover:bg-[#7BC5F0] text-black rounded-lg text-sm font-medium transition-colors">
                          Connect
                        </button>
                      </div>
                      <div className="space-y-3 pl-16">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">API Key</label>
                          <input
                            type="password"
                            placeholder="Rapsodo API key"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm placeholder-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Placeholder Integrations */}
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg opacity-60">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-2xl">📧</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">Email Service (SendGrid / Mailgun)</h4>
                            <p className="text-sm text-gray-400 mt-1">Send automated emails to athletes</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">
                                Coming Soon
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg opacity-60">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-2xl">💬</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">SMS Service (Twilio)</h4>
                            <p className="text-sm text-gray-400 mt-1">Send text message reminders</p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs">
                                Coming Soon
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Automation */}
            {activeTab === 'automation' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Workflow Automation</h3>

                  {/* Automated Actions */}
                  <div className="space-y-4 mb-6">
                    <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-medium mb-1">Welcome New Athletes</h4>
                          <p className="text-sm text-gray-400">Send onboarding email when athlete is created</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9BDDFF]"></div>
                        </label>
                      </div>
                      <div className="pl-4 border-l-2 border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Send welcome email
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Create initial assessment task
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Assign baseline testing plan
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-medium mb-1">Workout Reminders</h4>
                          <p className="text-sm text-gray-400">Notify athletes 24 hours before scheduled workout</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9BDDFF]"></div>
                        </label>
                      </div>
                      <div className="pl-4 border-l-2 border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Check for upcoming workouts
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Send reminder email
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Optional: Send SMS reminder
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-medium mb-1">Auto-Archive Inactive Athletes</h4>
                          <p className="text-sm text-gray-400">Mark athletes inactive after 90 days of no activity</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9BDDFF]"></div>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-400">Archive after</label>
                          <select className="px-2 py-1 bg-white/10 border border-white/10 rounded text-white text-xs">
                            <option>30 days</option>
                            <option>60 days</option>
                            <option selected>90 days</option>
                            <option>180 days</option>
                          </select>
                          <label className="text-xs text-gray-400">of inactivity</label>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-medium mb-1">Weekly Performance Reports</h4>
                          <p className="text-sm text-gray-400">Send coaches a summary every Monday at 8 AM</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9BDDFF]"></div>
                        </label>
                      </div>
                      <div className="pl-4 border-l-2 border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Workout completion stats
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> VALD test improvements
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="text-[#9BDDFF]">→</span> Athlete attendance trends
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Create Custom Automation */}
                  <div className="p-6 bg-gradient-to-br from-[#9BDDFF]/5 to-[#7BC5F0]/5 border border-[#9BDDFF]/20 rounded-xl text-center">
                    <div className="text-4xl mb-3">🤖</div>
                    <h4 className="text-white font-semibold mb-2">Custom Automations</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Create advanced workflows with custom triggers and actions
                    </p>
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                      Create Custom Workflow
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Billing */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Billing & Subscription</h3>

                  {/* Current Plan */}
                  <div className="p-6 bg-gradient-to-br from-[#9BDDFF]/10 to-[#7BC5F0]/10 border border-[#9BDDFF]/20 rounded-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-white font-semibold text-lg">Professional Plan</h4>
                        <p className="text-gray-400 text-sm mt-1">For performance training facilities</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">$299</p>
                        <p className="text-sm text-gray-400">per month</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Unlimited Athletes
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        VALD Integration
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Priority Support
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Change Plan
                      </button>
                      <button className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm transition-colors">
                        Cancel Subscription
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Payment Method</h4>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">VISA</span>
                          </div>
                          <div>
                            <p className="text-white text-sm">•••• •••• •••• 4242</p>
                            <p className="text-gray-400 text-xs">Expires 12/25</p>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                          Update
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Billing History */}
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Recent Invoices</h4>
                    <div className="space-y-2">
                      {[
                        { date: 'Dec 1, 2024', amount: '$299.00', status: 'Paid' },
                        { date: 'Nov 1, 2024', amount: '$299.00', status: 'Paid' },
                        { date: 'Oct 1, 2024', amount: '$299.00', status: 'Paid' },
                      ].map((invoice, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">📄</div>
                            <div>
                              <p className="text-white text-sm">{invoice.date}</p>
                              <p className="text-gray-400 text-xs">{invoice.amount}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">
                              {invoice.status}
                            </span>
                            <button className="text-[#9BDDFF] text-sm hover:underline">
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="mt-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
                {message}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-br from-[#9BDDFF] via-[#B0E5FF] to-[#7BC5F0] hover:from-[#7BC5F0] hover:to-[#5AB3E8] shadow-lg shadow-[#9BDDFF]/20 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
