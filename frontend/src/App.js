import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CabangPage from "@/pages/Cabang";
import MitraPage from "@/pages/Mitra";
import ProductsPage from "@/pages/Products";
import TransactionsPage from "@/pages/Transactions";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/"
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
              <Route
                path="/cabang"
                element={
                  <Layout>
                    <CabangPage />
                  </Layout>
                }
              />
              <Route
                path="/mitra"
                element={
                  <Layout>
                    <MitraPage />
                  </Layout>
                }
              />
              <Route
                path="/products"
                element={
                  <Layout>
                    <ProductsPage />
                  </Layout>
                }
              />
              <Route
                path="/transactions"
                element={
                  <Layout>
                    <TransactionsPage />
                  </Layout>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
