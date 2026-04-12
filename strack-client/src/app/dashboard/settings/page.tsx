'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import { useAppSelector } from '@/lib/hook';
import { Camera, Key, Shield, User } from 'lucide-react';
import { useState } from 'react';

const tabs = ['Profile', 'Security', 'Notifications', 'API Keys'] as const;
type Tab = (typeof tabs)[number];

const tabIcons: Record<Tab, React.ElementType> = {
  Profile: User,
  Security: Shield,
  Notifications: Camera,
  'API Keys': Key,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const { user } = useAppSelector((state) => state.user);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

  return (
    <main>
      <HeaderSearch
        headerText="Settings"
        headerDescription="Manage your account settings and preferences"
      />

      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        <aside className="lg:w-[240px] shrink-0">
          <nav className="border border-[#E1E4EA] rounded-xl bg-white overflow-hidden">
            {tabs.map((tab) => {
              const Icon = tabIcons[tab];
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-b border-[#E1E4EA] last:border-b-0 ${
                    activeTab === tab
                      ? 'bg-[#F7F9FC] text-[#0E121B] font-medium'
                      : 'text-[#525866] hover:bg-[#F7F9FC]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1">
          {activeTab === 'Profile' && (
            <section className="border border-[#E1E4EA] rounded-xl bg-white">
              <div className="p-5 border-b border-[#E1E4EA]">
                <h3 className="text-base font-semibold text-[#0E121B]">Profile Information</h3>
                <p className="text-sm text-[#525866]">Update your personal details</p>
              </div>

              <div className="p-5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-full bg-[#020C14] flex items-center justify-center text-white text-xl font-medium">
                    {(user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0E121B]">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-[#99A0AE]">{user?.email}</p>
                    <button className="text-xs text-[#020C14] font-medium mt-1 hover:underline">
                      Change photo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[600px]">
                  <CustomInput
                    id="settings-firstName"
                    label="First name"
                    value={firstName}
                    onChange={setFirstName}
                    placeholder="First name"
                  />
                  <CustomInput
                    id="settings-lastName"
                    label="Last name"
                    value={lastName}
                    onChange={setLastName}
                    placeholder="Last name"
                  />
                  <CustomInput
                    id="settings-email"
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    placeholder="Email"
                    type="email"
                  />
                  <CustomInput
                    id="settings-phone"
                    label="Phone number"
                    value={phone}
                    onChange={setPhone}
                    placeholder="Phone number"
                  />
                </div>

                <div className="mt-8">
                  <CustomButton text="Save Changes" className="!w-auto px-6" />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Security' && (
            <section className="border border-[#E1E4EA] rounded-xl bg-white">
              <div className="p-5 border-b border-[#E1E4EA]">
                <h3 className="text-base font-semibold text-[#0E121B]">Security Settings</h3>
                <p className="text-sm text-[#525866]">Manage your password and security preferences</p>
              </div>
              <div className="p-5 space-y-6">
                <div className="flex items-center justify-between p-4 border border-[#E1E4EA] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[#0E121B]">Password</p>
                    <p className="text-xs text-[#99A0AE]">Last changed: Never</p>
                  </div>
                  <CustomButton text="Change Password" className="!w-auto px-4 !h-9 text-sm" />
                </div>
                <div className="flex items-center justify-between p-4 border border-[#E1E4EA] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[#0E121B]">Two-factor authentication</p>
                    <p className="text-xs text-[#99A0AE]">Add an extra layer of security</p>
                  </div>
                  <CustomButton text="Enable" className="!w-auto px-4 !h-9 text-sm" />
                </div>
                <div className="flex items-center justify-between p-4 border border-[#E1E4EA] rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-[#0E121B]">Active Sessions</p>
                    <p className="text-xs text-[#99A0AE]">Manage your active sessions</p>
                  </div>
                  <CustomButton text="View Sessions" className="!w-auto px-4 !h-9 text-sm" />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'Notifications' && (
            <section className="border border-[#E1E4EA] rounded-xl bg-white">
              <div className="p-5 border-b border-[#E1E4EA]">
                <h3 className="text-base font-semibold text-[#0E121B]">Notification Preferences</h3>
                <p className="text-sm text-[#525866]">Choose how you want to be notified</p>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { label: 'Email notifications', desc: 'Receive email updates about your account' },
                  { label: 'Transaction alerts', desc: 'Get notified for every transaction' },
                  { label: 'Security alerts', desc: 'Login attempts and security changes' },
                  { label: 'Marketing emails', desc: 'Product updates and promotional content' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 border border-[#E1E4EA] rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0E121B]">{item.label}</p>
                      <p className="text-xs text-[#99A0AE]">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-9 h-5 bg-[#E1E4EA] peer-checked:bg-[#020C14] rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                    </label>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'API Keys' && (
            <section className="border border-[#E1E4EA] rounded-xl bg-white">
              <div className="p-5 border-b border-[#E1E4EA]">
                <h3 className="text-base font-semibold text-[#0E121B]">API Keys</h3>
                <p className="text-sm text-[#525866]">Manage your API keys for integration</p>
              </div>
              <div className="p-16 text-center">
                <Key className="w-10 h-10 text-[#E1E4EA] mx-auto mb-3" />
                <p className="text-sm font-medium text-[#0E121B]">No API keys yet</p>
                <p className="text-xs text-[#99A0AE] mt-1">
                  Complete your account verification to generate API keys
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
