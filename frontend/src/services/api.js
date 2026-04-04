import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Enable cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.response?.config?.url,
    });
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => {
    console.log('Registering with:', data);
    return apiClient.post('/auth/register', data);
  },
  login: (data) => {
    console.log('Logging in with:', data.email);
    return apiClient.post('/auth/login', data);
  },
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
};

export const superAdminAPI = {
  getOverview: (params) => apiClient.get('/super-admin/overview', { params }),
  getUserDetails: (id) => apiClient.get(`/super-admin/users/${id}`),
  updateUserStatus: (id, isActive) =>
    apiClient.patch(`/super-admin/users/${id}/status`, { isActive }),
  deleteUser: (id) => apiClient.delete(`/super-admin/users/${id}`),
};

export const instructorAPI = {
  getDashboard: () => apiClient.get('/instructor/dashboard'),
  getStudentPerformance: (studentId, courseId) =>
    apiClient.get(`/instructor/students/${studentId}/courses/${courseId}/performance`),
  createCourse: (data) => apiClient.post('/instructor/courses', data),
  updateCourse: (courseId, data) => apiClient.patch(`/instructor/courses/${courseId}`, data),
  deleteCourse: (courseId) => apiClient.delete(`/instructor/courses/${courseId}`),
  addTopic: (courseId, data) => apiClient.post(`/instructor/courses/${courseId}/topics`, data),
  deleteTopic: (courseId, topicId) => apiClient.delete(`/instructor/courses/${courseId}/topics/${topicId}`),
  updateTopicContent: (courseId, topicId, data) =>
    apiClient.patch(`/instructor/courses/${courseId}/topics/${topicId}/content`, data),
  createQuiz: (data) => apiClient.post('/instructor/quizzes', data),
  updateQuiz: (courseId, topicId, quizId, data) =>
    apiClient.patch(`/instructor/courses/${courseId}/topics/${topicId}/quizzes/${quizId}`, data),
  deleteQuiz: (courseId, topicId, quizId) =>
    apiClient.delete(`/instructor/courses/${courseId}/topics/${topicId}/quizzes/${quizId}`),
};

export const studentAPI = {
  getDashboard: () => apiClient.get('/student/dashboard'),
  getCourseDetails: (courseId) => apiClient.get(`/student/courses/${courseId}`),
  enrollInCourse: (courseId) => apiClient.post(`/student/courses/${courseId}/enroll`),
  createPaymentOrder: (courseId) => apiClient.post(`/student/courses/${courseId}/payment-order`),
  verifyCoursePayment: (courseId, data) => apiClient.post(`/student/courses/${courseId}/verify-payment`, data),
  updateProgress: (courseId, data) => apiClient.patch(`/student/courses/${courseId}/progress`, data),
  saveQuizResult: (courseId, data) => apiClient.post(`/student/courses/${courseId}/quiz-results`, data),
};

export default apiClient;
