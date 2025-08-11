import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';

const AddStudent = () => {
  const [formData, setFormData] = useState({
    name: '',
    class_id: '',
    gender: '',
    date_of_birth: ''
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const classesData = await db.getClasses();
      setClasses(classesData);
    } catch (err) {
      console.error('Error loading classes:', err);
      setError('Failed to load classes');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Student name is required');
      }
      if (!formData.class_id) {
        throw new Error('Please select a class');
      }
      if (!formData.gender) {
        throw new Error('Please select gender');
      }
      if (!formData.date_of_birth) {
        throw new Error('Date of birth is required');
      }

      // Check if date of birth is not in the future
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }

      await db.createStudent(formData);
      
      setSuccess('Student added successfully! 🎉');
      setFormData({
        name: '',
        class_id: '',
        gender: '',
        date_of_birth: ''
      });
    } catch (err) {
      console.error('Error adding student:', err);
      setError(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl card-hover">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👥</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Add New Student</h1>
            <p className="text-gray-600">Enter student information to add them to the system</p>
          </div>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-6">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Student Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter student's full name"
                required
              />
            </div>

            <div>
              <label htmlFor="class_id" className="block text-sm font-semibold text-gray-700 mb-2">
                Class *
              </label>
              <select
                id="class_id"
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_name} - Grade {cls.grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 mb-2">
                Gender *
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                className="form-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-2"></div>
                    Adding Student...
                  </div>
                ) : (
                  '✅ Add Student'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    name: '',
                    class_id: '',
                    gender: '',
                    date_of_birth: ''
                  });
                  setError('');
                  setSuccess('');
                }}
                className="btn-secondary"
              >
                🔄 Clear Form
              </button>
            </div>
          </form>

          {classes.length === 0 && (
            <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-xl">
              <p className="font-semibold">No classes available!</p>
              <p>You need to create at least one class before adding students.</p>
              <a href="/add-class" className="text-yellow-800 underline font-semibold">
                Create a class first →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudent;