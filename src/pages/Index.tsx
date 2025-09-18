import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const seedTestUsers = async () => {
    setIsSeeding(true);
    try {
      const response = await fetch('https://ealtyxadztsfepcfcjji.supabase.co/functions/v1/seed-test-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbHR5eGFkenRzZmVwY2ZjamppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwODQ2NzUsImV4cCI6MjA3MzY2MDY3NX0.htng2CQ6ivyHl5QEs3YepnfZ3anxe4Qmu3Dtq9Ky6Wg'
        }
      });
      
      if (response.ok) {
        toast({
          title: "Success!",
          description: "Test users have been seeded. You can now login.",
        });
      } else {
        throw new Error(`Failed to seed users: ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed test users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Notes SaaS</CardTitle>
          <CardDescription>
            Multi-tenant notes application with role-based access control
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Features</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Multi-tenant architecture</li>
              <li>• Role-based access (Admin/Member)</li>
              <li>• Subscription-based feature gating</li>
              <li>• Secure CRUD operations</li>
            </ul>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={seedTestUsers} 
              disabled={isSeeding}
              className="w-full"
              variant="outline"
            >
              {isSeeding ? 'Seeding Users...' : 'Seed Test Users'}
            </Button>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
