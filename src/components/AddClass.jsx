import React, { useState } from 'react';
import { db } from '../lib/supabase';

const AddClass = () => {
  const [formData, setFormData] = useState({
    class_name: '',
    grade: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.class_name.trim()) {
        throw new Error('Class name is required');
      }
      if (!formData.grade || formData.grade < 1 || formData.grade > 12) {
        throw new Error('Please select a valid grade (1-12)');
      }

      const classData = {
        class_name: formData.class_name.trim(),
        grade: parseInt(formData.grade)
      };

      await db.createClass(classData);
      
      setSuccess('Class created successfully! 🎉');
      setFormData({
        class_name: '',
        grade: ''
      });
    } catch (err) {
      console.error('Error creating class:', err);
      setError(err.message || 'Failed to create class');
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

  const grades = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl card-hover">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏫</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Add New Class</h1>
            <p className="text-gray-600">Create a new class to organize your students</p>
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
              <label htmlFor="class_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Class Name *
              </label>
              <input
                type="text"
                id="class_name"
                name="class_name"
                value={formData.class_name}
                onChange={handleChange}
                className="form-input"
                placeholder="e.g., 3A, Mathematics, Science Class"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter a descriptive name for the class (e.g., "3A", "Advanced Math", "Science Lab")
              </p>
            </div>

            <div>
              <label htmlFor="grade" className="block text-sm font-semibold text-gray-700 mb-2">
                Grade Level *
              </label>
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select grade level</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Class Naming Tips:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Use section letters: "3A", "3B", "4C"</li>
                <li>• Include subject: "Grade 5 Math", "Science Lab"</li>
                <li>• Keep it simple and clear for easy identification</li>
              </ul>
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
                    Creating Class...
                  </div>
                ) : (
                  '✅ Create Class'
                )}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    class_name: '',
                    grade: ''
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

          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-800 mb-2">📋 What happens next?</h3>
            <p className="text-sm text-gray-600">
              After creating a class, you can add students to it and start recording attendance. 
              Each class can have multiple students, and you can track their attendance individually.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddClass;