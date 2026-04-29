import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { websiteMenus, websiteMenuItems } from '../models/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { CreateMenuDto, UpdateMenuDto, CreateMenuItemDto, UpdateMenuItemDto } from '../dtos';

function buildMenuTree(flatItems: any[]): any[] {
  const map = new Map();
  const roots = [];

  for (const item of flatItems) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of flatItems) {
    const node = map.get(item.id);
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

@Injectable()
export class MenuService {
  constructor(private drizzle: DrizzleService) {}

  async findAll() {
    const db = this.drizzle.getDrizzle();
    const menus = await db.select().from(websiteMenus).orderBy(asc(websiteMenus.id));
    return { success: true, data: menus };
  }

  async findWithItems(id: number) {
    const db = this.drizzle.getDrizzle();
    const [menu] = await db
      .select()
      .from(websiteMenus)
      .where(eq(websiteMenus.id, Number(id)));

    if (!menu) {
      return { success: false, error: 'Menu not found', code: 'NOT_FOUND' };
    }

    const items = await db
      .select()
      .from(websiteMenuItems)
      .where(eq(websiteMenuItems.menuId, Number(id)))
      .orderBy(asc(websiteMenuItems.sequence));

    const tree = buildMenuTree(items);

    return { success: true, data: { ...menu, items, tree } };
  }

  async getByLocation(location: string) {
    const db = this.drizzle.getDrizzle();
    const [menu] = await db
      .select()
      .from(websiteMenus)
      .where(and(eq(websiteMenus.location, location), eq(websiteMenus.isActive, true)));

    if (!menu) {
      return { success: true, data: { items: [] } };
    }

    const items = await db
      .select()
      .from(websiteMenuItems)
      .where(
        and(
          eq(websiteMenuItems.menuId, menu.id),
          eq(websiteMenuItems.isActive, true),
        ),
      )
      .orderBy(asc(websiteMenuItems.sequence));

    const tree = buildMenuTree(items);

    return { success: true, data: { ...menu, items: tree } };
  }

  async create(dto: CreateMenuDto) {
    const db = this.drizzle.getDrizzle();
    const [result] = await db.insert(websiteMenus).values(dto as any);
    const [created] = await db
      .select()
      .from(websiteMenus)
      .where(eq(websiteMenus.id, result.insertId));

    return { success: true, data: created, message: 'Menu created' };
  }

  async update(id: number, dto: UpdateMenuDto) {
    const db = this.drizzle.getDrizzle();
    await db.update(websiteMenus).set(dto as any).where(eq(websiteMenus.id, Number(id)));
    const [updated] = await db
      .select()
      .from(websiteMenus)
      .where(eq(websiteMenus.id, Number(id)));

    return { success: true, data: updated, message: 'Menu updated' };
  }

  async delete(id: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websiteMenuItems).where(eq(websiteMenuItems.menuId, Number(id)));
    await db.delete(websiteMenus).where(eq(websiteMenus.id, Number(id)));

    return { success: true, message: 'Menu deleted' };
  }

  async addItem(menuId: number, dto: CreateMenuItemDto) {
    const db = this.drizzle.getDrizzle();
    const [result] = await db
      .insert(websiteMenuItems)
      .values({ ...dto, menuId: Number(menuId) } as any);
    const [created] = await db
      .select()
      .from(websiteMenuItems)
      .where(eq(websiteMenuItems.id, result.insertId));

    return { success: true, data: created, message: 'Menu item added' };
  }

  async updateItem(itemId: number, dto: UpdateMenuItemDto) {
    const db = this.drizzle.getDrizzle();
    await db
      .update(websiteMenuItems)
      .set(dto as any)
      .where(eq(websiteMenuItems.id, Number(itemId)));
    const [updated] = await db
      .select()
      .from(websiteMenuItems)
      .where(eq(websiteMenuItems.id, Number(itemId)));

    return { success: true, data: updated, message: 'Menu item updated' };
  }

  async deleteItem(itemId: number) {
    const db = this.drizzle.getDrizzle();
    await db.delete(websiteMenuItems).where(eq(websiteMenuItems.id, Number(itemId)));

    return { success: true, message: 'Menu item deleted' };
  }

  async reorderItems(menuId: number, items: any[]) {
    const db = this.drizzle.getDrizzle();
    const [menu] = await db
      .select()
      .from(websiteMenus)
      .where(eq(websiteMenus.id, Number(menuId)));

    if (!menu) {
      return { success: false, error: 'Menu not found', code: 'NOT_FOUND' };
    }

    const itemIds = items.map((i) => i.id);
    if (itemIds.length > 0) {
      const existing = await db
        .select({ id: websiteMenuItems.id })
        .from(websiteMenuItems)
        .where(
          and(
            eq(websiteMenuItems.menuId, Number(menuId)),
            inArray(websiteMenuItems.id, itemIds),
          ),
        );

      const existingIds = new Set(existing.map((e) => e.id));
      const invalid = itemIds.filter((id) => !existingIds.has(id));

      if (invalid.length > 0) {
        return {
          success: false,
          error: `Items not found in this menu: ${invalid.join(', ')}`,
        };
      }
    }

    for (const item of items) {
      await db
        .update(websiteMenuItems)
        .set({
          parentId: item.parentId || null,
          sequence: item.sequence,
        } as any)
        .where(eq(websiteMenuItems.id, item.id));
    }

    return { success: true, message: 'Menu items reordered' };
  }
}
