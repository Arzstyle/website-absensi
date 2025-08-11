import express from 'express';
import ExcelJS from 'exceljs';
import { format, subMonths, subDays } from 'date-fns';

const router = express.Router();

// GET /api/export/attendance - Export attendance data to Excel
router.get('/attendance', async (req, res) => {
  try {
    const { 
      period = '1month', // 1month, 3months, 6months, 1year, semester
      class_id,
      student_id,
      format_type = 'excel'
    } = req.query;

    // Calculate date range based on period
    let startDate;
    const endDate = new Date();

    switch (period) {
      case '1month':
        startDate = subMonths(endDate, 1);
        break;
      case '3months':
        startDate = subMonths(endDate, 3);
        break;
      case '6months':
      case 'semester':
        startDate = subMonths(endDate, 6);
        break;
      case '1year':
        startDate = subMonths(endDate, 12);
        break;
      default:
        startDate = subMonths(endDate, 1);
    }

    // Build query
    let query = req.supabase
      .from('attendance')
      .select(`
        *,
        students (
          id,
          name,
          gender,
          date_of_birth,
          classes (
            id,
            class_name,
            grade
          )
        )
      `)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));

    if (class_id) query = query.eq('students.class_id', class_id);
    if (student_id) query = query.eq('student_id', student_id);

    query = query.order('date', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    if (format_type === 'json') {
      return res.json({
        success: true,
        data: data || [],
        period,
        date_range: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        }
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Set up worksheet properties
    worksheet.properties.defaultRowHeight = 20;

    // Add title
    const titleRow = worksheet.addRow(['Sunshine Elementary School - Attendance Report']);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:E1');

    // Add period info
    const periodRow = worksheet.addRow([`Period: ${period.replace(/(\d+)/, '$1 ')} (${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')})`]);
    periodRow.font = { size: 12, italic: true };
    periodRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A2:E2');

    // Add empty row
    worksheet.addRow([]);

    // Add headers
    const headerRow = worksheet.addRow(['Student Name', 'Class', 'Grade', 'Date', 'Status']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    data?.forEach((record, index) => {
      const row = worksheet.addRow([
        record.students.name,
        record.students.classes.class_name,
        record.students.classes.grade,
        format(new Date(record.date), 'MMM dd, yyyy'),
        record.status
      ]);

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' }
        };
      }

      // Color code status
      const statusCell = row.getCell(5);
      switch (record.status) {
        case 'Present':
          statusCell.font = { color: { argb: '008000' }, bold: true };
          break;
        case 'Absent':
          statusCell.font = { color: { argb: 'FF0000' }, bold: true };
          break;
        case 'Late':
          statusCell.font = { color: { argb: 'FFA500' }, bold: true };
          break;
        case 'Excused':
          statusCell.font = { color: { argb: '0000FF' }, bold: true };
          break;
      }

      row.alignment = { vertical: 'middle' };
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Add borders to all cells with data
    const lastRow = worksheet.lastRow.number;
    for (let row = 4; row <= lastRow; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }

    // Add summary at the bottom
    if (data && data.length > 0) {
      worksheet.addRow([]);
      
      const summaryTitle = worksheet.addRow(['Summary Statistics']);
      summaryTitle.font = { bold: true, size: 14 };
      
      const statusCounts = data.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
      }, {});

      Object.entries(statusCounts).forEach(([status, count]) => {
        const summaryRow = worksheet.addRow([`${status}:`, count]);
        summaryRow.font = { bold: true };
      });

      worksheet.addRow(['Total Records:', data.length]).font = { bold: true };
    }

    // Generate filename
    const filename = `attendance_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export attendance data'
    });
  }
});

// GET /api/export/students - Export students data to Excel
router.get('/students', async (req, res) => {
  try {
    const { class_id } = req.query;

    let query = req.supabase
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

    if (class_id) query = query.eq('class_id', class_id);

    const { data, error } = await query;

    if (error) throw error;

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students List');

    // Add title
    const titleRow = worksheet.addRow(['Sunshine Elementary School - Students List']);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A1:F1');

    worksheet.addRow([]);

    // Add headers
    const headerRow = worksheet.addRow(['Student Name', 'Class', 'Grade', 'Gender', 'Date of Birth', 'Age']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };

    // Add data
    data?.forEach((student, index) => {
      const birthDate = new Date(student.date_of_birth);
      const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      
      const row = worksheet.addRow([
        student.name,
        student.classes.class_name,
        student.classes.grade,
        student.gender,
        format(birthDate, 'MMM dd, yyyy'),
        age
      ]);

      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' }
        };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 30);
    });

    const filename = `students_list_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export students data'
    });
  }
});

export default router;