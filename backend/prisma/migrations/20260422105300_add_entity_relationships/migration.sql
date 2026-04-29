-- AlterTable
ALTER TABLE `entity_records` ADD COLUMN `company_id` INT,
ADD COLUMN `visibility` VARCHAR(50) NOT NULL DEFAULT 'private',
ADD INDEX `entity_records_company_id`(`company_id`);

-- CreateTable
CREATE TABLE `entity_relationships` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `source_entity_id` INT NOT NULL,
    `target_entity_id` INT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `reverse_label` VARCHAR(255),
    `cascade_delete` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_relationship_records` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `relationship_id` INT NOT NULL,
    `source_record_id` INT NOT NULL,
    `target_record_id` INT NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_field_permissions` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `field_id` INT NOT NULL,
    `role_id` INT NOT NULL,
    `can_read` BOOLEAN NOT NULL DEFAULT true,
    `can_write` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `entity_field_permissions_field_id_role_id`(`field_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddIndex
ALTER TABLE `entity_relationships` ADD INDEX `entity_relationships_source_entity_id`(`source_entity_id`);
ALTER TABLE `entity_relationships` ADD INDEX `entity_relationships_target_entity_id`(`target_entity_id`);

-- AddIndex
ALTER TABLE `entity_relationship_records` ADD INDEX `entity_relationship_records_relationship_id`(`relationship_id`);
ALTER TABLE `entity_relationship_records` ADD INDEX `entity_relationship_records_source_record_id`(`source_record_id`);
ALTER TABLE `entity_relationship_records` ADD INDEX `entity_relationship_records_target_record_id`(`target_record_id`);

-- AddIndex
ALTER TABLE `entity_field_permissions` ADD INDEX `entity_field_permissions_field_id`(`field_id`);
ALTER TABLE `entity_field_permissions` ADD INDEX `entity_field_permissions_role_id`(`role_id`);

-- AddForeignKey
ALTER TABLE `entity_relationships` ADD CONSTRAINT `entity_relationships_source_entity_id` FOREIGN KEY (`source_entity_id`) REFERENCES `entities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_relationships` ADD CONSTRAINT `entity_relationships_target_entity_id` FOREIGN KEY (`target_entity_id`) REFERENCES `entities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_relationship_records` ADD CONSTRAINT `entity_relationship_records_relationship_id` FOREIGN KEY (`relationship_id`) REFERENCES `entity_relationships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_field_permissions` ADD CONSTRAINT `entity_field_permissions_field_id` FOREIGN KEY (`field_id`) REFERENCES `entity_fields`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_field_permissions` ADD CONSTRAINT `entity_field_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
