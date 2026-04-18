'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, googleLogin, logout, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        router.push('/dashboard');
      } else {
        const result = await register({
          full_name: fullName,
          email,
          password,
          phone,
          state: '',
          lga: '',
          street_address: address,
        });
        
        if (result.requiresVerification) {
          setShowVerificationSuccess(true);
          setVerificationEmail(email);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setEmail('');
    setPassword('');
  };

  return (
    <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl shadow-primary/5 min-h-[700px] mx-auto my-8">
      {/* Left Panel - Branding */}
      <section className="hidden md:flex flex-col justify-between p-12 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-fixed blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary-container blur-[120px]"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary-fixed rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-surface-container-lowest">MemberVault</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-surface-container-lowest leading-tight">
              Secure Wealth, <br />Collective Growth.
            </h1>
            <p className="text-primary-fixed/80 text-lg leading-relaxed max-w-md">
              Join SIS Club's premier mutual fund ecosystem. We empower members through shared Naira (₦) contributions and accessible credit.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 bg-primary-container/30 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary-fixed mb-4">How it Works</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-primary-fixed/20 rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">payments</span>
              </div>
              <p className="text-[10px] font-semibold text-surface-container-lowest uppercase tracking-tighter">Contribute</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-primary-fixed/20 rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">trending_up</span>
              </div>
              <p className="text-[10px] font-semibold text-surface-container-lowest uppercase tracking-tighter">Appreciate</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-primary-fixed/20 rounded-full flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">account_balance_wallet</span>
              </div>
              <p className="text-[10px] font-semibold text-surface-container-lowest uppercase tracking-tighter">Borrow</p>
            </div>
          </div>
          <div className="mt-6">
            <img 
              alt="Financial Data Visualization" 
              className="w-full h-32 object-cover rounded-lg opacity-80 mix-blend-screen" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZeMFiRAWUBqqSn3xMgJE46DeDvDO6bkezhQRjmot0246shIrDyP-2dgr0I3QG5BB93egp-bKSNtmnmmK0W0MehxwOSpt5SCRvmfQJxkeSAqQTHMFBgRfKCgsb2UJCeHwL1MdmkB07m-LeFqwq5lUSMzaFeXBMSi9o0SiYEpvyjYrSi-osxA8u7WIIeohvk5ENZG-ZWDAIOcGhnCFkYysxvWYU-KNEcib65rMovfH8n9k8YJppRYqZWinE7O2nxqkUFgmuMpT45Jw"
            />
          </div>
        </div>
      </section>

      {/* Right Panel - Login Form */}
      <section className="flex flex-col justify-center p-8 md:p-16 bg-surface-container-lowest">
        <div className="w-full max-w-sm mx-auto">
          {user ? (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-4xl">check_circle</span>
              </div>
              <h2 className="text-2xl font-extrabold text-primary mb-2">Welcome back!</h2>
              <p className="text-on-surface-variant mb-6">You're logged in as {user.full_name}</p>
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full py-4 bg-gradient-to-r from-primary to-primary-container text-surface-container-lowest font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Go to Dashboard
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-surface-container-low text-on-surface font-semibold rounded-lg hover:bg-surface-container-high transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-primary mb-2">
                  {isLogin ? 'Welcome back' : 'Create Account'}
                </h2>
                <p className="text-on-surface-variant font-medium">
                  {isLogin ? 'Access your SIS Club member portal' : 'Join the SIS Club community'}
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex p-1 bg-surface-container-low rounded-lg mb-8">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    isLogin ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                    !isLogin ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              {showVerificationSuccess && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-green-600">mark_email_read</span>
                    <div>
                      <p className="font-semibold text-green-800">Check your email!</p>
                      <p className="text-green-700 mt-1">
                        We've sent a verification link to <strong>{verificationEmail}</strong>. 
                        Please click the link to verify your account before logging in.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="full_name">
                      Full Name
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-outline text-lg group-focus-within:text-primary transition-colors">person</span>
                      </div>
                      <input
                        className="block w-full pl-10 pr-4 py-3 bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-lg text-on-surface placeholder-outline/50 transition-all font-medium"
                        id="full_name"
                        name="full_name"
                        type="text"
                        placeholder="Chiroma Odionyenma"
                        required={!isLogin}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline text-lg group-focus-within:text-primary transition-colors">alternate_email</span>
                    </div>
                    <input
                      className="block w-full pl-10 pr-4 py-3 bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-lg text-on-surface placeholder-outline/50 transition-all font-medium"
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="phone">
                      Phone Number
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-outline text-lg group-focus-within:text-primary transition-colors">phone</span>
                      </div>
                      <input
                        className="block w-full pl-10 pr-4 py-3 bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-lg text-on-surface placeholder-outline/50 transition-all font-medium"
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="08012345678"
                        required={!isLogin}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="address">
                      Home Address
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="material-symbols-outlined text-outline text-lg group-focus-within:text-primary transition-colors">home</span>
                      </div>
                      <input
                        className="block w-full pl-10 pr-4 py-3 bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-lg text-on-surface placeholder-outline/50 transition-all font-medium"
                        id="address"
                        name="address"
                        type="text"
                        placeholder="24 Adeola Adeku Street, Victoria Island, Lagos"
                        required={!isLogin}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1" htmlFor="password">
                      Password
                    </label>
                    {isLogin && (
                      <a className="text-xs font-bold text-primary-container hover:underline" href="#">
                        Forgot?
                      </a>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-outline text-lg group-focus-within:text-primary transition-colors">lock</span>
                    </div>
                    <input
                      className="block w-full pl-10 pr-10 py-3 bg-surface-container-low border-transparent focus:border-primary focus:ring-0 rounded-lg text-on-surface placeholder-outline/50 transition-all font-medium"
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
                      required
                      minLength={isLogin ? 1 : 8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-surface-container-lowest font-bold rounded-lg shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Enter MemberVault
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-outline-variant/30 text-center">
                <p className="text-sm text-on-surface-variant mb-4">Or continue with</p>
                <div className="flex justify-center">
                  <button 
                    type="button"
                    onClick={async () => {
                      setError('');
                      setLoading(true);
                      try {
                        await googleLogin();
                        router.push('/dashboard');
                      } catch (err: any) {
                        setError(err.message || 'Google login failed');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="flex items-center gap-3 px-6 py-3 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-medium text-on-surface">Continue with Google</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <footer className="mt-auto pt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
          © 2024 SIS CLUB ORGANIZATION • SECURE ACCESS
        </footer>
      </section>
    </main>
  );
}
