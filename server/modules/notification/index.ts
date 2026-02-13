import type { ModuleDefinition } from '../_types';
import { manifest } from './__manifest__';
import { Notification } from './models/notification.model';

export { Notification };

const notificationModule: ModuleDefinition = {
  manifest,
  initModels(sequelize) {
    Notification.initModel(sequelize);
  },
};

export default notificationModule;
