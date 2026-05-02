import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, ShieldCheck, Clock, User, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { demoAuditLogs } from '../lib/demoData';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data?.length ? data : demoAuditLogs);
    } catch (error) {
      toast.error('Failed to load system audit trail');
      setLogs(demoAuditLogs);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.event_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900 text-left">Internal Integrity</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">Immutable System Event Logs</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input 
            placeholder="Search events or types..." 
            className="pl-11 h-12 rounded-2xl bg-white border-neutral-100 shadow-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-neutral-900 text-white p-6 md:p-8">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                 <ShieldCheck size={20} strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl font-black">Audit History</CardTitle>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-50">
            {filteredLogs.length === 0 ? (
              <div className="py-20 text-center">
                 <Clock className="w-16 h-16 text-neutral-100 mx-auto mb-4" />
                 <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No activity found</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50 transition-colors group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-all shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-600 text-[10px] font-black uppercase tracking-widest border border-neutral-200">
                           {log.event_type}
                         </span>
                         <span className="text-[10px] font-bold text-neutral-400 tabular-nums">
                            {new Date(log.created_at).toLocaleTimeString()}
                         </span>
                      </div>
                      <p className="font-bold text-neutral-900 leading-tight">{log.description}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                         <User size={10} className="text-neutral-400" />
                         <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{log.user?.name || 'Automated System'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                    <div className="flex flex-col md:items-end">
                       <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Event Reference</span>
                       <span className="text-[10px] font-bold text-neutral-900 font-mono uppercase">{log.id.slice(0, 8)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-white hover:shadow-sm">
                       <ArrowUpRight size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
