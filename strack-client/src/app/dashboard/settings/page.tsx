'use client';

import HeaderSearch from '@/lib/components/HeaderSearch';
import ErrorState from '@/lib/components/ErrorState';
import CustomButton from '@/lib/components/CustomButton';
import CustomInput from '@/lib/components/CustomInput';
import { useAppDispatch, useAppSelector } from '@/lib/hook';
import { useResetDemo } from '@/lib/components/DemoBanner';
import { useSettings } from '@/lib/hooks/useSettings';
import { getDataSource } from '@/lib/data';
import { passwordFormError, passwordStrength } from '@/lib/data/passwordForm';
import type { NotificationPrefs } from '@/lib/data/types';
import { getErrorMessage, updateUser, type UpdateUserData } from '@/lib/features/user/thunkActions';
import { showToast } from '@/lib/utils/plainFunctions';
import { Eye, EyeOff, Key, Lock, Shield, User, Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const tabs = ['Profile', 'Security', 'Notifications', 'API Keys'] as const;
type Tab = (typeof tabs)[number];

const tabIcons: Record<Tab, React.ElementType> = {
  Profile: User,
  Security: Shield,
  Notifications: Bell,
  'API Keys': Key,
};

const NOTIFICATION_ITEMS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  { key: 'emailOnPayment', label: 'Email on payment', desc: 'Get an email whenever you receive a payment' },
  { key: 'emailOnPayout', label: 'Email on payout', desc: 'Get an email when a payout is made to your bank account' },
  { key: 'weeklySummary', label: 'Weekly summary', desc: 'A weekly email with your revenue and payouts' },
];

const Card = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
  <section className="border border-[#E1E4EA] rounded-xl bg-white">
    <div className="p-5 border-b border-[#E1E4EA]">
      <h3 className="text-base font-semibold text-[#0E121B]">{title}</h3>
      <p className="text-sm text-[#525866]">{desc}</p>
    </div>
    <div className="p-5">{children}</div>
  </section>
);

