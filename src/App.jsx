import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AddStudent from './components/AddStudent';
import AddClass from './components/AddClass';
import RecordAttendance from './components/RecordAttendance';
import AttendanceCharts from './components/AttendanceCharts';
import ExportData from './components/ExportData';
import { supabase } from './lib/supabase';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Test Supabase connection
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('classes').select('count').limit(1);
        if (error) throw error;
        setLoading(false);
      } catch (err) {
        console.error('Supabase connection error:', err);
        setError('Failed to connect to database. Please check your Supabase configuration.');
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-100 p-8 rounded-2xl max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-2">Connection Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen relative">
        {/* School Supplies Background */}
        <div className="school-supplies">
          <div className="supply-item top-10 left-10 text-6xl" style={{animationDelay: '0s'}}>✏️</div>
          <div className="supply-item top-20 right-20 text-5xl" style={{animationDelay: '1s'}}>📚</div>
          <div className="supply-item bottom-20 left-20 text-4xl" style={{animationDelay: '2s'}}>📐</div>
          <div className="supply-item top-1/2 right-10 text-6xl" style={{animationDelay: '3s'}}>🖍️</div>
          <div className="supply-item bottom-10 right-1/3 text-5xl" style={{animationDelay: '4s'}}>📝</div>
          <div className="supply-item top-1/3 left-1/4 text-4xl" style={{animationDelay: '5s'}}>🎒</div>
        </div>

        <Navbar />
        
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-student" element={<AddStudent />} />
            <Route path="/add-class" element={<AddClass />} />
            <Route path="/record-attendance" element={<RecordAttendance />} />
            <Route path="/charts" element={<AttendanceCharts />} />
            <Route path="/export" element={<ExportData />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;