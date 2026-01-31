import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import AdminLayout from './AdminLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import Events from './pages/Events.jsx';
import Resources from './pages/Resources.jsx';
import Register from './pages/Register.jsx';
import Clubs from './pages/Clubs.jsx';
import Bookings from './pages/Bookings.jsx';
import AdminEvents from './pages/AdminEvents.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import ClubManage from './pages/ClubManage.jsx';
import Calendar from './pages/Calendar.jsx';
import EventDetail from './pages/EventDetail.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<App />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="register" element={<Register />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="clubs/:id/manage" element={<ClubManage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>

        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="resources" element={<Resources />} />
          <Route path="bookings" element={<Bookings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
