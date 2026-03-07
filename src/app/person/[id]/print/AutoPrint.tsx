'use client';
import { useEffect } from 'react';

export default function AutoPrint() {
  useEffect(() => {
    // Small delay to let the page render fully before printing
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return null;
}
