import { useEffect, useRef } from 'react';

const layerKey = '__vardagLayer';

export function useHistoryLayer(isOpen: boolean, id: string, onBack: () => void) {
  const activeToken = useRef<string>();
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isOpen || activeToken.current) return undefined;

    const token = `${id}-${crypto.randomUUID()}`;
    activeToken.current = token;
    window.history.pushState({ ...window.history.state, [layerKey]: token }, '');

    const handlePopState = () => {
      if (activeToken.current !== token) return;
      if (window.history.state?.[layerKey] === token) return;
      activeToken.current = undefined;
      onBackRef.current();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (activeToken.current !== token) return;
      activeToken.current = undefined;
      if (window.history.state?.[layerKey] === token) window.history.back();
    };
  }, [id, isOpen]);
}
