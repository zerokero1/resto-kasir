import { useState, useEffect, useCallback, useRef } from 'react';

// Hook query ringan dengan proteksi race-condition:
// - respons yang sudah kedaluwarsa (ada fetch baru di depan) diabaikan,
//   sehingga ganti tanggal/tab dengan cepat tidak menampilkan data tanggal lama.
// - hanya re-fetch saat dependency berubah (tidak setiap render).
export function useSupabaseQuery(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const d = await fnRef.current();
      if (id !== seq.current) return;
      setData(d);
    } catch (e) {
      if (id !== seq.current) return;
      setError(e);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, error, loading, reload: run };
}