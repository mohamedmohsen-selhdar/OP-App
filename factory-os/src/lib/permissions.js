/**
 * Central permission engine.
 * Role permissions come from the `roles.permissions` JSONB column.
 * User overrides come from `user_profiles.permission_overrides`.
 */

/**
 * Check if a user profile can perform an action on a module.
 * @param {Object} profile - user_profiles record joined with role
 * @param {string} module  - e.g. 'production', 'inventory'
 * @param {string} action  - e.g. 'view', 'create', 'edit', 'delete', 'approve'
 */
export function canDo(profile, module, action) {
  if (!profile) return false;

  const rolePerms    = profile?.role?.permissions ?? {};
  const overrides    = profile?.permission_overrides ?? {};

  // Owner wildcard
  if (rolePerms['*']) return true;

  // Check role base permission
  const roleMod  = rolePerms[module] ?? {};
  const baseValue = roleMod[action] ?? false;

  // Apply override (can add or remove specific permissions)
  const overrideMod = overrides[module] ?? {};
  if (action in overrideMod) return overrideMod[action];

  return baseValue;
}

/**
 * Check if the user can see a specific branch's data.
 */
export function canSeeBranch(profile, branchId) {
  if (!profile) return false;
  if (profile?.role?.can_see_all_branches) return true;
  if (profile.branch_id === branchId) return true;
  const allowed = profile.allowed_branches ?? [];
  return allowed.includes(branchId);
}

/**
 * Filter an array of records to only those the user can see.
 */
export function filterByBranch(profile, records) {
  if (!profile) return [];
  if (profile?.role?.can_see_all_branches) return records;
  return records.filter(r => canSeeBranch(profile, r.branch_id));
}

/**
 * Get the list of branches accessible to this user.
 */
export function getAccessibleBranches(profile, allBranches) {
  if (!profile) return [];
  if (profile?.role?.can_see_all_branches) return allBranches;
  return allBranches.filter(b => canSeeBranch(profile, b.id));
}

/**
 * Default role permission templates — used when creating new roles in the UI.
 */
export const ROLE_TEMPLATES = {
  owner: {
    '*': true,
  },
  factory_manager: {
    production:  { view: true, create: true, edit: true, delete: false, approve: true },
    inventory:   { view: true, create: true, edit: true, delete: false, approve: true },
    quality:     { view: true, create: true, edit: true, delete: false, approve: true },
    maintenance: { view: true, create: true, edit: true, delete: false, approve: true },
    procurement: { view: true, create: true, edit: true, delete: false, approve: true },
    sales:       { view: true, create: true, edit: true, delete: false, approve: true },
    settings:    { view: true, create: false, edit: false, delete: false, approve: false },
  },
  production_supervisor: {
    production:  { view: true, create: true, edit: true, delete: false, approve: false },
    inventory:   { view: true, create: false },
    quality:     { view: true, create: true, edit: false },
    maintenance: { view: true, create: true, edit: false },
    procurement: { view: false },
    sales:       { view: false },
    settings:    { view: false },
  },
  quality_inspector: {
    production:  { view: true, create: false },
    inventory:   { view: true, create: false },
    quality:     { view: true, create: true, edit: true, delete: false, approve: false },
    maintenance: { view: true, create: false },
    procurement: { view: false },
    sales:       { view: false },
    settings:    { view: false },
  },
  warehouse_keeper: {
    production:  { view: true, create: false },
    inventory:   { view: true, create: true, edit: true, delete: false, approve: false },
    quality:     { view: false },
    maintenance: { view: false },
    procurement: { view: true, create: true, edit: false },
    sales:       { view: true, create: false },
    settings:    { view: false },
  },
  maintenance_tech: {
    production:  { view: true, create: false },
    inventory:   { view: true, create: false },
    quality:     { view: false },
    maintenance: { view: true, create: true, edit: true, delete: false, approve: false },
    procurement: { view: false },
    sales:       { view: false },
    settings:    { view: false },
  },
};
