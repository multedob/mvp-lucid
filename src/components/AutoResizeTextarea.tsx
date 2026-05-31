import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxRows?: number;
};

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(({
  maxRows = 5,
  onChange,
  onInput,
  style,
  rows = 1,
  value,
  ...props
}, fwdRef) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(fwdRef, () => ref.current as HTMLTextAreaElement);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 22;
    const maxHeight = lineHeight * maxRows;
    el.style.height = "auto";
    el.style.maxHeight = `${maxHeight}px`;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    const overflowing = el.scrollHeight > maxHeight;
    el.style.overflowY = overflowing ? "auto" : "hidden";
    // Keep caret visible: when overflowing, always pin scroll to bottom
    // so the line being typed stays in view on every keystroke.
    if (overflowing) {
      el.scrollTop = el.scrollHeight;
    }
  }, [maxRows]);

  // useLayoutEffect: roda sincronamente após DOM update, antes do paint —
  // evita flash em que o cursor sai de vista por 1 frame entre digitar e scrollar.
  useLayoutEffect(() => { resize(); }, [value, resize]);

  // Recalcula em resize de viewport (mudança de line-height por media query, etc).
  useEffect(() => {
    const handler = () => resize();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      onChange={e => { onChange?.(e); }}
      onInput={e => {
        onInput?.(e);
        // Ajusta no mesmo frame do input — cobre casos onde o componente
        // é não-controlado (sem value mudando via prop) e o useLayoutEffect
        // acima não dispararia.
        resize();
      }}
      style={{ ...style, resize: "none" }}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";
