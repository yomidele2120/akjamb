import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AccountSetup from "./pages/AccountSetup";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AllowedStudents from "./pages/admin/AllowedStudents";
import Subjects from "./pages/admin/Subjects";
import Topics from "./pages/admin/Topics";
import QuestionBank from "./pages/admin/QuestionBank";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/setup" element={<AccountSetup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/students" element={<AdminRoute><AllowedStudents /></AdminRoute>} />
            <Route path="/admin/subjects" element={<AdminRoute><Subjects /></AdminRoute>} />
            <Route path="/admin/topics" element={<AdminRoute><Topics /></AdminRoute>} />
            <Route path="/admin/questions" element={<AdminRoute><QuestionBank /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
