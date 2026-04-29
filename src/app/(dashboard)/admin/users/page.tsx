"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { UserPill } from "@/components/shared/UserPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAdminUsers, setUserAdmin } from "@/services/admin.service";
import type { RFIUser } from "@/services/rfi.service";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<RFIUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setUsers(await listAdminUsers());
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const toggleAdmin = async (user: RFIUser) => {
    try {
      setUpdatingId(user.id);
      const updated = await setUserAdmin(user.id, !user.is_admin);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      toast.success("User role updated.");
    } catch {
      toast.error("Failed to update user role.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 px-6 py-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who has access to the admin audit log and user controls.
        </p>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-4">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>IsAdmin</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <UserPill name={user.name} email={user.email} />
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_admin ? "default" : "outline"}>
                        {user.is_admin ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={user.is_admin ? "destructive" : "outline"}
                        size="sm"
                        disabled={updatingId === user.id}
                        onClick={() => toggleAdmin(user)}
                      >
                        {user.is_admin ? "Remove Admin" : "Make Admin"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
