import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppState(onChange: (state: AppStateStatus) => void): void {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      callbackRef.current(next);
    });
    return () => sub.remove();
  }, []);
}
