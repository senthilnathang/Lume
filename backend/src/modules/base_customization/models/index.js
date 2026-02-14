/**
 * Base Customization Models
 */

import { DataTypes } from 'sequelize';

export const CustomFieldModel = (sequelize) => {
  const CustomField = sequelize.define('CustomField', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    fieldType: {
      type: DataTypes.ENUM('text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'textarea', 'email', 'url', 'phone', 'currency', 'json'),
      defaultValue: 'text',
      field: 'field_type'
    },
    options: {
      type: DataTypes.JSON,
      defaultValue: null
    },
    defaultValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'default_value'
    },
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    unique: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    helpText: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'help_text'
    },
    placeholder: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    sequence: {
      type: DataTypes.INTEGER,
      defaultValue: 10
    },
    group: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'custom_fields',
    timestamps: true,
    underscored: true
  });

  return CustomField;
};

export const CustomViewModel = (sequelize) => {
  const CustomView = sequelize.define('CustomView', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    viewType: {
      type: DataTypes.ENUM('list', 'kanban', 'calendar', 'gallery', 'chart'),
      defaultValue: 'list',
      field: 'view_type'
    },
    config: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    filters: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    sortBy: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'sort_by'
    },
    columns: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default'
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_shared'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'custom_views',
    timestamps: true,
    underscored: true
  });

  return CustomView;
};

export const FormLayoutModel = (sequelize) => {
  const FormLayout = sequelize.define('FormLayout', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    layout: {
      type: DataTypes.JSON,
      defaultValue: { sections: [] }
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'form_layouts',
    timestamps: true,
    underscored: true
  });

  return FormLayout;
};

export const ListConfigModel = (sequelize) => {
  const ListConfig = sequelize.define('ListConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    columns: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    defaultSort: {
      type: DataTypes.JSON,
      defaultValue: {},
      field: 'default_sort'
    },
    defaultFilters: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'default_filters'
    },
    pageSize: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
      field: 'page_size'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'list_configs',
    timestamps: true,
    underscored: true
  });

  return ListConfig;
};

export const DashboardWidgetModel = (sequelize) => {
  const DashboardWidget = sequelize.define('DashboardWidget', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    widgetType: {
      type: DataTypes.ENUM('counter', 'chart', 'table', 'list', 'progress', 'custom'),
      defaultValue: 'counter',
      field: 'widget_type'
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    config: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    position: {
      type: DataTypes.JSON,
      defaultValue: { x: 0, y: 0, w: 4, h: 2 }
    },
    refreshInterval: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'refresh_interval'
    },
    roles: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'dashboard_widgets',
    timestamps: true,
    underscored: true
  });

  return DashboardWidget;
};

export default {
  CustomFieldModel,
  CustomViewModel,
  FormLayoutModel,
  ListConfigModel,
  DashboardWidgetModel
};
