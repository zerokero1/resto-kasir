import { useState, useEffect, useCallback } from 'react';

export function useSupabaseQuery(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await fn();
      setData(d);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, deps.concat(fn));

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, reload: run };
}