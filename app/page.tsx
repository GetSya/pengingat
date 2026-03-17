'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Plus, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  LogOut, 
  User as UserIcon,
  Clock,
  AlertCircle,
  Menu,
  X,
  Search,
  Filter,
  ChevronRight,
  MoreVertical,
  Mail,
  Layers,
  Trash2,
  Edit2
} from 'lucide-react';
import { format, addDays, addMonths, addYears, parseISO, isAfter, isBefore } from 'date-fns';

interface User {
  user_id: string;
  username: string;
  nama_lengkap: string;
}

interface JTData {
  id: string;
  email: string;
  sumber: string;
  jatuh_tempo: string;
  jam: string;
  user_id: string;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jtData, setJtData] = useState<JTData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'profile'>('dashboard');
  const [editingItem, setEditingItem] = useState<JTData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Login Form State
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Profile Form State
  const [profileData, setProfileData] = useState({
    nama_lengkap: '',
    password: '',
    telegram_id: '',
  });

  // Add JT Form State
  const [formData, setFormData] = useState({
    email: '',
    sumber: '',
    user_id: '',
    dateType: 'flexible',
    amount: '1',
    unit: 'days',
    jatuh_tempo: format(new Date(), 'yyyy-MM-dd'),
    jam: '',
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setProfileData({
        nama_lengkap: user.nama_lengkap || '',
        password: '', // Don't pre-fill password for security
        telegram_id: user.telegram_id || '',
      });
      setIsLoggedIn(true);
      fetchDashboardData(user.user_id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/jt');
      const data = await res.json();
      if (Array.isArray(data)) {
        setJtData(data.filter(item => item.user_id === userId));
      }
    } catch (err) {
      console.error('Failed to fetch JT data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setProfileData({
          nama_lengkap: data.user.nama_lengkap || '',
          password: '',
          telegram_id: data.user.telegram_id || '',
        });
        setIsLoggedIn(true);
        fetchDashboardData(data.user.user_id);
      } else {
        setLoginError('Username atau password salah.');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan koneksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.user_id,
          ...profileData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Update profile error', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setJtData([]);
    setIsMobileMenuOpen(false);
    setActiveView('dashboard');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengingat ini?')) return;
    try {
      const res = await fetch(`/api/jt/${id}`, { method: 'DELETE' });
      if (res.ok) fetchDashboardData(currentUser!.user_id);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleEdit = (item: JTData) => {
    setEditingItem(item);
    setFormData({
      email: item.email,
      sumber: item.sumber,
      user_id: item.user_id,
      dateType: 'manual',
      amount: '1',
      unit: 'days',
      jatuh_tempo: item.jatuh_tempo,
      jam: item.jam || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitJT = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let finalDate = formData.jatuh_tempo;
    const today = new Date();
    const amount = parseInt(formData.amount) || 1;

    if (formData.dateType === 'flexible') {
      if (formData.unit === 'days') finalDate = format(addDays(today, amount), 'yyyy-MM-dd');
      if (formData.unit === 'months') finalDate = format(addMonths(today, amount), 'yyyy-MM-dd');
      if (formData.unit === 'years') finalDate = format(addYears(today, amount), 'yyyy-MM-dd');
    }

    try {
      const url = editingItem ? `/api/jt/${editingItem.id}` : '/api/jt';
      const method = editingItem ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          jatuh_tempo: finalDate,
          user_id: currentUser?.user_id,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        fetchDashboardData(currentUser!.user_id);
        setTimeout(() => {
          setSuccess(false);
          setIsFormOpen(false);
          setEditingItem(null);
          setFormData({
            email: '',
            sumber: '',
            user_id: '',
            dateType: 'flexible',
            amount: '1',
            unit: 'days',
            jatuh_tempo: format(new Date(), 'yyyy-MM-dd'),
            jam: '',
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Submit error', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6 font-sans">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white rounded-lg shadow-xl p-10 border border-slate-200">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-slate-900 rounded-md flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Bell className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Notif Xiamo</h1>
              <p className="text-slate-500 text-sm">Sistem Pengingat Jatuh Tempo</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 text-red-600 p-3 rounded-md text-xs flex items-center gap-3 border border-red-100"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {loginError}
                </motion.div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                <input
                  required
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white"
                  placeholder="Username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input
                  required
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white"
                  placeholder="••••••••"
                />
              </div>
              <button
                disabled={submitting}
                type="submit"
                className="w-full bg-slate-900 text-white py-4 rounded-md font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'LOGIN'}
              </button>
            </form>
          </div>
          <p className="text-center mt-8 text-slate-400 text-sm font-medium">
            &copy; 2026 Reminder Bot System • v2.0
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f5] font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <Bell className="text-slate-900 w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Notif Xiamo</span>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-6">
          <SidebarItem 
            icon={<Layers className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')}
          />
          <SidebarItem 
            icon={<UserIcon className="w-4 h-4" />} 
            label="Profil" 
            active={activeView === 'profile'} 
            onClick={() => setActiveView('profile')}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-700 rounded-md flex items-center justify-center text-white font-bold text-xs">
                {currentUser?.nama_lengkap.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser?.nama_lengkap}</p>
                <p className="text-[10px] text-slate-400 truncate">@{currentUser?.username}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all font-medium text-xs"
          >
            <LogOut className="w-4 h-4" /> LOGOUT
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-6 h-20 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Bell className="text-white w-4 h-4" />
          </div>
          <span className="text-lg font-bold">ReminderBot</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-50 rounded-xl"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-50 bg-white md:hidden flex flex-col pt-24 px-6"
          >
            <nav className="space-y-4">
              <SidebarItem 
                icon={<Layers className="w-6 h-6" />} 
                label="Dashboard" 
                active={activeView === 'dashboard'} 
                onClick={() => { setActiveView('dashboard'); setIsMobileMenuOpen(false); }}
              />
              <SidebarItem 
                icon={<UserIcon className="w-6 h-6" />} 
                label="Profil" 
                active={activeView === 'profile'} 
                onClick={() => { setActiveView('profile'); setIsMobileMenuOpen(false); }}
              />
            </nav>
            <div className="mt-auto pb-10 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {currentUser?.nama_lengkap.charAt(0)}
                </div>
                <div>
                  <p className="font-bold">{currentUser?.nama_lengkap}</p>
                  <p className="text-sm text-slate-500">@{currentUser?.username}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 py-4 bg-red-50 text-red-500 rounded-2xl font-bold"
              >
                <LogOut className="w-5 h-5" /> Keluar Akun
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-12 max-w-7xl mx-auto w-full">
          {activeView === 'dashboard' ? (
            <>
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Halo, {currentUser?.nama_lengkap.split(' ')[0]}! 👋</h2>
                  <p className="text-slate-500 font-medium">Berikut adalah ringkasan jadwal jatuh tempo Anda.</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-md font-bold hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 text-sm"
                >
                  <Plus className="w-4 h-4" /> TAMBAH DATA
                </button>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <StatCard 
                  icon={<Layers className="w-6 h-6" />} 
                  label="Total Aktif" 
                  value={jtData.length.toString()} 
                  color="bg-sky-50 text-sky-600"
                />
                <StatCard 
                  icon={<AlertCircle className="w-6 h-6" />} 
                  label="Hari Ini" 
                  value={jtData.filter(d => format(parseISO(d.jatuh_tempo), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length.toString()} 
                  color="bg-amber-50 text-amber-600"
                />
                <StatCard 
                  icon={<Clock className="w-6 h-6" />} 
                  label="Mendatang" 
                  value={jtData.filter(d => isAfter(parseISO(d.jatuh_tempo), new Date())).length.toString()} 
                  color="bg-emerald-50 text-emerald-600"
                />
              </div>

              {/* Content Area */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Daftar Pengingat</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Cari data..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 w-full sm:w-48"
                      />
                    </div>
                  </div>
                </div>
                
                {loading ? (
                  <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-sky-500" />
                    <p className="font-medium">Sinkronisasi data...</p>
                  </div>
                ) : jtData.length === 0 ? (
                  <div className="py-24 text-center px-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Calendar className="w-10 h-10 text-slate-300" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">Belum ada jadwal</h4>
                    <p className="text-slate-500 max-w-xs mx-auto mb-8">Anda belum membuat pengingat apapun. Mulai dengan menambahkan data baru.</p>
                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="text-sky-500 font-bold flex items-center gap-2 mx-auto hover:underline"
                    >
                      <Plus className="w-4 h-4" /> Buat Pengingat Pertama
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Sumber & Email</th>
                          <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Jatuh Tempo & Jam</th>
                          <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                          <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-slate-400"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jtData
                          .filter(item => 
                            item.sumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.email.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((item) => {
                          const date = parseISO(item.jatuh_tempo);
                          const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                          const isPast = isBefore(date, new Date()) && !isToday;
                          
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-6">
                                <div className="font-bold text-slate-900 mb-1">{item.sumber}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3" /> {item.email}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2 font-medium text-slate-700 mb-1">
                                  <Calendar className="w-4 h-4 text-sky-500" />
                                  {format(date, 'dd MMM yyyy')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  {item.jam || '09:00'}
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                {isToday ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase">
                                    Hari Ini
                                  </span>
                                ) : isPast ? (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase">
                                    Terlewat
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                                    Mendatang
                                  </span>
                                )}
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handleEdit(item)}
                                    className="p-2 hover:bg-sky-50 text-slate-400 hover:text-sky-500 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <header className="mb-10">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Pengaturan Profil</h2>
                <p className="text-slate-500 font-medium">Perbarui informasi akun dan kredensial Anda.</p>
              </header>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 md:p-10">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {success && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border border-emerald-100"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Profil berhasil diperbarui!
                    </motion.div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Nama Lengkap</label>
                      <input
                        required
                        type="text"
                        value={profileData.nama_lengkap}
                        onChange={(e) => setProfileData({ ...profileData, nama_lengkap: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all bg-slate-50/50"
                        placeholder="Nama Lengkap Anda"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">ID Telegram</label>
                      <input
                        type="text"
                        value={profileData.telegram_id}
                        onChange={(e) => setProfileData({ ...profileData, telegram_id: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all bg-slate-50/50"
                        placeholder="ID Telegram Anda (Opsional)"
                      />
                      <p className="mt-2 text-xs text-slate-400 ml-1 italic">Dapatkan ID Anda dengan mengirim /id ke bot Telegram.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">Password Baru</label>
                      <input
                        type="password"
                        value={profileData.password}
                        onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                        className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all bg-slate-50/50"
                        placeholder="Kosongkan jika tidak ingin mengubah"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      disabled={submitting}
                      type="submit"
                      className="w-full bg-sky-500 text-white py-5 rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add JT Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl p-8 overflow-hidden border border-slate-200"
            >
              {success ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-md flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Berhasil!</h3>
                  <p className="text-slate-500 text-sm">Data telah disimpan ke sistem.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold uppercase tracking-tight">{editingItem ? 'Edit Data' : 'Tambah Data Baru'}</h2>
                    <button onClick={() => { setIsFormOpen(false); setEditingItem(null); }} className="p-1 hover:bg-slate-100 rounded transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitJT} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Tujuan</label>
                        <input
                          required
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white text-sm"
                          placeholder="email@tujuan.com"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Sumber</label>
                        <input
                          required
                          type="text"
                          value={formData.sumber}
                          onChange={(e) => setFormData({ ...formData, sumber: e.target.value })}
                          className="w-full px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white text-sm"
                          placeholder="Contoh: Hosting, Domain"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jatuh Tempo</label>
                      <div className="flex p-1 bg-slate-100 rounded-md mb-4">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, dateType: 'flexible' })}
                          className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                            formData.dateType === 'flexible' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          Fleksibel
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, dateType: 'manual' })}
                          className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                            formData.dateType === 'manual' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          Manual
                        </button>
                      </div>

                      {formData.dateType === 'flexible' ? (
                        <div className="flex items-center gap-3 mb-4">
                          <input
                            type="number"
                            min="1"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-20 px-3 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white text-center font-bold text-sm"
                          />
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            {['days', 'months', 'years'].map((u) => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => setFormData({ ...formData, unit: u })}
                                className={`py-3 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all border ${
                                  formData.unit === u ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-500'
                                }`}
                              >
                                {u === 'days' ? 'Hari' : u === 'months' ? 'Bulan' : 'Tahun'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={formData.jatuh_tempo}
                          onChange={(e) => setFormData({ ...formData, jatuh_tempo: e.target.value })}
                          className="w-full px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white text-sm mb-4"
                        />
                      )}

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Jam Notifikasi</label>
                        <input
                          type="time"
                          value={formData.jam}
                          onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                          className="w-full px-4 py-3 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setIsFormOpen(false); setEditingItem(null); }}
                        className="flex-1 px-4 py-3 rounded-md border border-slate-300 hover:bg-slate-50 transition-colors font-bold text-sm"
                      >
                        BATAL
                      </button>
                      <button
                        disabled={submitting}
                        type="submit"
                        className="flex-1 px-4 py-3 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors font-bold text-sm flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SIMPAN'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-all font-bold text-xs ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-md flex items-center justify-center ${color} border border-current opacity-80`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}
