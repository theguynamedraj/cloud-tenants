import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

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
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full"
          >
            Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
