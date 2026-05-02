import React from 'react';
import { 
  BarChart3, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Layers,
  Box,
  Store,
  ArrowRightLeft,
  CreditCard,
  Truck,
  BookOpen,
  ShieldCheck,
  Menu,
  Moon,
  Sun,
  Calculator,
  Activity
} from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider, 
  SidebarTrigger,
  SidebarRail
} from '../ui/sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/sheet";

function Clock() {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-end mr-1">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-right">Time</span>
      <span className="text-xs font-bold text-slate-700 tabular-nums">
        {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut, currentPath, navigateTo } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('flexflow-theme') as 'light' | 'dark') || 'light';
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('flexflow-theme', theme);
  }, [theme]);

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, role: ['owner', 'store_manager'], path: '/' },
    { title: 'POS Terminal', icon: CreditCard, role: ['owner', 'store_manager'], path: '/pos' },
    { title: 'Branch Network', icon: Store, role: ['owner'], path: '/stores' },
    { title: 'Raw Materials', icon: Layers, role: ['owner', 'store_manager'], path: '/inventory' },
    { title: 'Finished Products', icon: Box, role: ['owner', 'store_manager'], path: '/products' },
    { title: 'BOM Calculator', icon: Calculator, role: ['owner'], path: '/calculator' },
    { title: 'Vendors', icon: Truck, role: ['owner'], path: '/vendors' },
    { title: 'Purchases', icon: BookOpen, role: ['owner'], path: '/purchase-entry' },
    { title: 'Stock Transfers', icon: ArrowRightLeft, role: ['owner'], path: '/transfers' },
    { title: 'Reports', icon: BarChart3, role: ['owner', 'store_manager'], path: '/reports' },
    { title: 'Audit Trail', icon: ShieldCheck, role: ['owner'], path: '/audit-logs' },
    { title: 'Settings', icon: Settings, role: ['owner'], path: '/settings' },
  ];

  const filteredItems = menuItems.filter(item => item.role.includes(profile?.role || ''));

  const SidebarMenuContent = () => (
    <div className="mb-4 mt-2">
       <p className="text-[10px] font-bold text-slate-400 dark:text-white/35 uppercase tracking-[0.24em] mb-4 px-3">Main Navigation</p>
       <SidebarMenu className="gap-1">
         {filteredItems.map((item) => (
           <SidebarMenuItem key={item.title}>
             <SidebarMenuButton 
               className={`h-12 px-4 rounded-2xl transition-all duration-200 group ${currentPath === item.path ? 'bg-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-black/25 hover:bg-orange-600 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-white/62 dark:hover:bg-white/10 dark:hover:text-white border border-transparent'}`}
               onClick={() => { navigateTo(item.path); setMobileMenuOpen(false); }}
             >
               <item.icon size={20} className={currentPath === item.path ? 'text-white' : 'group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors'} />
               <span className="font-bold text-sm ml-3 tracking-tight">{item.title}</span>
             </SidebarMenuButton>
           </SidebarMenuItem>
         ))}
       </SidebarMenu>
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden font-sans bg-transparent">
        {/* Desktop Sidebar */}
        <Sidebar className="hidden lg:flex glass-card !border-r-0 !bg-transparent">
          <SidebarHeader className="h-24 flex items-center justify-center px-6 border-b border-white/10">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigateTo('/')}>
              <div className="w-12 h-12 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20 transform group-hover:rotate-12 transition-all duration-300">
                <Activity size={26} strokeWidth={3} />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-2xl tracking-tighter leading-none">FLEX<span className="text-orange-600">FLOW</span></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Retail Engine</span>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-3">
            <SidebarMenuContent />
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] backdrop-blur-sm">
            <div className="p-4 rounded-[1.6rem] bg-white dark:bg-white/[0.07] text-slate-950 dark:text-white shadow-sm border border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl brand-gradient flex items-center justify-center font-black text-sm border border-white/20 shadow-lg shadow-orange-950/30">
                  {profile?.name?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold truncate">{profile?.name}</span>
                  <div className="flex items-center gap-1.5">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[10px] text-slate-400 dark:text-white/50 uppercase font-black tracking-widest">{profile?.role?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-slate-500 dark:text-white/60 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 h-10 rounded-xl px-3 group"
                onClick={() => signOut()}
              >
                <LogOut size={16} className="mr-3 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold">Sign Out</span>
              </Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 md:h-20 bg-white/80 dark:bg-slate-950/72 backdrop-blur-2xl border-b border-white/70 dark:border-white/10 flex items-center px-4 md:px-8 justify-between shrink-0 sticky top-0 z-10 shadow-sm shadow-slate-900/5">
            <div className="flex items-center gap-3 md:gap-6">
              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden h-10 w-10 border-white/70 rounded-xl">
                    <Menu size={20} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-950 dark:text-white">
                    <div className="p-6 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
                            <Activity size={22} strokeWidth={2.5} />
                         </div>
                         <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white leading-none">FLEX<span className="text-orange-600">FLOW</span></h1>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Retail OS</span>
                         </div>
                      </div>
                    </div>
                    <div className="flex-1 px-3 py-4 overflow-y-auto">
                      <SidebarMenuContent />
                    </div>
                    <div className="p-4 border-t border-slate-100 dark:border-white/10">
                      <Button 
                        variant="outline"
                        className="w-full justify-start h-12 rounded-xl"
                        onClick={() => signOut()}
                      >
                        <LogOut size={18} className="mr-3" />
                        <span className="font-bold">Sign Out</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <SidebarTrigger className="hidden lg:flex h-10 w-10 border border-white/70 bg-white/70 hover:bg-white rounded-xl shadow-sm" />
              <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/85 dark:bg-white/10 rounded-2xl border border-white/70 dark:border-white/10 shadow-sm">
                <LayoutDashboard size={14} className="text-orange-600 shrink-0" />
                <span className="text-[10px] md:text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider truncate max-w-[120px] md:max-w-none">
                   {currentPath.substring(1).replace('-', ' ') || 'Dashboard'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
               <Button
                 variant="outline"
                 size="icon"
                 className="h-10 w-10 rounded-2xl"
                 onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                 title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
               >
                 {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
               </Button>
               <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-white/85 dark:bg-white/10 rounded-2xl border border-white/70 dark:border-white/10 shadow-sm">
                  <Clock />
                  <div className="hidden md:block w-px h-6 bg-neutral-200" />
                  <div className="relative">
                     <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                     <Avatar className="h-8 w-8 md:h-9 md:w-9 rounded-xl border border-white shadow-sm">
                        <AvatarFallback className="brand-gradient text-white text-xs font-black">{profile?.name?.[0]}</AvatarFallback>
                     </Avatar>
                  </div>
               </div>
            </div>
          </header>

          <div className="flex-1 p-3 md:p-8 overflow-y-auto">
             <div className="max-w-7xl mx-auto h-full space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {children}
             </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
