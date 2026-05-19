const _mods = import.meta.glob('./gcp/*.svg', { eager: true, query: '?url', import: 'default' });

export const GCP_ICONS = Object.fromEntries(
  Object.entries(_mods).map(([path, url]) => [
    path.replace('./gcp/', '').replace('.svg', ''),
    url,
  ])
);
