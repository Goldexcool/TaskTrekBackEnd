const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');
const Team = require('../models/Team'); 
const User = require('../models/User'); 
const { logTaskActivity } = require('../services/activityService');

// Create task
const createTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      columnId, 
      position, 
      dueDate,
      priority,
      labels, 
      assignedTo 
    } = req.body;
    
    // Validate required fields
    if (!title || !columnId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide task title and column ID'
      });
    }
    
    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }
    
    // Check if column exists
    const column = await Column.findById(columnId);
    if (!column) {
      return res.status(404).json({
        success: false,
        message: "Column not found"
      });
    }
    
    // Safely format date
    let formattedDueDate = null;
    if (dueDate) {
      try {
        // Handle various date formats
        formattedDueDate = new Date(dueDate);
        // Check if date is valid
        if (isNaN(formattedDueDate.getTime())) {
          // Try to parse non-standard format like "21-05-2025"
          const parts = dueDate.split('-');
          if (parts.length === 3) {
            // Remove any trailing characters like apostrophes
            const year = parts[2].replace(/[^0-9]/g, '');
            formattedDueDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
          }
          
          // If still invalid, return error
          if (isNaN(formattedDueDate.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid date format. Please use YYYY-MM-DD format."
            });
          }
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD format."
        });
      }
    }
    
    // Create task with properly formatted date
    const task = await Task.create({
      title,
      description,
      column: columnId,
      priority, // Include priority
      position: position || 0,
      dueDate: formattedDueDate,
      labels,
      assignedTo: assignedTo || req.user.id,
      createdBy: req.user.id
    });

    // Log activity
    await logTaskActivity(
      'create_task',
      req.user,
      task,
      column.board,
      column._id,
      `${req.user.username || 'A user'} created task "${title}"`,
      { taskTitle: title, columnId }
    );
    
    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all tasks for a column
const getTasks = async (req, res) => {
  try {
    const { columnId } = req.query;
    
    if (!columnId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a columnId'
      });
    }
    
    // Check if the column exists
    const column = await Column.findById(columnId);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }
    
    // Check if the board associated with the column belongs to the user
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    if (board.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view tasks in this column'
      });
    }
    
    // Get tasks for the column
    const tasks = await Task.find({ column: columnId }).sort({ order: 1 });
    
    res.status(200).json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get tasks by column
const getTasksByColumn = async (req, res) => {
  try {
    const columnId = req.params.columnId;
    console.log('Getting tasks for column:', columnId);
    
    // Check if the column exists
    const column = await Column.findById(columnId);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Column not found'
      });
    }
    
    // Get tasks for the column
    const tasks = await Task.find({ column: columnId })
      .sort({ position: 1 });
    
    console.log(`Found ${tasks.length} tasks for column`);
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    console.log('Getting task by ID:', taskId);
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the user has access to the board containing this task
    const column = await Column.findById(task.column);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Check if current user is the creator of the board or a team member
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      console.log('User is not the board creator, checking team membership...');
      // For now, allow access - you can implement team membership checks later
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a task
const updateTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, position } = req.body;
    
    // If priority is provided, validate it
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high'
      });
    }
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the user has access to the board containing this task
    const column = await Column.findById(task.column);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Check if current user is the creator of the board
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      // For now, allow access - you can implement team membership checks later
    }
    
    // Update task fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate) {
      // Safely handle date
      try {
        task.dueDate = new Date(dueDate);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
    }
    if (priority) task.priority = priority;
    if (position !== undefined) task.position = position;
    
    await task.save();

    // Log activity
    await logTaskActivity(
      'update_task',
      req.user,
      task,
      null, // We'll get this from the task's column
      task.column,
      `${req.user.username || 'A user'} updated task "${task.title}"`,
      { updatedFields: Object.keys(req.body) }
    );
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the user has access to the board containing this task
    const column = await Column.findById(task.column);
    
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Safe access to board creator
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      console.log('User is not the board creator, allowing delete for now');
    }
    
    await Task.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Move a task to a different column
