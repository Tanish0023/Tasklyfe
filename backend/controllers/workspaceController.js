const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Task = require('../models/Task'); 

// ✅ Global Search (Command Palette)
// @route   GET /api/workspaces/search?q=keyword
exports.globalSearch = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(200).json({ workspaces: [], tasks: [] });

    const regex = new RegExp(query, 'i');

    const workspaces = await Workspace.find({
      'members.user': req.user.id,
      $or: [{ name: regex }, { description: regex }, { noteContent: regex }]
    }).select('_id name description');

    const userWorkspaces = await Workspace.find({ 'members.user': req.user.id });
    const workspaceIds = userWorkspaces.map(ws => ws._id);

    const tasks = await Task.find({
      workspaceId: { $in: workspaceIds },
      $or: [{ title: regex }, { description: regex }]
    }).select('_id title workspaceId status priority');

    res.status(200).json({ workspaces, tasks });
  } catch (error) {
    res.status(500).json({ message: "Search Error: " + error.message });
  }
};

// @desc    Get all workspaces for the logged-in user
// @route   GET /api/workspaces
exports.getUserWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user.id })
      .populate('members.user', 'name email'); 
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// @desc    Get single workspace by ID
// @route   GET /api/workspaces/:id
exports.getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('members.user', 'name email'); 
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    
    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// @desc    Create a new workspace
// @route   POST /api/workspaces
exports.createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const newWorkspace = new Workspace({
      name,
      description,
      members: [{ user: req.user.id, role: 'owner' }], 
      noteContent: '',
      chatMessages: [],
      files: [],
      notices: [],
      activityLog: [] 
    });

    const savedWorkspace = await newWorkspace.save();
    
    const populatedWorkspace = await Workspace.findById(savedWorkspace._id).populate('members.user', 'name email');
    
    res.status(201).json(populatedWorkspace);
  } catch (error) {
    res.status(500).json({ message: "Creation Error: " + error.message });
  }
};

// 📁 FUNCTION: Manually add a file or link to workspace resources
// @route   POST /api/workspaces/:id/files
exports.addManualFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type, sender } = req.body;
    
    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { $push: { files: { name, url, type, sender } } },
      { returnDocument: 'after' } 
    );

    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    res.status(200).json(workspace.files);
  } catch (err) {
    res.status(500).json({ message: "File Add Error: " + err.message });
  }
};

// 📁 FUNCTION: Delete a file/link from workspace resources
// @route   DELETE /api/workspaces/:id/files/:fileId
exports.deleteFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    
    const workspace = await Workspace.findByIdAndUpdate(
      id,
      { $pull: { files: { _id: fileId } } },
      { returnDocument: 'after' } 
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.status(200).json(workspace.files);
  } catch (err) {
    console.error("Delete File Error:", err);
    res.status(500).json({ message: "Delete File Error: " + err.message });
  }
};

// 📢 FUNCTION: Add Notice (Only Admin)
// @route   POST /api/workspaces/:id/notices
exports.addNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author } = req.body;
    
    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const requester = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ message: "Only Admins can post notices!" });
    }

    workspace.notices.push({ text, author });
    await workspace.save();

    res.status(200).json(workspace.notices);
  } catch (err) {
    res.status(500).json({ message: "Add Notice Error: " + err.message });
  }
};

// 📢 FUNCTION: Delete Notice (Only Admin)
// @route   DELETE /api/workspaces/:id/notices/:noticeId
exports.deleteNotice = async (req, res) => {
  try {
    const { id, noticeId } = req.params;
    
    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const requester = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ message: "Only Admins can delete notices!" });
    }

    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      id,
      { $pull: { notices: { _id: noticeId } } },
      { returnDocument: 'after' } 
    );

    res.status(200).json(updatedWorkspace.notices);
  } catch (err) {
    res.status(500).json({ message: "Delete Notice Error: " + err.message });
  }
};

// 👥 FUNCTION: Add/Invite a member to workspace
// @route   POST /api/workspaces/:id/members
exports.addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const requester = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ message: "Only Admins can invite members" });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: "User not found with this email" });

    const alreadyMember = workspace.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ message: "User is already in this team" });

    workspace.members.push({ user: userToAdd._id, role: role || 'Editor' });
    await workspace.save();

    res.status(200).json({ message: "Member successfully invited" });
  } catch (error) {
    res.status(500).json({ message: "Invite Error: " + error.message });
  }
};

