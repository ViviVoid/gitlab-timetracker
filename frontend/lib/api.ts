import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, redirect to login
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// GitLab API
export const gitlabAPI = {
  createConnection: async (data: {
    gitlabUrl: string;
    accessToken: string;
    connectionName: string;
  }) => {
    const response = await api.post('/gitlab/connections', data);
    return response.data;
  },

  getConnections: async () => {
    const response = await api.get('/gitlab/connections');
    return response.data;
  },

  deleteConnection: async (id: string) => {
    const response = await api.delete(`/gitlab/connections/${id}`);
    return response.data;
  },

  getProjects: async (connectionId: string, filters?: any) => {
    const response = await api.get('/gitlab/projects', {
      params: { connectionId, ...filters },
    });
    return response.data;
  },

  saveProject: async (data: {
    connectionId: string;
    gitlabProjectId: string;
    projectName: string;
    projectPath: string;
  }) => {
    const response = await api.post('/gitlab/projects', data);
    return response.data;
  },

  syncProject: async (projectId: string) => {
    const response = await api.post(`/gitlab/sync/${projectId}`);
    return response.data;
  },
};

// Time Entries API
export const timeEntriesAPI = {
  getTimeEntries: async (params: {
    projectId: string;
    startDate?: string;
    endDate?: string;
    author?: string;
  }) => {
    const response = await api.get('/time-entries', { params });
    return response.data;
  },

  getStats: async (params: {
    projectId: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/time-entries/stats', { params });
    return response.data;
  },

  getCumulative: async (params: {
    projectId: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/time-entries/cumulative', { params });
    return response.data;
  },
};
