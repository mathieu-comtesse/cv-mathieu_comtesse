// Résolution de « three » vers la copie du dépôt, pour exécuter les modules de spatial/ sous Node (importmap du navigateur).
export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('../vendor/three.module.min.js', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) return { url: new URL('../vendor/' + specifier.slice(13), import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
