// supabase/functions/_shared/eco/operators/op04-weight.ts
// OP04 Weight — detecção determinística de hesitação.
// Spec §4.4 + appendix PT-BR §1.
// Concatena M2 + M4, conta ocorrências de marcadores de hesitação ordenados
// por tamanho (frase mais longa primeiro), dispara se total ≥ threshold PT-BR.

import type { EcoInputs, DetectionResult, Operator, Locale } from '../types.ts';
import {
  HESITATION_MARKERS_PT_BR,
  HESITATION_THRESHOLD_PT_BR,
} from '../locale/pt-br/index.ts';

// ─── Contagem com masking (evita dupla captura) ──────────────────

/**
 * Conta marcadores respeitando a ordem (longo primeiro) e mascara cada
 * match para evitar que sub-marcadores contem duas vezes.
 * Ex.: "não tenho certeza" (frase longa) não deve ser contado de novo
 * como "não sei" ou similar.
 */
function countMarkersMasked(
  text: string,
  markers: readonly string[]
): { total: number; byMarker: Record<string, number> } {
  let working = text.toLowerCase();
  const byMarker: Record<string, number> = {};
  let total = 0;

  for (const marker of markers) {
    const normalized = marker.toLowerCase();
    if (!normalized) continue;

    let count = 0;
    let searchFrom = 0;
    while (true) {
      const idx = working.indexOf(normalized, searchFrom);
      if (idx === -1) break;

      // Validação de fronteira: a match não pode estar no meio de outra palavra.
      const before = idx === 0 ? ' ' : working[idx - 1];
      const afterIdx = idx + normalized.length;
      const after = afterIdx >= working.length ? ' ' : working[afterIdx];
      const isWordBoundary =
        /[\s,.;:!?()\-—–/"'`]/.test(before) &&
        /[\s,.;:!?()\-—–/"'`]/.test(after);

      if (isWordBoundary) {
        count++;
        // mascara pra evitar overlap
        working =
          working.slice(0, idx) +
          ' '.repeat(normalized.length) +
          working.slice(afterIdx);
        searchFrom = afterIdx;
      } else {
        searchFrom = idx + 1;
      }
    }

    if (count > 0) {
      byMarker[normalized] = count;
      total += count;
    }
  }

  return { total, byMarker };
}

// ─── Detector ────────────────────────────────────────────────────

export const OP04_Weight: Operator = {
  id: 'OP04',
  detect(inputs: EcoInputs, _locale: Locale): DetectionResult {
    const combined = [inputs.m2 ?? '', inputs.m4 ?? ''].join(' ').trim();
    if (!combined) {
      return { triggered: false, rejection_reason: 'empty m2 + m4' };
    }

    const { total, byMarker } = countMarkersMasked(combined, HESITATION_MARKERS_PT_BR);

    if (total < HESITATION_THRESHOLD_PT_BR) {
      return {
        triggered: false,
        metadata: { total, byMarker },
        rejection_reason: `total ${total} < threshold ${HESITATION_THRESHOLD_PT_BR}`,
      };
    }

    // Identifica marcador dominante para rotação V0/V1/V3 no renderer/selector.
    const sorted = Object.entries(byMarker).sort((a, b) => b[1] - a[1]);
    const dominantMarker = sorted[0]?.[0] ?? '';

    return {
      triggered: true,
      fragments: Object.keys(byMarker),
      metadata: {
        total_hesitations: total,
        by_marker: byMarker,
        dominant_marker: dominantMarker,
      },
      rejection_reason: null,
    };
  },
};

// Export interno para testes.
export { countMarkersMasked };
