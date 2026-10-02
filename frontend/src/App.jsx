import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';

// Customer pages (Member 3)
import DashboardPage from './pages/customer/DashboardPage';
import TransferPage from './pages/customer/TransferPage';
import BeneficiariesPage from './pages/customer/BeneficiariesPage';
import TransactionsPage from './pages/customer/TransactionsPage';
import StatementPage from './pages/customer/StatementPage';
import NotificationsPage from './pages/customer/NotificationsPage';

// Staff pages (Member 4)
import CustomersPage from './pages/staff/CustomersPage';
import CustomerDetailPage from './pages/staff/CustomerDetailPage';
import StaffTransactionsPage from './pages/staff/StaffTransactionsPage';

// Admin pages (Member 4)
import UsersPage from './pages/admin/UsersPage';
import CreateEmployeePage from './pages/admin/CreateEmployeePage';
import BranchesPage from './pages/admin/BranchesPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer Routes (Member 3) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfer"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <TransferPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/beneficiaries"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <BeneficiariesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/statement"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <StatementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'EMPLOYEE', 'ADMIN']}>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Staff Routes (Member 4) */}
            <Route
              path="/staff/customers"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/customers/:userId"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                  <CustomerDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/transactions"
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                  <StaffTransactionsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes (Member 4) */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <CreateEmployeePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/branches"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <BranchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
