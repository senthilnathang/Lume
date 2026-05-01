import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import prisma from '../../db/prisma';

@Injectable()
export class DataLoaderService {
  userLoader = new DataLoader(async (userIds: string[]) => {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    return userIds.map(id => users.find(u => u.id === id));
  });

  roleLoader = new DataLoader(async (roleIds: string[]) => {
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
    });
    return roleIds.map(id => roles.find(r => r.id === id));
  });

  permissionLoader = new DataLoader(async (permissionIds: string[]) => {
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });
    return permissionIds.map(id => permissions.find(p => p.id === id));
  });

  /**
   * Batch load users by IDs
   */
  loadUser(id: string) {
    return this.userLoader.load(id);
  }

  /**
   * Batch load roles by IDs
   */
  loadRole(id: string) {
    return this.roleLoader.load(id);
  }

  /**
   * Batch load permissions by IDs
   */
  loadPermission(id: string) {
    return this.permissionLoader.load(id);
  }

  /**
   * Clear all caches
   */
  clearAll() {
    this.userLoader.clearAll();
    this.roleLoader.clearAll();
    this.permissionLoader.clearAll();
  }

  /**
   * Prime cache with data
   */
  primeUser(id: string, user: any) {
    this.userLoader.prime(id, user);
  }

  primeRole(id: string, role: any) {
    this.roleLoader.prime(id, role);
  }

  primePermission(id: string, permission: any) {
    this.permissionLoader.prime(id, permission);
  }
}
