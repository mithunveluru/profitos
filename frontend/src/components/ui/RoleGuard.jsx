import { useRole } from "../../hooks/useAuth";

/**
 * Renders children only if user has required role.
 * <RoleGuard roles={["owner","manager"]}> ... </RoleGuard>
 * <RoleGuard ownerOnly> ... </RoleGuard>
 * <RoleGuard managerOnly> ... </RoleGuard>
 */
export default function RoleGuard({ children, roles, ownerOnly, managerOnly, fallback = null }) {
  const { role } = useRole();

  if (ownerOnly   && role !== "owner")                              return fallback;
  if (managerOnly && !["owner", "manager"].includes(role))          return fallback;
  if (roles       && !roles.includes(role))                         return fallback;

  return children;
}