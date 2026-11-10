import { useEffect, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return [toast, setToast];
}