function ProfileSection() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.user.user);
  const saving = useAppSelector((s) => s.user.saving);
  const locked = user?.complianceStatus === 'pending_review' || user?.complianceStatus === 'approved';
  const business = user?.accountType === 'business';
  const initial = {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    businessName: user?.businessName ?? '',
    businessEmail: user?.businessEmail ?? '',
  };
  const [form, setForm] = useState(initial);
  const demoMode = useAppSelector((s) => s.auth.mode) === 'demo';
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const emailChanged = form.email.trim().toLowerCase() !== initial.email.toLowerCase();
  // The server asks for the password when the email changes; demo mode has none.
  const needsPassword = emailChanged && !demoMode;
  const set = (k: keyof typeof initial) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Keep the form in step with the stored profile once it has loaded or been saved.
  useEffect(() => {
    setForm(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async () => {
    if (submitting.current || locked) return;
    if (!user?._id) return setError('Your session has expired. Please log in again.');
    const data: UpdateUserData = {};
    const keys: (keyof typeof initial)[] = business
      ? ['firstName', 'lastName', 'email', 'phone', 'businessName', 'businessEmail']
      : ['firstName', 'lastName', 'email', 'phone'];
    const optional = ['businessName', 'businessEmail'];
    for (const k of keys) {
      const v = form[k].trim();
      if (v === initial[k]) continue; // only fields being submitted are validated
      if (!v) {
        if (optional.includes(k)) continue; // an emptied business field is dropped, not saved
        return setError('First name, last name, email and phone cannot be empty');
      }
      data[k] = v;
    }
    if (!Object.keys(data).length) return setError('Nothing to save');
    if (needsPassword) {
      if (!currentPassword) return setError('Enter your current password to change your email');
      data.currentPassword = currentPassword;
    }
    setError(null);
    submitting.current = true;
    try {
      const r = await dispatch(updateUser({ userId: user._id, data }));
      if (updateUser.fulfilled.match(r)) {
        setCurrentPassword('');
        showToast({ message: 'Saved', description: 'Your profile has been updated.' });
      }
      else setError(String(r.payload ?? 'Could not save your profile.'));
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Card title="Profile Information" desc="Update your personal details">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#020C14] flex items-center justify-center text-white text-xl font-medium">
          {(user?.firstName?.[0] || 'U') + (user?.lastName?.[0] || '')}
        </div>
        <div>
          <p className="text-sm font-medium text-[#0E121B]">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-[#99A0AE]">{user?.email}</p>
        </div>
      </div>
      {locked && (
        <p role="status" className="mb-5 max-w-[600px] rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Lock className="mr-1 inline h-4 w-4" />
          Your details are under review or approved, so they can no longer be edited here. Contact support if something needs to change.
        </p>
      )}
      <fieldset disabled={locked} className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[600px] disabled:opacity-60">
        <CustomInput id="settings-firstName" label="First name" value={form.firstName} onChange={set('firstName')} placeholder="First name" />
        <CustomInput id="settings-lastName" label="Last name" value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
        <CustomInput id="settings-email" label="Email" value={form.email} onChange={set('email')} placeholder="Email" type="email" />
        <CustomInput id="settings-phone" label="Phone number" value={form.phone} onChange={set('phone')} placeholder="Phone number" />
        {business && (
          <>
            <CustomInput id="settings-businessName" label="Business name" value={form.businessName} onChange={set('businessName')} placeholder="Business name" />
            <CustomInput id="settings-businessEmail" label="Business email" value={form.businessEmail} onChange={set('businessEmail')} placeholder="Business email" type="email" />
          </>
        )}
      </fieldset>
      {needsPassword && !locked && (
        <div className="mt-5 max-w-[300px]">
          <CustomInput id="settings-currentPassword" label="Current password (needed to change your email)" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Current password" />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-6">
        <CustomButton text="Save Changes" className="!w-auto px-6" onClick={save} isLoading={saving} disabled={saving || locked} />
      </div>
    </Card>
  );
}

function PasswordField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="grid w-full items-center gap-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={id === 'pw-current' ? 'current-password' : 'new-password'}
          className="w-full rounded-lg border border-[#E1E4EA] px-3 py-2 pr-10 text-sm focus:border-[#020C14] focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525866]"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SecuritySection({ demo }: { demo: boolean }) {
  const mode = useAppSelector((s) => s.auth.mode);
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const strength = passwordStrength(f.newPassword);
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || demo) return;
    const problem = passwordFormError(f);
    if (problem) return setError(problem);
    setError(null);
    submitting.current = true;
    setBusy(true);
    try {
      await getDataSource(mode).user.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword });
      setF({ currentPassword: '', newPassword: '', confirm: '' });
      showToast({ message: 'Password changed. Other devices have been signed out.', description: 'Other devices have been signed out.' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <Card title="Security Settings" desc="Change your password">
      {demo && (
        <p role="status" className="mb-5 max-w-[420px] rounded-lg border border-[#E1E4EA] bg-[#F7F9FC] p-3 text-sm text-[#525866]">
          Password change isn&apos;t available in demo mode.
        </p>
      )}
      <form onSubmit={submit} className="max-w-[420px] space-y-4">
        <fieldset disabled={demo || busy} className="space-y-4">
          <PasswordField id="pw-current" label="Current password" value={f.currentPassword} onChange={set('currentPassword')} />
          <PasswordField id="pw-new" label="New password" value={f.newPassword} onChange={set('newPassword')} />
          {f.newPassword && (
            <p className="text-xs text-[#525866]" aria-live="polite">
              Strength: <span className="font-medium">{strength.label}</span>. Use at least 8 characters; mixing upper and lower case, numbers and symbols makes it stronger.
            </p>
          )}
          <PasswordField id="pw-confirm" label="Confirm new password" value={f.confirm} onChange={set('confirm')} />
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <CustomButton text="Change password" type="submit" className="!w-auto px-6" isLoading={busy} disabled={demo || busy} />
      </form>
    </Card>
  );
}

function NotificationsSection() {
  const { settings, error, saving, update, refetch } = useSettings();
  const toggle = async (key: keyof NotificationPrefs) => {
    if (!settings || saving) return;
    const err = await update({ notifications: { [key]: !settings.notifications[key] } });
    showToast(err ? { message: 'Error', description: err } : { message: 'Saved', description: 'Notification preference updated.' });
  };
  return (
    <Card title="Notification Preferences" desc="Choose how you want to be notified. Changes save immediately.">
      {error && !settings && <ErrorState message={error} onRetry={refetch} className="mb-3 mt-0" />}
      {error && settings && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="space-y-4">
        {NOTIFICATION_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between p-4 border border-[#E1E4EA] rounded-lg">
            <div>
              <p className="text-sm font-medium text-[#0E121B]">{item.label}</p>
              <p className="text-xs text-[#99A0AE]">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                role="switch"
                aria-label={item.label}
                className="sr-only peer"
                checked={settings?.notifications[item.key] ?? false}
                disabled={!settings || saving}
                onChange={() => toggle(item.key)}
              />
              <div className="w-9 h-5 bg-[#E1E4EA] peer-checked:bg-[#020C14] peer-disabled:opacity-50 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}

// The theme setting stays in the data model, but there is no selector: the app has no dark styles yet.

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const demo = useAppSelector((state) => state.auth.mode) === 'demo';
  const { openReset, dialog: resetDialog } = useResetDemo();

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
          {demo && (
            <section className="mb-6 flex items-center justify-between rounded-xl border border-[#E1E4EA] bg-white p-4">
              <div>
                <p className="text-sm font-medium text-[#0E121B]">Demo data</p>
                <p className="text-xs text-[#99A0AE]">Restore the original sample data in this browser.</p>
              </div>
              <CustomButton text="Reset demo data" className="!w-auto px-4 !h-9 text-sm" onClick={openReset} />
            </section>
          )}
          {resetDialog}

          {activeTab === 'Profile' && <ProfileSection />}
          {activeTab === 'Security' && <SecuritySection demo={demo} />}
          {activeTab === 'Notifications' && <NotificationsSection />}

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
