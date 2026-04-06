import { useRole } from "../../hooks/useAuth";

export default function RoleGuard({ children, roles, ownerOnly, managerOnly, fallback = null }) {
  const { role } = useRole();

  if (ownerOnly   && role !== "owner")                              return fallback;
  if (managerOnly && !["owner", "manager"].includes(role))          return fallback;
  if (roles       && !roles.includes(role))                         return fallback;

  return children;
}