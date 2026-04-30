// src/hooks/useCycleAggregate.ts
// Hook + cache em memória para resultado do edge `ipe-cycle-aggregate`.
// Honra ponderação 80/20 D2 (não chamar canonical_ils diretamente).

import { useEffect, useState } from "react";
import { callEdgeFunction } from "@/lib/api";

export interface AggregatedLine {
  il_auto: number | null;
  il_external_avg: number | null;
  il_final: number | null;
  faixa_final: "A" | "B" | "C" | "D" | null;
  weighting_applied: "self_only" | "weighted_80_20";
  external_count: number;
}

export interface CycleAggregateResult {
  ok: boolean;
  cycle_number: number;
  completion_status: string;
  third_parties: { alpha: number; beta: number; total: number };
  lines_complete_auto: number;
  il_aggregated: Record<string, AggregatedLine>;
}

// Cache simples em memória durante a sessão
const cache = new Map<string, CycleAggregateResult>();

export function useCycleAggregate(ipeCycleId: string | null | undefined) {
  const [data, setData] = useState<CycleAggregateResult | null>(
    ipeCycleId ? cache.get(ipeCycleId) ?? null : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ipeCycleId) return;
    const cached = cache.get(ipeCycleId);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    callEdgeFunction<CycleAggregateResult>("ipe-cycle-aggregate", { ipe_cycle_id: ipeCycleId })
      .then((res) => {
        if (cancelled) return;
        cache.set(ipeCycleId, res);
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [ipeCycleId]);

  return { data, loading, error };
}

export function invalidateCycleAggregate(ipeCycleId?: string) {
  if (ipeCycleId) cache.delete(ipeCycleId);
  else cache.clear();
}
