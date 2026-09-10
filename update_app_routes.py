import re

with open('frontend/src/App.tsx', 'r') as f:
    content = f.read()

# Update import
content = content.replace("import Layout from './components/Layout';", "import Layout from './components/Layout';\nimport AccessDenied from './components/AccessDenied';")

# Update ProtectedRoute definition
protected_route_new = """const ProtectedRoute: React.FC<{ children: React.ReactNode, requiredRole?: 'CLIENTE' | 'RESELLER' }> = ({ children, requiredRole }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const token = localStorage.getItem('starlink_token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const userJson = localStorage.getItem('starlink_user');
  let userRoles: string[] = [];
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      userRoles = u.role_codes || [];
    } catch (e) {}
  }

  const hasRole = (role: string) => {
    if (Array.isArray(userRoles)) return userRoles.some((r: string) => r.toUpperCase() === role);
    return typeof userRoles === 'string' && userRoles.toUpperCase() === role;
  };

  // Enforce strictly role based routing
  if (requiredRole) {
    if (!hasRole(requiredRole)) {
       return <AccessDenied />;
    }
  }

  // Explicit layout injection based on requiredRole to completely decouple from URL parsing in Layout
  if (requiredRole === 'RESELLER') {
    return <Layout type="RESELLER">{children}</Layout>;
  } else if (requiredRole === 'CLIENTE') {
    return <Layout type="CLIENTE">{children}</Layout>;
  }

  return <Layout>{children}</Layout>;
};"""

content = re.sub(r'const ProtectedRoute.*?return <Layout>{children}</Layout>;\n};', protected_route_new, content, flags=re.DOTALL)

# Update Route declarations
content = content.replace('<ProtectedRoute>', '<ProtectedRoute requiredRole="RESELLER">')
content = content.replace('requiredRole="RESELLER"><Cliente', 'requiredRole="CLIENTE"><Cliente')
content = content.replace('requiredRole="RESELLER"><Alerts /></ProtectedRoute>', 'requiredRole="CLIENTE"><Alerts /></ProtectedRoute>')
# Fix Alerts which are shared. Wait! The ones in /cliente should be CLIENTE.
# It's better to regex replace the whole <Route path="/reseller..." with RESELLER and "/cliente..." with CLIENTE.

# Let's read line by line to safely replace <ProtectedRoute> with <ProtectedRoute requiredRole="..."> based on the path
lines = content.split('\n')
new_lines = []
for line in lines:
    if '<Route path="/reseller' in line and '<ProtectedRoute>' in line:
        line = line.replace('<ProtectedRoute>', '<ProtectedRoute requiredRole="RESELLER">')
    elif '<Route path="/cliente' in line and '<ProtectedRoute>' in line:
        line = line.replace('<ProtectedRoute>', '<ProtectedRoute requiredRole="CLIENTE">')
    new_lines.append(line)

with open('frontend/src/App.tsx', 'w') as f:
    f.write('\n'.join(new_lines))
