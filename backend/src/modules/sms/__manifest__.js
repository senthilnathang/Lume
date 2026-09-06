export default {
  name: 'SMS Gateway',
  technicalName: 'sms',
  version: '1.0.0',
  summary: 'Multi-provider SMS sending with templates and delivery logs',
  description: 'Ported from FastVue sms_gateway: providers, templates with variables, bulk send, retry, and delivery logging.',
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
