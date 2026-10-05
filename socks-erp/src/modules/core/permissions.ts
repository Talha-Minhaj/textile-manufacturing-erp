import { db } from "./db";
import { getSession, Session } from "./auth";

export const MODULES = ["production", "warehouse", "products", "materials", "stock"] as const;
export type Module = (typeof MODULES)[number];
export type Action = "view" | "create" | "edit" | "delete";

/**
 * Evaluates whether a user session holds permission to perform an action on a module.
 * Admin roles bypass permission checks.
 *
 * @param session - The active user session.
 * @param module - The targeted ERP domain module.
 * @param action - The action type: view, create, edit, delete.
 */
export async function can(session: Session, module: string, action: Action): Promise<boolean> {
  if (session.role === "Admin") return true;

  const perm = await db.permission.findUnique({
    where: { roleId_module: { roleId: session.roleId, module } },
  });

  if (!perm) return false;

  const actionMap: Record<Action, boolean> = {
    view: perm.canView,
    create: perm.canCreate,
    edit: perm.canEdit,
    delete: perm.canDelete,
  };

  return !!actionMap[action];
}

/**
 * Returns list of module names that the current user has permission to view.
 */
export async function allowedModules(session: Session): Promise<string[]> {
  if (session.role === "Admin") return [...MODULES];

  const rows = await db.permission.findMany({
    where: { roleId: session.roleId, canView: true },
  });
  return rows.map((r) => r.module);
}

/**
 * API Route Guard helper.
 * Validates session authentication and RBAC permissions.
 * Returns the Session on success, or a typed HTTP Response on authorization failure.
 */
export async function guard(module: string, action: Action): Promise<Session | Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Authentication required. Please sign in." }, { status: 401 });
  }

  const isAuthorized = await can(session, module, action);
  if (!isAuthorized) {
    return Response.json(
      { error: `Forbidden: You lack '${action}' permission on module '${module}'.` },
      { status: 403 }
    );
  }

  return session;
}
