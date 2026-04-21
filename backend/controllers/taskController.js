const Task = require('../models/Task');
const Workspace = require('../models/Workspace'); // ✅ REQUIRED FOR GLOBAL TASKS

// @desc    Get all tasks across all workspaces the user belongs to (Assigned to them)
// @route   GET /api/tasks/global/all
exports.getGlobalTasks = async (req, res) => {
  try {
    // 1. Find all workspaces where the user is a member
    const userWorkspaces = await Workspace.find({ 'members.user': req.user.id });
    const workspaceIds = userWorkspaces.map(ws => ws._id);

    // 2. Fetch tasks that are NOT 'done' AND ONLY ASSIGNED TO CURRENT USER
    const tasks = await Task.find({ 
      workspaceId: { $in: workspaceIds },
      status: { $ne: 'done' },
      assignee: req.user.id // ✅ STRICT FILTER: Only tasks assigned to the logged-in user
    }).sort({ dueDate: 1 }).limit(10); // Sort by deadline, limit to 10 upcoming

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Global Fetch Error: " + error.message });
  }
};

// @desc    Get all tasks for a specific workspace
// @route   GET /api/tasks/:workspaceId
exports.getTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const tasks = await Task.find({ workspaceId }).sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// @desc    Create a new task (Manual or AI)
// @route   POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, subTasks, workspaceId, assignee } = req.body;
    
    const newTask = new Task({
      title,
      description: description || '',
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
      subTasks: subTasks || [], // Sync with frontend 'subTasks' array
      workspaceId,
      assignee: assignee || null // ✅ Supports initial assignment if passed
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: "Error creating task: " + error.message });
  }
};

// @desc    Update ANY detail of a task (Title, Checkboxes, Date, Assignee, etc.)
// @route   PUT /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ $set automatically updates only what frontend sends (including assignee)
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: "Error updating task: " + error.message });
  }
};

// @desc    Update only task status (For Kanban Drag & Drop)
// @route   PUT /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: "Error updating task status: " + error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task: " + error.message });
  }
};