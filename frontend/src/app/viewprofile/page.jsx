"use client";

import { useState } from "react";
import { Camera, Check, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useMe } from "@/hooks/useMe";
import { apiRequest } from "@/lib/api";
import Avatar from "../components/Avatar";
import { useTheme } from "../ThemeProvider";
import { FALLBACK_THEME_ICON, THEME_ICONS } from "../components/themeIcons";

// Only these fields are accepted by the API DTO. Sending anything else (id,
// email, avatar URL, createdAt…) makes the request fail validation.
const EDITABLE_FIELDS = ["name", "username", "gender", "age", "phoneNumber"];

const FIELD =
  "w-full rounded-lg border border-t-border-strong bg-background px-3.5 py-2.5 text-foreground outline-none placeholder:text-t-muted focus:border-t-primary disabled:opacity-70";

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const queryClient = useQueryClient();
  const { theme, setTheme, themes } = useTheme();
  const [edit, setEdit] = useState(false);
  const [edits, setEdits] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Display value = pending edit if any, otherwise the loaded profile.
  const value = (key) => (key in edits ? edits[key] : (user?.[key] ?? ""));

  const handleChange = (e) => {
    setEdits((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      for (const key of EDITABLE_FIELDS) {
        if (key in edits) formData.append(key, String(edits[key]));
      }
      if (avatarFile) formData.append("avatar", avatarFile);

      return apiRequest({
        url: "/user/updatemyprofile",
        method: "POST",
        data: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEdit(false);
      setEdits({});
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Profile has been updated!");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to update profile");
    },
  });

  const validateForm = () => {
    const name = String(value("name") ?? "").trim();
    if (name.length < 2) {
      toast.error("Name must be at least 2 characters");
      return false;
    }
    const username = String(value("username") ?? "");
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return false;
    }
    const phone = String(value("phoneNumber") ?? "");
    if (phone && !/^\d{10,15}$/.test(phone)) {
      toast.error("Phone number must be 10–15 digits");
      return false;
    }
    const age = value("age");
    if (age !== "" && age != null) {
      const n = Number(age);
      if (!Number.isFinite(n) || n < 1 || n > 150) {
        toast.error("Age must be between 1 and 150");
        return false;
      }
    }
    return true;
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-t-muted">Loading your profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-t-danger">
          We couldn&apos;t load your profile. Reload the page to try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 flex items-center gap-4">
        <div className="relative">
          <Avatar
            src={avatarPreview || user.avatar}
            size={72}
            className="border border-t-border"
          />
          {edit && (
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-t-border bg-t-primary text-t-on-primary">
              <Camera size={15} aria-hidden="true" />
              <span className="sr-only">Change photo</span>
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
              />
            </label>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold text-foreground">{user.name}</h1>
          <p className="truncate text-[13px] text-t-muted">
            {user.username ? `@${user.username} · ` : ""}
            {user.email}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEdit((v) => !v);
            setEdits({});
            setAvatarFile(null);
            setAvatarPreview(null);
          }}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-t-border-strong px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-t-hover"
        >
          <Pencil size={15} aria-hidden="true" />
          {edit ? "Cancel" : "Edit"}
        </button>
      </header>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-foreground">Your details</h2>
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-t-border bg-t-surface p-4 sm:grid-cols-2 sm:p-5">
          <Field
            label="Name"
            name="name"
            value={value("name")}
            disabled={!edit}
            onChange={handleChange}
          />
          <Field
            label="Username"
            name="username"
            value={value("username")}
            disabled={!edit}
            onChange={handleChange}
          />
          <Field label="Email" value={user.email} disabled onChange={() => {}} />
          <Field
            label="Phone number"
            name="phoneNumber"
            type="tel"
            value={value("phoneNumber")}
            disabled={!edit}
            onChange={(e) =>
              setEdits((prev) => ({
                ...prev,
                phoneNumber: e.target.value.replace(/\D/g, ""),
              }))
            }
          />
          <Field
            label="Age"
            name="age"
            type="number"
            min="1"
            max="150"
            value={value("age")}
            disabled={!edit}
            onChange={handleChange}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="gender" className="text-[13px] font-medium text-t-muted">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              disabled={!edit}
              value={value("gender")}
              onChange={handleChange}
              className={FIELD}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {edit && (
          <button
            type="button"
            onClick={() => {
              if (validateForm()) updateProfileMutation.mutate();
            }}
            disabled={updateProfileMutation.isPending}
            className="mt-4 min-h-11 w-full rounded-lg bg-t-primary text-sm font-semibold text-t-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updateProfileMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        )}
      </section>

      <section className="mt-9">
        <h2 className="text-[15px] font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-[13px] text-t-muted">
          The theme Convoia uses on this device. Each preview is the theme itself.
        </p>

        <div role="radiogroup" aria-label="Theme" className="mt-4 grid gap-3 sm:grid-cols-2">
          {themes.map((option) => {
            const active = option.id === theme;
            const Icon = THEME_ICONS[option.icon] ?? FALLBACK_THEME_ICON;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(option.id)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-t-primary bg-t-hover"
                    : "border-t-border bg-t-surface hover:bg-t-hover"
                }`}
              >
                {/* A miniature of the theme named on this element. */}
                <span
                  data-theme={option.id}
                  aria-hidden="true"
                  className="flex h-14 w-20 shrink-0 gap-1.5 rounded-lg border border-t-border bg-background p-1.5"
                >
                  <span className="flex w-6 flex-col gap-1 rounded bg-t-surface p-1">
                    <span className="h-1 w-full rounded-full bg-t-border" />
                    <span className="h-1 w-3/4 rounded-full bg-t-primary" />
                    <span className="h-1 w-2/3 rounded-full bg-t-border" />
                  </span>
                  <span className="flex flex-1 flex-col justify-end gap-1">
                    <span className="h-2.5 w-2/3 self-start rounded border border-t-border bg-t-bubble-in" />
                    <span className="h-2.5 w-1/2 self-end rounded bg-t-bubble-out" />
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <Icon size={13} className="text-t-muted" aria-hidden="true" />
                    <span className="truncate text-[13px] font-semibold text-foreground">
                      {option.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-t-muted">
                    {option.description}
                  </span>
                </span>

                <Check
                  size={16}
                  aria-hidden="true"
                  className={active ? "shrink-0 text-t-primary" : "shrink-0 opacity-0"}
                />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-t-muted">{label}</label>
      <input {...props} className={FIELD} />
    </div>
  );
}
