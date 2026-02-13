"use client";

import { useEffect, useState } from "react";
import { Camera, Pencil } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { toast } from "react-toastify";

export default function ProfilePage() {
  const { data: user, isLoading } = useMe();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [edit, setEdit] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("/profile.webp");
  const [avatarFile, setAvatarFile] = useState(null);

  /* ---------------- SYNC FORM WITH USER DATA ---------------- */

  useEffect(() => {
    if (user) {
      setForm(user);
      setAvatarPreview(user.avatar || "/profile.webp");
    }
  }, [user]);

  /* ---------------- INPUT HANDLERS ---------------- */

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  /* ---------------- UPDATE PROFILE MUTATION ---------------- */
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        if (form[key] !== null && form[key] !== undefined) {
          formData.append(key, form[key]);
        }
      });

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const data = await apiRequest({
        url: "/user/updatemyprofile",
        method: "POST",
        data: formData,
      });

      return data.user;
    },
    onSuccess: () => {
      // Invalidate and refetch the profile query - this will update Sidebar automatically!
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setEdit(false);
      setAvatarFile(null);
      // Reset preview to show the updated avatar from server
      if (user) {
        setAvatarPreview(user.avatar || "/profile.webp");
      }
      toast.success("Profile has been updated!");
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.message || err.message || "Failed to update profile";
      toast.error(errorMessage);
    },
  });

  /*----------------------- Validation Function -----------------------------*/
  const validateForm = () => {
    // Name validation
    if (!form.name || form.name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return false;
    }

    if (!/^[A-Za-z\s]+$/.test(form.name)) {
      toast.error("Name can only contain letters and spaces");
      return false;
    }

    // Username validation
    if (!form.username || form.username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return false;
    }

    // Phone validation
    if (form.phoneNumber) {
      if (!/^\d+$/.test(form.phoneNumber)) {
        toast.error("Phone number must contain only numbers");
        return false;
      }

      if (form.phoneNumber.length < 10 || form.phoneNumber.length > 15) {
        toast.error("Phone number must be between 10 and 15 digits");
        return false;
      }
    }

    // Age validation
    if (form.age) {
      const age = Number(form.age);

      if (isNaN(age) || age <= 0) {
        toast.error("Age must be a valid number");
        return false;
      }

      if (age > 150) {
        toast.error("Age cannot be greater than 150");
        return false;
      }
    }

    return true;
  };

  const updateProfile = () => {
    if (!validateForm()) return;
    updateProfileMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8 flex items-center justify-center">
        <div className="text-gray-500">No user data available</div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* HEADER */}
      <div className="flex items-center gap-6 mb-10">
        <div className="relative">
          <img
            src={avatarPreview || user.avatar || "/profile.webp"}
            className="h-24 w-24 rounded-full object-cover border"
          />

          {edit && (
            <label className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full cursor-pointer">
              <Camera size={16} className="text-white" />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </label>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-800">{user.name}</h2>
          <p className="text-gray-500">{user.email}</p>
        </div>

        <button
          onClick={() => setEdit(!edit)}
          className="ml-auto flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <Pencil size={16} />
          {edit ? "Cancel" : "Edit"}
        </button>
      </div>

      {/* FORM */}
      <div className="grid grid-cols-2 gap-6">
        <Input
          label="Name"
          name="name"
          value={form.name || ""}
          disabled={!edit}
          onChange={handleChange}
        />

        <Input
          label="Username"
          name="username"
          value={form.username || ""}
          disabled={!edit}
          onChange={handleChange}
        />

        <Input
          label="Email"
          value={form.email || ""}
          disabled
        />

        <Input
          label="Phone Number"
          name="phoneNumber"
          type="tel"
          value={form.phoneNumber || ""}
          disabled={!edit}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setForm({ ...form, phoneNumber: value });
          }}
        />

        <Input
          label="Age"
          name="age"
          type="number"
          min="1"
          max="150"
          value={form.age || ""}
          disabled={!edit}
          onChange={handleChange}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-500">Gender</label>
          <select
            name="gender"
            disabled={!edit}
            value={form.gender || ""}
            onChange={handleChange}
            className="border rounded-lg px-4 py-2 text-gray-700 disabled:border-0 disabled:border-gray-300 disabled:bg-gray-100"
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
          onClick={updateProfile}
          disabled={updateProfileMutation.isPending}
          className="mt-10 w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateProfileMutation.isPending ? "Updating..." : "Update"}
        </button>
      )}
    </div>
  );
}

/* ---------------- REUSABLE INPUT ---------------- */

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-500">{label}</label>
      <input
        {...props}
        className="disabled:border-0 border disabled:border-gray-300 rounded-lg px-4 disabled:px-0 py-2 disabled:bg-gray-100 text-gray-700"
      />
    </div>
  );
}
