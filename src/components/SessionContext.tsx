'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { permits, type Role } from '@/lib/auth';
const Context = createContext<{ name: string; role: Role }>({ name: 'Famille', role: 'reader' });
export function SessionProvider({ value, children }: { value: { name: string; role: Role }; children: ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useSession() { const session = useContext(Context); return { ...session, canEdit: permits(session.role, 'contributor'), isAdmin: session.role === 'admin' }; }
