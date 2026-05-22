// src/components/CollapsibleSections.tsx
// Componente compartilhado de seções colapsáveis estilo "sistema".
// Header (uppercase + linha + `+` rotacionando) → click → expande itens.
// Usado em: ContextSystem (sistema), Privacy, Terms.
//
// Estrutura:
//   sections[].section: string  → header em uppercase
//   sections[].items[]:
//     - label: string           → label do item (small caps)
//     - text: string[]          → parágrafos do item

import { useState } from "react";

export interface CollapsibleSection {
  section: string;
  items: { label: string; text: string[] }[];
}

interface Props {
  sections: CollapsibleSection[];
  /** Quantos initialmente abertos (default: nenhum). */
  initiallyOpen?: number[];
}

export default function CollapsibleSections({ sections, initiallyOpen = [] }: Props) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set(initiallyOpen));
  const toggle = (i: number) => {
    setOpenIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="r-scroll" style={{ padding: "24px 24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map((sec, i) => {
        const isOpen = openIdx.has(i);
        return (
          <div key={sec.section} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header clicável */}
            <div
              onClick={() => toggle(i)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--r-font-sys)",
                fontWeight: 400,
                fontSize: 10,
                color: "var(--r-text)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--r-ghost)",
                paddingBottom: 8,
                paddingTop: 4,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <span>{sec.section}</span>
              <span
                aria-hidden="true"
                style={{
                  fontSize: 12,
                  color: "var(--r-muted)",
                  marginLeft: 12,
                  transition: "transform 200ms ease",
                  transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  display: "inline-block",
                  lineHeight: 1,
                }}
              >
                +
              </span>
            </div>

            {/* Items — só aparecem quando expandido */}
            {isOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 12 }}>
                {sec.items.map((item) => (
                  <div key={item.label} style={{ borderLeft: "1px solid var(--r-ghost)", paddingLeft: 16 }}>
                    <div
                      style={{
                        fontFamily: "var(--r-font-sys)",
                        fontWeight: 400,
                        fontSize: 10,
                        color: "var(--r-sub)",
                        letterSpacing: "0.1em",
                        marginBottom: 8,
                      }}
                    >
                      {item.label}
                    </div>
                    {item.text.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontFamily: "var(--r-font-sys)",
                          fontWeight: 300,
                          fontSize: 11,
                          color: "var(--r-dim)",
                          lineHeight: 1.7,
                          letterSpacing: "0.03em",
                          marginBottom: idx < item.text.length - 1 ? 10 : 0,
                        }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
