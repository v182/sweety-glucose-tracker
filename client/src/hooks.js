import { useEffect, useState } from 'react';
import { api } from './api.js';

export function useRemote(path, revision = 0, keepPrevious = false) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    setState((previous) => ({
      data: keepPrevious ? previous.data : null,
      loading: true,
      error: '',
    }));
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      })
      .catch((error) => {
        if (error.name !== 'AbortError' && !controller.signal.aborted)
          setState((previous) => ({
            data: keepPrevious ? previous.data : null,
            loading: false,
            error: error.message,
          }));
      });
    return () => controller.abort();
  }, [path, revision, keepPrevious]);
  return state;
}
