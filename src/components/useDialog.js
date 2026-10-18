import { useEffect, useRef } from 'react';
import { activateDialog } from '../utils/dialog.js';

export function useDialog(isOpen, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (isOpen && ref.current) return activateDialog(ref.current, () => closeRef.current?.());
  }, [isOpen]);
  return ref;
}
