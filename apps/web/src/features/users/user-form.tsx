"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userSchema, type UserInput } from "@/schemas";
import { api } from "@/lib/api";
import type { UserDto, VillageDto } from "@/lib/contracts";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function UserForm({
  user,
  villages,
  onClose,
}: {
  user?: UserDto;
  villages: VillageDto[];
  onClose: () => void;
}) {
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || "",
      mobile: user?.mobile || "",
      roles: (user?.roles.filter((r) =>
        ["buyer", "seller", "coordinator"].includes(r),
      ) as UserInput["roles"]) || ["buyer"],
      village: user?.village?.id || "",
      status: user?.status || "active",
    },
  });
  const mutation = useMutation({
    mutationFn: (input: UserInput) =>
      api(user ? `/users/${user.id}` : "/users", {
        method: user ? "PUT" : "POST",
        body: JSON.stringify(
          user ? { ...input, version: user.version } : input,
        ),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["users"] }),
        client.invalidateQueries({ queryKey: ["counts"] }),
        client.invalidateQueries({ queryKey: ["stats"] }),
        client.invalidateQueries({ queryKey: ["growth"] }),
        client.invalidateQueries({ queryKey: ["admin-villages"] }),
        client.invalidateQueries({ queryKey: ["coordinator-options"] }),
      ]);
      onClose();
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle className="text-xl font-bold">
          {user ? "Edit User" : "Add User"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate-500">
          Manage their details and village membership.
        </DialogDescription>
        <form
          onSubmit={handleSubmit((input) => mutation.mutate(input))}
          className="mt-6 space-y-4"
        >
          <div className="field">
            <label htmlFor="user-name">Name</label>
            <input id="user-name" autoComplete="name" {...register("name")} />
            {errors.name && (
              <p className="field-error">{errors.name.message}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="user-mobile">Mobile Number</label>
            <input
              id="user-mobile"
              inputMode="tel"
              maxLength={10}
              autoComplete="tel-national"
              {...register("mobile")}
            />
            {errors.mobile && (
              <p className="field-error">{errors.mobile.message}</p>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-600">
              Role
            </legend>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" value="seller" {...register("roles")} />
                Seller
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" value="buyer" {...register("roles")} />
                Buyer
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value="coordinator"
                  {...register("roles")}
                />
                Coordinator
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              All users retain buyer capability.
            </p>
            {errors.roles && (
              <p className="field-error">{errors.roles.message}</p>
            )}
          </fieldset>
          <div className="field">
            <label htmlFor="user-village">Village</label>
            <select id="user-village" {...register("village")}>
              <option value="">Select a village</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {errors.village && <p className="field-error">Select a village</p>}
          </div>
          <div className="field">
            <label htmlFor="user-status">Status</label>
            <select id="user-status" {...register("status")}>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {mutation.error && (
            <p role="alert" className="field-error">
              {mutation.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button disabled={mutation.isPending || !villages.length}>
              {mutation.isPending
                ? "Saving…"
                : user
                  ? "Save Changes"
                  : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
