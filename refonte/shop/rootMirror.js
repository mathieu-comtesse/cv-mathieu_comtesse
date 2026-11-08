/* Recopie des attributs d'un élément sur <html> (préfixe + nom), avec comptage des demandeurs et nettoyage à l'abandon. */
const owners = new Map();
export function mirrorToRoot(source, prefix, attributes, signal) {
  const root = document.documentElement;
  const copy = () => {
    for (const [from, suffix] of Object.entries(attributes)) {
      const value = source.getAttribute(from);
      if (value === null) root.removeAttribute(`${prefix}-${suffix}`); else root.setAttribute(`${prefix}-${suffix}`, value);
    }
  };
  const observer = new MutationObserver(copy);
  if (Object.keys(attributes).length) observer.observe(source, { attributeFilter: Object.keys(attributes) });
  let group = owners.get(prefix);
  if (!group) owners.set(prefix, group = new Set());
  group.add(copy);
  root.setAttribute(prefix, '');
  copy();
  signal.addEventListener('abort', () => {
    observer.disconnect(); group.delete(copy);
    if (group.size) { for (const other of group) other(); return; }   // un autre demandeur reste : on resynchronise
    owners.delete(prefix); root.removeAttribute(prefix);
    for (const suffix of Object.values(attributes)) root.removeAttribute(`${prefix}-${suffix}`);
  }, { once: true });
}
export { mirrorToRoot as m };
