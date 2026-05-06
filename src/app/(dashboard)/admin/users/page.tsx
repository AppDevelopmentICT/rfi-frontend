"use client";

import { useState } from "react";
import { toast } from "sonner";

import { UserPill } from "@/components/shared/UserPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useFetchOnNavigation } from "@/hooks/useFetchOnNavigation";

export default function AdminUsersPage() {
  const { data: users = [], isLoading, refetch } = useFetchOnNavigation(
    "adminUsers",
    listAdminUsers
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const toggleAdmin = async (user: RFIUser) => {
    try {
      setUpdatingId(user.id);
      await setUserAdmin(user.id, !user.is_admin);
      toast.success("User role updated.");
      refetch();
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
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-1/4" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
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
