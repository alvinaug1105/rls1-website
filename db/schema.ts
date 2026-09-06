import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const entries=sqliteTable('entries',{id:text('id').primaryKey(),kind:text('kind').notNull(),title:text('title').notNull(),body:text('body').notNull(),author:text('author').notNull(),userId:text('user_id').notNull(),approved:integer('approved').notNull().default(0),created:text('created').notNull()});
