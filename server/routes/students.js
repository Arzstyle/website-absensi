import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schema for student creation
const studentSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  class_id: Joi.string().uuid().required(),
  gender: Joi.string().valid('Male', 'Female').required(),
  date_of_birth: Joi.date().max('now').required()
});

// GET /api/students - Get all students with class information
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
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

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students'
    });
  }
});

// GET /api/students/:id - Get single student
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('students')
      .select(`
        *,
        classes (
          id,
          class_name,
          grade
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student'
    });
  }
});

// POST /api/students - Create new student
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error: validationError, value } = studentSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }

    // Check if class exists
    const { data: classExists } = await req.supabase
      .from('classes')
      .select('id')
      .eq('id', value.class_id)
      .single();

    if (!classExists) {
      return res.status(400).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Create student
    const { data, error } = await req.supabase
      .from('students')
      .insert([value])
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

    res.status(201).json({
      success: true,
      data,
      message: 'Student created successfully'
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student'
    });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error: validationError, value } = studentSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }

    // Check if class exists
    const { data: classExists } = await req.supabase
      .from('classes')
      .select('id')
      .eq('id', value.class_id)
      .single();

    if (!classExists) {
      return res.status(400).json({
        success: false,
        error: 'Class not found'
      });
    }

    // Update student
    const { data, error } = await req.supabase
      .from('students')
      .update(value)
      .eq('id', id)
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

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Student updated successfully'
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student'
    });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('students')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student'
    });
  }
});

export default router;