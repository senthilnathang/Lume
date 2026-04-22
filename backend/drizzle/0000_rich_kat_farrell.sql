CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`short_description` varchar(500),
	`category` varchar(100),
	`status` varchar(20) DEFAULT 'draft',
	`start_date` timestamp,
	`end_date` timestamp,
	`location` varchar(255),
	`cover_image` varchar(500),
	`gallery` json DEFAULT ('[]'),
	`capacity` int,
	`registered_count` int DEFAULT 0,
	`is_featured` boolean DEFAULT false,
	`metadata` json DEFAULT ('{}'),
	`created_by` int,
	`published_at` timestamp,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`),
	CONSTRAINT `activities_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`file_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`file_size` int,
	`mime_type` varchar(100),
	`attachable_type` varchar(100) NOT NULL,
	`attachable_id` int NOT NULL,
	`uploaded_by` int,
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`body` text NOT NULL,
	`commentable_type` varchar(100) NOT NULL,
	`commentable_id` int NOT NULL,
	`parent_id` int,
	`user_id` int NOT NULL,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`channel_type` varchar(20) NOT NULL,
	`config` json DEFAULT ('{}'),
	`is_default` boolean DEFAULT false,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `notification_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`type` varchar(20) DEFAULT 'info',
	`channel` varchar(20) DEFAULT 'in_app',
	`related_model` varchar(100),
	`related_id` int,
	`action_url` varchar(500),
	`read_at` timestamp,
	`status` varchar(20) DEFAULT 'unread',
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taggings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`tag_id` int NOT NULL,
	`taggable_type` varchar(100) NOT NULL,
	`taggable_id` int NOT NULL,
	CONSTRAINT `taggings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`color` varchar(20) DEFAULT '#1890ff',
	`description` varchar(255),
	`category` varchar(100),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`webhook_id` int NOT NULL,
	`event` varchar(100) NOT NULL,
	`payload` json DEFAULT ('{}'),
	`response_status` int,
	`response_body` text,
	`duration` int,
	`status` varchar(20) DEFAULT 'pending',
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`url` varchar(500) NOT NULL,
	`events` json DEFAULT ('[]'),
	`headers` json DEFAULT ('{}'),
	`secret` varchar(255),
	`model` varchar(100),
	`retry_count` int DEFAULT 3,
	`last_triggered_at` timestamp,
	`last_status` varchar(20),
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_approval_chains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`description` text,
	`steps` json DEFAULT ('[]'),
	`condition` json DEFAULT ('{}'),
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `automation_approval_chains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_assignment_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`description` text,
	`assign_to` varchar(20) DEFAULT 'user',
	`assignee_id` int,
	`condition` json DEFAULT ('{}'),
	`priority` int DEFAULT 10,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `automation_assignment_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_business_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`field` varchar(100) NOT NULL,
	`description` text,
	`condition` json DEFAULT ('{}'),
	`action` json DEFAULT ('{}'),
	`priority` int DEFAULT 10,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `automation_business_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`description` text,
	`nodes` json DEFAULT ('[]'),
	`edges` json DEFAULT ('[]'),
	`trigger` varchar(20) DEFAULT 'manual',
	`status` varchar(20) DEFAULT 'draft',
	CONSTRAINT `automation_flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_rollup_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`parent_model` varchar(100) NOT NULL,
	`child_model` varchar(100) NOT NULL,
	`rollup_field` varchar(100) NOT NULL,
	`target_field` varchar(100) NOT NULL,
	`operation` varchar(20) DEFAULT 'sum',
	`filter_condition` json DEFAULT ('{}'),
	`description` text,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `automation_rollup_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_scheduled_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100),
	`description` text,
	`action_type` varchar(20) DEFAULT 'code',
	`config` json DEFAULT ('{}'),
	`cron_expression` varchar(100),
	`interval` int,
	`interval_unit` varchar(20) DEFAULT 'hours',
	`last_run_at` timestamp,
	`next_run_at` timestamp,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `automation_scheduled_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_validation_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`field` varchar(100),
	`description` text,
	`rule_type` varchar(20) DEFAULT 'required',
	`config` json DEFAULT ('{}'),
	`error_message` varchar(255),
	`priority` int DEFAULT 10,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `automation_validation_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`description` text,
	`states` json DEFAULT ('[]'),
	`transitions` json DEFAULT ('[]'),
	`initial_state` varchar(50),
	`status` varchar(20) DEFAULT 'draft',
	CONSTRAINT `automation_workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`label` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`field_type` varchar(20) DEFAULT 'text',
	`options` json,
	`default_value` varchar(255),
	`required` boolean DEFAULT false,
	`unique` boolean DEFAULT false,
	`help_text` varchar(255),
	`placeholder` varchar(255),
	`sequence` int DEFAULT 10,
	`group` varchar(100),
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `custom_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`view_type` varchar(20) DEFAULT 'list',
	`config` json DEFAULT ('{}'),
	`filters` json DEFAULT ('[]'),
	`sort_by` json DEFAULT ('[]'),
	`columns` json DEFAULT ('[]'),
	`is_default` boolean DEFAULT false,
	`is_shared` boolean DEFAULT false,
	`created_by` int,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `custom_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`widget_type` varchar(20) DEFAULT 'counter',
	`model` varchar(100),
	`config` json DEFAULT ('{}'),
	`position` json DEFAULT ('{}'),
	`refresh_interval` int DEFAULT 0,
	`roles` json DEFAULT ('[]'),
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `dashboard_widgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `form_layouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`layout` json DEFAULT ('{}'),
	`is_default` boolean DEFAULT false,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `form_layouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `list_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`columns` json DEFAULT ('[]'),
	`default_sort` json DEFAULT ('{}'),
	`default_filters` json DEFAULT ('[]'),
	`page_size` int DEFAULT 20,
	`is_default` boolean DEFAULT false,
	`created_by` int,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `list_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`type` varchar(20) DEFAULT 'full',
	`file_path` varchar(500),
	`file_size` bigint,
	`tables` json DEFAULT ('[]'),
	`status` varchar(20) DEFAULT 'pending',
	`created_by` int,
	CONSTRAINT `backups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_exports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`model` varchar(100) NOT NULL,
	`filters` json DEFAULT ('{}'),
	`fields` json DEFAULT ('[]'),
	`format` varchar(20) DEFAULT 'csv',
	`file_path` varchar(500),
	`file_size` int,
	`record_count` int DEFAULT 0,
	`status` varchar(20) DEFAULT 'pending',
	`exported_by` int,
	CONSTRAINT `data_exports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`model` varchar(100) NOT NULL,
	`file_name` varchar(255),
	`file_path` varchar(500),
	`mapping` json DEFAULT ('{}'),
	`total_rows` int DEFAULT 0,
	`processed_rows` int DEFAULT 0,
	`success_rows` int DEFAULT 0,
	`failed_rows` int DEFAULT 0,
	`errors` json DEFAULT ('[]'),
	`status` varchar(20) DEFAULT 'pending',
	`imported_by` int,
	CONSTRAINT `data_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`key` varchar(100) NOT NULL,
	`description` text,
	`enabled` boolean DEFAULT false,
	`enabled_for` json DEFAULT ('[]'),
	`disabled_for` json DEFAULT ('[]'),
	`config` json DEFAULT ('{}'),
	`expires_at` timestamp,
	`sequence` int DEFAULT 10,
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_name_unique` UNIQUE(`name`),
	CONSTRAINT `feature_flags_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `rbac_access_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`role_id` int,
	`permission` varchar(50) NOT NULL,
	`field` varchar(100),
	`filter` json,
	`is_active` boolean DEFAULT true,
	`priority` int DEFAULT 0,
	CONSTRAINT `rbac_access_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rbac_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(150) NOT NULL,
	`description` varchar(255),
	`group_name` varchar(100),
	`category` varchar(50),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rbac_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `rbac_permissions_name_unique` UNIQUE(`name`),
	CONSTRAINT `rbac_permissions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `rbac_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`permissions` json DEFAULT ('[]'),
	`is_system` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `rbac_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `rbac_roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`key` varchar(255) NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`user_id` int,
	`expires_at` timestamp,
	`last_used_at` timestamp,
	`status` varchar(20) DEFAULT 'active',
	`scopes` json DEFAULT ('[]'),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `ip_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`ip_address` varchar(45) NOT NULL,
	`description` varchar(255),
	`type` varchar(20) NOT NULL,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `ip_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `ip_access_ip_address_unique` UNIQUE(`ip_address`)
);
--> statement-breakpoint
CREATE TABLE `security_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`user_id` int,
	`event` varchar(100) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`details` json,
	`status` varchar(20) DEFAULT 'success',
	CONSTRAINT `security_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`user_id` int NOT NULL,
	`token` varchar(500) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`expires_at` timestamp NOT NULL,
	`last_activity_at` timestamp,
	`status` varchar(20) DEFAULT 'active',
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `two_factor` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`user_id` int NOT NULL,
	`secret` varchar(255) NOT NULL,
	`backup_codes` json,
	`enabled` boolean DEFAULT false,
	`verified_at` timestamp,
	CONSTRAINT `two_factor_id` PRIMARY KEY(`id`),
	CONSTRAINT `two_factor_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `custom_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`color` varchar(20),
	`is_publishable` boolean DEFAULT false,
	`is_published` boolean DEFAULT false,
	`created_by` int,
	CONSTRAINT `custom_entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_entities_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `entity_fields` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`entity_id` int NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`required` boolean DEFAULT false,
	`unique` boolean DEFAULT false,
	`validation` text,
	`position` int DEFAULT 0,
	`default_value` text,
	CONSTRAINT `entity_fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_sync_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`entity_id` int,
	`source` varchar(50) NOT NULL,
	`action` varchar(50) NOT NULL,
	`changes` json DEFAULT ('{}'),
	`synced_at` timestamp,
	`status` varchar(50) NOT NULL,
	CONSTRAINT `entity_sync_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entity_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`entity_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`is_default` boolean DEFAULT false,
	`config` json DEFAULT ('{}'),
	CONSTRAINT `entity_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`title` varchar(255) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`mime_type` varchar(100),
	`size` int,
	`type` varchar(20) DEFAULT 'document',
	`category` varchar(100),
	`path` varchar(500) NOT NULL,
	`url` varchar(500),
	`description` text,
	`tags` json DEFAULT ('[]'),
	`uploaded_by` int,
	`is_public` boolean DEFAULT false,
	`downloads` int DEFAULT 0,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`goal_amount` decimal(12,2),
	`raised_amount` decimal(12,2) DEFAULT '0',
	`start_date` timestamp,
	`end_date` timestamp,
	`status` varchar(20) DEFAULT 'draft',
	`cover_image` varchar(500),
	`is_featured` boolean DEFAULT false,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaigns_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`donor_id` int,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`status` varchar(20) DEFAULT 'pending',
	`payment_method` varchar(20),
	`transaction_id` varchar(255),
	`payment_gateway` varchar(50),
	`campaign_id` int,
	`activity_id` int,
	`designation` varchar(255),
	`is_recurring` boolean DEFAULT false,
	`frequency` varchar(20) DEFAULT 'one_time',
	`receipt_sent` boolean DEFAULT false,
	`receipt_sent_at` timestamp,
	`notes` text,
	`anonymous` boolean DEFAULT false,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `donations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`country` varchar(100),
	`postal_code` varchar(20),
	`is_anonymous` boolean DEFAULT false,
	`is_subscribed` boolean DEFAULT true,
	`notes` text,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `donors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editor_global_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`block_type` varchar(100) NOT NULL,
	`content` longtext NOT NULL,
	`created_by` int DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	`deleted_at` timestamp DEFAULT null,
	CONSTRAINT `editor_global_widgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editor_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_id` int NOT NULL,
	`block_id` varchar(255) DEFAULT null,
	`content` text NOT NULL,
	`author_id` int NOT NULL,
	`parent_id` int DEFAULT null,
	`is_resolved` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `editor_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editor_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`block_type` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`attributes` longtext,
	`thumbnail_url` varchar(500),
	`created_by` int,
	CONSTRAINT `editor_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editor_snippets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`name` varchar(255) NOT NULL,
	`content` longtext,
	`category` varchar(100) DEFAULT 'general',
	`icon` varchar(100),
	`shortcut` varchar(50),
	`thumbnail_url` varchar(500),
	`is_global` boolean DEFAULT false,
	`usage_count` int DEFAULT 0,
	`created_by` int,
	CONSTRAINT `editor_snippets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editor_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`name` varchar(255) NOT NULL,
	`description` text,
	`content` longtext,
	`category` varchar(100) DEFAULT 'general',
	`is_default` boolean DEFAULT false,
	`thumbnail_url` varchar(500),
	`created_by` int,
	CONSTRAINT `editor_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`title` varchar(255) NOT NULL,
	`description` text,
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`mime_type` varchar(100),
	`size` int,
	`type` varchar(20) DEFAULT 'document',
	`category` varchar(100),
	`path` varchar(500) NOT NULL,
	`url` varchar(500),
	`thumbnail_url` varchar(500),
	`alt_text` varchar(255),
	`caption` varchar(500),
	`width` int,
	`height` int,
	`uploaded_by` int,
	`downloads` int DEFAULT 0,
	`views` int DEFAULT 0,
	`is_public` boolean DEFAULT true,
	`is_featured` boolean DEFAULT false,
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `media_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`subject` varchar(255),
	`content` text NOT NULL,
	`sender_name` varchar(255),
	`sender_email` varchar(255) NOT NULL,
	`sender_phone` varchar(20),
	`recipient_email` varchar(255),
	`type` varchar(20) DEFAULT 'contact',
	`status` varchar(20) DEFAULT 'new',
	`priority` varchar(20) DEFAULT 'normal',
	`is_starred` boolean DEFAULT false,
	`metadata` json DEFAULT ('{}'),
	`read_at` timestamp,
	`replied_at` timestamp,
	`assigned_to` int,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(20),
	`position` varchar(100),
	`department` varchar(100),
	`bio` text,
	`photo` varchar(500),
	`order` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`is_leader` boolean DEFAULT false,
	`social_links` json DEFAULT ('{}'),
	`metadata` json DEFAULT ('{}'),
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_members_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `website_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parent_id` int,
	`sequence` int DEFAULT 0,
	CONSTRAINT `website_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_custom_fonts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`family` varchar(255) NOT NULL,
	`weight` int DEFAULT 400,
	`style` varchar(20) DEFAULT 'normal',
	`file_url` varchar(500) NOT NULL,
	`format` varchar(20) DEFAULT 'woff2',
	CONSTRAINT `website_custom_fonts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_custom_icons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`set_name` varchar(100) DEFAULT 'custom',
	`svg_content` longtext NOT NULL,
	`tags` varchar(500),
	CONSTRAINT `website_custom_icons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_form_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`form_id` int NOT NULL,
	`data` longtext,
	`ip_address` varchar(45),
	`user_agent` text,
	`is_read` boolean DEFAULT false,
	`page_slug` varchar(255),
	CONSTRAINT `website_form_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`fields` longtext,
	`settings` longtext,
	`is_active` boolean DEFAULT true,
	`submission_count` int DEFAULT 0,
	CONSTRAINT `website_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`filename` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`path` varchar(500) NOT NULL,
	`url` varchar(500),
	`mime_type` varchar(100),
	`size` int,
	`width` int,
	`height` int,
	`alt_text` varchar(255),
	`caption` text,
	`folder` varchar(255) DEFAULT 'general',
	`uploaded_by` int,
	CONSTRAINT `website_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`menu_id` int NOT NULL,
	`label` varchar(150) NOT NULL,
	`url` varchar(500),
	`page_id` int,
	`target` varchar(10) DEFAULT '_self',
	`icon` varchar(100),
	`parent_id` int,
	`sequence` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`css_class` varchar(255),
	`description` text,
	`mega_menu_content` longtext DEFAULT null,
	CONSTRAINT `website_menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(100) NOT NULL,
	`location` varchar(20) DEFAULT 'header',
	`is_active` boolean DEFAULT true,
	CONSTRAINT `website_menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_page_categories` (
	`page_id` int NOT NULL,
	`category_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `website_page_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`page_id` int NOT NULL,
	`content` longtext,
	`content_html` longtext,
	`revision_number` int DEFAULT 1,
	`change_description` varchar(255),
	`created_by` int,
	`is_auto_save` boolean DEFAULT false,
	CONSTRAINT `website_page_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_page_tags` (
	`page_id` int NOT NULL,
	`tag_id` int NOT NULL
);
--> statement-breakpoint
CREATE TABLE `website_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`title` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`content` longtext,
	`content_html` longtext,
	`excerpt` text,
	`template` varchar(50) DEFAULT 'default',
	`page_type` varchar(20) DEFAULT 'page',
	`featured_image` varchar(500),
	`meta_title` varchar(255),
	`meta_description` text,
	`meta_keywords` varchar(500),
	`focus_keyword` varchar(255),
	`og_title` varchar(255),
	`og_description` text,
	`og_image` varchar(500),
	`canonical_url` varchar(500),
	`no_index` boolean DEFAULT false,
	`no_follow` boolean DEFAULT false,
	`is_published` boolean DEFAULT false,
	`published_at` timestamp,
	`parent_id` int,
	`sequence` int DEFAULT 0,
	`show_in_menu` boolean DEFAULT false,
	`custom_css` text,
	`head_scripts` text,
	`body_scripts` text,
	`created_by` int,
	`publish_at` timestamp,
	`expire_at` timestamp,
	`visibility` varchar(20) DEFAULT 'public',
	`password_hash` varchar(255),
	`locked_by` int,
	`locked_at` timestamp,
	CONSTRAINT `website_pages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_popups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`content` longtext,
	`content_html` longtext,
	`trigger_type` varchar(20) DEFAULT 'page-load',
	`trigger_value` varchar(100),
	`position` varchar(20) DEFAULT 'center',
	`width` varchar(20) DEFAULT 'md',
	`overlay_close` boolean DEFAULT true,
	`show_once` boolean DEFAULT true,
	`conditions` longtext,
	`is_active` boolean DEFAULT false,
	CONSTRAINT `website_popups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_redirects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`source_path` varchar(500) NOT NULL,
	`target_path` varchar(500) NOT NULL,
	`status_code` int DEFAULT 301,
	`hits` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `website_redirects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`key` varchar(100) NOT NULL,
	`value` text,
	`type` varchar(20) DEFAULT 'string',
	CONSTRAINT `website_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	CONSTRAINT `website_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `website_theme_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`name` varchar(255) NOT NULL,
	`type` varchar(50) DEFAULT 'header',
	`content` longtext,
	`content_html` longtext,
	`conditions` longtext,
	`priority` int DEFAULT 10,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `website_theme_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `entity_fields` ADD CONSTRAINT `entity_fields_entity_id_custom_entities_id_fk` FOREIGN KEY (`entity_id`) REFERENCES `custom_entities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_sync_history` ADD CONSTRAINT `entity_sync_history_entity_id_custom_entities_id_fk` FOREIGN KEY (`entity_id`) REFERENCES `custom_entities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_views` ADD CONSTRAINT `entity_views_entity_id_custom_entities_id_fk` FOREIGN KEY (`entity_id`) REFERENCES `custom_entities`(`id`) ON DELETE cascade ON UPDATE no action;