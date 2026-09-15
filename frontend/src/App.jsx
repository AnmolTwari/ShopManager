import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import AdminPage from './pages/admin/AdminPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import InventoryPage from './pages/inventory/InventoryPage'
import ProductFormPage from './pages/products/ProductFormPage'
import ProductListPage from './pages/products/ProductListPage'
import ReportsPage from './pages/reports/ReportsPage'
import DebtsPage from './pages/debts/DebtsPage'
import NewSalePage from './pages/sales/NewSalePage'
import SaleDetailPage from './pages/sales/SaleDetailPage'
import SalesPage from './pages/sales/SalesPage'
import SettingsPage from './pages/settings/SettingsPage'
import { auth } from './services/api'

function ProtectedRoute({ children }) {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AdminRoute({ children }) {
  if (!auth.isAdmin()) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  const [ready, setReady] = useState(!auth.isAuthenticated())

  useEffect(() => {
    if (!auth.isAuthenticated()) return
    let cancelled = false
    auth
      .me()
      .catch(() => {
        // session expired — api.js redirects to /login
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return null
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/new" element={<NewSalePage />} />
          <Route path="sales/:id" element={<SaleDetailPage />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
