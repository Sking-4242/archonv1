const _mods = import.meta.glob('./azure/*.svg', { eager: true, query: '?url', import: 'default' });

export const AZURE_ICONS = Object.fromEntries(
  Object.entries(_mods).map(([path, url]) => [
    path.replace('./azure/', '').replace('.svg', ''),
    url,
  ])
);
