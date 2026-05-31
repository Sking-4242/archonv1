import { api } from "./client";

export function getAffiliation() {
  return api.get("/academy/organization/affiliation");
}

export function updateAffiliation(organizationName) {
  return api.put("/academy/organization/affiliation", {
    organization_name: organizationName,
  });
}

export function createOrganization(name) {
  return api.post("/academy/organization/create", { name });
}

export function joinOrganization(code) {
  return api.post("/academy/organization/join", { code });
}
