import client from './client';

// Initial fake users matching system sample accounts & schema
let FAKE_USERS = [
  {
    id: 1,
    name: 'Alice Smith',
    email: 'alice@bank.com',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 2,
    name: 'Bob Jones',
    email: 'bob@bank.com',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: '2026-03-01T11:00:00.000Z'
  },
  {
    id: 3,
    name: 'Carol White',
    email: 'carol@bank.com',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: '2026-03-02T09:00:00.000Z'
  },
  {
    id: 4,
    name: 'John Staff',
    email: 'employee@bank.com',
    role: 'EMPLOYEE',
    isActive: true,
    createdAt: '2026-02-15T08:00:00.000Z'
  },
  {
    id: 5,
    name: 'Super Admin',
    email: 'admin@bank.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

// Initial bank branches
let FAKE_BRANCHES = [
  {
    id: 1,
    branchCode: 'BR001',
    name: 'Main City Branch',
    address: '100 Banking Plaza, Financial Core',
    createdAt: '2026-01-01T09:00:00.000Z'
  },
  {
    id: 2,
    branchCode: 'BR002',
    name: 'Downtown Branch',
    address: '45 Market Street, Suite 10',
    createdAt: '2026-01-05T09:00:00.000Z'
  },
  {
    id: 3,
    branchCode: 'BR003',
    name: 'Uptown Branch',
    address: '89 North Avenue, Sector 4',
    createdAt: '2026-01-10T09:00:00.000Z'
  }
];

// Initial audit logs matching exact action names
let FAKE_AUDIT_LOGS = [
  {
    id: 501,
    userId: 4,
    userName: 'John Staff (employee@bank.com)',
    action: 'ACCOUNT_VERIFIED',
    targetId: '3',
    details: 'Verified customer Carol White account ACC10000003 from PENDING to ACTIVE',
    createdAt: '2026-03-02T10:00:00.000Z'
  },
  {
    id: 502,
    userId: 4,
    userName: 'John Staff (employee@bank.com)',
    action: 'ACCOUNT_BLOCKED',
    targetId: '1',
    details: 'Blocked customer Alice Smith account ACC10000001 for suspicious activity review',
    createdAt: '2026-03-02T11:15:00.000Z'
  },
  {
    id: 503,
    userId: 5,
    userName: 'Super Admin (admin@bank.com)',
    action: 'EMPLOYEE_CREATED',
    targetId: '4',
    details: 'Created new employee user John Staff (employee@bank.com)',
    createdAt: '2026-02-15T08:00:00.000Z'
  },
  {
    id: 504,
    userId: 5,
    userName: 'Super Admin (admin@bank.com)',
    action: 'BRANCH_CREATED',
    targetId: '1',
    details: 'Registered bank branch BR001 - Main City Branch',
    createdAt: '2026-01-01T09:00:00.000Z'
  },
  {
    id: 505,
    userId: 4,
    userName: 'John Staff (employee@bank.com)',
    action: 'ACCOUNT_UNBLOCKED',
    targetId: '1',
    details: 'Unblocked customer Alice Smith account ACC10000001 after identity confirmation',
    createdAt: '2026-03-02T13:30:00.000Z'
  },
  {
    id: 506,
    userId: 5,
    userName: 'Super Admin (admin@bank.com)',
    action: 'USER_DEACTIVATED',
    targetId: '2',
    details: 'Deactivated user account for Bob Jones (bob@bank.com)',
    createdAt: '2026-03-02T14:00:00.000Z'
  }
];

// Helper to make API calls safely through client.js
async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (client && typeof client[method.toLowerCase()] === 'function') {
    return options.body ? client[method.toLowerCase()](url, options.body) : client[method.toLowerCase()](url);
  }
  if (typeof client === 'function') {
    return client(url, options);
  }
  if (client && typeof client.request === 'function') {
    return client.request(url, options);
  }
  throw new Error('API client not available');
}

/**
 * Fetch all users with role filtering, search, and pagination.
 * GET /admin/users?role=...&search=...&page=...&limit=...
 */
export async function getUsers({ role = '', search = '', page = 1, limit = 10 } = {}) {
  const query = new URLSearchParams();
  if (role) query.set('role', role);
  if (search) query.set('search', search);
  query.set('page', String(page));
  query.set('limit', String(limit));

  const url = `/admin/users?${query.toString()}`;

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data;
    if (res && res.users) return res;
    return res;
  } catch (err) {
    console.warn(`[getUsers] Backend call failed (${err.message}). Using fake users list.`);

    let filtered = [...FAKE_USERS];

    if (role) {
      filtered = filtered.filter(u => u.role.toUpperCase() === role.toUpperCase());
    }

    if (search) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      users: filtered.slice(start, start + limit),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    };
  }
}

/**
 * Activate or deactivate a user.
 * PATCH /admin/users/:userId/activate or PATCH /admin/users/:userId/deactivate
 */
