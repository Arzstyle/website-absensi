import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const db = {
  // Classes
  async getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('grade', { ascending: true })
      .order('class_name', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createClass(classData) {
    const { data, error } = await supabase
      .from('classes')
      .insert([classData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Students
  async getStudents(classId = null) {
    let query = supabase
      .from('students')
      .select(`
        *,
        classes (
          id,
          class_name,
          grade
        )
      `)
      .order('name');

    if (classId) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createStudent(studentData) {
    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select(`
        *,
        classes (
          id,
          class_name,
          grade
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Attendance
  async getAttendance(filters = {}) {
    let query = supabase
      .from('attendance')
      .select(`
        *,
        students (
          id,
          name,
          classes (
            id,
            class_name,
            grade
          )
        )
      `);

    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.classId) query = query.eq('students.class_id', filters.classId);
    if (filters.date) query = query.eq('date', filters.date);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);

    query = query.order('date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async recordAttendance(attendanceData) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert([attendanceData], { 
        onConflict: 'student_id,date',
        ignoreDuplicates: false 
      })
      .select(`
        *,
        students (
          id,
          name,
          classes (
            id,
            class_name,
            grade
          )
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async bulkRecordAttendance(date, records) {
    const attendanceRecords = records.map(record => ({
      ...record,
      date
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, { 
        onConflict: 'student_id,date',
        ignoreDuplicates: false 
      })
      .select(`
        *,
        students (
          id,
          name,
          classes (
            id,
            class_name,
            grade
          )
        )
      `);
    
    if (error) throw error;
    return data;
  },

  async getClassAttendanceForDate(classId, date) {
    // Get all students in the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        gender,
        classes (
          id,
          class_name,
          grade
        )
      `)
      .eq('class_id', classId)
      .order('name');

    if (studentsError) throw studentsError;

    // Get attendance records for the date
    const studentIds = students.map(s => s.id);
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .in('student_id', studentIds)
      .eq('date', date);

    if (attendanceError) throw attendanceError;

    // Merge students with their attendance status
    const studentsWithAttendance = students.map(student => {
      const attendanceRecord = attendanceRecords.find(a => a.student_id === student.id);
      return {
        ...student,
        attendance: attendanceRecord ? {
          id: attendanceRecord.id,
          status: attendanceRecord.status,
          date: attendanceRecord.date
        } : null
      };
    });

    return {
      date,
      class_id: classId,
      students: studentsWithAttendance
    };
  }
};