#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function toCamelCase(str) {
  return str.split('-').map((word, index) => {
    if (index === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join('');
}

function capitalize(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

const moduleName = process.argv[2];
if (!moduleName) {
  console.error('Usage: node scripts/generate-module.js <moduleName>');
  process.exit(1);
}

const moduleDir = path.join(__dirname, '../src/modules', moduleName);
const dirs = [
  moduleDir,
  path.join(moduleDir, 'controllers'),
  path.join(moduleDir, 'services'),
  path.join(moduleDir, 'dtos'),
];

// Create directories
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Templates
const camelModuleName = capitalize(moduleName);

const controllerContent = `import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ${camelModuleName}Service } from '../services/${moduleName}.service';

@Controller('${moduleName}')
export class ${camelModuleName}Controller {
  constructor(private service: ${camelModuleName}Service) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(+id); }

  @Post()
  create(@Body() dto: any) { return this.service.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) { return this.service.update(+id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(+id); }
}
`;

const serviceContent = `import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';

@Injectable()
export class ${camelModuleName}Service {
  constructor(private prisma: PrismaService) {}

  findAll() { return 'findAll ${moduleName}'; }
  findOne(id: number) { return { id, name: '${moduleName} #' + id }; }
  create(dto: any) { return { message: 'create ${moduleName}', ...dto }; }
  update(id: number, dto: any) { return { id, message: 'update ${moduleName}', ...dto }; }
  remove(id: number) { return { message: 'remove ${moduleName} #' + id }; }
}
`;

const moduleContent = `import { Module } from '@nestjs/common';
import { ${camelModuleName}Controller } from './controllers/${moduleName}.controller';
import { ${camelModuleName}Service } from './services/${moduleName}.service';
import { PrismaService } from '@core/services/prisma.service';

@Module({
  controllers: [${camelModuleName}Controller],
  providers: [${camelModuleName}Service, PrismaService],
  exports: [${camelModuleName}Service],
})
export class ${camelModuleName}Module {}
`;

// Write files
fs.writeFileSync(
  path.join(moduleDir, 'controllers', `${moduleName}.controller.ts`),
  controllerContent
);
fs.writeFileSync(
  path.join(moduleDir, 'services', `${moduleName}.service.ts`),
  serviceContent
);
fs.writeFileSync(path.join(moduleDir, `${moduleName}.module.ts`), moduleContent);

console.log(`✅ Module '${moduleName}' scaffold created`);
console.log(`📁 src/modules/${moduleName}`);
console.log('Generated files:');
console.log(`  - controllers/${moduleName}.controller.ts`);
console.log(`  - services/${moduleName}.service.ts`);
console.log(`  - ${moduleName}.module.ts`);
