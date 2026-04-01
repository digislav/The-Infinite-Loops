'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage('');
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/api/auth/callback?next=/reset-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for the reset link.');
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto mt-20 max-w-md rounded-lg border p-6">
      <h1 className="mb-4 text-2xl font-bold">Forgot Password</h1>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border p-2"
          required
        />

        <button type="submit" disabled={loading} className="w-full rounded border p-2">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {message && <p className="mt-4 text-green-600">{message}</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
