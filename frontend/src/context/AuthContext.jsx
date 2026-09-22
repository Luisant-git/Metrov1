import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "../api/auth.js";


const AuthContext = createContext(null);

// Hook to access auth context
export const useAuth = () => useContext(AuthContext);

export const ROLES = {
  ADMIN: "Admin",
  DIRECTOR: "Director",
  REGIONAL_MANAGER: "Regional Manager",
  BRANCH_MANAGER: "Branch Manager",
  BDM: "BDM",
  SALES_MANAGER: "Sales Manager",
};

export const WEB_ROLES = [ROLES.ADMIN, ROLES.DIRECTOR];
export const PWA_ROLES = [
  ROLES.REGIONAL_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.BDM,
  ROLES.SALES_MANAGER,
];

// Role hierarchy level (higher number = lower in hierarchy)
const ROLE_LEVEL = {
  [ROLES.ADMIN]: 0,
  [ROLES.DIRECTOR]: 1,
  [ROLES.REGIONAL_MANAGER]: 2,
  [ROLES.BRANCH_MANAGER]: 3,
  [ROLES.BDM]: 4,
  [ROLES.SALES_MANAGER]: 5,
};

// Which roles each role can create
const CAN_CREATE = {
  [ROLES.ADMIN]: [ROLES.DIRECTOR, ROLES.REGIONAL_MANAGER, ROLES.BRANCH_MANAGER, ROLES.BDM, ROLES.SALES_MANAGER],
  [ROLES.DIRECTOR]: [ROLES.REGIONAL_MANAGER, ROLES.BRANCH_MANAGER, ROLES.BDM, ROLES.SALES_MANAGER],
  [ROLES.REGIONAL_MANAGER]: [ROLES.BRANCH_MANAGER, ROLES.BDM, ROLES.SALES_MANAGER],
  [ROLES.BRANCH_MANAGER]: [ROLES.BDM, ROLES.SALES_MANAGER],
  [ROLES.BDM]: [ROLES.SALES_MANAGER],
  [ROLES.SALES_MANAGER]: [],
};

// Which parent role is required for each role
const REQUIRED_PARENT_ROLE = {
  [ROLES.REGIONAL_MANAGER]: ROLES.ADMIN,
  [ROLES.BRANCH_MANAGER]: ROLES.REGIONAL_MANAGER,
  [ROLES.BDM]: ROLES.BRANCH_MANAGER,
  [ROLES.SALES_MANAGER]: ROLES.BDM,
};

/** Get the required parent role for a given role */
function getRequiredParentRole(role) {
  return REQUIRED_PARENT_ROLE[role] || null;
}

