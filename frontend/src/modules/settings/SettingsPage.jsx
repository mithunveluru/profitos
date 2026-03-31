import { useState, useEffect } from "react";
import { usersApi } from "../../services/api";
import { useAuthStore, useRole } from "../../hooks/useAuth";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import RoleGuard from "../../components/ui/RoleGuard";
import { User, Users, Shield, Bell } from "lucide-react";

const ROLE_COLORS = {
  owner:     "approved",
  manager:   "pending",
  accounts:  "received",
  warehouse: "draft",
  viewer:    "draft",
};

function ProfileSection() {
  const { user } = useAuthStore();
  const [form, setForm]     = useState({ full_name: user?.full_name ?? "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.update(user.id, { full_name: form.full_name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
          <User className="w-5 h-5 text-brand-light" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{user?.full_name}</p>
          <p className="text-xs text-muted">{user?.email}</p>
        </div>
        <Badge status={ROLE_COLORS[user?.role]} label={user?.role} />
      </div>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-xs text-muted mb-1.5">Full Name</label>
          <input value={form.full_name} onChange={(e) => setForm({ full_name: e.target.value })}
            className="w-full px-3 py-2 bg-surface-2 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand transition-colors" />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" loading={saving}>Save</Button>
          {saved && <span className="text-xs text-success">✓ Saved</span>}
        </div>
      </form>
    </Card>
  );
}

function UserManagementSection() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: me }        = useAuthStore();

  useEffect(() => {
    usersApi.list().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function toggleActive(u) {
    await usersApi.update(u.id, { is_active: !u.is_active });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
  }

  async function changeRole(u, role) {
    await usersApi.update(u.id, { role });
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role } : x));
  }

  if (loading) return <div className="h-40 rounded-xl bg-surface-2 animate-pulse" />;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-brand-light" />
        <h3 className="text-sm font-medium text-white">Team Members</h3>
        <span className="text-xs text-muted">({users.length})</span>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id}
            className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-xs font-medium text-brand-light">
                {u.full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-white">{u.full_name}
                  {u.id === me.id && <span className="ml-2 text-xs text-muted">(you)</span>}
                </p>
                <p className="text-xs text-muted">{u.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {u.id !== me.id ? (
                <>
                  <select value={u.role}
                    onChange={(e) => changeRole(u, e.target.value)}
                    className="px-2 py-1 bg-surface-1 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-brand">
                    {["owner", "manager", "accounts", "warehouse", "viewer"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button onClick={() => toggleActive(u)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      u.is_active
                        ? "text-danger hover:bg-danger/10"
                        : "text-success hover:bg-success/10"
                    }`}>
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </>
              ) : (
                <Badge status={ROLE_COLORS[u.role]} label={u.role} />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "team",    label: "Team",    icon: Users,  ownerOnly: true },
    { id: "security",label: "Security",icon: Shield, ownerOnly: true },
  ];
  const [tab, setTab] = useState("profile");
  const { isOwner }   = useRole();

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {TABS.filter((t) => !t.ownerOnly || isOwner).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors -mb-px ${
              tab === id
                ? "border-brand text-white font-medium"
                : "border-transparent text-muted hover:text-white"
            }`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "profile" && <ProfileSection />}
      {tab === "team"    && <RoleGuard ownerOnly><UserManagementSection /></RoleGuard>}
      {tab === "security" && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-brand-light" />
            <h3 className="text-sm font-medium text-white">Security Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
              <div>
                <p className="text-sm text-white">Session Timeout</p>
                <p className="text-xs text-muted">Auto-logout after inactivity</p>
              </div>
              <select className="px-2 py-1 bg-surface-1 border border-white/10 rounded text-xs text-white focus:outline-none">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
                <option>8 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 border border-white/5">
              <div>
                <p className="text-sm text-white">Audit Log Retention</p>
                <p className="text-xs text-muted">How long to keep audit records</p>
              </div>
              <span className="text-xs text-muted px-2 py-1 rounded bg-surface-1 border border-white/5">
                90 days
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
