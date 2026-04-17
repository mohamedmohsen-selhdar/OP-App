import { useAuth } from '../context/AuthContext';
import { canDo, canSeeBranch, filterByBranch, getAccessibleBranches } from '../lib/permissions';

export function usePermissions() {
  const { profile } = useAuth();

  function can(module, action) {
    return canDo(profile, module, action);
  }

  function canBranch(branchId) {
    return canSeeBranch(profile, branchId);
  }

  function filterBranch(records) {
    return filterByBranch(profile, records);
  }

  function accessibleBranches(allBranches) {
    return getAccessibleBranches(profile, allBranches);
  }

  return { can, canBranch, filterBranch, accessibleBranches };
}
