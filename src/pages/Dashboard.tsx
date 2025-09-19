import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Plus, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import NotesManager from '@/components/NotesManager';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_plan: 'free' | 'pro';
}

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  console.log('🏠 Dashboard render:', { hasUser: !!user, hasProfile: !!profile, loading, userEmail: user?.email, profileRole: profile?.role });

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTenant();
    }
  }, [profile]);

  const fetchTenant = async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id)
      .single();

    if (error) {
      console.error('Error fetching tenant:', error);
    } else {
      setTenant(data);
    }
  };

  const handleUpgrade = async () => {
    if (!tenant || profile?.role !== 'admin') return;

    setIsUpgrading(true);
    
    try {
      const response = await supabase.functions.invoke('upgrade-tenant', {
        method: 'POST',
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Upgrade Successful!",
        description: "Your tenant has been upgraded to Pro. You now have unlimited notes!",
      });

      // Refresh tenant data
      await fetchTenant();
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: "Upgrade Failed",
        description: "There was an error upgrading your tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">Nottes Dashboard</h1>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{tenant?.name}</Badge>
                <Badge variant={tenant?.subscription_plan === 'pro' ? 'default' : 'outline'}>
                  {tenant?.subscription_plan?.toUpperCase()}
                </Badge>
                <Badge variant="outline">{profile.role}</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {profile.role === 'admin' && tenant?.subscription_plan === 'free' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="flex items-center space-x-1"
                >
                  <Settings className="h-4 w-4" />
                  <span>{isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back!</CardTitle>
                <CardDescription>
                  Logged in as {profile.email}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>
                  {tenant?.subscription_plan === 'free' 
                    ? 'Free plan - Limited to 3 notes' 
                    : 'Pro plan - Unlimited notes'
                  }
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role</CardTitle>
                <CardDescription>
                  {profile.role === 'admin' 
                    ? 'Admin - Can manage users and upgrade subscription'
                    : 'Member - Can create and manage notes'
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <NotesManager 
            tenantPlan={tenant?.subscription_plan || 'free'}
            userRole={profile.role}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;