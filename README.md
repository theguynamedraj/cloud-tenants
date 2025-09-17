# Multi-Tenant SaaS Notes Application

A comprehensive multi-tenant SaaS application built with React, TypeScript, Tailwind CSS, and Supabase. Features secure tenant isolation, role-based access control, and subscription-based feature gating.

## 🏗️ Multi-Tenancy Architecture

**Approach: Shared Schema with Tenant ID Column**

This application uses a shared schema approach where all tenants store their data in the same database tables, but each row includes a `tenant_id` column for data isolation. This approach was chosen for:

- **Cost Efficiency**: Single database instance reduces infrastructure costs
- **Maintenance**: Easier to maintain and update schema changes
- **Scalability**: Good performance for moderate scale with proper indexing
- **Security**: Enforced through Row Level Security (RLS) policies

### Database Schema

```sql
-- Tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_plan subscription_plan DEFAULT 'free'
);

-- User profiles with tenant association
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES public.tenants(id),
  email TEXT NOT NULL,
  role app_role DEFAULT 'member'
);

-- Notes table with tenant isolation
CREATE TABLE public.notes (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT
);
```

## 🔐 Authentication & Authorization

### JWT-Based Authentication
- Powered by Supabase Auth
- Session persistence with automatic token refresh
- Secure password-based authentication

### Role-Based Access Control
- **Admin**: Can upgrade subscriptions, manage tenant settings
- **Member**: Can create, read, update, and delete notes

### Test Accounts
All test accounts use password: `password`

| Email | Tenant | Role | Capabilities |
|-------|--------|------|-------------|
| admin@acme.test | Acme | Admin | Full access + upgrade subscription |
| user@acme.test | Acme | Member | Note management only |
| admin@globex.test | Globex | Admin | Full access + upgrade subscription |
| user@globex.test | Globex | Member | Note management only |

## 📊 Subscription Feature Gating

### Free Plan
- Limited to 3 notes maximum
- Basic note CRUD operations
- Read-only access to tenant information

### Pro Plan
- Unlimited notes
- All Free plan features
- Priority support (conceptual)

### Upgrade Process
Admins can upgrade their tenant using the upgrade endpoint:
```
POST /functions/v1/upgrade-tenant
Authorization: Bearer <jwt_token>
```

## 🔒 Security Features

### Row Level Security (RLS)
All tables implement comprehensive RLS policies:

- **Tenant Isolation**: Users can only access data from their tenant
- **User Isolation**: Users can only modify their own notes
- **Role Enforcement**: Admins have additional permissions for tenant management

### Data Isolation Examples

```sql
-- Notes can only be viewed by users in the same tenant
CREATE POLICY "Users can view notes in their tenant"
ON public.notes FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Users can only create notes in their own tenant
CREATE POLICY "Users can create notes in their tenant"
ON public.notes FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND user_id = auth.uid()
);
```

## 🚀 API Endpoints

### Health Check
- `GET /functions/v1/health` → `{ "status": "ok" }`

### Notes CRUD
- `GET /functions/v1/notes` - List all notes for current tenant
- `GET /functions/v1/notes/:id` - Get specific note
- `POST /functions/v1/notes` - Create new note
- `PUT /functions/v1/notes/:id` - Update note
- `DELETE /functions/v1/notes/:id` - Delete note

### Tenant Management
- `POST /functions/v1/upgrade-tenant` - Upgrade tenant to Pro (Admin only)

### Test Data Seeding
- `POST /functions/v1/seed-test-users` - Create test accounts (Development only)

## 🎨 Frontend Features

### Responsive Design
- Built with Tailwind CSS and shadcn/ui components
- Dark/light mode support
- Mobile-first responsive design

### User Experience
- Intuitive login with test account quick-fill
- Real-time subscription limit warnings
- Contextual upgrade prompts for Free plan users
- Toast notifications for user feedback

### Component Architecture
- **AuthContext**: Manages authentication state and user sessions
- **NotesManager**: Handles CRUD operations with optimistic updates
- **Dashboard**: Main application interface with tenant information
- **Login**: Authentication interface with test account helpers

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── NotesManager.tsx    # Notes CRUD interface
├── contexts/
│   └── AuthContext.tsx     # Authentication state management
├── pages/
│   ├── Index.tsx          # Landing page
│   ├── Login.tsx          # Authentication page
│   └── Dashboard.tsx      # Main application interface
├── integrations/
│   └── supabase/          # Supabase client and types
└── hooks/                 # Custom React hooks

supabase/
├── functions/             # Edge Functions (API endpoints)
│   ├── health/           # Health check endpoint
│   ├── notes/            # Notes CRUD operations
│   ├── upgrade-tenant/   # Subscription upgrade
│   └── seed-test-users/  # Test data seeding
└── config.toml           # Supabase configuration
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- Supabase account
- Vercel account (for deployment)

### Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and update environment variables
4. Run development server: `npm run dev`
5. Seed test users: Call `/functions/v1/seed-test-users` endpoint

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## 🚀 Deployment

### Automatic Deployment
This application is configured for automatic deployment to Vercel:

1. **Database**: Supabase handles database hosting and edge functions
2. **Frontend**: Vercel automatically builds and deploys the React application
3. **API**: Supabase Edge Functions provide the backend API
4. **CORS**: Enabled for cross-origin requests

### Production Checklist
- [ ] Set up proper domain configuration in Supabase Auth
- [ ] Configure production environment variables
- [ ] Set up monitoring and logging
- [ ] Run security audit
- [ ] Test all user flows with production data

## 🔍 Testing & Validation

The application is designed to pass automated validation scripts that verify:

- ✅ Health endpoint accessibility
- ✅ Authentication with all test accounts
- ✅ Tenant data isolation
- ✅ Role-based access restrictions
- ✅ Subscription limit enforcement
- ✅ CRUD operations functionality
- ✅ Frontend accessibility and responsiveness

## 🛡️ Security Considerations

### Implemented Security Measures
- Row Level Security (RLS) on all database tables
- JWT token validation on protected endpoints
- Input validation and sanitization
- CORS configuration for controlled access
- Secure password policies through Supabase Auth

### Security Best Practices
- Never expose sensitive data in client-side code
- Validate all user inputs on the server side
- Use parameterized queries to prevent SQL injection
- Implement proper session management
- Regular security audits and dependency updates

## 📈 Scalability Considerations

### Current Architecture Limits
- Single database instance (Supabase managed)
- Shared schema approach suitable for moderate scale
- Edge functions auto-scale based on demand

### Future Scaling Options
- Database read replicas for improved read performance
- Caching layer (Redis) for frequently accessed data
- Microservices architecture for complex business logic
- CDN integration for static asset delivery

## 🎯 Future Enhancements

### Planned Features
- [ ] Email notifications for important events
- [ ] Advanced note features (rich text, attachments)
- [ ] Team collaboration features
- [ ] Advanced analytics and reporting
- [ ] Mobile application
- [ ] Third-party integrations (Slack, Microsoft Teams)

### Technical Improvements
- [ ] Automated testing suite
- [ ] Performance monitoring
- [ ] Advanced caching strategies
- [ ] Database query optimization
- [ ] Enhanced security measures

---

**Built with ❤️ using React, TypeScript, Tailwind CSS, and Supabase**