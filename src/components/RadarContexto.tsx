// src/components/RadarContexto.tsx
// Radar SVG estrutural — visualiza IL_final das 16 linhas.
// - Sem libs externas. Tema rdwth (var(--r-*)).
// - Suporta overlay de comparação opt-in com outro ciclo.
// - Labels "L1.1" pequenos nos eixos; nomes humanos em hover/tap (tooltip simples).

import { useState, useMemo } from "react";
import { ALL_LINES, LINE_NAMES, DIMENSION_NAMES, DIMENSION_OF } from "@/lib/lineNames";
import type { AggregatedLine } from "@/hooks/useCycleAggregate";

interface Props {
  primary: Record<string, AggregatedLine> | null;
  comparison?: Record<string, AggregatedLine> | null;
  primaryLabel?: string;
  comparisonLabel?: string;
  size?: number;
}

const MAX_IL = 9; // escala 0-9 (faixa A começa em 7)

export default function RadarContexto({
  primary,
  comparison = null,
  primaryLabel = "atual",
  comparisonLabel = "comparação",
  size = 280,
}: Props) {
  const [hoverLine, setHoverLine] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const labelRadius = radius + 18;

  // 16 ângulos (topo = 0deg, sentido horário). Começa em -90° (12 o'clock).
  const angleFor = (i: number) => (-90 + (i * 360) / ALL_LINES.length) * (Math.PI / 180);

  const point = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(MAX_IL, value)) / MAX_IL) * radius;
    const a = angleFor(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const labelPoint = (i: number) => {
    const a = angleFor(i);
    return { x: cx + labelRadius * Math.cos(a), y: cy + labelRadius * Math.sin(a) };
  };

  const buildPath = (data: Record<string, AggregatedLine>) => {
    const pts = ALL_LINES.map((line, i) => {
      const v = data[line]?.il_final;
      return v == null ? null : point(i, v);
    });
    // Se algum ponto faltar, fecha skipping com fallback no centro (visualmente cria reentrância)
    const segs = pts.map((p, i) => {
      if (p) return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      const fallback = point(i, 0);
      return `${i === 0 ? "M" : "L"}${fallback.x.toFixed(2)},${fallback.y.toFixed(2)}`;
    });
    return segs.join(" ") + " Z";
  };

  // Grades: 3 anéis (3, 5, 7) — referenciam faixas C/B/A
  const ringValues = [3, 5, 7];

  // Arcos por dimensão (4 quadrantes de 4 linhas cada)
  const dimArcs = useMemo(() => {
    return (["D1", "D2", "D3", "D4"] as const).map((dim, di) => {
      const startIdx = di * 4;
      const endIdx = startIdx + 3;
      const aStart = angleFor(startIdx) - (Math.PI / 16); // estende meio passo
      const aEnd = angleFor(endIdx) + (Math.PI / 16);
      const r = radius + 4;
      const x1 = cx + r * Math.cos(aStart);
      const y1 = cy + r * Math.sin(aStart);
      const x2 = cx + r * Math.cos(aEnd);
      const y2 = cy + r * Math.sin(aEnd);
      // Label arc midpoint
      const aMid = (aStart + aEnd) / 2;
      const labelR = radius + 38;
      const lx = cx + labelR * Math.cos(aMid);
      const ly = cy + labelR * Math.sin(aMid);
      return {
        dim,
        path: `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
        label: DIMENSION_NAMES[dim],
        lx, ly,
      };
    });
  }, [cx, cy, radius]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible", maxWidth: "100%" }}
        role="img"
        aria-label="radar estrutural das 16 linhas"
      >
        {/* Anéis de grade */}
        {ringValues.map((v) => (
          <circle
            key={v}
            cx={cx} cy={cy}
            r={(v / MAX_IL) * radius}
            fill="none"
            stroke="var(--r-ghost)"
            strokeOpacity={0.35}
            strokeWidth={0.5}
          />
        ))}

        {/* Eixos (16 raios) */}
        {ALL_LINES.map((_, i) => {
          const p = point(i, MAX_IL);
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={p.x} y2={p.y}
              stroke="var(--r-ghost)"
              strokeOpacity={0.25}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Arcos de dimensão */}
        {dimArcs.map((a) => (
          <g key={a.dim}>
            <path d={a.path} fill="none" stroke="var(--r-sub)" strokeOpacity={0.5} strokeWidth={1} />
            <text
              x={a.lx} y={a.ly}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--r-font-sys)",
                fontSize: 8,
                fill: "var(--r-sub)",
                letterSpacing: "0.08em",
              }}
            >
              {a.label}
            </text>
          </g>
        ))}

        {/* Comparação (atrás) */}
        {comparison && (
          <path
            d={buildPath(comparison)}
            fill="var(--r-muted)"
            fillOpacity={0.08}
            stroke="var(--r-muted)"
            strokeOpacity={0.6}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* Primário */}
        {primary && (
          <path
            d={buildPath(primary)}
            fill="var(--r-accent)"
            fillOpacity={0.15}
            stroke="var(--r-accent)"
            strokeOpacity={0.9}
            strokeWidth={1.25}
          />
        )}

        {/* Pontos + labels de linha */}
        {ALL_LINES.map((line, i) => {
          const v = primary?.[line]?.il_final;
          const p = v != null ? point(i, v) : null;
          const lp = labelPoint(i);
          const isHover = hoverLine === line;
          return (
            <g key={line}>
              {p && (
                <circle
                  cx={p.x} cy={p.y}
                  r={isHover ? 3 : 1.8}
                  fill="var(--r-accent)"
                />
              )}
              <text
                x={lp.x} y={lp.y}
                textAnchor="middle"
                dominantBaseline="middle"
                onMouseEnter={() => setHoverLine(line)}
                onMouseLeave={() => setHoverLine(null)}
                onClick={() => setHoverLine(hoverLine === line ? null : line)}
                style={{
                  fontFamily: "var(--r-font-sys)",
                  fontSize: 8,
                  fill: isHover ? "var(--r-accent)" : "var(--r-muted)",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {line}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip + legenda */}
      <div style={{ minHeight: 16, textAlign: "center" }}>
        {hoverLine ? (
          <span style={{ fontFamily: "var(--r-font-sys)", fontSize: 10, color: "var(--r-text)", letterSpacing: "0.04em" }}>
            {hoverLine} · {LINE_NAMES[hoverLine]}
            {primary?.[hoverLine]?.il_final != null && (
              <span style={{ color: "var(--r-sub)" }}>
                {"  ·  "}IL {primary[hoverLine]!.il_final!.toFixed(1)}
                {primary[hoverLine]!.weighting_applied === "weighted_80_20" && " · 80/20"}
              </span>
            )}
          </span>
        ) : (
          <span style={{ fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-ghost)", letterSpacing: "0.06em" }}>
            toque um código pra ver o nome
          </span>
        )}
      </div>

      {/* Legenda comparação */}
      {comparison && (
        <div style={{ display: "flex", gap: 16, fontFamily: "var(--r-font-sys)", fontSize: 9, color: "var(--r-sub)", letterSpacing: "0.06em" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 2, background: "var(--r-accent)" }} />
            {primaryLabel}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 2, background: "var(--r-muted)", opacity: 0.7, borderTop: "1px dashed" }} />
            {comparisonLabel}
          </span>
        </div>
      )}
    </div>
  );
}
