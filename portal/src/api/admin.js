import { api } from "./client";

export async function adminCreateLicense({ assignEmail, validDays = 365 } = {}) {
  return api.post("/portal/admin/licenses", {
    assign_email: assignEmail || null,
    valid_days: validDays,
  });
}

export async function adminListLicenses() {
  return api.get("/portal/admin/licenses");
}