// Mock users with hierarchy fields — exact counts per role
const MOCK_USERS = [
  // Admin (1)
  { id: 1, name: "Arjun Mehta", email: "admin@realestate.com", password: "1234", role: ROLES.ADMIN, mobile: "9876543210", employeeCode: "AD001", avatar: null, status: "Active", region: "Head Office", branch: null, parentUserId: null, createdBy: null },

  // Directors (2)
  { id: 2, name: "Priya Sharma", email: "director@realestate.com", password: "1234", role: ROLES.DIRECTOR, mobile: "9876543211", employeeCode: "D001", avatar: null, status: "Active", region: "North", branch: null, parentUserId: 1, createdBy: 1 },
  { id: 7, name: "Rahul Verma", email: "rahul.dir@realestate.com", password: "1234", role: ROLES.DIRECTOR, mobile: "9876543240", employeeCode: "D002", avatar: null, status: "Active", region: "South", branch: null, parentUserId: 1, createdBy: 1 },

  // Regional Managers (3)
  { id: 3, name: "Rajesh Kumar", email: "rm@realestate.com", password: "rm123", role: ROLES.REGIONAL_MANAGER, mobile: "9876543212", employeeCode: "RM001", avatar: null, status: "Active", region: "North", branch: null, parentUserId: 2, createdBy: 2 },
  { id: 8, name: "Sanjay Gupta", email: "sanjay.rm@realestate.com", password: "rm123", role: ROLES.REGIONAL_MANAGER, mobile: "9876543241", employeeCode: "RM002", avatar: null, status: "Active", region: "South", branch: null, parentUserId: 7, createdBy: 7 },
  { id: 9, name: "Meena Joshi", email: "meena.rm@realestate.com", password: "rm123", role: ROLES.REGIONAL_MANAGER, mobile: "9876543242", employeeCode: "RM003", avatar: null, status: "Active", region: "East", branch: null, parentUserId: 7, createdBy: 7 },

  // Branch Managers (4)
  { id: 4, name: "Sunita Patel", email: "bm@realestate.com", password: "bm123", role: ROLES.BRANCH_MANAGER, mobile: "9876543213", employeeCode: "BM001", avatar: null, status: "Active", region: "North", branch: "Delhi HQ", parentUserId: 3, createdBy: 3 },
  { id: 10, name: "Amit Patel", email: "amit.bm@realestate.com", password: "bm123", role: ROLES.BRANCH_MANAGER, mobile: "9876543243", employeeCode: "BM002", avatar: null, status: "Active", region: "South", branch: "Mumbai HQ", parentUserId: 8, createdBy: 8 },
  { id: 11, name: "Pooja Singh", email: "pooja.bm@realestate.com", password: "bm123", role: ROLES.BRANCH_MANAGER, mobile: "9876543244", employeeCode: "BM003", avatar: null, status: "Active", region: "South", branch: "Bangalore Branch", parentUserId: 8, createdBy: 8 },
  { id: 12, name: "Ramesh Yadav", email: "ramesh.bm@realestate.com", password: "bm123", role: ROLES.BRANCH_MANAGER, mobile: "9876543245", employeeCode: "BM004", avatar: null, status: "Active", region: "East", branch: "Hyderabad Branch", parentUserId: 9, createdBy: 9 },

  // BDMs (5)
  { id: 5, name: "Vikram Singh", email: "bdm@realestate.com", password: "bdm123", role: ROLES.BDM, mobile: "9876543214", employeeCode: "BD001", avatar: null, status: "Active", region: "North", branch: "Delhi HQ", parentUserId: 4, createdBy: 4 },
  { id: 13, name: "Kiran Kumar", email: "kiran.bdm@realestate.com", password: "bdm123", role: ROLES.BDM, mobile: "9876543246", employeeCode: "BD002", avatar: null, status: "Active", region: "South", branch: "Mumbai HQ", parentUserId: 10, createdBy: 10 },
  { id: 14, name: "Ritu Sharma", email: "ritu.bdm@realestate.com", password: "bdm123", role: ROLES.BDM, mobile: "9876543247", employeeCode: "BD003", avatar: null, status: "Active", region: "South", branch: "Bangalore Branch", parentUserId: 11, createdBy: 11 },
  { id: 15, name: "Anil Bose", email: "anil.bdm@realestate.com", password: "bdm123", role: ROLES.BDM, mobile: "9876543248", employeeCode: "BD004", avatar: null, status: "Active", region: "East", branch: "Hyderabad Branch", parentUserId: 12, createdBy: 12 },
  { id: 16, name: "Deepa Rao", email: "deepa.bdm@realestate.com", password: "bdm123", role: ROLES.BDM, mobile: "9876543249", employeeCode: "BD005", avatar: null, status: "Active", region: "South", branch: "Mumbai HQ", parentUserId: 10, createdBy: 10 },

  // Sales Managers (6)
  { id: 6, name: "Anjali Verma", email: "sm@realestate.com", password: "sm123", role: ROLES.SALES_MANAGER, mobile: "9876543215", employeeCode: "SM001", avatar: null, status: "Active", region: "North", branch: "Delhi HQ", parentUserId: 5, createdBy: 5 },
  { id: 17, name: "Manoj Tiwari", email: "manoj.sm@realestate.com", password: "sm123", role: ROLES.SALES_MANAGER, mobile: "9876543250", employeeCode: "SM002", avatar: null, status: "Active", region: "South", branch: "Mumbai HQ", parentUserId: 13, createdBy: 13 },
  { id: 18, name: "Sonia Kapoor", email: "sonia.sm@realestate.com", password: "sm123", role: ROLES.SALES_MANAGER, mobile: "9876543251", employeeCode: "SM003", avatar: null, status: "Active", region: "South", branch: "Bangalore Branch", parentUserId: 14, createdBy: 14 },
  { id: 19, name: "Vijay Menon", email: "vijay.sm@realestate.com", password: "sm123", role: ROLES.SALES_MANAGER, mobile: "9876543252", employeeCode: "SM004", avatar: null, status: "Active", region: "East", branch: "Hyderabad Branch", parentUserId: 15, createdBy: 15 },
  { id: 20, name: "Rekha Das", email: "rekha.sm@realestate.com", password: "sm123", role: ROLES.SALES_MANAGER, mobile: "9876543253", employeeCode: "SM005", avatar: null, status: "Active", region: "South", branch: "Mumbai HQ", parentUserId: 16, createdBy: 16 },
  { id: 21, name: "Arjun Reddy", email: "arjun.sm@realestate.com", password: "sm123", role: ROLES.SALES_MANAGER, mobile: "9876543254", employeeCode: "SM006", avatar: null, status: "Active", region: "South", branch: "Mumbai HQ", parentUserId: 13, createdBy: 13 },
];

