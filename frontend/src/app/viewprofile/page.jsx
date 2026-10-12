"use client";

import { useState } from "react";
import { Camera, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useMe } from "@/hooks/useMe";
import { apiRequest } from "@/lib/api";

// Only these fields are accepted by the API DTO. Sending anything else (id,
// email, avatar URL, createdAt…) makes the request fail validation.
const EDITABLE_FIELDS = ["name", "username", "gender", "age", "phoneNumber"];

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const queryClient = useQueryClient();
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
      <div className="mx-auto flex max-w-4xl items-center justify-center p-8 text-t-muted">
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center p-8 text-t-muted">
        No user data available
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-10 flex items-center gap-6">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarPreview || user.avatar || "/profile.webp"}
            alt="Your avatar"
            className="h-24 w-24 rounded-full border border-t-border object-cover"
          />
          {edit && (
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-t-primary p-2">
              <Camera size={16} className="text-white" />
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
              />
            </label>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground">{user.name}</h2>
          <p className="text-t-muted">{user.email}</p>
        </div>

        <button
          onClick={() => {
            setEdit((v) => !v);
            setEdits({});
            setAvatarFile(null);
            setAvatarPreview(null);
          }}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-t-border px-4 py-2 text-foreground hover:bg-t-hover"
        >
          <Pencil size={16} />
          {edit ? "Cancel" : "Edit"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
          label="Phone Number"
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

        <div className="flex flex-col gap-1">
          <label htmlFor="gender" className="text-sm text-t-muted">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            disabled={!edit}
            value={value("gender")}
            onChange={handleChange}
            className="rounded-lg border border-t-border bg-background px-4 py-2 text-foreground disabled:opacity-60"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {edit && (
        <button
          onClick={() => {
            if (validateForm()) updateProfileMutation.mutate();
          }}
          disabled={updateProfileMutation.isPending}
          className="mt-10 w-full rounded-xl bg-t-primary py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateProfileMutation.isPending ? "Updating…" : "Update"}
        </button>
      )}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-t-muted">{label}</label>
      <input
        {...props}
        className="rounded-lg border border-t-border bg-background px-4 py-2 text-foreground disabled:opacity-60"
      />
    </div>
  );
}
