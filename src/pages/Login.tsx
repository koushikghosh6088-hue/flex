import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Store, 
  KeyRound, 
  User, 
  ChevronRight, 
  Mail, 
  Layers, 
  Lock, 
  ShieldCheck, 
  Fingerprint,
  ChevronLeft,
  ArrowRight,
  Delete,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { signInWithEmail, signInWithPin } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { mockLogin } = useAuth();
  const [mode, setMode] = useState<'selection' | 'pin' | 'email'>('selection');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  const demoProfiles: Record<string, any> = {
    'owner@flexstock.com': { id: '47e21fdb-f442-4e2b-8988-68b81b847166', email: 'owner@flexstock.com', name: 'System Owner', role: 'owner', password: 'owner123' },
    'manager@flexstock.com': { id: '3bb8939d-bfb2-41d3-b65a-e2d6f14ac51a', email: 'manager@flexstock.com', name: 'Rahul Sharma (A)', role: 'store_manager', store_id: '9a1da2b4-5ce0-487e-93a5-c2d582b7ae32', password: 'manager123' },
    'managerb@flexstock.com': { id: '01fe0674-289e-4f53-a817-9d676d971b48', email: 'managerb@flexstock.com', name: 'Priya Das (B)', role: 'store_manager', store_id: '009831f3-50ba-407a-8f31-58e63abf944e', password: 'manager123' },
    'managerc@flexstock.com': { id: 'ff92e24a-072a-46d4-b60e-fac0b12626b5', email: 'managerc@flexstock.com', name: 'Amit Roy (C)', role: 'store_manager', store_id: '05b19e18-1103-4493-9844-7bc930485b21', password: 'manager123' }
  };

  const handleDemoLogin = async (type: 'owner' | 'managerA' | 'managerB' | 'managerC') => {
    const profiles: any = {
      owner: demoProfiles['owner@flexstock.com'],
      managerA: demoProfiles['manager@flexstock.com'],
      managerB: demoProfiles['managerb@flexstock.com'],
      managerC: demoProfiles['managerc@flexstock.com']
    };
    
    const target = profiles[type];
    
    // Perform real login in background without blocking the UI
    try {
      await supabase.auth.signInWithPassword({
        email: target.email,
        password: target.password
      });
      mockLogin(target);
      toast.success(`Logged in as ${target.name} (Demo Mode)`);
    } catch (e) {
      console.warn('Auth sync failed, using mock session only', e);
      mockLogin(target);
      toast.success(`Logged in as ${target.name} (Limited Access)`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*');
      if (error) throw error;
      setStaffList(users || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load user list');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, error } = await signInWithEmail(email, password);
      if (error) {
        const demoProfile = demoProfiles[email.trim().toLowerCase()];
        if (demoProfile?.password === password) {
          mockLogin(demoProfile);
          toast.success(`Logged in as ${demoProfile.name} (Demo Mode)`);
        } else {
          toast.error('Authentication Failed: ' + error);
        }
      } else {
        toast.success('Access Granted. Welcome back.');
      }
    } catch (error: any) {
      const demoProfile = demoProfiles[email.trim().toLowerCase()];
      if (demoProfile?.password === password) {
        mockLogin(demoProfile);
        toast.success(`Logged in as ${demoProfile.name} (Demo Mode)`);
      } else {
        toast.error('Authentication Failed: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (digit: string) => {
    if (loading) return;
    const newPin = pin + digit;
    if (newPin.length > 6) return;
    setPin(newPin);

    if (newPin.length >= 6) {
      setLoading(true);
      try {
        const { user, error } = await signInWithPin(newPin, selectedUser.store_id);
        if (error) {
          toast.error(error || 'Invalid Security PIN');
          setPin('');
        } else {
          toast.success('Secure Identity Verified');
          if (user) {
            mockLogin(user as any);
          }
        }
      } catch (err) {
        toast.error('Network Security Error');
        setPin('');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden font-sans soft-grid bg-[linear-gradient(135deg,#111827_0%,#2b1b14_45%,#fff7ed_45%,#f8fafc_100%)]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-[48%] bg-[linear-gradient(135deg,rgba(255,122,26,0.18),rgba(255,255,255,0.03))]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
      </div>

      <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Branding Info */}
        <div className="hidden lg:flex flex-col gap-10 text-white p-8">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-900/30">
                 <Layers size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-black tracking-tighter">FlexStock</h1>
           </div>
           
           <div className="space-y-8">
              <h2 className="text-6xl font-black leading-[1.1] tracking-tight">
                 Smart Inventory <br />
                 <span className="text-orange-500 underline decoration-white/10 decoration-4 underline-offset-8">Perfectly </span>Executed.
              </h2>
              <p className="text-neutral-400 text-xl font-medium max-w-lg leading-relaxed">
                        A sharp operating desk for vinyl printing hubs and retail branches. Manage store billing, stock, and sales with real separation.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-6 pt-12">
              {[
                { icon: ShieldCheck, label: 'Encrypted PIN Access' },
                { icon: Store, label: 'Multi-Location Sync' },
                { icon: Fingerprint, label: 'Biometric Security' },
                { icon: Lock, label: 'PCI Compliant' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-neutral-400">
                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <item.icon size={16} className="text-orange-500" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Login Area */}
        <div className="flex justify-center w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="app-surface shadow-[0_32px_70px_-16px_rgba(15,23,42,0.35)] rounded-[2rem] overflow-hidden border-white/70">
              <AnimatePresence mode="wait">
                {mode === 'selection' && (
                  <motion.div
                    key="selection"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-10"
                  >
                    <div className="text-center mb-10">
                       <div className="lg:hidden flex justify-center mb-6">
                          <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white">
                             <Layers size={32} />
                          </div>
                       </div>
                       <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Authenticate</h2>
                       <p className="text-neutral-500 font-bold mt-2">Select your access protocol</p>
                    </div>

                    <div className="space-y-4">
                      <Button 
                        variant="secondary" 
                        size="lg"
                        className="w-full h-20 rounded-3xl justify-between px-8 bg-neutral-950 text-white hover:bg-neutral-800 shadow-xl shadow-neutral-200 transition-all border-none group"
                        onClick={() => {
                          setMode('pin');
                          fetchStaff();
                        }}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center text-white ring-4 ring-orange-950 group-hover:scale-110 transition-transform">
                            <KeyRound size={24} strokeWidth={2.5} />
                          </div>
                          <div className="text-left">
                             <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Staff Access</p>
                             <p className="text-lg font-bold">Secure PIN Login</p>
                          </div>
                        </div>
                        <ChevronRight size={24} className="text-neutral-600 group-hover:translate-x-1 transition-transform" />
                      </Button>

                      <div className="relative py-8">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-100" /></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-neutral-300">
                          <span className="bg-white px-4">Master Credentials</span>
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="lg"
                        className="w-full h-16 rounded-2xl text-neutral-500 hover:text-neutral-950 hover:bg-neutral-50 border border-neutral-100 transition-all font-bold"
                        onClick={() => setMode('email')}
                      >
                        <Mail size={18} className="mr-3" />
                        Owner Email Access
                      </Button>

                      <div className="relative py-8">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-100" /></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-neutral-300">
                          <span className="bg-white px-4">Demo Quick Access</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline"
                          className="h-12 rounded-xl border-orange-100 hover:bg-orange-50 text-orange-600 font-bold text-xs"
                          onClick={() => handleDemoLogin('owner')}
                        >
                          System Owner
                        </Button>
                        <Button 
                          variant="outline"
                          className="h-12 rounded-xl border-blue-100 hover:bg-blue-50 text-blue-600 font-bold text-xs"
                          onClick={() => handleDemoLogin('managerA')}
                        >
                          Manager A
                        </Button>
                        <Button 
                          variant="outline"
                          className="h-12 rounded-xl border-blue-100 hover:bg-blue-50 text-blue-600 font-bold text-xs"
                          onClick={() => handleDemoLogin('managerB')}
                        >
                          Manager B
                        </Button>
                        <Button 
                          variant="outline"
                          className="h-12 rounded-xl border-blue-100 hover:bg-blue-50 text-blue-600 font-bold text-xs"
                          onClick={() => handleDemoLogin('managerC')}
                        >
                          Manager C
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {mode === 'email' && (
                  <motion.div
                    key="email"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-10"
                  >
                    <button onClick={() => setMode('selection')} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 font-bold text-xs uppercase tracking-widest mb-8 group">
                       <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
                    </button>
                    
                    <div className="mb-10">
                       <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Owner Portal</h2>
                       <p className="text-neutral-500 font-bold mt-2">Credentials for root access</p>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Email Authority</Label>
                        <Input 
                          type="email" 
                          placeholder="owner@flexstock.com" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 focus-visible:ring-orange-600 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Master Password</Label>
                        <Input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-14 rounded-2xl bg-neutral-50 border-neutral-100 focus-visible:ring-orange-600 font-bold"
                        />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-neutral-950 text-white hover:bg-neutral-800 text-lg font-bold shadow-xl shadow-neutral-200 mt-4">
                        {loading ? <Loader2 className="animate-spin" /> : 'Request Access'}
                      </Button>
                    </form>
                  </motion.div>
                )}

                {mode === 'pin' && (
                  <motion.div
                    key="pin"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="p-10"
                  >
                    {!selectedUser ? (
                      <div className="space-y-8">
                        <button onClick={() => setMode('selection')} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 font-bold text-xs uppercase tracking-widest group">
                           <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
                        </button>

                        <div>
                           <h2 className="text-3xl font-black text-neutral-900 tracking-tight">Select Identity</h2>
                           <p className="text-neutral-500 font-bold mt-2">Active personnel terminal</p>
                        </div>

                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-3 custom-scrollbar">
                          {staffList.map((staff) => (
                            <Button
                              key={staff.id}
                              variant="outline"
                              className="w-full h-20 rounded-2xl px-6 border-neutral-100 hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-lg hover:shadow-orange-100 transition-all group"
                              onClick={() => setSelectedUser(staff)}
                            >
                              <div className="flex items-center gap-4 w-full">
                                <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-900 font-black text-lg border border-neutral-200 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                  {staff.name[0]}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                   <p className="font-bold text-neutral-900 truncate">{staff.name}</p>
                                   <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-orange-600 transition-colors">{staff.role}</p>
                                </div>
                                <ChevronRight size={18} className="text-neutral-300 group-hover:text-orange-500 transition-colors" />
                              </div>
                            </Button>
                          ))}
                          {loading && (
                             <div className="flex flex-col items-center justify-center py-12 gap-4 text-neutral-400">
                                <Loader2 className="animate-spin" size={32} />
                                <span className="text-xs font-black tracking-widest uppercase">Initializing Staff List</span>
                             </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                           <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 font-bold text-xs uppercase tracking-widest group">
                              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Switch User
                           </button>
                           <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              Security Active
                           </div>
                        </div>

                        <div className="text-center">
                          <div className="w-20 h-20 rounded-[2rem] bg-neutral-950 text-white flex items-center justify-center mx-auto mb-4 font-black text-3xl shadow-2xl shadow-neutral-300 border-4 border-white">
                            {selectedUser.name[0]}
                          </div>
                          <h3 className="text-2xl font-black text-neutral-900">{selectedUser.name}</h3>
                          <p className="text-sm font-bold text-neutral-500 mt-1 uppercase tracking-widest">{selectedUser.role} Terminal</p>
                        </div>

                        <div className="flex justify-center gap-3 py-4">
                          {[...Array(6)].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={false}
                              animate={i < pin.length ? { scale: [1, 1.3, 1], backgroundColor: '#ea580c' } : { scale: 1, backgroundColor: '#f5f5f5' }}
                              className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                                i < pin.length ? 'border-orange-600' : 'border-neutral-200 bg-neutral-100 shadow-inner'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 max-w-[320px] mx-auto">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'RESET', 0, 'DEL'].map((key) => (
                            <Button
                              key={key}
                              variant={typeof key === 'number' ? 'outline' : 'ghost'}
                              className={`h-20 rounded-2xl text-2xl font-bold transition-all active:scale-90 border-none shadow-sm ${
                                typeof key === 'number' 
                                  ? 'bg-neutral-50 text-neutral-800 hover:bg-white hover:text-orange-600 hover:shadow-xl hover:shadow-orange-100' 
                                  : key === 'DEL' ? 'text-red-500 hover:bg-red-50 hover:text-red-600' : 'text-[10px] uppercase font-black tracking-widest text-neutral-400 hover:bg-neutral-50'
                              }`}
                              onClick={() => {
                                if (key === 'RESET') setPin('');
                                else if (key === 'DEL') setPin(pin.slice(0, -1));
                                else handlePinLogin(key.toString());
                              }}
                              disabled={loading}
                            >
                              {key === 'DEL' ? <Delete size={28} /> : key}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
            <p className="mt-10 text-center text-[10px] font-black text-neutral-500/50 uppercase tracking-[0.4em]">
              Precision Logistics &copy; 2026 FlexFlow
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
