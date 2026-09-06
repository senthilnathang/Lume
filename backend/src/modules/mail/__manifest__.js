export default {
  name: 'Mail',
  technicalName: 'mail',
  version: '1.0.0',
  summary: 'Inbound mail fetch, routing rules, and outbound queue',
  description: 'Ported from FastVue mail: IMAP servers, priority routing rules that create records, message store, and retrying outbound queue.',
  author: 'Lume',
  website: 'https://lume.dev',
  license: 'MIT',
  category: 'Integration',

  application: false,
  installable: true,
  autoInstall: true,

  depends: ['base'],

  models: ['models/index.js'],
  services: ['services/index.js'],
  api: ['api/index.js'],
};
