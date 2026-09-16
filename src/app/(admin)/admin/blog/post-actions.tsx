"use client";

import { Trash2 } from "lucide-react";
import { deletePostAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";

export function DeletePostButton({ id, title }: { id: string; title: string }) {
  return <ConfirmAction title={`Delete "${title}"?`} description="The post is archived and removed from the public blog. It can be restored from the database if needed." confirmLabel="Delete" variant="ghost" action={() => deletePostAction(id)} successMessage="Post deleted."><Trash2 /></ConfirmAction>;
}
