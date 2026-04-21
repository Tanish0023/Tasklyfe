import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import {
  LayoutDashboard, Plus, Briefcase,
  LogOut, ChevronRight, FolderPlus, Clock, Users,
  Calendar, CheckCircle2, Sparkles, Search, FileText, CheckSquare,
  Bell, Activity, MessageSquare, Trash2 // ✅ Trash2 icon imported
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL);

const Dashboard = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [globalTasks, setGlobalTasks] = useState([]);
  const [globalActivities, setGlobalActivities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [aiBriefing, setAiBriefing] = useState('');
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ workspaces: [], tasks: [] });
  const [isSearching, setIsSearching] = useState(false);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [wsRes, tasksRes, activitiesRes] = await Promise.all([
          API.get('/workspaces'),
          API.get('/tasks/global/all').catch(() => ({ data: [] })),
          API.get('/workspaces/activities/global').catch(() => ({ data: [] }))
        ]);

        const fetchedWorkspaces = wsRes.data || [];
        setWorkspaces(fetchedWorkspaces);

        fetchedWorkspaces.forEach(ws => {
          socket.emit('join_workspace', ws._id);
        });

        const fetchedTasks = tasksRes.data || [];
        const pendingTasksOnly = fetchedTasks.filter(task => task.status !== 'done');
        setGlobalTasks(pendingTasksOnly);

        setGlobalActivities(activitiesRes.data || []);

        if (pendingTasksOnly.length > 0) {
          setIsBriefingLoading(true);
          try {
            const briefingRes = await API.post('/ai/daily-briefing', {
              tasks: pendingTasksOnly,
              userName: user.name?.split(' ')[0] || 'User'
            });
            setAiBriefing(briefingRes.data.briefing);
          } catch (err) {
            setAiBriefing(`You have ${pendingTasksOnly.length} pending tasks today. Check your agenda below!`);
          } finally {
            setIsBriefingLoading(false);
          }
        } else {
          setAiBriefing(`You have no pending tasks today. Enjoy your day or start a new project!`);
        }
      } catch (err) {
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  useEffect(() => {
    const fetchLatestRadar = async () => {
      try {
        const res = await API.get('/workspaces/activities/global');
        setGlobalActivities(res.data || []);
      } catch (err) {
        console.error("Radar refresh failed");
      }
    };

    socket.on('refresh_radar', fetchLatestRadar);
    return () => { socket.off('refresh_radar', fetchLatestRadar); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ workspaces: [], tasks: [] });
        return;
      }
      setIsSearching(true);
      try {
        const res = await API.get(`/workspaces/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    };
    const timeoutId = setTimeout(() => { fetchSearchResults(); }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error("Workspace name is required");
    const tid = toast.loading("Creating Workspace...");
    try {
      const res = await API.post('/workspaces', { name: newName, description: newDesc });
      setWorkspaces(prev => [...prev, res.data]);
      socket.emit('join_workspace', res.data._id);
      setShowModal(false);
      setNewName(''); setNewDesc('');
      toast.success("Workspace Created!", { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating workspace", { id: tid });
    }
  };

  // ✅ NAYA: Function to Delete Single Activity
  const handleDeleteActivity = async (workspaceId, activityId) => {
    try {
      await API.delete(`/workspaces/${workspaceId}/activities/${activityId}`);
      setGlobalActivities(prev => prev.filter(log => log._id !== activityId));
      // Notify other teammates
      socket.emit('log_dashboard_activity', workspaceId);
      toast.success('Activity removed');
    } catch (err) {
      toast.error('Failed to remove activity');
    }
  };

  // ✅ NAYA: Function to Clear All Activities
  const handleClearAllActivities = async () => {
    if (!window.confirm("Are you sure you want to clear your entire Team Radar?")) return;
    const tid = toast.loading("Clearing radar...");
    try {
      await API.delete('/workspaces/activities/global/clear');
      setGlobalActivities([]);
      // Notify all workspaces to clear radar
      workspaces.forEach(ws => {
        socket.emit('log_dashboard_activity', ws._id);
      });
      toast.success('Radar cleared successfully!', { id: tid });
    } catch (err) {
      toast.error('Failed to clear radar', { id: tid });
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "just now";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EDF2F7] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Toaster position="top-right" />

      <nav className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-200">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-gray-900">Tasklyfe<span className="text-indigo-600">.</span></span>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={() => setIsSearchOpen(true)} className="hidden md:flex items-center gap-3 bg-gray-100 hover:bg-gray-200/80 border border-gray-200 px-4 py-2 rounded-xl transition-all group">
            <Search size={14} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
            <span className="text-xs font-bold text-gray-500">Search...</span>
            <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-md text-gray-400 border border-gray-200 shadow-sm ml-4">Ctrl K</span>
          </button>

          <div className="relative">
            <div
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1 rounded-full pr-3 transition-colors border border-transparent hover:border-gray-200"
            >
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Logged In</p>
                <p className="text-sm font-bold text-gray-800 leading-none">{user.name?.split(' ')[0] || 'User'}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shadow-sm hover:scale-105 transition-transform">
                {(user.name || 'U').substring(0, 2).toUpperCase()}
              </div>
            </div>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 border-b border-gray-50 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-inner shrink-0">
                        {(user.name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-extrabold text-gray-900 truncate" title={user.name}>{user.name || 'User'}</p>
                        <p className="text-xs font-bold text-gray-500 truncate" title={user.email}>{user.email || 'No email provided'}</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors group"
                    >
                      <span className="flex items-center gap-2"><LogOut size={14} /> Sign Out</span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto w-full p-8 md:p-12 flex-1">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">{user.name?.split(' ')[0] || 'User'}</span>
          </h1>

          <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-100/60 p-5 rounded-2xl flex gap-4 items-start shadow-sm relative overflow-hidden w-full">
            <div className="absolute -top-4 -right-4 text-8xl opacity-5">✨</div>
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 border border-indigo-50">
              <Sparkles size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-indigo-900 mb-1 flex items-center gap-2 uppercase tracking-wide">AI Daily Briefing</h3>
              {isBriefingLoading ? (
                <div className="space-y-2 mt-2 max-w-2xl">
                  <div className="h-2.5 w-full bg-indigo-200/50 animate-pulse rounded-full"></div>
                  <div className="h-2.5 w-3/4 bg-indigo-200/50 animate-pulse rounded-full"></div>
                </div>
              ) : (
                <p className="text-sm font-medium text-indigo-800/80 leading-relaxed">{aiBriefing}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200/60 shadow-sm flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 relative z-10"><Briefcase size={22} strokeWidth={2.5} /></div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Workspaces</p>
              <p className="text-3xl font-black text-gray-900">{workspaces.length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200/60 shadow-sm flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 relative z-10">
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending Tasks</p>
              <p className="text-3xl font-black text-gray-900">{globalTasks.length}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-gray-900 p-6 rounded-[1.5rem] shadow-xl flex flex-col justify-between relative overflow-hidden group border border-indigo-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full group-hover:bg-indigo-500/30 transition-colors"></div>
            <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest relative z-10">Quick Action</p>
            <button onClick={() => setShowModal(true)} className="flex items-center justify-between w-full bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl backdrop-blur-sm border border-white/10 transition-all duration-300 relative z-10 mt-4 group/btn">
              <span className="text-sm font-bold flex items-center gap-2"><Plus size={16} /> New Workspace</span>
              <ChevronRight size={16} className="text-indigo-300 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* 🔔 LEFT SIDEBAR: Activity Radar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[1.5rem] border border-gray-200/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <Bell size={16} className="text-orange-500" /> Team Radar
                </h2>
                {/* ✅ NAYA: Clear All Button */}
                {globalActivities.length > 0 && (
                  <button
                    onClick={handleClearAllActivities}
                    className="text-[9px] font-black text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 border border-red-100 uppercase tracking-widest"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                )}
              </div>
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar relative">
                <div className="absolute left-8 top-5 bottom-5 w-px bg-gray-100"></div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl ml-8"></div>)}
                  </div>
                ) : globalActivities.length > 0 ? (
                  <div className="space-y-5">
                    {globalActivities.map((log) => (
                      <div key={log._id} className="relative pl-8 group animate-in slide-in-from-left-4 fade-in duration-300">
                        <div className={`absolute left-[-2px] top-1 h-6 w-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10
                          ${log.type === 'task' ? 'bg-blue-100 text-blue-600' :
                            log.type === 'file' ? 'bg-orange-100 text-orange-600' :
                              log.type === 'notice' ? 'bg-purple-100 text-purple-600' :
                                'bg-emerald-100 text-emerald-600'}`}>
                          {log.type === 'task' && <CheckSquare size={10} />}
                          {log.type === 'file' && <FileText size={10} />}
                          {log.type === 'notice' && <MessageSquare size={10} />}
                          {(!log.type || log.type === 'member') && <Users size={10} />}
                        </div>

                        <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm group-hover:border-indigo-200 transition-colors relative">
                          {/* ✅ NAYA: Individual Delete Button */}
                          <button
                            onClick={() => handleDeleteActivity(log.workspaceId, log._id)}
                            className="absolute -top-2 -right-2 p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20 shadow-sm"
                            title="Remove from Radar"
                          >
                            <Trash2 size={12} />
                          </button>

                          <p className="text-xs text-gray-600 leading-snug pr-4">
                            <span className="font-extrabold text-gray-900">{log.userName}</span> {log.action}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                            <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded tracking-wider truncate max-w-[120px]">
                              {log.workspaceName}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap">
                              {timeAgo(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center opacity-50 relative z-20">
                    <Activity size={32} className="text-gray-300 mb-3" />
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No Activity Yet</p>
                    <p className="text-[10px] font-medium text-gray-400 mt-1 max-w-[180px]">Team updates will appear here automatically.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 📂 MIDDLE: Workspace Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                <FolderPlus size={20} className="text-gray-400" /> Your Workspaces
              </h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-gray-200/50 animate-pulse rounded-[1.5rem]"></div>)}
              </div>
            ) : workspaces.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {workspaces.map((ws) => (
                  <Link to={`/workspace/${ws._id}`} key={ws._id} className="group bg-white p-6 rounded-[1.5rem] border border-gray-200/60 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                        <span className="text-indigo-600 font-black text-lg group-hover:text-white transition-colors uppercase">{ws.name.substring(0, 1)}</span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded-md border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-gray-900 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">{ws.name}</h3>
                    <p className="text-sm text-gray-500 font-medium line-clamp-2 flex-1 mb-5">{ws.description || 'No description provided for this team project.'}</p>
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-gray-400">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold"><Users size={14} /><span>{ws.members?.length || 1} Member{(ws.members?.length || 1) > 1 ? 's' : ''}</span></div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold"><Clock size={14} /><span>Updated recently</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center hover:border-indigo-300 transition-colors duration-300 h-[400px]">
                <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4"><FolderPlus size={28} className="text-indigo-400" /></div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">No workspaces yet</h3>
                <p className="text-gray-500 font-medium mb-6 max-w-sm">Create your first workspace to start collaborating.</p>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                  <Plus size={18} /> Launch First Project
                </button>
              </div>
            )}
          </div>

          {/* 🎯 RIGHT: Global Tasks Widget */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[1.5rem] border border-gray-200/60 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" /> Upcoming Tasks
                </h2>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">{globalTasks.length}</span>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl"></div>)
                ) : globalTasks.length > 0 ? (
                  globalTasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                      <Link to={`/workspace/${task.workspaceId}`} key={task._id} className="block p-4 rounded-2xl border border-gray-100 hover:border-indigo-300 hover:shadow-md transition-all group bg-white cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-50 text-red-600' : task.priority === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                              {task.priority}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${task.status === 'in-progress' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                              {task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                            </span>
                          </div>

                          {task.dueDate && (
                            <span className={`text-[9px] font-bold flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                              <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-800 leading-snug mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">{task.title}</h4>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Project ID: ...{task.workspaceId.substring(task.workspaceId.length - 4)}</span>
                          <span className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">Go to Board <ChevronRight size={12} /></span>
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <div className="py-16 flex flex-col items-center text-center">
                    <CheckCircle2 size={40} className="text-emerald-200 mb-3" />
                    <p className="text-sm font-bold text-gray-700">All caught up!</p>
                    <p className="text-xs text-gray-400 font-medium px-4 mt-1">You don't have any pending tasks right now.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* COMMAND PALETTE */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-start justify-center pt-[10vh] p-4 z-50 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col">
            <div className="flex items-center px-4 py-4 border-b border-gray-100">
              <Search size={22} className="text-indigo-500 ml-2" />
              <input
                autoFocus type="text" placeholder="Search workspaces, docs, or tasks..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-lg font-medium text-gray-800 px-4 placeholder:text-gray-300"
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 uppercase tracking-widest">ESC</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-gray-50/50 p-2">
              {!searchQuery ? (
                <div className="p-10 text-center text-gray-400 font-medium text-sm">Type to search across your entire workspace...</div>
              ) : isSearching ? (
                <div className="p-10 text-center text-indigo-400 font-bold text-sm animate-pulse">Searching...</div>
              ) : (searchResults.workspaces.length === 0 && searchResults.tasks.length === 0) ? (
                <div className="p-10 text-center text-gray-500 font-medium text-sm">No results found for "<span className="text-gray-800">{searchQuery}</span>"</div>
              ) : (
                <div className="p-2 space-y-4">
                  {searchResults.workspaces.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">Projects & Docs</h3>
                      <div className="space-y-1">
                        {searchResults.workspaces.map(ws => (
                          <Link to={`/workspace/${ws._id}`} key={ws._id} onClick={() => setIsSearchOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 group transition-colors">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><FileText size={16} /></div>
                            <div>
                              <p className="text-sm font-extrabold text-gray-800 group-hover:text-indigo-700">{ws.name}</p>
                              {ws.description && <p className="text-xs text-gray-400 line-clamp-1">{ws.description}</p>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.tasks.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2 mt-4">Tasks</h3>
                      <div className="space-y-1">
                        {searchResults.tasks.map(task => (
                          <Link to={`/workspace/${task.workspaceId}`} key={task._id} onClick={() => setIsSearchOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 group transition-colors">
                            <div className={`p-2 rounded-lg ${task.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                              <CheckSquare size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-gray-800 group-hover:text-green-700">{task.title}</p>
                              <div className="flex gap-2 mt-0.5">
                                <span className="text-[9px] font-bold text-gray-400 uppercase bg-white border border-gray-200 px-1.5 rounded">{task.status}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase bg-white border border-gray-200 px-1.5 rounded">{task.priority} Priority</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE WORKSPACE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 md:p-10 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">New Workspace</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Setup your environment</p>
              </div>
              <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center"><Briefcase size={20} className="text-indigo-600" /></div>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest ml-1">Workspace Name <span className="text-red-500">*</span></label>
                <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Marketing Team 2026" className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-gray-800 placeholder:text-gray-400" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest ml-1">Objective (Optional)</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows="3" placeholder="What are we building?" className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-gray-700 resize-none placeholder:text-gray-400" />
              </div>
              <div className="flex gap-3 pt-6 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3.5 rounded-xl font-extrabold text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                  Create Project <ChevronRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="h-10 bg-white/80 backdrop-blur-md border-t border-gray-200/60 flex items-center justify-center shrink-0 z-30 mt-auto">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
          @Team CSK
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

export default Dashboard;