import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.get('/auth/logout');
export const getMe = () => api.get('/auth/me');

// Profile
export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data) => api.put('/users/profile', data);

// Skills
export const getSkills = () => api.get('/skills');
export const assignSkills = (skills) => api.post('/skills/assign', { skills });
export const removeSkill = (skillId) => api.delete(`/skills/${skillId}`);

// Projects
export const getProjects = (params = {}) => api.get('/projects', { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Applications
export const applyToProject = (projectId, message = '') =>
  api.post(`/projects/${projectId}/apply`, { message });
export const getProjectApplications = (projectId) =>
  api.get(`/projects/${projectId}/applications`);
export const updateApplication = (appId, status) =>
  api.patch(`/applications/${appId}`, { status });
export const getMyApplications = () => api.get('/applications/mine');

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`);

// AI
export const matchCandidates = (projectId) => api.get(`/ai/match/${projectId}`);
export const generateRoadmap = (data) => api.post('/ai/roadmap', data);
export const aiDebug = (data) => api.post('/ai/debug', data);

// Chat
export const getChatMessages = (projectId, params = {}) =>
  api.get(`/chat/${projectId}/messages`, { params });

export default api;