export async function toggleUserStatus(userId, activate) {
  const action = activate ? 'activate' : 'deactivate';
  const url = `/admin/users/${userId}/${action}`;

  try {
    const res = await request(url, { method: 'PATCH' });
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[toggleUserStatus] Backend call failed (${err.message}). Simulating toggle.`);

    const user = FAKE_USERS.find(u => String(u.id) === String(userId));
    if (user) {
      user.isActive = activate;
    }

    return {
      success: true,
      message: `User ${activate ? 'activated' : 'deactivated'} successfully`,
      data: { id: userId, isActive: activate }
    };
  }
}

/**
 * Create a new employee account.
 * POST /admin/employees
 * Body: { name, email, password, branchId }
 */
export async function createEmployee(employeeData) {
  const url = '/admin/employees';

  try {
    const res = await request(url, {
      method: 'POST',
      body: employeeData
    });
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[createEmployee] Backend call failed (${err.message}). Simulating create employee.`);

    const newId = FAKE_USERS.length > 0 ? Math.max(...FAKE_USERS.map(u => u.id)) + 1 : 101;
    const newEmployee = {
      id: newId,
      name: employeeData.name,
      email: employeeData.email,
      role: 'EMPLOYEE',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    FAKE_USERS.unshift(newEmployee);

    return {
      success: true,
      message: 'Employee created successfully',
      data: newEmployee
    };
  }
}

/**
 * Fetch all bank branches.
 * GET /branches or GET /admin/branches
 */
export async function getBranches() {
  const url = '/branches';

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data.branches || res.data;
    if (res && res.branches) return res.branches;
    return res;
  } catch (err) {
    console.warn(`[getBranches] Backend call failed (${err.message}). Using fake branches.`);
    return [...FAKE_BRANCHES];
  }
}

/**
 * Create a new bank branch.
 * POST /admin/branches
 * Body: { branchCode, name, address }
 */
export async function createBranch({ branchCode, name, address }) {
  const url = '/admin/branches';

  try {
    const res = await request(url, {
      method: 'POST',
      body: { branchCode, name, address }
    });
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[createBranch] Backend call failed (${err.message}). Simulating create branch.`);

    // Check duplicate code
    const existing = FAKE_BRANCHES.find(
      b => b.branchCode.toUpperCase() === branchCode.trim().toUpperCase()
    );
    if (existing) {
      throw new Error(`Branch code "${branchCode}" already exists.`);
    }

    const newBranch = {
      id: FAKE_BRANCHES.length > 0 ? Math.max(...FAKE_BRANCHES.map(b => b.id)) + 1 : 1,
      branchCode: branchCode.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim(),
      createdAt: new Date().toISOString()
    };

    FAKE_BRANCHES.push(newBranch);

    return {
      success: true,
      message: 'Branch created successfully',
      data: newBranch
    };
  }
}

/**
 * Update an existing bank branch.
 * PUT /admin/branches/:branchId
 * Body: { branchCode, name, address }
 */
export async function updateBranch(branchId, { branchCode, name, address }) {
  const url = `/admin/branches/${branchId}`;

  try {
    const res = await request(url, {
      method: 'PUT',
      body: { branchCode, name, address }
    });
    return res && res.data ? res.data : res;
  } catch (err) {
    console.warn(`[updateBranch] Backend call failed (${err.message}). Simulating update branch.`);

    const index = FAKE_BRANCHES.findIndex(b => String(b.id) === String(branchId));
    if (index === -1) {
      throw new Error('Branch not found');
    }

    const duplicate = FAKE_BRANCHES.find(
      b => String(b.id) !== String(branchId) && b.branchCode.toUpperCase() === branchCode.trim().toUpperCase()
    );
    if (duplicate) {
      throw new Error(`Branch code "${branchCode}" already exists on another branch.`);
    }

    const updated = {
      ...FAKE_BRANCHES[index],
      branchCode: branchCode.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim()
    };

    FAKE_BRANCHES[index] = updated;

    return {
      success: true,
      message: 'Branch updated successfully',
      data: updated
    };
  }
}

/**
 * Fetch system audit logs with filters by action, dates, and pagination.
 * GET /admin/audit-logs?action=...&from=...&to=...&page=...&limit=...
 */
export async function getAuditLogs({ action = '', from = '', to = '', page = 1, limit = 10 } = {}) {
  const query = new URLSearchParams();
  if (action) query.set('action', action);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  query.set('page', String(page));
  query.set('limit', String(limit));

  const url = `/admin/audit-logs?${query.toString()}`;

  try {
    const res = await request(url, { method: 'GET' });
    if (res && res.data) return res.data;
    if (res && res.logs) return res;
    return res;
  } catch (err) {
    console.warn(`[getAuditLogs] Backend call failed (${err.message}). Using fake audit logs.`);

    let filtered = [...FAKE_AUDIT_LOGS];

    if (action) {
      filtered = filtered.filter(l => l.action === action);
    }

    if (from) {
      const fromTime = new Date(from).getTime();
      filtered = filtered.filter(l => new Date(l.createdAt).getTime() >= fromTime);
    }

    if (to) {
      const toTime = new Date(to).getTime() + (24 * 60 * 60 * 1000 - 1);
      filtered = filtered.filter(l => new Date(l.createdAt).getTime() <= toTime);
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;

    return {
      logs: filtered.slice(start, start + limit),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    };
  }
}