// ─── Hierarchy utility functions ───────────────────────────────────────────

/** Get all direct children of a user */
function getDirectChildren(users, userId) {
  return users.filter(u => u.parentUserId === userId);
}

/** Get all descendants (full downline) of a user */
function getDownline(users, userId) {
  const result = [];
  const queue = [...getDirectChildren(users, userId)];
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);
    queue.push(...getDirectChildren(users, current.id));
  }
  return result;
}

/** Get all ancestors (reporting chain up to root) of a user */
function getAncestors(users, userId) {
  const result = [];
  let current = users.find(u => u.id === userId);
  while (current && current.parentUserId) {
    const parent = users.find(u => u.id === current.parentUserId);
    if (parent) {
      result.push(parent);
      current = parent;
    } else {
      break;
    }
  }
  return result;
}

/** Check if a user is in the logged-in user's team (downline or self) */
function isInMyTeam(users, loggedInUserId, targetUserId) {
  if (loggedInUserId === targetUserId) return true;
  const downline = getDownline(users, loggedInUserId);
  return downline.some(u => u.id === targetUserId);
}

/** Get roles that a given role can create */
function getCreatableRoles(role) {
  return CAN_CREATE[role] || [];
}

/** Get total team count for a user (self + downline) */
function getTeamCount(users, userId) {
  return 1 + getDownline(users, userId).length;
}

/** Get the role name for the level immediately above */
function getParentRoleName(role) {
  const entries = Object.entries(ROLE_LEVEL);
  const currentLevel = ROLE_LEVEL[role];
  if (currentLevel === undefined || currentLevel === 0) return null;
  for (const [r, l] of entries) {
    if (l === currentLevel - 1) return r;
  }
  return null;
}

