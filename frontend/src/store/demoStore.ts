import { create } from 'zustand';

type Role = 'RESELLER' | 'CLIENTE';

interface DemoState {
  role: Role;
  tenantId: number | null;
  setRole: (role: Role) => void;
  setTenantId: (tenantId: number | null) => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  role: 'CLIENTE',
  tenantId: 1, // Default tenant ID for client demo
  setRole: (role) => set({ role, tenantId: role === 'CLIENTE' ? 1 : null }), // Reseller can see all initially
  setTenantId: (tenantId) => set({ tenantId }),
}));
