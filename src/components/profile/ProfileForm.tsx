"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CameraIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import { updateProfile } from "@/lib/actions";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type ProfileFormProps = {
  profile: UserProfile;
};

function profileInitials(profile: UserProfile) {
  const source = profile.name.trim() || profile.email.trim();
  if (!source) return "N";
  return source
    .split(/[.@\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "N";
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const initials = useMemo(() => profileInitials(currentProfile), [currentProfile]);
  const avatarUrl = previewUrl ?? currentProfile.avatar_url ?? null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
    setSuccess("");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.success) {
        setCurrentProfile(result.data);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setSuccess("Profile updated");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form className="profile-form" onSubmit={onSubmit}>
      <section className="profile-panel profile-photo-panel" aria-label="Profile picture">
        <div className="profile-photo">
          {avatarUrl ? (
            <span className="profile-avatar-image" style={{ backgroundImage: `url(${avatarUrl})` }} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="profile-photo-copy">
          <h2>Profile picture</h2>
          <p>JPG, PNG, WEBP, or GIF. Up to 5MB.</p>
          <Button variant="outline" asChild className="profile-upload-button">
            <label>
            <CameraIcon size={14} />
            Choose image
            <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onAvatarChange} />
            </label>
          </Button>
        </div>
      </section>

      <section className="profile-panel">
        <div className="profile-panel-header">
          <h2>Personal details</h2>
          <p>Keep your account identity tidy and recognizable.</p>
        </div>

        {error && <div className="profile-message profile-message-error">{error}</div>}
        {success && <div className="profile-message profile-message-success">{success}</div>}

        <div className="profile-fields">
          <Field>
            <FieldLabel htmlFor="profile-name">Name</FieldLabel>
            <Input id="profile-name" name="name" type="text" defaultValue={currentProfile.name} placeholder="Your name" />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-email">Email</FieldLabel>
            <Input id="profile-email" name="email" type="email" defaultValue={currentProfile.email} placeholder="you@example.com" />
          </Field>

          <Field>
            <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
            <Input id="profile-phone" name="phone" type="tel" defaultValue={currentProfile.phone} placeholder="+1 555 0100" />
          </Field>
        </div>

        <div className="profile-actions">
          <Button type="submit" disabled={isPending}>
            <FloppyDiskIcon size={14} />
            {isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </section>
    </form>
  );
}
