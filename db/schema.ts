import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';

export const studioWorkspaces=sqliteTable('studio_workspaces',{
 ownerId:text('owner_id').primaryKey(),revision:integer('revision').notNull().default(0),
 lastOperation:text('last_operation').notNull().default(''),updatedAt:text('updated_at').notNull(),
});
export const studioRecords=sqliteTable('studio_records',{
 ownerId:text('owner_id').notNull(),store:text('store').notNull(),recordId:text('record_id').notNull(),
 payload:text('payload').notNull(),updatedAt:text('updated_at').notNull(),
},table=>[primaryKey({columns:[table.ownerId,table.store,table.recordId]})]);

export const studioGrants=sqliteTable('studio_grants',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),documentId:text('document_id').notNull(),
 partId:text('part_id').notNull(),email:text('email').notNull(),userId:text('user_id'),
 recipientRole:text('recipient_role').notNull().default('employee'),scope:text('scope').notNull().default('part'),
 ownerName:text('owner_name').notNull(),createdAt:text('created_at').notNull(),revokedAt:text('revoked_at'),
},table=>[index('studio_grants_recipient').on(table.email,table.userId),index('studio_grants_owner').on(table.ownerId)]);
export const studioGrantEvents=sqliteTable('studio_grant_events',{
 id:text('id').primaryKey(),grantId:text('grant_id').notNull(),ownerId:text('owner_id').notNull(),
 actorId:text('actor_id').notNull(),action:text('action').notNull(),at:text('at').notNull(),
});