const moveTask = async (req, res) => {
  try {
    const { sourceColumnId, destinationColumnId, position } = req.body;
    const taskId = req.params.id;
    
    // Get source and destination column information
    const sourceColumn = await Column.findById(sourceColumnId).select('title board');
    const destinationColumn = await Column.findById(destinationColumnId).select('title board');
    
    console.log('Moving task', taskId, 'to column', destinationColumnId, 'at position', position);
    console.log('Request body:', req.body);
    
    if (!destinationColumnId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide destinationColumnId'
      });
    }
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the target column exists
    const targetColumn = await Column.findById(destinationColumnId);
    
    if (!targetColumn) {
      return res.status(404).json({
        success: false,
        message: 'Target column not found'
      });
    }
    
    // Check if the user has access to the board
    const board = await Board.findById(targetColumn.board);
    
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Safe access to board creator
    const userId = req.user.id;
    const boardCreatorId = board.createdBy ? 
      (typeof board.createdBy === 'object' ? board.createdBy._id.toString() : board.createdBy.toString()) 
      : null;
    
    if (boardCreatorId !== userId) {
      console.log('User is not the board creator, allowing move for now');
    }
    
    // Update task
    task.column = destinationColumnId;
    if (position !== undefined) task.position = position;
    
    await task.save();

    // Log activity
    await logTaskActivity(
      'move_task',
      req.user,
      task,
      destinationColumn.board,
      destinationColumnId,
      `${req.user.username || 'A user'} moved task "${task.title}" from "${sourceColumn.title}" to "${destinationColumn.title}"`,
      { 
        sourceColumnId, 
        sourceColumnTitle: sourceColumn.title,
        destinationColumnId, 
        destinationColumnTitle: destinationColumn.title,
        position 
      }
    );
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Debug function to check all tasks
const debugTasks = async (req, res) => {
  try {
    // Get all tasks
    const tasks = await Task.find({});
    
    // Get task count by column
    const tasksByColumn = [];
    const columns = await Column.find({});
    
    for (const column of columns) {
      const count = await Task.countDocuments({ column: column._id });
      tasksByColumn.push({
        columnId: column._id,
        columnTitle: column.title,
        taskCount: count
      });
    }
    
    res.status(200).json({
      success: true,
      tasksCount: tasks.length,
      tasksByColumn,
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        column: task.column,
        priority: task.priority,
        dueDate: task.dueDate
      }))
    });
  } catch (error) {
    console.error('Debug tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all tasks with flexible filtering options
// @route   GET /api/tasks/all
// @access  Private
const getAllTasks = async (req, res) => {
  try {
    console.log('Getting all tasks for user:', req.user.id);
    
    // Extract all query parameters for filtering
    const { 
      priority, 
      dueDate, 
      overdue, 
      completed, 
      assignedToMe,
      assignedTo,
      createdBy,
      boardId, 
      teamId,
      search,
      sortBy,
      sortOrder,
      page = 1,
      limit = 50
    } = req.query;
    
    // Start building the query
    let query = {};
    
    // STEP 1: Find all teams the user belongs to
    const userTeams = await Team.find({ 
      'members.user': req.user.id 
    }).select('_id');
    
    const teamIds = userTeams.map(team => team._id);
    console.log(`User belongs to ${teamIds.length} teams`);
    
    // STEP 2: Determine which boards to include
    let boardIds = [];
    
    if (boardId) {
      // If specific board is requested, verify the user has access to it
      const board = await Board.findOne({
        _id: boardId,
        $or: [
          { createdBy: req.user.id },
          { team: { $in: teamIds } }
        ]
      });
      
      if (board) {
        boardIds = [boardId];
      } else {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this board'
        });
      }
    } else if (teamId) {
      // If specific team is requested, verify the user is a member
      if (!teamIds.some(id => id.toString() === teamId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this team'
        });
      }
      
      // Find all boards in this team
      const boards = await Board.find({ team: teamId }).select('_id');
      boardIds = boards.map(board => board._id);
    } else {
      // No specific board or team specified, get all boards from all user's teams
      const boards = await Board.find({ 
        $or: [
          { createdBy: req.user.id },
          { team: { $in: teamIds } }
        ]
      }).select('_id');
      
      boardIds = boards.map(board => board._id);
    }
    
    console.log(`Found ${boardIds.length} boards accessible to the user`);
    
    if (boardIds.length === 0) {
      // Early return if no boards are accessible
      return res.status(200).json({
        success: true,
        count: 0,
        totalTasks: 0,
        totalPages: 0,
        currentPage: parseInt(page),
        data: []
      });
    }
    
    // STEP 3: Get all columns from these boards
    const columns = await Column.find({ board: { $in: boardIds } }).select('_id board');
    const columnIds = columns.map(col => col._id);
    
    console.log(`Found ${columnIds.length} columns in accessible boards`);
    
    if (columnIds.length === 0) {
      // Early return if no columns exist
      return res.status(200).json({
        success: true,
        count: 0,
        totalTasks: 0,
        totalPages: 0,
        currentPage: parseInt(page),
        data: []
      });
    }
    
    // STEP 4: Build the task query based on columns
    query.column = { $in: columnIds };
    
    // Apply all other filters
    if (priority) {
      query.priority = priority;
    }
    
    if (dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      query.dueDate = {
        $gte: today,
        $lt: tomorrow
      };
    } else if (dueDate === 'week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      query.dueDate = {
        $gte: today,
        $lt: nextWeek
      };
    } else if (dueDate === 'month') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      query.dueDate = {
        $gte: today,
        $lt: nextMonth
      };
    }
    
    if (overdue === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      query.dueDate = {
        $lt: today
      };
      query.completed = { $ne: true };
    }
    
    if (completed === 'true') {
      query.completed = true;
    } else if (completed === 'false') {
      query.completed = { $ne: true };
    }
    
    if (assignedToMe === 'true') {
      query.assignedTo = req.user.id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Determine sorting
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      // Default sort by creation date, newest first
      sortOptions.createdAt = -1;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalTasks = await Task.countDocuments(query);
    
    console.log(`Found ${totalTasks} total tasks matching criteria`);
    
    // Perform the query with population
    const tasks = await Task.find(query)
      .populate({
        path: 'column',
        select: 'title board',
        populate: {
          path: 'board',
          select: 'title backgroundColor team',
          populate: {
            path: 'team',
            select: 'name avatar'
          }
        }
      })
      .populate({
        path: 'assignedTo',
        select: 'username email name avatar'
      })
      .populate({
        path: 'createdBy',
        select: 'username email name avatar'
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log(`Retrieved ${tasks.length} tasks for current page`);
    
    // Format the tasks for response
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate,
      completed: task.completed || false,
      column: {
        id: task.column._id,
        title: task.column.title
      },
      board: {
        id: task.column.board._id,
        title: task.column.board.title,
        backgroundColor: task.column.board.backgroundColor
      },
      team: task.column.board.team ? {
        id: task.column.board.team._id,
        name: task.column.board.team.name,
        avatar: task.column.board.team.avatar
      } : null,
      assignedTo: task.assignedTo ? {
        id: task.assignedTo._id,
        username: task.assignedTo.username,
        name: task.assignedTo.name || task.assignedTo.username,
        avatar: task.assignedTo.avatar
      } : null,
      createdBy: task.createdBy ? {
        id: task.createdBy._id,
        username: task.createdBy.username,
        name: task.createdBy.name || task.createdBy.username,
        avatar: task.createdBy.avatar
      } : null,
      labels: task.labels || [],
      position: task.position || 0,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));
    
    // Return the response
    res.status(200).json({
      success: true,
      count: formattedTasks.length,
      totalTasks: totalTasks,
      totalPages: Math.ceil(totalTasks / parseInt(limit)),
      currentPage: parseInt(page),
      data: formattedTasks
    });
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving tasks'
    });
  }
};

