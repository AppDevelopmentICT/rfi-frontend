"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Cloud,
  ExternalLink,
  Layers,
  Mail,
  Shield,
  Signal,
  User,
  UserCircle,
} from "lucide-react";

import { fetchProfile, type ProfileResponse } from "@/services/profile.service";
import { useAuth } from "@/contexts/auth-context";
import { pb } from "@/lib/pocketbase";
import { AvatarUpload } from "./AvatarUpload";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileSkeleton } from "./ProfileSkeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { RecordModel } from "pocketbase";

interface InfoPillProps {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "ghost"
    | "link";
}

function InfoCell({ icon, label, value }: InfoPillProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      {value ? (
        <span className="text-sm font-medium text-foreground">{value}</span>
      ) : (
        <span className="text-sm text-muted-foreground/60 italic">Not set</span>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, ready } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileFetched, setProfileFetched] = useState(false);
  const [pbRecord, setPbRecord] = useState<RecordModel | null>(null);

  const loading = !ready || (!profileFetched && !!user);

  useEffect(() => {
    if (!ready || !user) return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchProfile();
        if (!cancelled) {
          setProfile(data);
          setPbRecord(pb.authStore.record as RecordModel | null);
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileFetched(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const handleAvatarUploaded = useCallback((record: RecordModel) => {
    setPbRecord(record);
  }, []);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">
          Unable to load profile. Please log in again.
        </p>
      </div>
    );
  }

  const name = profile?.name || user.name || "N/A";
  const email = profile?.email || user.email || "N/A";
  const isAdmin = profile?.is_admin ?? user.is_admin;
  const role = profile?.role;
  const department = profile?.department;
  const level = profile?.level;
  const grade = profile?.grade;

  const isOAuth2 = profile?.auth_method === "oauth2";

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <UserCircle className="size-8 text-primary" />
            Profile Settings
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage your profile picture and account security.
          </p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Profile Picture
            </CardTitle>
            <CardDescription>
              Personalize your account with a profile photo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarUpload
              user={pbRecord}
              name={name}
              onUploadComplete={handleAvatarUploaded}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your name, email, and employment details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5">
                  <User className="size-3.5" />
                  Full Name
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={name}
                    disabled
                    readOnly
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    value={email}
                    disabled
                    readOnly
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Employment Details
                </span>
                <Badge
                  variant={isAdmin ? "default" : "outline"}
                  className="gap-1.5"
                >
                  <Shield className="size-3" />
                  {isAdmin ? "Administrator" : "Standard User"}
                </Badge>
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <InfoCell
                  icon={<User className="size-3.5" />}
                  label="Role"
                  value={role}
                />
                <InfoCell
                  icon={<Building2 className="size-3.5" />}
                  label="Department"
                  value={department}
                />
                <InfoCell
                  icon={<Layers className="size-3.5" />}
                  label="Level"
                  value={level}
                />
                <InfoCell
                  icon={<Signal className="size-3.5" />}
                  label="Grade"
                  value={grade}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isOAuth2 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5" />
                Password &amp; Security
              </CardTitle>
              <CardDescription>
                Manage your authentication settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-blue-200/60 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/30">
                  <div className="flex items-start gap-3">
                    <Cloud className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-foreground">
                        Managed by Microsoft Entra ID
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your organization manages your password and security
                        policies. You cannot change your password directly from
                        this platform.
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-fit flex flex-row items-center gap-2 whitespace-nowrap"
                  onClick={() =>
                    window.open("https://myaccount.microsoft.com", "_blank", "noopener,noreferrer")
                  }
                >
                  Manage Account in Microsoft
                  <ExternalLink className="ml-2 size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <ChangePasswordForm />
        )}
      </div>
    </div>
  );
}
