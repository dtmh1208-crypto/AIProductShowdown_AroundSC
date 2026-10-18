const activeDialogs = [];
let originalOverflow;

// DOM adapter is separately testable without a browser or a testing framework.
export function activateDialog(dialog, onClose) {
  const doc = dialog.ownerDocument;
  const previousFocus = doc.activeElement;
  if (!activeDialogs.length) { originalOverflow = doc.body.style.overflow; doc.body.style.overflow = 'hidden'; }
  activeDialogs.push(dialog);
  const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]')];
  (focusable()[0] || dialog).focus();
  const keydown = (event) => {
    if (activeDialogs.at(-1) !== dialog) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === 'Tab') {
      const elements = focusable();
      if (!elements.length) { event.preventDefault(); dialog.focus(); return; }
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  };
  doc.addEventListener('keydown', keydown);
  return () => {
    doc.removeEventListener('keydown', keydown);
    const index = activeDialogs.indexOf(dialog);
    const wasTop = index === activeDialogs.length - 1;
    if (index !== -1) activeDialogs.splice(index, 1);
    if (!activeDialogs.length) doc.body.style.overflow = originalOverflow;
    if (wasTop && previousFocus?.isConnected) previousFocus.focus();
  };
}