/** Verify if a user can be created by a given role with a specific parent */
function verifyUserCreation(parentRole, childRole) {
  const parentLevel = ROLE_LEVEL[parentRole];
  const childLevel = ROLE_LEVEL[childRole];

  if (parentLevel === undefined || childLevel === undefined) {
    return { valid: false, error: "Invalid role selected" };
  }

  if (childLevel <= parentLevel) {
    return {
      valid: false,
      error: `${parentRole} cannot create ${childRole} role.`
    };
  }

  return { valid: true };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const saved = localStorage.getItem("re_user");
      if (saved) {
        try { setUser(JSON.parse(saved)); } catch {}
      }
      
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const profile = await auth.getProfile();
          if (profile) {
            setUser(profile);
            localStorage.setItem("re_user", JSON.stringify(profile));
          }
        } catch (err) {
          console.error("Failed to sync profile from server:", err);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (identifier, password) => {
    try {
      const data = await auth.login(identifier, password);
      if (data?.user) {
        const { password: _, ...safeUser } = data.user;
        setUser(safeUser);
        localStorage.setItem("re_user", JSON.stringify(safeUser));
        // Save the auth token so API calls work on page refresh
        if (data.accessToken) {
          localStorage.setItem("authToken", data.accessToken);
        }
        return { success: true, user: safeUser };
      }
      return { success: false, error: "Login failed" };
    } catch (err) {
      return { success: false, error: err.message || "Invalid user ID or password" };
    }
  };

  const adminLogin = async (identifier, pin) => {
    try {
      const data = await auth.adminLogin(identifier, pin);
      if (data?.user && data?.accessToken) {
        const { pin: _, ...safeUser } = data.user;
        setUser(safeUser);
        localStorage.setItem("re_user", JSON.stringify(safeUser));
        localStorage.setItem("authToken", data.accessToken);
        return { success: true, user: safeUser };
      }
      return { success: false, error: "Admin login failed" };
    } catch (err) {
      return { success: false, error: err.message || "Invalid Admin credentials" };
    }
  };

  // OTP functions
  const requestOtp = async (employeeCode) => {
    try {
      const result = await auth.requestOtp(employeeCode);
      return result;
    } catch (e) {
      return { error: e.message };
    }
  };

  const verifyOtp = async (employeeCode, otp) => {
    try {
      const result = await auth.verifyOtp(employeeCode, otp);
      if (result?.accessToken && result?.user) {
        const { password: _, ...safeUser } = result.user;
        setUser(safeUser);
        localStorage.setItem("re_user", JSON.stringify(safeUser));
        localStorage.setItem("authToken", result.accessToken);
      }
      return result;
    } catch (e) {
      return { error: e.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("re_user");
    localStorage.removeItem("authToken");
  };

  const updateProfile = async (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem("re_user", JSON.stringify(updated));
    
    // Persist changes to backend if we have a logged-in user
    if (user?.id) {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          // Only send allowed fields to backend
          const allowedFields = {
            name: updates.name || user.name,
            email: updates.email || user.email,
            mobile: updates.mobile || user.mobile,
            fatherHusbandName: updates.fatherHusbandName || user.fatherHusbandName,
            address: updates.address || user.address,
            dob: updates.dob || user.dob,
            nomineeName: updates.nomineeName || user.nomineeName,
            nomineeRelationship: updates.nomineeRelationship || user.nomineeRelationship,
            bankName: updates.bankName || user.bankName,
            bankAccountNo: updates.bankAccountNo || user.bankAccountNo,
            ifscCode: updates.ifscCode || user.ifscCode,
            bankBranch: updates.bankBranch || user.bankBranch,
            panNo: updates.panNo || user.panNo,
            avatar: updates.avatar || user.avatar,
          };
          
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/users/${user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(allowedFields)
          });
        }
      } catch (error) {
        console.error("Failed to persist profile update to backend:", error);
      }
    }
  };

  const isWebRole = user && WEB_ROLES.includes(user.role);
  const isPWARole = user && PWA_ROLES.includes(user.role);

  // Hierarchy helpers exposed to consumers
  const hierarchy = {
    // Pre-bound helpers (use logged-in user's id)
    getDownline: (allUsers) => getDownline(allUsers, user?.id),
    getDirectChildren: (allUsers) => getDirectChildren(allUsers, user?.id),
    getAncestors: (allUsers) => getAncestors(allUsers, user?.id),
    isInMyTeam: (allUsers, targetUserId) => isInMyTeam(allUsers, user?.id, targetUserId),
    getCreatableRoles: () => getCreatableRoles(user?.role),
    canCreateUser: () => getCreatableRoles(user?.role).length > 0,
    getTeamCount: (allUsers) => getTeamCount(allUsers, user?.id),
    getParentRoleName: () => getParentRoleName(user?.role),
    // Generic helpers (pass any user id)
    getDirectChildrenFor: (allUsers, uid) => getDirectChildren(allUsers, uid),
    getDownlineFor: (allUsers, uid) => getDownline(allUsers, uid),
    getTeamCountFor: (allUsers, uid) => getTeamCount(allUsers, uid),
    ROLE_LEVEL,
    CAN_CREATE,
    verifyUserCreation,
    getRequiredParentRole,
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, logout, requestOtp, verifyOtp, updateProfile, loading, isWebRole, isPWARole, hierarchy, MOCK_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}
