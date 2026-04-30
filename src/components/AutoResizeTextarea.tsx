import { forwardRef, useEffect, useImperativeHandle, useRef, type TextareaHTMLAttributes } from "react";

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  maxRows?: number;
};

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(({
  maxRows = 5,
  onChange,
  style,
  rows = 1,
  value,
  ...props
}, fwdRef) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(fwdRef, () => ref.current as HTMLTextAreaElement);

  function resize() {
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 22;
    const maxHeight = lineHeight * maxRows;
    el.style.height = "auto";
    el.style.maxHeight = `${maxHeight}px`;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    el.scrollTop = el.scrollHeight;
  }

  useEffect(() => { resize(); }, [value, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      onChange={e => {
        onChange?.(e);
        requestAnimationFrame(resize);
      }}
      style={{ ...style, resize: "none" }}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";