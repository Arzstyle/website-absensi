import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schema for class creation
const classSchema = Joi.object({
  class_name: Joi.string().min(1).max(50).required(),
  grade: Joi.number().integer().min(1).max(12).required()
});

// GET /api/classes - Get all classes
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('classes')
      .select('*')
      .order('grade', { ascending: true })
      .order('class_name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch classes'
    });
  }
});

// GET /api/classes/:id - Get single class with students
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('classes')
      .select(`
        *,
        students (
          id,
          name,
          gender,
          date_of_birth,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch class'
    });
  }
});

// POST /api/classes - Create new class
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error: validationError, value } = classSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }

    // Check if class name already exists for the same grade
    const { data: existingClass } = await req.supabase
      .from('classes')
      .select('id')
      .eq('class_name', value.class_name)
      .eq('grade', value.grade)
      .single();

    if (existingClass) {
      return res.status(400).json({
        success: false,
        error: 'Class with this name already exists for this grade'
      });
    }

    // Create class
    const { data, error } = await req.supabase
      .from('classes')
      .insert([value])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Class created successfully'
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create class'
    });
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error: validationError, value } = classSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.details[0].message
      });
    }

    // Check if class name already exists for the same grade (excluding current class)
    const { data: existingClass } = await req.supabase
      .from('classes')
      .select('id')
      .eq('class_name', value.class_name)
      .eq('grade', value.grade)
      .neq('id', id)
      .single();

    if (existingClass) {
      return res.status(400).json({
        success: false,
        error: 'Class with this name already exists for this grade'
      });
    }

    // Update class
    const { data, error } = await req.supabase
      .from('classes')
      .update(value)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    res.json({
      success: true,
      data,
      message: 'Class updated successfully'
    });
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update class'
    });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if class has students
    const { data: students } = await req.supabase
      .from('students')
      .select('id')
      .eq('class_id', id)
      .limit(1);

    if (students && students.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete class with existing students'
      });
    }

    const { data, error } = await req.supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete class'
    });
  }
});

export default router;