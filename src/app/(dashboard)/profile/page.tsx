"use client";

import { useEffect, useState } from "react";
import { Loader2, User } from "lucide-react";

import { apiClient } from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileRole {
  name?: string;
}

interface ProfileDetails {
  department?: { name?: string };
  manager?: { name?: string };
  roles?: ProfileRole[];
  join_date?: string;
}

interface ProfileExtra {
  verified?: boolean;
}

interface AuthProfile {
  name?: string | null;
  email: string;
  is_admin?: boolean;
  details?: ProfileDetails;
  extra?: ProfileExtra;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await apiClient.get<AuthProfile>("/v1/auth/profile");
        setProfile(data);
      } catch (error) {
        console.error("Failed to load profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Failed to load profile details.</p>
      </div>
    );
  }

  const { details = {}, extra = {} } = profile;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your profile and account information.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" /> Account Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{profile.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{profile.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p>
                {extra.verified ? (
                  <span className="text-emerald-600 font-medium">Verified</span>
                ) : (
                  <span className="text-amber-600 font-medium">Unverified</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administrator</p>
              <p>{profile.is_admin ? "Yes" : "No"}</p>
            </div>
          </CardContent>
        </Card>

        {details && Object.keys(details).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {details.department && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p>{details.department.name || "N/A"}</p>
                </div>
              )}
              {details.manager && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Manager</p>
                  <p>{details.manager.name || "N/A"}</p>
                </div>
              )}
              {details.roles && details.roles.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Roles</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {details.roles.map((r, idx) => (
                      <span key={idx} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                        {r.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {details.join_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                  <p>{details.join_date}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