// 👥 FUNCTION: Update a member's role (Admin Only)
// @route   PUT /api/workspaces/:id/members/:memberId
exports.updateMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const requester = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ message: "Permission Denied: Only Admins can set roles" });
    }

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === memberId);
    if (memberIndex === -1) return res.status(404).json({ message: "Member not found in workspace" });

    workspace.members[memberIndex].role = role;
    await workspace.save();

    res.status(200).json({ message: "Role updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Role Update Error: " + error.message });
  }
};

// 👥 FUNCTION: Kick/Remove a member (Admin Only)
// @route   DELETE /api/workspaces/:id/members/:memberId
exports.removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const requester = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ message: "Permission Denied: Only Admins can remove members" });
    }

    if (memberId === req.user.id) {
      return res.status(400).json({ message: "Admins cannot kick themselves. Delete the workspace instead." });
    }

    workspace.members = workspace.members.filter(m => m.user.toString() !== memberId);
    await workspace.save();

    res.status(200).json({ message: "Member removed from team" });
  } catch (error) {
    res.status(500).json({ message: "Kick Error: " + error.message });
  }
};

// 🗑️ FUNCTION: Delete entire workspace (Admin Only)
// @route   DELETE /api/workspaces/:id
exports.deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const requester = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!requester || requester.role !== 'owner') {
      return res.status(403).json({ message: "Permission Denied: Only Admins can delete a workspace" });
    }

    await Workspace.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Workspace deleted forever" });
  } catch (error) {
    res.status(500).json({ message: "Delete Error: " + error.message });
  }
};

// 🔔 FUNCTION: Get Global Activities for Dashboard Radar
// @route   GET /api/workspaces/activities/global
exports.getGlobalActivities = async (req, res) => {
  try {
    console.log("👉 [RADAR] Fetching activities for user:", req.user.id);
    
    const workspaces = await Workspace.find({ 'members.user': req.user.id }).select('name activityLog');
    let allActivities = [];

    workspaces.forEach(ws => {
      if(ws.activityLog && ws.activityLog.length > 0) {
        ws.activityLog.forEach(log => {
          allActivities.push({
            _id: log._id,
            action: log.action,
            userName: log.userName,
            type: log.type,
            createdAt: log.createdAt,
            workspaceName: ws.name, 
            workspaceId: ws._id
          });
        });
      }
    });

    allActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`✅ [RADAR] Found ${allActivities.length} activities! Sending to Dashboard.`);
    res.status(200).json(allActivities.slice(0, 20)); 
  } catch (error) {
    console.error("❌ [RADAR FETCH ERROR]:", error);
    res.status(500).json({ message: "Failed to fetch global activities" });
  }
};

// 🔔 FUNCTION: Log a New Activity 
// @route   POST /api/workspaces/:id/activities
exports.logActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, userName, type } = req.body;
    
    console.log(`📝 [RADAR] Saving New Activity: "${userName} ${action}" in Workspace ID: ${id}`);

    await Workspace.findByIdAndUpdate(id, {
      $push: { activityLog: { action, userName, type } }
    }, { returnDocument: 'after' });

    res.status(200).json({ message: "Activity Logged Successfully" });
  } catch (err) {
    console.error("❌ [RADAR SAVE ERROR]:", err);
    res.status(500).json({ message: "Activity Log Error" });
  }
};

// 🗑️ ✅ NAYA FUNCTION: Delete Single Activity from Radar
// @route   DELETE /api/workspaces/:id/activities/:activityId
exports.deleteActivity = async (req, res) => {
  try {
    const { id, activityId } = req.params;
    await Workspace.findByIdAndUpdate(
      id,
      { $pull: { activityLog: { _id: activityId } } }
    );
    res.status(200).json({ message: "Activity deleted successfully" });
  } catch (err) {
    console.error("❌ [RADAR DELETE ERROR]:", err);
    res.status(500).json({ message: "Failed to delete activity" });
  }
};

// 🗑️ ✅ NAYA FUNCTION: Clear All Activities for a User
// @route   DELETE /api/workspaces/activities/global/clear
exports.clearAllActivities = async (req, res) => {
  try {
    const userWorkspaces = await Workspace.find({ 'members.user': req.user.id });
    const workspaceIds = userWorkspaces.map(ws => ws._id);

    await Workspace.updateMany(
      { _id: { $in: workspaceIds } },
      { $set: { activityLog: [] } }
    );
    res.status(200).json({ message: "All activities cleared" });
  } catch (err) {
    console.error("❌ [RADAR CLEAR ALL ERROR]:", err);
    res.status(500).json({ message: "Failed to clear activities" });
  }
};