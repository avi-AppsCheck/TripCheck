import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewActivity from './pages/NewActivity';
import Archive from './pages/Archive';
import ManageGroups from './pages/ManageGroups';
import GroupDetails from './pages/GroupDetails';
import Attendance from './pages/Attendance';
import ActivityHistory from './pages/ActivityHistory';
import EditParticipants from './pages/EditParticipants';

function RequireAuth({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="container mx-auto max-w-lg min-h-screen flex flex-col pt-safe bg-[#f3f4f6] text-gray-900 overflow-x-hidden">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/new-activity" element={<RequireAuth><NewActivity /></RequireAuth>} />
        <Route path="/archive" element={<RequireAuth><Archive /></RequireAuth>} />
        <Route path="/manage-groups" element={<RequireAuth><ManageGroups /></RequireAuth>} />
        <Route path="/group/:id" element={<RequireAuth><GroupDetails /></RequireAuth>} />
        <Route path="/attendance/:activityId" element={<RequireAuth><Attendance /></RequireAuth>} />
        <Route path="/edit-participants/:activityId" element={<RequireAuth><EditParticipants /></RequireAuth>} />
        <Route path="/history/:activityId" element={<RequireAuth><ActivityHistory /></RequireAuth>} />
      </Routes>
    </div>
  );
}
