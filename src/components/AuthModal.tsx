import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthError } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup' | 'forgot-password';
}

export function AuthModal({ isOpen, onClose, mode: initialMode }: AuthModalProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Autofocus email input when modal opens
  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isOpen]);

  // Password strength checker
  useEffect(() => {
    if (mode === 'signup' && password) {
      const hasLength = password.length >= 8;
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*]/.test(password);

      if (hasLength && hasUpper && hasLower && hasNumber && hasSpecial) {
        setPasswordStrength('strong');
      } else if (hasLength && (hasUpper || hasLower) && hasNumber) {
        setPasswordStrength('medium');
      } else {
        setPasswordStrength('weak');
      }
    } else {
      setPasswordStrength(null);
    }
  }, [password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Client-side validation
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setIsEmailValid(false);
      setLoading(false);
      return;
    }
    setIsEmailValid(true);

    if (mode !== 'forgot-password' && password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'forgot-password') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) throw resetError;
        setResetEmailSent(true);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) throw signUpError;
        onClose();
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
        onClose();
      }
    } catch (err: unknown) {
      const error = err as AuthError;
      setError(
        error.message.includes('Invalid login credentials')
          ? 'Invalid email or password'
          : error.message.includes('Email not confirmed')
          ? 'Please confirm your email before logging in'
          : error.message.includes('User already registered')
          ? 'This email is already registered'
          : error.message.includes('rate limit')
          ? 'Too many requests, please try again later'
          : 'Something went wrong, please try again'
      );
      console.error('AuthModal error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'forgot-password') => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setResetEmailSent(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsEmailValid(true);
    setPasswordStrength(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl p-8 w-full max-w-md relative shadow-2xl transform transition-all duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 id="auth-modal-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          {mode === 'login' ? 'Log In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
        </h2>

        {error && (
          <div
            className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg flex items-center space-x-2 animate-shake"
            role="alert"
            id="error-message"
          >
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'forgot-password' && resetEmailSent ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6" />
              <span>Password reset instructions have been sent to your email.</span>
            </div>
            <button
              onClick={() => switchMode('login')}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsEmailValid(true);
                }}
                className={`peer w-full px-4 py-3 pl-12 rounded-lg border-2 ${
                  isEmailValid
                    ? 'border-gray-300 dark:border-gray-700'
                    : 'border-red-500 dark:border-red-500 animate-shake'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all duration-200`}
                placeholder="Enter your email"
                required
                aria-required="true"
                aria-invalid={!isEmailValid}
                aria-describedby={error && !isEmailValid ? 'error-message' : undefined}
                ref={emailInputRef}
              />
              <label
                htmlFor="email"
                className="absolute left-4 top-0 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-sm peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 bg-white px-1 z-10"
              >
                Email
              </label>
              <Mail className="absolute bg-white left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400" />
            </div>

            {mode !== 'forgot-password' && (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer w-full px-4 py-3 pl-12 pr-12 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                  aria-required="true"
                  aria-describedby={error && password.length < 6 ? 'error-message' : undefined}
                />
                <label
                  htmlFor="password"
                  className="absolute left-4 top-0 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-sm peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 bg-white px-1 z-10"
                >
                  Password
                </label>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="peer w-full px-4 py-3 pl-12 pr-12 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm your password"
                    required
                    aria-required="true"
                    aria-describedby={error && password !== confirmPassword ? 'error-message' : undefined}
                  />
                  <label
                    htmlFor="confirmPassword"
                    className="absolute left-4 top-0 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 transition-all duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-sm peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 bg-white dark:bg-gray-800 px-1 z-10"
                  >
                    Confirm Password
                  </label>
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordStrength && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Password strength:</span>
                    <div className="flex space-x-1">
                      <div
                        className={`h-2 w-8 rounded-full ${
                          passwordStrength === 'weak'
                            ? 'bg-red-500'
                            : passwordStrength === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <div
                        className={`h-2 w-8 rounded-full ${
                          passwordStrength === 'medium' || passwordStrength === 'strong'
                            ? 'bg-yellow-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                      <div
                        className={`h-2 w-8 rounded-full ${
                          passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    </div>
                    <span
                      className={`capitalize ${
                        passwordStrength === 'weak'
                          ? 'text-red-500'
                          : passwordStrength === 'medium'
                          ? 'text-yellow-500'
                          : 'text-green-500'
                      }`}
                    >
                      {passwordStrength}
                    </span>
                  </div>
                )}
              </>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === 'login' ? (
                'Log In'
              ) : mode === 'signup' ? (
                'Sign Up'
              ) : (
                'Reset Password'
              )}
            </button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              ) : mode === 'signup' ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium"
                  >
                    Log in
                  </button>
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}