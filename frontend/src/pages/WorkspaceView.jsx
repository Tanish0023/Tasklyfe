import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast, { Toaster } from 'react-hot-toast';
import API from '../api/axios';
import io from 'socket.io-client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { File, Image as ImageIcon, Link as LinkIcon, Upload, ExternalLink, FolderPlus, Plus, ChevronRight, Trash2, Megaphone, X } from 'lucide-react';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL);

const WorkspaceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('board');

  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [noteContent, setNoteContent] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [roleInputs, setRoleInputs] = useState({});

  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [fileTab, setFileTab] = useState('Documents');

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [workspaceNotices, setWorkspaceNotices] = useState([]);
  const [newNoticeText, setNewNoticeText] = useState('');

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const manualFileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);

  const authUser = JSON.parse(localStorage.getItem('user')) || {};
  const currentUserId = authUser._id || authUser.id;
  const currentUserDisplay = authUser.name || authUser.email?.split('@')[0] || `User_${Math.floor(Math.random() * 100)}`;
  const isCurrentUserAdmin = workspaceMembers.some(m => m.user?._id === currentUserId && m.role === 'owner');

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  };

  useEffect(() => {
    fetchTasks();
    fetchWorkspaceData();
    socket.emit('join_workspace', id);

    socket.on('update_board', (data) => setTasks(prev => prev.map(t => t._id === data.taskId ? { ...t, status: data.newStatus } : t)));
    socket.on('update_task_ui', (data) => setTasks(prev => prev.map(t => t._id === data.task._id ? data.task : t)));
    socket.on('note_updated', (newContent) => setNoteContent(newContent));
    socket.on('receive_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (msg.fileUrl) {
        setWorkspaceFiles(prev => [...prev, { _id: Date.now().toString(), name: msg.text || 'File', url: msg.fileUrl, type: msg.fileType || 'document', sender: msg.sender, createdAt: new Date() }]);
      }
    });
    socket.on('message_deleted_everyone', (deletedMessageId) => setChatMessages(prev => prev.filter(msg => msg.messageId !== deletedMessageId)));

    socket.on('workspace_deleted_broadcast', () => {
      toast.error("Admin has deleted this workspace!");
      navigate('/dashboard');
    });

    return () => {
      socket.off('update_board'); socket.off('update_task_ui');
      socket.off('note_updated'); socket.off('receive_message');
      socket.off('message_deleted_everyone'); socket.off('workspace_deleted_broadcast');
    };
  }, [id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, activeTab]);

  const fetchTasks = async () => { try { const res = await API.get(`/tasks/${id}`); setTasks(res.data); } catch (e) { toast.error("Failed to fetch tasks!"); } };
  const fetchWorkspaceData = async () => {
    try {
      const res = await API.get(`/workspaces/${id}`);
      setNoteContent(res.data.noteContent || '');
      setChatMessages(res.data.chatMessages || []);
      setWorkspaceMembers(res.data.members || []);
      setWorkspaceFiles(res.data.files || []);
      setWorkspaceNotices(res.data.notices || []);
    } catch (e) { console.error(e); }
  };

  const logActivity = async (actionDesc, activityType) => {
    try {
      await API.post(`/workspaces/${id}/activities`, {
        action: actionDesc,
        userName: currentUserDisplay,
        type: activityType
      });
      socket.emit('log_dashboard_activity', id);
    } catch (err) {
      console.error("Failed to log activity", err);
    }
  };

  const handleAddNotice = async (e) => {
    e.preventDefault();
    if (!newNoticeText.trim()) return;
    const t = toast.loading('Posting notice...');
    try {
      const res = await API.post(`/workspaces/${id}/notices`, { text: newNoticeText, author: currentUserDisplay });
      setWorkspaceNotices(res.data);
      setNewNoticeText('');
      toast.success('Notice posted!', { id: t });
      logActivity('posted a new notice', 'notice');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post', { id: t });
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm("Delete this notice?")) return;
    const t = toast.loading('Deleting...');
    try {
      const res = await API.delete(`/workspaces/${id}/notices/${noticeId}`);
      setWorkspaceNotices(res.data);
      toast.success('Deleted!', { id: t });
    } catch (err) {
      toast.error('Failed to delete', { id: t });
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const t = toast.loading('Adding...');
    try {
      const r = await API.post('/tasks', { title: newTaskTitle, workspaceId: id, status: 'todo', priority: 'medium' });
      setTasks([...tasks, r.data]);
      toast.success('Task Added!', { id: t });
      logActivity(`created a new task: "${newTaskTitle.substring(0, 20)}..."`, 'task');
      setNewTaskTitle('');
    } catch (e) {
      toast.error('Error', { id: t });
    }
  };

  const handleAIGenerate = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    const t = toast.loading('AI is crafting a plan...');
    try {
      const ai = await API.post('/ai/generate-task', { prompt: aiPrompt });
      const db = await API.post('/tasks', { title: "✨ " + ai.data.title, description: ai.data.description, priority: ai.data.priority || 'medium', dueDate: ai.data.dueDate, subTasks: ai.data.subTasks || [], workspaceId: id, status: 'todo' });
      setTasks([...tasks, db.data]);
      setAiPrompt('');
      toast.success('Smart Task Generated!', { id: t });
      logActivity('generated a smart task using AI ✨', 'task');
    } catch (e) {
      toast.error('AI Failed to generate task', { id: t });
    } finally {
      setIsGenerating(false);
    }
  };

  const openEditModal = (task) => { setEditingTask({ ...task }); setIsEditModalOpen(true); };

  const handleUpdateTask = async (e) => {
    e.preventDefault(); const t = toast.loading('Updating...');
    try {
      const payload = { title: editingTask.title, description: editingTask.description, priority: editingTask.priority, dueDate: editingTask.dueDate, assignee: editingTask.assignee };
      const r = await API.put(`/tasks/${editingTask._id}`, payload);
      setTasks(tasks.map(x => x._id === editingTask._id ? r.data : x)); socket.emit('task_updated', { workspaceId: id, task: r.data }); setIsEditModalOpen(false); toast.success('Updated!', { id: t });
    } catch (e) { toast.error('Failed', { id: t }); }
  };

  const handleDeleteTask = async (taskId) => { if (!window.confirm("Delete this task?")) return; try { await API.delete(`/tasks/${taskId}`); setTasks(tasks.filter(x => x._id !== taskId)); toast.success('Deleted!'); } catch (e) { toast.error('Failed'); } };
  const handleToggleSubtask = async (taskId, idx) => { const task = tasks.find(t => t._id === taskId); const updated = [...task.subTasks]; updated[idx].isCompleted = !updated[idx].isCompleted; setTasks(tasks.map(t => t._id === taskId ? { ...t, subTasks: updated } : t)); try { await API.put(`/tasks/${taskId}`, { subTasks: updated }); } catch (e) { fetchTasks(); } };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    const newStatus = destination.droppableId;
    setTasks(tasks.map(t => String(t._id) === draggableId ? { ...t, status: newStatus } : t));
    socket.emit('task_moved', { taskId: draggableId, newStatus, workspaceId: id });
    try {
      await API.put(`/tasks/${draggableId}/status`, { status: newStatus });
      if (newStatus === 'done') logActivity('completed a task ✅', 'task');
      else logActivity(`moved a task to ${newStatus}`, 'task');
    } catch (e) {
      fetchTasks();
    }
  };

  const getTasksByStatus = (status) => tasks.filter(task => task.status === status);

  const handleNoteChange = (content) => { setNoteContent(content); socket.emit('update_note', { workspaceId: id, content: content }); };

  const generateMessageId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const handleSendMessage = (e) => { e.preventDefault(); if (!chatInput.trim()) return; const msgId = generateMessageId(); socket.emit('send_message', { workspaceId: id, messageId: msgId, sender: currentUserDisplay, text: chatInput }); setChatInput(''); };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; const formData = new FormData(); formData.append('file', file); setIsUploading(true); const t = toast.loading('Uploading...');
    try {
      const res = await API.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const msgId = generateMessageId();
      socket.emit('send_message', { workspaceId: id, messageId: msgId, sender: currentUserDisplay, text: res.data.fileName, fileUrl: res.data.fileUrl, fileType: res.data.fileType });
      toast.success('Sent!', { id: t });
      logActivity(`shared a file in chat`, 'file');
    } catch (err) { toast.error('Upload failed', { id: t }); } finally { setIsUploading(false); e.target.value = null; }
  };

  const handleManualFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    const t = toast.loading('Uploading to Files...');
    try {
      const uploadRes = await API.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const type = file.type.startsWith('image/') ? 'image' : 'document';
      const fileRes = await API.post(`/workspaces/${id}/files`, { name: file.name, url: uploadRes.data.fileUrl, type: type, sender: currentUserDisplay });
      setWorkspaceFiles(fileRes.data);
      toast.success('Saved to Files!', { id: t });
      logActivity(`uploaded a new document`, 'file');
    } catch (err) { toast.error('Upload failed', { id: t }); } finally { e.target.value = null; }
  };

  const handleManualLinkAdd = async () => {
    const link = prompt("Enter Link URL (e.g., https://google.com):");
    if (!link) return;
    const t = toast.loading('Saving Link...');
    try {
      const res = await API.post(`/workspaces/${id}/files`, { name: link.replace(/^https?:\/\//, '').split('/')[0], url: link, type: 'link', sender: currentUserDisplay });
      setWorkspaceFiles(res.data);
      toast.success("Link Saved!", { id: t });
      logActivity(`shared a new link`, 'file');
    } catch (e) { toast.error("Failed to save link", { id: t }); }
  };

  const handleDeleteFile = async (fileId) => { if (!window.confirm("Are you sure you want to delete this?")) return; const t = toast.loading('Deleting...'); try { const res = await API.delete(`/workspaces/${id}/files/${fileId}`); setWorkspaceFiles(res.data); toast.success('Deleted successfully!', { id: t }); } catch (e) { toast.error('Failed to delete', { id: t }); } };

  const handleDeleteForEveryone = (msgId) => { if (window.confirm("Delete for everyone?")) { socket.emit('delete_message_everyone', { workspaceId: id, messageId: msgId }); setActiveMessageMenu(null); } };
  const handleDeleteForMe = (msgId) => { socket.emit('delete_message_me', { workspaceId: id, messageId: msgId, user: currentUserDisplay }); setChatMessages(prev => prev.filter(msg => msg.messageId !== msgId)); setActiveMessageMenu(null); toast.success("Deleted"); };
  const renderMessageText = (text) => { const urlRegex = /(https?:\/\/[^\s]+)/g; return text.split(urlRegex).map((part, i) => urlRegex.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline hover:text-blue-100">{part}</a> : part); };

  const handleInvite = async (e) => { e.preventDefault(); const t = toast.loading('Inviting...'); try { await API.post(`/workspaces/${id}/members`, { email: inviteEmail, role: 'Editor' }); toast.success('Member Added!', { id: t }); setInviteEmail(''); fetchWorkspaceData(); logActivity(`invited a new member to the team`, 'member'); } catch (err) { toast.error(err.response?.data?.message || 'Error', { id: t }); } };
  const handleRoleInputChange = (memberId, value) => { setRoleInputs(prev => ({ ...prev, [memberId]: value })); };
  const handleSetCustomRole = async (memberId) => { const newRole = roleInputs[memberId]?.trim(); if (!newRole) return toast.error("Enter a role"); const t = toast.loading('Updating...'); try { await API.put(`/workspaces/${id}/members/${memberId}`, { role: newRole }); toast.success('Role updated!', { id: t }); setRoleInputs(prev => ({ ...prev, [memberId]: '' })); fetchWorkspaceData(); } catch (err) { toast.error('Failed to update', { id: t }); } };
  const handleKickMember = async (memberId) => { if (!window.confirm("Kick this member?")) return; const t = toast.loading('Removing...'); try { await API.delete(`/workspaces/${id}/members/${memberId}`); toast.success('Member removed!', { id: t }); fetchWorkspaceData(); } catch (err) { toast.error('Failed to remove', { id: t }); } };
  const handleDeleteWorkspace = async () => { if (!window.confirm("DANGER: Delete ENTIRE Workspace?")) return; const t = toast.loading('Deleting...'); try { await API.delete(`/workspaces/${id}`); socket.emit('delete_workspace', id); toast.success('Deleted!', { id: t }); navigate('/dashboard'); } catch (err) { toast.error('Failed', { id: t }); } };

  const pieData = [{ name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: '#9CA3AF' }, { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#3B82F6' }, { name: 'Done', value: tasks.filter(t => t.status === 'done').length, color: '#10B981' }].filter(d => d.value > 0);
  const barData = [{ name: 'High', count: tasks.filter(t => t.priority === 'high').length, color: '#EF4444' }, { name: 'Medium', count: tasks.filter(t => t.priority === 'medium').length, color: '#F59E0B' }, { name: 'Low', count: tasks.filter(t => t.priority === 'low').length, color: '#10B981' }];

  return (
    <div className="h-screen bg-gray-50 font-sans flex flex-col overflow-hidden" onClick={() => setActiveMessageMenu(null)}>
      <Toaster position="top-right" />

      <nav className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm shrink-0 z-20">
        <div className="flex gap-4 items-center">
          <Link to="/dashboard" className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 font-bold text-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            Dashboard
          </Link>
          <div className="h-6 w-px bg-gray-200"></div>
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Workspace</h1>

          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="ml-2 flex items-center gap-2 px-4 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 font-extrabold text-sm hover:bg-orange-100 hover:shadow-sm transition-all relative"
          >
            <Megaphone size={16} />
            Notices
            {workspaceNotices.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full animate-pulse shadow-sm">
                {workspaceNotices.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-inner">
          <button onClick={() => setActiveTab('board')} className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'board' ? 'bg-white text-blue-600 shadow-md border border-blue-100/50 scale-[1.02]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}>📋 Kanban</button>
          <button onClick={() => setActiveTab('docs')} className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'docs' ? 'bg-white text-purple-600 shadow-md border border-purple-100/50 scale-[1.02]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}>📝 Docs</button>
          <button onClick={() => setActiveTab('files')} className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'files' ? 'bg-white text-orange-600 shadow-md border border-orange-100/50 scale-[1.02]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}>📁 Files</button>
          <button onClick={() => setActiveTab('chat')} className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'chat' ? 'bg-white text-emerald-600 shadow-md border border-emerald-100/50 scale-[1.02]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}>💬 Chat</button>
          <button onClick={() => setActiveTab('analytics')} className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'analytics' ? 'bg-white text-rose-500 shadow-md border border-rose-100/50 scale-[1.02]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}>📊 Analytics</button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          <div className="max-w-6xl mx-auto w-full h-full flex flex-col">

            {activeTab === 'board' && (
              <div className="h-full flex flex-col">
                <div className="bg-white p-4 rounded-xl border border-gray-200 w-full mb-6 shadow-sm flex flex-col md:flex-row gap-4 items-center shrink-0">
                  <form onSubmit={handleAIGenerate} className="flex gap-2 flex-1 w-full">
                    <input type="text" required placeholder="✨ Describe a task for AI..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="border border-gray-300 bg-purple-50 focus:bg-white p-3 rounded-lg text-sm w-full outline-none focus:ring-2 ring-purple-400 transition" disabled={isGenerating} />
                    <button type="submit" disabled={isGenerating} className="bg-purple-600 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md hover:bg-purple-700 transition whitespace-nowrap">{isGenerating ? '...' : 'Generate'}</button>
                  </form>
                </div>
                <form onSubmit={handleAddTask} className="flex gap-2 mb-6 shrink-0">
                  <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="+ Add a manual task and press enter..." className="border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 bg-transparent p-2 w-full text-lg outline-none transition" />
                </form>

                <DragDropContext onDragEnd={onDragEnd}>
                  <div className="flex gap-6 items-start overflow-x-auto overflow-y-hidden pb-4 flex-1">
                    {['todo', 'in-progress', 'done'].map(status => (
                      <div key={status} className="bg-gray-100 rounded-[1.5rem] w-80 shrink-0 border border-gray-200 flex flex-col h-full max-h-[75vh] overflow-hidden shadow-sm">
                        <div className="bg-gray-100 px-5 py-4 border-b border-gray-200 flex justify-between items-center shrink-0 z-10">
                          <h2 className="font-extrabold uppercase text-xs text-gray-500 tracking-widest flex items-center gap-2">
                            {status === 'todo' && '📌'} {status === 'in-progress' && '⏳'} {status === 'done' && '✅'} {status}
                          </h2>
                          <span className="bg-white text-gray-700 px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm border border-gray-100">{getTasksByStatus(status).length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          <Droppable droppableId={status}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[200px] space-y-4">
                                {getTasksByStatus(status).map((task, index) => {
                                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                                  return (
                                    <Draggable key={String(task._id)} draggableId={String(task._id)} index={index}>
                                      {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group relative ${snapshot.isDragging ? 'shadow-xl scale-105 rotate-2 border-blue-200' : 'hover:shadow-md'} transition-all`}>
                                          <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                                            <button onClick={() => openEditModal(task)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors">✎</button>
                                            <button onClick={() => handleDeleteTask(task._id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors">✖</button>
                                          </div>
                                          <div className="flex justify-between items-center mb-3 pr-16">
                                            <div className="flex gap-2 items-center flex-wrap">
                                              {task.priority && (<span className={`text-[9px] px-2.5 py-1 rounded-md font-extrabold uppercase border ${task.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : task.priority === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{task.priority}</span>)}
                                              {task.dueDate && (<span className={`text-[10px] font-bold flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>📅 {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>)}
                                            </div>
                                          </div>
                                          <div className={`mb-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${task.assignee ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                            {task.assignee ? (<>👤 Assigned: {workspaceMembers.find(m => m.user?._id === task.assignee)?.user?.name?.split(' ')[0] || 'Member'}</>) : (<>⚪ Unassigned</>)}
                                          </div>
                                          <p className="font-extrabold text-gray-800 text-sm leading-snug">{task.title}</p>
                                          {task.description && <p className="text-xs text-gray-500 mt-2 mb-1 font-medium">{task.description}</p>}
                                          {task.subTasks?.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2.5">
                                              {task.subTasks.map((sub, idx) => (
                                                <div key={idx} className="flex items-start gap-2">
                                                  <input type="checkbox" checked={sub.isCompleted} onChange={() => handleToggleSubtask(task._id, idx)} className="mt-0.5 w-3.5 h-3.5 cursor-pointer accent-blue-600 rounded-sm" />
                                                  <span className={`text-xs font-medium leading-tight ${sub.isCompleted ? 'line-through text-gray-400' : 'text-gray-600'}`}>{sub.title}</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  )
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    ))}
                  </div>
                </DragDropContext>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
                  <span className="font-bold text-gray-700">Project Documentation</span>
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold uppercase tracking-wider italic">Live Ready</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ReactQuill theme="snow" value={noteContent} onChange={handleNoteChange} modules={modules} placeholder="Start typing your team's knowledge here..." className="h-full quill-premium" />
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="h-full flex flex-col bg-white rounded-[2rem] shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                  <div className="flex gap-8">
                    {['Documents', 'Images', 'Links'].map(t => (
                      <button key={t} onClick={() => setFileTab(t)} className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${fileTab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>{t}</button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="file" ref={manualFileInputRef} onChange={handleManualFileUpload} className="hidden" />
                    {fileTab === 'Links' ? (
                      <button onClick={handleManualLinkAdd} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all"><Plus size={16} /> Add Link</button>
                    ) : (
                      <button onClick={() => manualFileInputRef.current?.click()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all"><Upload size={16} /> Upload {fileTab === 'Images' ? 'Image' : 'Doc'}</button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {workspaceFiles.filter(f => {
                      if (fileTab === 'Documents') return f.type === 'document';
                      if (fileTab === 'Images') return f.type === 'image';
                      return f.type === 'link';
                    }).map((file, idx) => (
                      <div key={file._id || idx} className="group border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:border-indigo-100 transition-all bg-gray-50/30 flex flex-col relative overflow-hidden">

                        {(file.sender === currentUserDisplay || isCurrentUserAdmin) && file._id && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleDeleteFile(file._id); }}
                            className="absolute top-2 right-2 p-1.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm border border-gray-100"
                            title="Delete File"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div className="h-40 bg-white rounded-xl mb-4 flex items-center justify-center relative overflow-hidden border border-gray-100 shrink-0 shadow-sm">
                          {file.type === 'image' ? (
                            <img src={file.url} className="w-full h-full object-cover" alt="resource" />
                          ) : file.type === 'document' ? (
                            <File size={48} className="text-blue-500 opacity-80" strokeWidth={1.5} />
                          ) : (
                            <LinkIcon size={48} className="text-orange-500 opacity-80" strokeWidth={1.5} />
                          )}
                          <a href={file.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 z-10">
                            <div className="bg-white p-3 rounded-full shadow-lg translate-y-4 group-hover:translate-y-0 transition-transform"><ExternalLink className="text-indigo-600" size={20} /></div>
                          </a>
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-800 truncate mb-1" title={file.name}>{file.name}</h4>
                        <div className="mt-auto flex justify-between items-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase">By {file.sender}</p>
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold">{new Date(file.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}

                    {workspaceFiles.filter(f => (fileTab === 'Documents' ? f.type === 'document' : fileTab === 'Images' ? f.type === 'image' : f.type === 'link')).length === 0 && (
                      <div className="col-span-full py-24 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                          <FolderPlus size={32} className="text-gray-300" />
                        </div>
                        <p className="font-extrabold text-gray-800 text-lg mb-1">No {fileTab} shared yet</p>
                        <p className="text-gray-400 font-medium text-sm">Upload files or share links in chat to see them here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 💬 CHAT SECTION */}
            {activeTab === 'chat' && (
              <div className="h-full w-full max-w-3xl mx-auto flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 relative">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 shrink-0 z-10"><h2 className="font-bold text-gray-700">Team Chat</h2></div>
                <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50 space-y-4">
                  {chatMessages.filter(msg => !msg.deletedFor?.includes(currentUserDisplay)).map((msg, idx) => {
                    const isMe = msg.sender === currentUserDisplay;
                    return (
                      <div key={msg.messageId || idx} className={`flex flex-col relative ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-gray-400 font-bold mb-1 ml-1">{msg.sender}</span>

                        {/* ✅ UPDATE: Click ab sab messages pe allow hai (isMe hata diya logic se) */}
                        <div
                          className={`group relative px-4 py-2 rounded-2xl max-w-[80%] md:max-w-[70%] text-sm shadow-sm cursor-pointer transition-transform active:scale-[0.98] ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none hover:bg-gray-50'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMessageMenu(activeMessageMenu === msg.messageId ? null : msg.messageId);
                          }}
                        >
                          {msg.fileType === 'image' && <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"><img src={msg.fileUrl} alt="attachment" className="max-w-full h-auto rounded-lg mb-2" /></a>}
                          {msg.fileType === 'document' && <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg mb-2 text-inherit"><span className="underline truncate">{msg.text}</span></a>}
                          {msg.fileType !== 'document' && <div>{renderMessageText(msg.text)}</div>}

                          {/* ✅ UPDATE: Dynamic Dropdown Positioning based on isMe */}
                          {activeMessageMenu === msg.messageId && (
                            <div className={`absolute top-10 ${isMe ? 'right-0' : 'left-0'} bg-white border border-gray-100 rounded-xl shadow-2xl w-56 z-50 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-200`}>
                              <div className="p-1.5">
                                {/* Option 1: Delete For Me (Sabke liye aayega) */}
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteForMe(msg.messageId); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors flex flex-col group">
                                  <span className="font-bold text-gray-700 flex items-center gap-2"><span className="opacity-70">👤</span> Delete for me</span>
                                </button>

                                {/* Option 2: Delete For Everyone (Sirf isMe wale ke liye aayega) */}
                                {isMe && (
                                  <>
                                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteForEveryone(msg.messageId); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-red-50 transition-colors flex flex-col group">
                                      <span className="font-bold text-red-600 flex items-center gap-2"><span className="opacity-80">🗑️</span> Delete for everyone</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2 shrink-0 items-center z-10">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={isUploading} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-3 text-gray-500 hover:text-blue-600 bg-gray-100 rounded-full">📎</button>
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message or share a link..." className="flex-1 bg-gray-100 p-3 rounded-full text-sm outline-none px-6 transition" /><button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold">Send</button>
                </form>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-y-auto flex-1 p-6 md:p-8">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-6">Workspace Analytics 📊</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl shadow-sm"><p className="text-sm font-bold text-blue-600 uppercase mb-1">Total Tasks</p><p className="text-4xl font-extrabold text-gray-800">{tasks.length}</p></div>
                  <div className="bg-green-50 border border-green-100 p-5 rounded-xl shadow-sm"><p className="text-sm font-bold text-green-600 uppercase mb-1">Completed</p><p className="text-4xl font-extrabold text-gray-800">{tasks.filter(t => t.status === 'done').length}</p></div>
                  <div className="bg-yellow-50 border border-yellow-100 p-5 rounded-xl shadow-sm"><p className="text-sm font-bold text-yellow-600 uppercase mb-1">Pending</p><p className="text-4xl font-extrabold text-gray-800">{tasks.filter(t => t.status !== 'done').length}</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                  <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col items-center">
                    <h3 className="font-bold text-gray-700 mb-4 w-full text-left">Task Status Distribution</h3>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (<p className="text-gray-400 mt-10 font-medium">No tasks added yet.</p>)}
                  </div>

                  <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col items-center">
                    <h3 className="font-bold text-gray-700 mb-4 w-full text-left">Tasks by Priority</h3>
                    {tasks.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData}>
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (<p className="text-gray-400 mt-10 font-medium">No tasks added yet.</p>)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="w-72 bg-white border-l border-gray-200 hidden md:flex flex-col shrink-0 z-10 shadow-sm h-full">
          <div className="p-5 border-b border-gray-100 shrink-0"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Team Directory</h3><p className="text-sm text-gray-800 font-bold">{workspaceMembers.length} Active Members</p>{isCurrentUserAdmin && <span className="inline-block mt-2 text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded">👑 You are Admin</span>}</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {workspaceMembers.map((m, i) => {
              const memberId = m.user?._id;
              const nameParts = (m.user?.name || m.user?.email || 'User').split(' ');
              const initials = nameParts.length > 1 ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() : nameParts[0].substring(0, 2).toUpperCase();
              const displayName = m.user?.name || m.user?.email?.split('@')[0] || 'Unknown';
              const isOwner = m.role === 'owner';
              return (
                <div key={memberId || i} className="flex flex-col gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group relative">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 ${isOwner ? 'bg-gradient-to-tr from-purple-600 to-pink-500' : 'bg-gradient-to-tr from-blue-600 to-indigo-500'}`}>{initials}</div>
                    <div className="flex flex-col flex-1 overflow-hidden"><span className="text-sm font-bold text-gray-700 truncate">{displayName}</span><span className={`text-[10px] uppercase font-bold tracking-wider ${isOwner ? 'text-purple-500' : 'text-gray-400'}`}>{isOwner ? 'Admin' : m.role}</span></div>
                    {isCurrentUserAdmin && !isOwner && (<button onClick={() => handleKickMember(memberId)} className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition absolute top-2 right-2 opacity-0 group-hover:opacity-100" title="Remove Member">✖</button>)}
                  </div>
                  {isCurrentUserAdmin && !isOwner && (<div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"><input type="text" placeholder="New role..." value={roleInputs[memberId] || ''} onChange={(e) => handleRoleInputChange(memberId, e.target.value)} className="flex-1 text-[11px] border border-gray-200 bg-white rounded p-1.5 outline-none focus:border-blue-400 transition" /><button onClick={() => handleSetCustomRole(memberId)} className="text-[11px] bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold px-3 py-1.5 rounded transition">Set</button></div>)}
                </div>
              );
            })}
          </div>
          {isCurrentUserAdmin && (<div className="p-4 border-t border-gray-200 bg-red-50/50 shrink-0"><button onClick={handleDeleteWorkspace} className="w-full bg-white text-red-600 border border-red-200 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-red-600 hover:text-white transition-colors">🗑️ Delete Workspace</button></div>)}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            {isCurrentUserAdmin ? (<form onSubmit={handleInvite} className="flex flex-col gap-2"><input type="email" required placeholder="invite@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 ring-blue-400 bg-white" /><button type="submit" className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-gray-900 transition">Add Member</button></form>) : (<div className="text-center p-3 border border-dashed border-gray-300 rounded-lg bg-white"><p className="text-xs text-gray-500 font-medium">Only Admins can invite.</p></div>)}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-extrabold mb-6 text-gray-800">Edit Task</h2>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-400 mb-2">TITLE</label><input type="text" required value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full bg-gray-50 border p-3 rounded-xl outline-none focus:ring-2 ring-blue-500" /></div>
              <div className="flex gap-4">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-2">PRIORITY</label><select value={editingTask.priority || 'medium'} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })} className="w-full bg-gray-50 border p-3 rounded-xl outline-none focus:ring-2 ring-blue-500 cursor-pointer"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-2">DUE DATE</label><input type="date" value={editingTask.dueDate ? editingTask.dueDate.split('T')[0] : ''} onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="w-full bg-gray-50 border p-3 rounded-xl outline-none focus:ring-2 ring-blue-500 cursor-pointer" /></div>
              </div>
              {isCurrentUserAdmin && (
                <div><label className="block text-xs font-bold text-gray-400 mb-2">ASSIGN TO TEAM MEMBER</label><select value={editingTask.assignee || ''} onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })} className="w-full bg-gray-50 border p-3 rounded-xl outline-none focus:ring-2 ring-indigo-500 cursor-pointer text-gray-700 font-bold"><option value="">Unassigned</option>{workspaceMembers.map((m, idx) => (<option key={idx} value={m.user?._id}>{m.user?.name || m.user?.email} ({m.role})</option>))}</select></div>
              )}
              <div><label className="block text-xs font-bold text-gray-400 mb-2">DESCRIPTION</label><textarea rows="3" value={editingTask.description || ''} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} className="w-full bg-gray-50 border p-3 rounded-xl outline-none focus:ring-2 ring-blue-500" /></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl w-full">Cancel</button><button type="submit" className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 w-full shadow-md">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {isNoticeModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

            <div className="bg-orange-50 px-8 py-5 flex justify-between items-center border-b border-orange-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Megaphone size={24} /></div>
                <div>
                  <h2 className="text-xl font-extrabold text-orange-900 leading-tight">Workspace Notices</h2>
                  <p className="text-xs font-bold text-orange-600/70 uppercase tracking-wider">Important Announcements</p>
                </div>
              </div>
              <button onClick={() => setIsNoticeModalOpen(false)} className="p-2 bg-white text-orange-400 hover:text-orange-600 hover:bg-orange-100 rounded-full transition-colors shadow-sm"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50 space-y-4 custom-scrollbar">
              {workspaceNotices.length === 0 ? (
                <div className="text-center py-16 opacity-50">
                  <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="font-bold text-gray-500">No notices posted yet.</p>
                </div>
              ) : (
                [...workspaceNotices].reverse().map((notice, idx) => (
                  <div key={notice._id || idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-orange-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 text-[10px] font-black uppercase rounded-md border border-orange-100 tracking-wider">
                        👤 {notice.author}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(notice.createdAt || Date.now()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed">{notice.text}</p>

                    {isCurrentUserAdmin && (
                      <button
                        onClick={() => handleDeleteNotice(notice._id)}
                        className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Notice"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {isCurrentUserAdmin ? (
              <div className="p-6 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={handleAddNotice} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 ml-1">Post a new notice</label>
                    <textarea
                      value={newNoticeText}
                      onChange={(e) => setNewNoticeText(e.target.value)}
                      placeholder="Type your announcement here..."
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 ring-orange-400 focus:bg-white transition-all resize-none"
                      rows="2"
                      required
                    />
                  </div>
                  <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 h-[52px] rounded-xl font-bold shadow-md transition-colors flex items-center gap-2">
                    Post
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-orange-50/50 border-t border-orange-100 text-center shrink-0">
                <p className="text-[10px] font-bold text-orange-600/70 uppercase tracking-widest">Only admins can post notices</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        .quill-premium .ql-container { font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 16px; border: none !important; height: calc(100% - 42px); }
        .quill-premium .ql-toolbar { border: none !important; border-bottom: 1px solid #e5e7eb !important; background: #ffffff; padding: 8px 12px; }
        .quill-premium .ql-editor { padding: 40px 60px; min-height: 400px; line-height: 1.6; color: #1f2937; }
      `}</style>
    </div>
  );
};

export default WorkspaceView;