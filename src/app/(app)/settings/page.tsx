export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences.</p>
      </div>

      {/* Account Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Account</h2>
        <div className="border rounded-lg divide-y">
          {/* Email */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Email Address</p>
              <p className="text-sm text-muted-foreground mt-1">Update your email address</p>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">Change</button>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-sm text-muted-foreground mt-1">Update your password</p>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">Change</button>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Preferences</h2>
        <div className="border rounded-lg divide-y">
          {/* Notifications */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your notification preferences
              </p>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">Manage</button>
          </div>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Delete Account</h2>
        <div className="border border-red-200 rounded-lg divide-y divide-red-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground mt-1">
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
