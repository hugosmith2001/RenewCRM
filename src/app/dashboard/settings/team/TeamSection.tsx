"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FormActions,
  FormField,
  FormLayout,
  FormError,
  formInputClasses,
  formSelectClasses,
} from "@/components/forms";
import {
  Badge,
  Button,
  ConfirmDialog,
  Table,
  TableShell,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { sectionInnerGapClass } from "@/components/layout";
import type { Role } from "@prisma/client";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
};

type InviteFormState = {
  email: string;
  name: string;
  role: Role | "";
};

type EditFormState = {
  name: string;
  role: Role;
};

type ConfirmState =
  | null
  | {
      kind: "deactivate" | "activate" | "demote";
      user: User;
      payload: Partial<Pick<User, "role" | "isActive">>;
    };

export function TeamSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteState, setInviteState] = useState<InviteFormState>({
    email: "",
    name: "",
    role: "",
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/users");
      if (!res.ok) {
        throw new Error("Failed to load team");
      }
      const data: User[] = await res.json();
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load team members."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const aName = a.name || a.email;
        const bName = b.name || b.email;
        return aName.localeCompare(bName);
      }),
    [users]
  );

  function openInvite() {
    setInviteOpen(true);
    setInviteError(null);
    setTempPassword(null);
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteState({ email: "", name: "", role: "" });
    setInviteError(null);
  }

  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError(null);
    setTempPassword(null);

    if (!inviteState.role) {
      setInviteError("Role is required");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteState.email.trim(),
          name: inviteState.name.trim() || undefined,
          role: inviteState.role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.user) {
        throw new Error(
          data.error ??
            "Failed to invite user. Check the details and try again."
        );
      }

      setUsers((prev) => [...prev, data.user as User]);
      setTempPassword(data.tempPassword ?? null);
      setInviteState({ email: "", name: "", role: "" });
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setInviteLoading(false);
    }
  }

  function startEdit(user: User) {
    setEditingUserId(user.id);
    setEditState({
      name: user.name ?? "",
      role: user.role,
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditState(null);
    setEditError(null);
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUserId || !editState) return;

    setEditError(null);
    setEditLoading(true);

    const user = users.find((u) => u.id === editingUserId);
    if (!user) {
      setEditError("User not found.");
      setEditLoading(false);
      return;
    }

    const payload: Partial<Pick<User, "name" | "role">> = {};
    if (editState.name.trim() !== (user.name ?? "")) {
      payload.name = editState.name.trim();
    }
    if (editState.role !== user.role) {
      payload.role = editState.role;
    }

    if (!payload.name && !payload.role) {
      setEditLoading(false);
      setEditingUserId(null);
      setEditState(null);
      return;
    }

    // If we are changing an admin's role to non-admin, confirm first.
    if (user.role === "ADMIN" && payload.role && payload.role !== "ADMIN") {
      setConfirmState({
        kind: "demote",
        user,
        payload: { role: payload.role },
      });
      setEditLoading(false);
      return;
    }

    await applyUserUpdate(user, payload);
    setEditLoading(false);
    setEditingUserId(null);
    setEditState(null);
  }

  async function applyUserUpdate(
    user: User,
    payload: Partial<Pick<User, "name" | "role" | "isActive">>
  ) {
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update user");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? (data as User) : u))
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      if (payload.name || payload.role) {
        setEditError(message);
      } else {
        setError(message);
      }
    }
  }

  function handleToggleActive(user: User) {
    setConfirmState({
      kind: user.isActive ? "deactivate" : "activate",
      user,
      payload: { isActive: !user.isActive },
    });
  }

  async function handleConfirm() {
    if (!confirmState) return;
    const { user, payload } = confirmState;

    setConfirmLoading(true);
    await applyUserUpdate(user, payload);
    setConfirmLoading(false);
    setConfirmState(null);
  }

  function handleCancelConfirm() {
    setConfirmState(null);
  }

  const roleOptions: Role[] = ["ADMIN", "BROKER", "STAFF"];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Invite and manage your team members for this brokerage. For the MVP,
        new users are created with a one-time{" "}
        <span className="font-medium text-foreground">temporary password</span>{" "}
        that you must share with them securely. This is a short-term shortcut
        and will be replaced by proper email-based invites in a future update.
      </p>

      <div className={sectionInnerGapClass}>
        <button
          type="button"
          onClick={inviteOpen ? closeInvite : openInvite}
          className="text-sm font-medium text-primary hover:underline"
        >
          {inviteOpen ? "Hide invite form" : "Invite a new user"}
        </button>
      </div>

      {inviteOpen && (
        <form onSubmit={handleInviteSubmit}>
          <FormLayout variant="embedded">
            {inviteError && <FormError message={inviteError} />}
            {tempPassword && (
              <p className="text-sm text-amber-700">
                Share this temporary password with the new user{" "}
                <span className="font-mono text-xs px-1 py-0.5 rounded-sm bg-surface-muted border border-border">
                  {tempPassword}
                </span>{" "}
                and ask them to log in and change it immediately. It will not be
                shown again.
              </p>
            )}
            <FormField id="invite-email" label="Email" required>
              <input
                id="invite-email"
                type="email"
                required
                className={formInputClasses}
                value={inviteState.email}
                onChange={(e) =>
                  setInviteState((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
            </FormField>
            <FormField
              id="invite-name"
              label="Name"
              description="Optional display name shown throughout the app."
            >
              <input
                id="invite-name"
                type="text"
                className={formInputClasses}
                value={inviteState.name}
                onChange={(e) =>
                  setInviteState((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </FormField>
            <FormField id="invite-role" label="Role" required>
              <select
                id="invite-role"
                className={formSelectClasses}
                value={inviteState.role}
                onChange={(e) =>
                  setInviteState((prev) => ({
                    ...prev,
                    role: e.target.value as Role | "",
                  }))
                }
              >
                <option value="">Select a role…</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role === "ADMIN"
                      ? "Admin"
                      : role === "BROKER"
                      ? "Broker"
                      : "Staff"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormActions
              submitLabel="Send temp-password invite"
              loadingLabel="Creating user…"
              loading={inviteLoading}
              cancelLabel="Cancel"
              onCancel={closeInvite}
            />
          </FormLayout>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading team…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No team members yet. Invite your first user to get started.
        </p>
      ) : (
        <TableShell>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {sortedUsers.map((user) => (
                <TR key={user.id}>
                  <TD title={user.name || user.email}>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {user.name || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <span className="text-sm">{user.email}</span>
                  </TD>
                  <TD>
                    <Badge tone={user.role === "ADMIN" ? "info" : "muted"}>
                      {user.role}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={user.isActive ? "success" : "warning"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(user)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={
                          user.isActive
                            ? "text-danger hover:text-danger"
                            : "text-foreground"
                        }
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableShell>
      )}

      {editingUserId && editState && (
        <form onSubmit={saveEdit}>
          <FormLayout variant="embedded">
            {editError && <FormError message={editError} />}
            <FormField id="edit-name" label="Name">
              <input
                id="edit-name"
                type="text"
                className={formInputClasses}
                value={editState.name}
                onChange={(e) =>
                  setEditState((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
              />
            </FormField>
            <FormField id="edit-role" label="Role">
              <select
                id="edit-role"
                className={formSelectClasses}
                value={editState.role}
                onChange={(e) =>
                  setEditState((prev) =>
                    prev
                      ? { ...prev, role: e.target.value as Role }
                      : prev
                  )
                }
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role === "ADMIN"
                      ? "Admin"
                      : role === "BROKER"
                      ? "Broker"
                      : "Staff"}
                  </option>
                ))}
              </select>
            </FormField>
            <FormActions
              submitLabel="Save changes"
              loadingLabel="Saving…"
              loading={editLoading}
              cancelLabel="Cancel"
              onCancel={cancelEdit}
            />
          </FormLayout>
        </form>
      )}

      <ConfirmDialog
        open={confirmState !== null}
        title={
          confirmState?.kind === "deactivate"
            ? "Deactivate user"
            : confirmState?.kind === "activate"
            ? "Reactivate user"
            : "Change admin role"
        }
        message={
          confirmState?.kind === "deactivate"
            ? "This user will no longer be able to sign in until reactivated. They will not be removed from historical records."
            : confirmState?.kind === "activate"
            ? "This user will be able to sign in again and access the brokerage according to their role."
            : "Changing an admin to a different role may reduce their access. Backend safeguards prevent removing the last active admin, but please confirm you want to update this role."
        }
        confirmLabel={
          confirmState?.kind === "deactivate"
            ? "Deactivate user"
            : confirmState?.kind === "activate"
            ? "Reactivate user"
            : "Change role"
        }
        variant={confirmState?.kind === "activate" ? "primary" : "danger"}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}

