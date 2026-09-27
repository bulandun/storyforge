import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const stories = sqliteTable('stories', {
  id: text('id').primaryKey(),
  ownerKey: text('owner_key').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
