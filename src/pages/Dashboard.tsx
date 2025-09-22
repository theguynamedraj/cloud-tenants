import React, { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import NotesManager from "@/components/NotesManager";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscription_plan: "free" | "pro";
}

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // fetch tenant info
  const fetchTenant = useCallback(async () => {
    if (!profile?.tenant_id) return;

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single();

    if (error) {
      console.error("Error fetching tenant:", error);
    } else {
      setTenant(data);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchTenant();
    }
  }, [fetchTenant, profile?.tenant_id]);

  // ✅ fixed upgrade function (direct DB update)
  const handleUpgrade = async () => {
    if (!tenant || profile?.role !== "admin") return;

    setIsUpgrading(true);

    try {
      const { error } = await supabase
        .from("tenants")
        .update({ subscription_plan: "pro" })
        .eq("id", tenant.id);

      if (error) throw error;

      toast({
        title: "Upgrade Successful!",
        description:
          "Your tenant has been upgraded to Pro. You now have unlimited notes!",
      });

      await fetchTenant();
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade Failed",
        description:
          "There was an error upgrading your tenant. Please try again.",
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait for profile to load after authentication
  if (user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Nottes Dashboard
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{tenant?.name}</Badge>
                <Badge
                  variant={
                    tenant?.subscription_plan === "pro" ? "default" : "outline"
                  }
                >
                  {tenant?.subscription_plan?.toUpperCase()}
                </Badge>
                <Badge variant="outline">{profile.role}</Badge>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-wrap gap-2">
              {profile.role === "admin" && tenant?.subscription_plan === "free" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUpgrade}
                  disabled={isUpgrading}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  <span>{isUpgrading ? "Upgrading..." : "Upgrade to Pro"}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* Welcome */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">
              Welcome back, {profile.email} 👋
            </CardTitle>
            <CardDescription>
              Manage your notes and subscription details from your personalized
              dashboard.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                {tenant?.subscription_plan === "free"
                  ? "Free plan — Limited to 3 notes"
                  : "Pro plan — Unlimited notes"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role</CardTitle>
              <CardDescription>
                {profile.role === "admin"
                  ? "Admin — Can manage users & upgrade subscription"
                  : "Member — Can create & manage notes"}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>
                {tenant?.subscription_plan === "free"
                  ? "You can create up to 3 notes"
                  : "Unlimited notes available"}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Notes Manager */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Your Notes</CardTitle>
              <CardDescription>
                Create, edit, and organize your notes below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotesManager
                tenantPlan={tenant?.subscription_plan || "free"}
                userRole={profile.role}
              />
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                © 2024 Nottes. Built with care for your productivity.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Tenant: {tenant?.name}</span>
              <span>•</span>
              <span>{tenant?.subscription_plan?.toUpperCase()} Plan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