/**
 * Reopen a completed task
 * @route PATCH /api/tasks/:id/reopen
 * @access Private
 */
const reopenTask = async (req, res) => {
  try {
    // Find the task
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if the task is already open
    if (!task.completed) {
      return res.status(400).json({
        success: false,
        message: 'Task is already open'
      });
    }
    
    // Check if user has permission
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    const team = await Team.findById(board.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is in the team
    const isTeamMember = team.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reopen tasks on this board'
      });
    }
    
    // Update task status
    task.completed = false;
    task.completedAt = null;
    task.reopenedBy = req.user.id;
    task.reopenedAt = new Date();
    task.updatedAt = new Date();
    await task.save();
    
    // Log the activity
    await logTaskActivity(
      'reopen_task',
      req.user.id,
      task._id,
      task.board,
      task.column,
      `${req.user.name || 'A user'} reopened task "${task.title}"`,
      { reopenedAt: task.reopenedAt }
    );
    
    // Get the populated task for the response
    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name username email avatar')
      .populate('createdBy', 'name username email avatar')
      .populate('reopenedBy', 'name username email avatar');
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error reopening task:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error reopening task'
    });
  }
};

/**
 * Complete a task
 * @route PATCH /api/tasks/:id/complete
 * @access Private
 */
const completeTask = async (req, res) => {
  try {
    // Find the task
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if task is already completed
    if (task.completed) {
      return res.status(400).json({
        success: false,
        message: 'Task is already completed'
      });
    }
    
    // Check if user has permission
    const column = await Column.findById(task.column);
    if (!column) {
      return res.status(404).json({
        success: false,
        message: 'Associated column not found'
      });
    }
    
    const board = await Board.findById(column.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    const team = await Team.findById(board.team);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }
    
    // Check if user is in the team
    const isTeamMember = team.members.some(
      member => member.user.toString() === req.user.id
    );
    
    if (!isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to complete tasks on this board'
      });
    }
    
    // Update task status
    task.completed = true;
    task.completedAt = new Date();
    task.completedBy = req.user.id;
    task.updatedAt = new Date();
    await task.save();
    
    // Log the activity
    await logTaskActivity(
      'complete_task',
      req.user.id,
      task._id,
      board._id,
      task.column,
      `${req.user.name || req.user.username || 'A user'} completed task "${task.title}"`,
      { completedAt: task.completedAt }
    );
    
    // Get the populated task for the response
    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name username email avatar')
      .populate('createdBy', 'name username email avatar')
      .populate('completedBy', 'name username email avatar');
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completing task'
    });
  }
};

