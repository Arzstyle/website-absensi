import express from 'express';
import Joi from 'joi';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// Validation schema for attendance record
const attendanceSchema = Joi.object({
  student_id: Joi.string().uuid().required(),
  date: Joi.date().required(),
  status: Joi.string().valid('Present', 'Absent', 'Late', 'Excused').required()
});

// Validation schema for bulk attendance
const bulkAttendanceSchema = Joi.object({
  date: Joi.date().required(),
  records: Joi.array().items(
    Joi.object({
      student_id: Joi.string().uuid().required(),
      status: Joi.string().valid('Present', 'Absent', 'Late', 'Excused').required()
    })
  ).min(1).required()
});

// GET /api/attendance - Get attendance records with filters
router.get('/', async (req, res) => {
  try {
    const { 
      student_id, 
      class_id, 
      date, 
      start_date, 
      end_date, 
      status,
      limit = 100,
      offset = 0
    } = req.query;

    let query = req.supabase
      .from('attendance')
      .select(`
        *,
        students (
          id,
          name,
          gender,
          classes (
            id,
            class_name,
            grade
          )
        )
      `);

    // Apply filters
    if (student_id) query = query.eq('student_id', student_id);
    if (date) query = query.eq('date', date);
    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);
    if (status) query = query.eq('status', status);
    if (class_id) {
      query = query.eq('students.class_id', class_id);
    }

    // Apply pagination and ordering
    query = query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records'
    });
  }
});

// GET /api/attendance/charts - Get attendance data for charts
router.get('/charts', async (req, res) => {
  try {
    const { 
      class_id, 
      student_id, 
      days = 30 
    } = req.query;

    const startDate = format(subDays(new Date(), parseInt(days)), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    let query = req.supabase
      .from('attendance')
      .select(`
        date,
        status,
        students (
          id,
          name,
          class_id,
          classes (
            id,
            class_name,
            grade
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (class_id) query = query.eq('students.class_id', class_id);
    if (student_id) query = query.eq('student_id', student_id);

    const { data, error } = await query.order('date');

    if (error) throw error;

    // Process data for charts
    const chartData = {
      daily: {},
      statusCounts: {
        Present: 0,
        Absent: 0,
        Late: 0,
        Excused: 0
      },
      trends: []
    };

    data?.forEach(record => {
      const date = record.date;
      
      // Count by status
      chartData.statusCounts[record.status]++;
      
      // Group by date
      if (!chartData.daily[date]) {
        chartData.daily[date] = {
          Present: 0,
          Absent: 0,
          Late: 0,
          Excused: 0
        };
      }
      chartData.daily[date][record.status]++;
    });

    // Convert daily data to trends array
    chartData.trends = Object.entries(chartData.daily).map(([date, counts]) => ({
      date,
      ...counts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0)
    }));

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

// POST /api/attendance - Record single attendance
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error: validationError, value } = attendanceSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }

    // Check if student exists
    const { data: student } = await req.supabase
      .from('students')
      .select('id')
      .eq('id', value.student_id)
      .single();

    if (!student) {
      return res.status(400).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Upsert attendance record (insert or update if exists)
    const { data, error } = await req.supabase
      .from('attendance')
      .upsert([value], { 
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

    res.status(201).json({
      success: true,
      data,
      message: 'Attendance recorded successfully'
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record attendance'
    });
  }
});

// POST /api/attendance/bulk - Record bulk attendance
router.post('/bulk', async (req, res) => {
  try {
    // Validate request body
    const { error: validationError, value } = bulkAttendanceSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }

    // Prepare attendance records
    const attendanceRecords = value.records.map(record => ({
      ...record,
      date: value.date
    }));

    // Verify all students exist
    const studentIds = attendanceRecords.map(r => r.student_id);
    const { data: students } = await req.supabase
      .from('students')
      .select('id')
      .in('id', studentIds);

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more students not found'
      });
    }

    // Upsert all attendance records
    const { data, error } = await req.supabase
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

    res.status(201).json({
      success: true,
      data,
      message: `${data.length} attendance records processed successfully`
    });
  } catch (error) {
    console.error('Error recording bulk attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record bulk attendance'
    });
  }
});

// GET /api/attendance/class/:classId/date/:date - Get attendance for specific class and date
router.get('/class/:classId/date/:date', async (req, res) => {
  try {
    const { classId, date } = req.params;

    // Get all students in the class
    const { data: students, error: studentsError } = await req.supabase
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
    const { data: attendanceRecords, error: attendanceError } = await req.supabase
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

    res.json({
      success: true,
      data: {
        date,
        class_id: classId,
        students: studentsWithAttendance
      }
    });
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class attendance'
    });
  }
});

export default router;