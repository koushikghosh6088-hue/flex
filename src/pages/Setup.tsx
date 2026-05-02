import React, { useState } from 'react';
import { Building2, User, Mail, Lock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function SetupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [adminInfo, setAdminInfo] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleCompanySetup = async () => {
    setLoading(true);
    try {
      // Create company settings in system_configs
      const { error } = await supabase.from('system_configs').upsert([
        { key: 'company_name', value: JSON.stringify(companyInfo.name) },
        { key: 'company_email', value: JSON.stringify(companyInfo.email) },
        { key: 'company_phone', value: JSON.stringify(companyInfo.phone) },
        { key: 'company_address', value: JSON.stringify(companyInfo.address) }
      ]);

      if (error) throw error;
      setStep(2);
      toast.success('Company information saved!');
    } catch (error) {
      toast.error('Failed to save company information');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetup = async () => {
    if (adminInfo.password !== adminInfo.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminInfo.email,
          password: adminInfo.password,
          name: adminInfo.name,
          role: 'owner',
          pin: '000000'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admin');
      }

      setStep(3);
      toast.success('Admin account created successfully!');
    } catch (error: any) {
      toast.error('Failed to create admin account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            <Building2 className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Setup FlexStock</h2>
            <p className="text-gray-600">Configure your inventory management system</p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="company@example.com"
                />
              </div>
              <div>
                <Label htmlFor="company-phone">Phone</Label>
                <Input
                  id="company-phone"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <Label htmlFor="company-address">Address</Label>
                <Input
                  id="company-address"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, City, State"
                />
              </div>
              <Button onClick={handleCompanySetup} disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Create Admin Account</h3>
              <div>
                <Label htmlFor="admin-name">Full Name</Label>
                <Input
                  id="admin-name"
                  value={adminInfo.name}
                  onChange={(e) => setAdminInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminInfo.email}
                  onChange={(e) => setAdminInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminInfo.password}
                  onChange={(e) => setAdminInfo(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <Label htmlFor="admin-confirm-password">Confirm Password</Label>
                <Input
                  id="admin-confirm-password"
                  type="password"
                  value={adminInfo.confirmPassword}
                  onChange={(e) => setAdminInfo(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm password"
                />
              </div>
              <Button onClick={handleAdminSetup} disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-lg font-semibold">Setup Complete!</h3>
              <p className="text-gray-600">
                Your FlexStock system is ready to use. You can now log in with your admin account.
              </p>
              <Button className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
