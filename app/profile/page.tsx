'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneDisplay } from '@/lib/formatDate';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken, logout, isLoading: authLoading, refreshUserData, changePassword } = useAuth();
  const nationalIdInputRef = useRef<HTMLInputElement>(null);
  const utilityBillInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [uploading, setUploading] = useState<'national_id' | 'utility_bill' | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    street_address: '',
    area: '',
    bank_account_number: '',
    bank_name: '',
    bvn: '',
  });

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setFormData({
      phone: user.phone || '',
      street_address: user.street_address || '',
      area: user.area || '',
      bank_account_number: user.bank_account_number || '',
      bank_name: user.bank_name || '',
      bvn: user.bvn || '',
    });
  }, [user, router, authLoading]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });


      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }


      
      await refreshUserData();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      console.error('Save profile error:', err);
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: 'national_id' | 'utility_bill') => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setUploading(docType);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('document', file);
    formData.append('doc_type', docType);

    try {
      const response = await fetch(`${API_URL}/kyc/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(data.message);
      await refreshUserData();
      
      setTimeout(() => setUploadSuccess(''), 5000);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const getDocStatus = (url: string | undefined, status: string) => {
    if (!url) return { label: 'Not Uploaded', color: 'bg-slate-100 text-slate-600' };
    if (status === 'approved') return { label: 'Verified', color: 'bg-green-100 text-green-700' };
    if (status === 'rejected') return { label: 'Rejected', color: 'bg-red-100 text-red-700' };
    return { label: 'Pending Review', color: 'bg-amber-100 text-amber-700' };
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setPasswordSubmitting(true);
    
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      
      alert('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handlePasswordChange = () => {
    setShowPasswordModal(true);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const hasNationalId = !!user?.national_id_url;
  const hasUtilityBill = !!user?.utility_bill_url;
  const kycProgress = user?.kyc_status === 'approved' ? 100 : 
    ((hasNationalId ? 1 : 0) + (hasUtilityBill ? 1 : 0)) / 2 * 100;

  return (
    <div className="bg-background font-body text-on-surface">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-40 bg-slate-50/80 backdrop-blur-xl">
        <div className="flex justify-between items-center px-6 py-3 w-full">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tight text-sky-950 font-headline">MemberVault</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8 text-sm">
              <Link href="/dashboard" className="text-slate-500 hover:bg-slate-100 transition-colors px-3 py-1 rounded">Dashboard</Link>
              <Link href="/loans" className="text-slate-500 hover:bg-slate-100 transition-colors px-3 py-1 rounded">Loans</Link>
              <Link href="/contributions" className="text-slate-500 hover:bg-slate-100 transition-colors px-3 py-1 rounded">Contributions</Link>
              <Link href="/profile" className="text-sky-950 font-semibold">Profile</Link>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined">settings</span>
              </button>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                {user.full_name?.[0] || 'M'}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-200/20 h-px w-full"></div>
      </nav>

      {/* SideNavBar */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-slate-50 flex-col py-8 z-30">
        <div className="px-6 mb-10">
          <h1 className="text-lg font-black text-sky-950 font-headline uppercase tracking-widest">The Vault</h1>
          <p className="text-xs text-on-secondary-container font-medium">Club Member Portal</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 hover:pl-2 transition-all duration-300 rounded-lg">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-medium text-sm">Dashboard</span>
          </Link>
          <Link href="/loans" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 hover:pl-2 transition-all duration-300 rounded-lg">
            <span className="material-symbols-outlined">payments</span>
            <span className="font-medium text-sm">Loans</span>
          </Link>
          <Link href="/contributions" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200/50 hover:pl-2 transition-all duration-300 rounded-lg">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="font-medium text-sm">Contributions</span>
          </Link>
          <Link href="/profile" className="flex items-center gap-3 px-4 py-3 bg-sky-100/50 text-sky-950 border-r-4 border-sky-950 hover:pl-2 transition-all duration-300 rounded-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <span className="font-semibold text-sm">Profile</span>
          </Link>
        </nav>
        <div className="px-6 py-6 mt-auto">
          <Link href="/loans" className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-lg text-sm font-bold tracking-tight shadow-lg text-center block">
            Request Loan
          </Link>
        </div>
        <div className="px-4 border-t border-slate-200/50 pt-4 space-y-1">
          <button className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm w-full">
            <span className="material-symbols-outlined">help</span> Support
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-error hover:bg-error-container/20 rounded-lg transition-colors text-sm w-full">
            <span className="material-symbols-outlined">logout</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 pt-24 pb-12 px-6 lg:px-12">
        <header className="mb-12 max-w-5xl mx-auto">
          <h2 className="text-4xl font-extrabold font-headline tracking-tight text-primary mb-2">Member Identity & Verification</h2>
          <p className="text-on-surface-variant font-medium">Manage your personal information and KYC compliance status.</p>
        </header>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Information */}
          <section className="lg:col-span-7 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/15">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold font-headline text-sky-950">Contact Details</h3>
                  <p className="text-sm text-on-surface-variant">Update your primary contact methods.</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-primary font-bold text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span> Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Full Name</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="text"
                    value={user.full_name || ''}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Phone Number</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium focus:ring-2 focus:ring-primary/20 px-4 py-3"
                    type="text"
                    name="phone"
                    value={isEditing ? formData.phone : formatPhoneDisplay(user.phone || '')}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Email Address</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="email"
                    value={user.email || ''}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">State / LGA</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="text"
                    value={`${user.state || ''}, ${user.lga || ''}`}
                    readOnly
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Residential Address</label>
                  <textarea
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium focus:ring-2 focus:ring-primary/20 px-4 py-3"
                    name="street_address"
                    rows={3}
                    value={isEditing ? formData.street_address : user.street_address || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Member ID</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="text"
                    value={user.id?.slice(0, 8).toUpperCase() || 'SIS-000000'}
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/15">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold font-headline text-sky-950">Bank Details</h3>
                  <p className="text-sm text-on-surface-variant">Your registered bank account for loan disbursements.</p>
                </div>
                {isEditing && (
                  <span className="text-xs text-amber-600 font-medium">Editing</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Bank Name</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="text"
                    name="bank_name"
                    value={isEditing ? formData.bank_name : user.bank_name || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Account Number</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="text"
                    name="bank_account_number"
                    value={isEditing ? formData.bank_account_number : user.bank_account_number ? `****${user.bank_account_number.slice(-4)}` : ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-outline">Bank Verification Number (BVN)</label>
                  <input
                    className="w-full bg-surface-container-low border-0 rounded-lg text-on-surface font-medium px-4 py-3"
                    type="text"
                    name="bvn"
                    maxLength={11}
                    placeholder="Enter your 11-digit BVN"
                    value={isEditing ? formData.bvn : user.bvn || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  <p className="text-xs text-on-surface-variant mt-1">Required for loan eligibility verification</p>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/15">
              <h3 className="text-xl font-bold font-headline text-sky-950 mb-6">Security & Access</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">lock</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">Change Password</p>
                      <p className="text-xs text-on-surface-variant">Update your account credentials</p>
                    </div>
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    className="bg-surface-container-high px-4 py-2 rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors"
                  >
                    Update
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary-container">
                      <span className="material-symbols-outlined">security</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">Two-Factor Authentication</p>
                      <p className="text-xs text-on-surface-variant">Stronger security for your vault</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={twoFactorEnabled}
                      onChange={() => setTwoFactorEnabled(!twoFactorEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* KYC Document Vault */}
          <aside className="lg:col-span-5">
            <div className="bg-surface-container-low p-8 rounded-xl h-full border border-white/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <h3 className="text-xl font-bold font-headline text-sky-950">Document Vault</h3>
              </div>
              <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">Securely upload and manage your KYC documents for loan eligibility.</p>

              {uploadSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  {uploadSuccess}
                </div>
              )}

              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  {uploadError}
                </div>
              )}

              {/* National ID Section */}
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-surface-container-lowest rounded-lg border-l-4 border-primary shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">badge</span>
                      <div>
                        <span className="text-sm font-medium block">National ID</span>
                        <span className="text-xs text-on-surface-variant">NIN, Voter Card, Passport, or Driver's License</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${getDocStatus(user?.national_id_url, user?.kyc_status || '').color}`}>
                      {getDocStatus(user?.national_id_url, user?.kyc_status || '').label}
                    </span>
                  </div>
                  {user?.national_id_url ? (
                    <div className="flex items-center gap-2">
                      <a 
                        href={user.national_id_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Uploaded Document
                      </a>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={nationalIdInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => handleDocumentUpload(e, 'national_id')}
                      />
                      <button
                        onClick={() => nationalIdInputRef.current?.click()}
                        disabled={uploading === 'national_id'}
                        className="w-full py-2 px-4 border-2 border-dashed border-outline-variant/30 rounded-lg text-center bg-surface-container-low hover:bg-surface-container-high transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {uploading === 'national_id' ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">cloud_upload</span>
                            Upload National ID
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Utility Bill Section */}
                <div className="p-4 bg-surface-container-lowest rounded-lg border-l-4 border-primary shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary">receipt_long</span>
                      <div>
                        <span className="text-sm font-medium block">Utility Bill</span>
                        <span className="text-xs text-on-surface-variant">Electricity, water, or internet bill</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${getDocStatus(user?.utility_bill_url, user?.kyc_status || '').color}`}>
                      {getDocStatus(user?.utility_bill_url, user?.kyc_status || '').label}
                    </span>
                  </div>
                  {user?.utility_bill_url ? (
                    <div className="flex items-center gap-2">
                      <a 
                        href={user.utility_bill_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        View Uploaded Document
                      </a>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={utilityBillInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => handleDocumentUpload(e, 'utility_bill')}
                      />
                      <button
                        onClick={() => utilityBillInputRef.current?.click()}
                        disabled={uploading === 'utility_bill'}
                        className="w-full py-2 px-4 border-2 border-dashed border-outline-variant/30 rounded-lg text-center bg-surface-container-low hover:bg-surface-container-high transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        {uploading === 'utility_bill' ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">cloud_upload</span>
                            Upload Utility Bill
                          </span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* KYC Progress */}
              {user?.kyc_status && user.kyc_status !== 'approved' && (
                <div className="mt-6 pt-6 border-t border-outline-variant/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`material-symbols-outlined text-lg ${
                      user.kyc_status === 'rejected' ? 'text-red-500' : 
                      user.kyc_status === 'pending' ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      {user.kyc_status === 'rejected' ? 'cancel' : 
                       user.kyc_status === 'pending' ? 'hourglass_empty' : 'check_circle'}
                    </span>
                    <span className="text-sm font-medium">
                      {user.kyc_status === 'rejected' ? 'Verification Rejected' :
                       user.kyc_status === 'pending' ? 'Verification Pending' : ''}
                    </span>
                  </div>
                  {user.kyc_status === 'rejected' && user.kyc_rejection_reason && (
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {user.kyc_rejection_reason}
                    </p>
                  )}
                  {user.kyc_status === 'pending' && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Your documents are being reviewed. This usually takes 24-48 hours.
                    </p>
                  )}
                </div>
              )}

              {/* Accepted Documents */}
              <div className="mt-6 p-4 bg-surface-container-lowest rounded-lg">
                <h4 className="text-sm font-bold text-on-surface mb-3">Accepted Documents</h4>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    National ID Card (NIN)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    Bank Verification Number (BVN)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    Voter&apos;s Card
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    International Passport
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    Driver&apos;s License
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 z-50">
        <div className="flex justify-between items-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] font-bold uppercase">Home</span>
          </Link>
          <Link href="/loans" className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">payments</span>
            <span className="text-[10px] font-bold uppercase">Loans</span>
          </Link>
          <Link href="/contributions" className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span className="text-[10px] font-bold uppercase">Funds</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <span className="text-[10px] font-bold uppercase">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-sky-950/40 backdrop-blur-md" onClick={() => setShowPasswordModal(false)}></div>
          
          <div className="relative w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-sky-900 to-sky-800 px-8 py-6 text-white text-center relative">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">shield_person</span>
              </div>
              <h3 className="text-2xl font-black font-headline tracking-tight">Security Protocol</h3>
              <p className="text-sky-100/70 text-xs font-medium uppercase tracking-[0.2em] mt-1">Update Access Credentials</p>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePasswordUpdate} className="p-8 space-y-6">
              {passwordError && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded">
                   {passwordError}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Current Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">lock</span>
                    <input
                      required
                      type="password"
                      name="oldPassword"
                      value={passwordForm.oldPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-900/10 placeholder:text-slate-300 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Secure Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">password</span>
                    <input
                      required
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-900/10 placeholder:text-slate-300 transition-all"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">verified</span>
                    <input
                      required
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-900/10 placeholder:text-slate-300 transition-all"
                      placeholder="Match new password"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-sky-900 to-sky-700 text-white rounded-xl text-sm font-bold tracking-tight shadow-xl shadow-sky-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Encrypting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">security_update_good</span>
                      Update Access Key
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 opacity-50">
                <span className="material-symbols-outlined text-sm">lock_person</span>
                <span className="text-[10px] uppercase font-black tracking-widest">End-to-End Encryption Enabled</span>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
