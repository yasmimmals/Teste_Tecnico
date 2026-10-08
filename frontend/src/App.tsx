import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, isManager, useAuth } from './auth/AuthContext';
import Equipe from './pages/Equipe';
import Espelho from './pages/Espelho';
import Home from './pages/Home';
import Login from './pages/Login';
import MeusDados from './pages/MeusDados';
import Ponto from './pages/Ponto';
import Register from './pages/Register';

function PrivateRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function ManagerRoutes() {
  const { user } = useAuth();
  return isManager(user) ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />

          <Route element={<PrivateRoutes />}>
            <Route path="/" element={<Home />} />
            <Route path="/ponto" element={<Ponto />} />
            <Route path="/espelho" element={<Espelho />} />
            <Route path="/meus-dados" element={<MeusDados />} />
            <Route element={<ManagerRoutes />}>
              <Route path="/equipe" element={<Equipe />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