/**
 * Assign a task to a user
 * @route PATCH /api/tasks/:id/assign
 * @access Private
 */
const assignTask = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find the task
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if user has access to the board
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Associated board not found'
      });
    }
    
    // Check if the user making the request has permission
    const team = await Team.findById(board.team);
    const isMember = team.members.some(member => 
      member.user.toString() === req.user.id && 
      ['admin', 'member'].includes(member.role)
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign tasks on this board'
      });
    }
    
    // Check if user being assigned is a team member
    const isAssigneeMember = team.members.some(member => 
      member.user.toString() === userId
    );
    
    if (!isAssigneeMember) {
      return res.status(400).json({
        success: false,
        message: 'Can only assign tasks to team members'
      });
    }
    
    // Update task assignment
    task.assignedTo = userId;
    task.updatedAt = Date.now();
    await task.save();
    
    // Log activity
    await logTaskActivity(
      'assign_task',
      req.user.id,
      task._id,
      board._id,
      task.column,
      `${req.user.name || 'A user'} assigned task "${task.title}" to ${user.name || 'a team member'}`,
      { assignedTo: userId }
    );
    
    // Populate the updated task
    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name username email avatar')
      .populate('createdBy', 'name username email avatar');
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error assigning task'
    });
  }
};

/**
 * Unassign a task (remove assignee)
 * @route PATCH /api/tasks/:id/unassign
 * @access Private
 */
const unassignTask = async (req, res) => {
  try {
    // Find the task
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    // Check if task is already unassigned
    if (!task.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Task is already unassigned'
      });
    }
    
    // Check permissions
    const board = await Board.findById(task.board);
    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }
    
    // Check if user has permission
    const team = await Team.findById(board.team);
    const isMember = team.members.some(member => 
      member.user.toString() === req.user.id && 
      ['admin', 'member'].includes(member.role)
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to unassign tasks on this board'
      });
    }
    
    // Store current assignee info for activity log
    let previousAssigneeName = 'someone';
    if (task.assignedTo) {
      const previousAssignee = await User.findById(task.assignedTo);
      if (previousAssignee) {
        previousAssigneeName = previousAssignee.name || previousAssignee.username || previousAssignee.email;
      }
    }
    
    // Update task to remove assignment
    task.assignedTo = null;
    task.updatedAt = Date.now();
    await task.save();
    
    // Log activity
    await logTaskActivity(
      'unassign_task',
      req.user.id,
      task._id,
      task.board,
      task.column,
      `${req.user.name || 'A user'} removed ${previousAssigneeName} from task "${task.title}"`,
      {}
    );
    
    // Get updated task
    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name username email avatar');
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error unassigning task:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error unassigning task'
    });
  }
};

module.exports = {
  createTask,
  getTasksByColumn,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  getAllTasks,
  reopenTask,
  assignTask,
  unassignTask,
  completeTask  
};