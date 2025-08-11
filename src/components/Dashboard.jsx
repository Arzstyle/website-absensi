import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/supabase';
import { format, subDays } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    todayPresent: 0,
    todayAbsent: 0,
    attendanceRate: 0
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get basic counts
      const [students, classes] = await Promise.all([
        db.getStudents(),
        db.getClasses()
      ]);

      // Get today's attendance
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayAttendance = await db.getAttendance({
        date: today
      });

      // Get recent attendance (last 7 days)
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const recentData = await db.getAttendance({
        startDate: weekAgo,
        endDate: today
      });

      // Calculate stats
      const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
      const absentToday = todayAttendance.filter(a => a.status === 'Absent').length;
      const totalToday = presentToday + absentToday;
      const attendanceRate = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;

      setStats({
        totalStudents: students.length,
        totalClasses: classes.length,
        todayPresent: presentToday,
        todayAbsent: absentToday,
        attendanceRate
      });

      setRecentAttendance(recentData.slice(0, 10)); // Show last 10 records
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl card-hover mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Welcome to Sunshine Elementary! 🌞
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Manage student attendance with ease and efficiency
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/record-attendance" className="btn-primary">
              📝 Record Attendance
            </Link>
            <Link to="/add-student" className="btn-success">
              👥 Add Student
            </Link>
            <Link to="/charts" className="btn-secondary">
              📈 View Charts
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-800">Total Students</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-800">Total Classes</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.totalClasses}</p>
            </div>
            <div className="text-4xl">🏫</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-800">Present Today</h3>
              <p className="text-3xl font-bold text-green-600">{stats.todayPresent}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-800">Absent Today</h3>
              <p className="text-3xl font-bold text-red-600">{stats.todayAbsent}</p>
            </div>
            <div className="text-4xl">❌</div>
          </div>
        </div>
      </div>

      {/* Attendance Rate */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl card-hover mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          📊 <span className="ml-2">Today's Attendance Rate</span>
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-gray-200 rounded-full h-8">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-8 rounded-full flex items-center justify-center text-white font-bold transition-all duration-1000"
              style={{ width: `${stats.attendanceRate}%` }}
            >
              {stats.attendanceRate}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-700">
            {stats.attendanceRate}%
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-xl card-hover">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          📋 <span className="ml-2">Recent Attendance Records</span>
        </h2>
        
        {recentAttendance.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 text-lg">No attendance records yet</p>
            <Link to="/record-attendance" className="btn-primary mt-4 inline-block">
              Record First Attendance
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((record, index) => (
                  <tr key={record.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4 font-medium">{record.students.name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {record.students.classes.class_name} - Grade {record.students.classes.grade}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {format(new Date(record.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800' :
                        record.status === 'Absent' ? 'bg-red-100 text-red-800' :
                        record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;