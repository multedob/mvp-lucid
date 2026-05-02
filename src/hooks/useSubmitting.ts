// src/hooks/useSubmitting.ts
// Previne double-submit em handlers async.
// Aplicar em qualquer handler que dispare mutação no banco ou navegação irreversível.
//
// Uso:
//   const [submitting, wrap] = useSubmitting();
//   const handleClick = wrap(async () => {
//     await supabase.auth.updateUser({ ... });
//     navigate("/home");
//   });
//   <button onClick={handleClick} disabled={submitting}>continuar</button>

import { useCallback, useRef, useState } from "react";

type AnyAsyncFn = (...args: any[]) => Promise<any>;

export function useSubmitting() {
  const [submitting, setSubmitting] = useState(false);
  const lockRef = useRef(false);

  const wrap = useCallback(<T extends AnyAsyncFn>(fn: T): T => {
    return (async (...args: Parameters<T>) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setSubmitting(true);
      try {
        return await fn(...args);
      } finally {
        lockRef.current = false;
        setSubmitting(false);
      }
    }) as T;
  }, []);

  return [submitting, wrap] as const;
}
