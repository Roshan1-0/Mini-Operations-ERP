import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'
import Login from './Features/Auth/pages/Login.jsx'
import Inventory from './Features/Inventory/pages/Inventory.jsx'
import WorkOrders from './Features/WorkOrders/pages/WorkOrders.jsx'
import Transfers from './Features/Transfers/pages/Transfers.jsx'
import CustomerOrders from './Features/Orders/pages/CustomerOrders.jsx'

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={
                <ProtectedRoute>
                    <AppLayout />
                </ProtectedRoute>
            }>
                <Route path="/" element={<Navigate to="/inventory" replace />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/work-orders" element={<WorkOrders />} />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/orders" element={<CustomerOrders />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
