const _mods = import.meta.glob('./aws/*.svg', { eager: true, query: '?url', import: 'default' });

export const AWS_ICONS = Object.fromEntries(
  Object.entries(_mods).map(([path, url]) => [
    path.replace('./aws/', '').replace('.svg', ''),
    url,
  ])
);
