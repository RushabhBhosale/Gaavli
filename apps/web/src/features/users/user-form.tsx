"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCog, UserPlus } from "lucide-react";
import { userSchema, type UserInput } from "@/schemas";
import { api } from "@/lib/api";
import type { UserDto, VillageDto } from "@/lib/contracts";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FormAlert,
  FormDialogFooter,
  FormDialogHeader,
  FormSaveButton,
} from "@/components/shared/form-dialog";

// A role card is a checkbox the admin can click anywhere on. The input stays in
// the DOM so react-hook-form keeps collecting the `roles` array. The inner span
// carries the flex layout because the global `label` rule sets display:block.
const roleCard =
  "group flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-[#B9520A] has-[:checked]:bg-[#FEF3EA] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#B9520A]";
const roleText =
  "text-sm font-medium text-slate-700 group-has-[:checked]:text-[#A84E0D]";
const roleInput =
  "size-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[#B9520A]";

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
  const assignedVillage = user?.roles.includes("coordinator")
    ? user.coordinatorVillages?.[0]?.id
    : undefined;
  const [coordinatorSelected, setCoordinatorSelected] = useState(
    user?.roles.includes("coordinator") ?? false,
  );
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
      village: assignedVillage || user?.village?.id || "",
      status: user?.status || "active",
    },
  });
  const coordinatorRole = register("roles");
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
  const saving = mutation.isPending;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent>
        <FormDialogHeader
          icon={user ? <UserCog size={19} /> : <UserPlus size={19} />}
          title={user ? "Edit User" : "Add User"}
          description="Manage their details and village membership."
        />
        <form
          onSubmit={handleSubmit((input) => mutation.mutate(input))}
          className="space-y-5"
        >
          <div className="field">
            <label htmlFor="user-name">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="user-name"
              autoFocus
              autoComplete="name"
              aria-required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "user-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <FieldError id="user-name-error">
                {errors.name.message!}
              </FieldError>
            )}
          </div>
          <div className="field">
            <label htmlFor="user-mobile">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span
                className={`flex select-none items-center rounded-l-md border border-r-0 px-3 text-sm font-medium ${
                  errors.mobile
                    ? "border-[#f0a9a9] bg-[#fffafa] text-red-500"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                +91
              </span>
              <input
                id="user-mobile"
                className="rounded-l-none"
                inputMode="tel"
                maxLength={10}
                autoComplete="tel-national"
                aria-required
                aria-invalid={!!errors.mobile}
                aria-describedby={
                  errors.mobile ? "user-mobile-error" : undefined
                }
                {...register("mobile")}
              />
            </div>
            {errors.mobile && (
              <FieldError id="user-mobile-error">
                {errors.mobile.message!}
              </FieldError>
            )}
          </div>
          <fieldset>
            <legend className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
              Role <span className="text-red-500">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className={roleCard}>
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    value="seller"
                    className={roleInput}
                    style={{ accentColor: "#B9520A" }}
                    {...register("roles")}
                  />
                  <span className={roleText}>Seller</span>
                </span>
              </label>
              <label className={roleCard}>
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    value="buyer"
                    className={roleInput}
                    style={{ accentColor: "#B9520A" }}
                    {...register("roles")}
                  />
                  <span className={roleText}>Buyer</span>
                </span>
              </label>
              <label className={roleCard}>
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    value="coordinator"
                    className={roleInput}
                    style={{ accentColor: "#B9520A" }}
                    {...coordinatorRole}
                    onChange={(event) => {
                      void coordinatorRole.onChange(event);
                      setCoordinatorSelected(event.target.checked);
                    }}
                  />
                  <span className={roleText}>Coordinator</span>
                </span>
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              All users retain buyer capability.
            </p>
            {errors.roles && (
              <FieldError id="user-roles-error">
                {errors.roles.message!}
              </FieldError>
            )}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <div className="field">
              <label htmlFor="user-village">
                Village <span className="text-red-500">*</span>
              </label>
              <select
                id="user-village"
                aria-required
                aria-invalid={!!errors.village}
                aria-describedby={
                  errors.village ? "user-village-error" : undefined
                }
                {...register("village")}
              >
                <option value="">Select a village</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
                {(user?.coordinatorVillages ?? [])
                  .filter(
                    (assigned) => !villages.some((v) => v.id === assigned.id),
                  )
                  .map((assigned) => (
                    <option key={assigned.id} value={assigned.id}>
                      {assigned.name}
                    </option>
                  ))}
              </select>
              {coordinatorSelected && (
                <p className="text-[11px] text-slate-400">
                  This village is the coordinator&apos;s assigned village.
                </p>
              )}
              {errors.village && (
                <FieldError id="user-village-error">
                  Select a village
                </FieldError>
              )}
            </div>
            <div className="field">
              <label htmlFor="user-status">
                Status <span className="text-red-500">*</span>
              </label>
              <select id="user-status" aria-required {...register("status")}>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
          {mutation.error && <FormAlert>{mutation.error.message}</FormAlert>}
          <FormDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </Button>
            <FormSaveButton saving={saving} disabled={!villages.length}>
              {user ? "Save Changes" : "Add User"}
            </FormSaveButton>
          </FormDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
