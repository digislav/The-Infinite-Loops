import { createClient } from '@/lib/supabase/server';
import { UpdateEmailDialog } from '@/components/settings/UpdateEmailDialog';
import { UpdatePasswordDialog } from '@/components/settings/UpdatePasswordDialog';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentEmail = user?.email || 'Loading...';
  return (
    <div className="mx-auto max-w-2xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-foreground text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences.</p>
      </div>

      {/* Account Section */}
      <div className="mb-6">
        <h2 className="text-foreground mb-4 text-xl font-semibold">Account</h2>
        <div className="divide-y rounded-lg border">
          {/* Email */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-foreground text-sm font-medium">Email Address</p>
              <p className="text-muted-foreground mt-1 text-sm">Update your email address</p>
            </div>
            <UpdateEmailDialog currentEmail={currentEmail} />
          </div>

          {/* Password */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-foreground text-sm font-medium">Password</p>
              <p className="text-muted-foreground mt-1 text-sm">Update your password</p>
            </div>
            <UpdatePasswordDialog currentEmail={currentEmail} />
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-6">
        <h2 className="text-foreground mb-4 text-xl font-semibold">Preferences</h2>
        <div className="divide-y rounded-lg border">
          {/* Notifications */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-foreground text-sm font-medium">Notifications</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage your notification preferences
              </p>
            </div>
            <button className="text-primary text-sm font-medium hover:underline">Manage</button>
          </div>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mb-6">
        <h2 className="mb-4 text-xl font-semibold text-red-600">Delete Account</h2>
        <div className="divide-y divide-red-200 rounded-lg border border-red-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-muted-foreground mt-1 text-sm">
                Permanently delete your account and all your data. This action cannot be undone.
              </p>
            </div>
            <button className="text-sm font-medium text-red-600 hover:underline">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
