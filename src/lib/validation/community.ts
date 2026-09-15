import { z } from "zod";
import { nonEmpty, uuid } from "./common";

export const discussionSchema = z.object({
  courseId: uuid.optional().nullable(),
  batchId: uuid.optional().nullable(),
  lessonId: uuid.optional().nullable(),
  groupId: uuid.optional().nullable(),
  title: nonEmpty.max(200),
  body: nonEmpty.max(20000),
  isQuestion: z.boolean().default(false),
});

export const replySchema = z.object({ discussionId: uuid, parentId: uuid.optional().nullable(), body: nonEmpty.max(20000) });

export const reactionSchema = z.object({ discussionId: uuid.optional().nullable(), replyId: uuid.optional().nullable(), emoji: z.string().min(1).max(8).default("👍") });

export const moderationSchema = z.object({
  discussionId: uuid.optional().nullable(),
  replyId: uuid.optional().nullable(),
  action: z.enum(["PIN", "UNPIN", "LOCK", "UNLOCK", "RESOLVE", "DELETE", "ACCEPT_ANSWER"]),
});

export const reportSchema = z.object({ discussionId: uuid.optional().nullable(), replyId: uuid.optional().nullable(), reason: nonEmpty.max(500) });

export const messageSchema = z.object({ conversationId: uuid, body: nonEmpty.max(10000), attachmentId: uuid.optional().nullable() });

export const startConversationSchema = z.object({ participantIds: z.array(uuid).min(1).max(20), title: z.string().max(120).optional().or(z.literal("")), body: nonEmpty.max(10000) });

export const announcementSchema = z.object({
  courseId: uuid.optional().nullable(),
  batchId: uuid.optional().nullable(),
  title: nonEmpty.max(200),
  body: nonEmpty.max(10000),
  isPinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional().nullable(),
  notify: z.boolean().default(true),
});

export const groupSchema = z.object({ name: nonEmpty.max(80), slug: z.string().max(80).optional(), description: z.string().max(1000).optional().or(z.literal("")), isPrivate: z.boolean().default(false) });
