import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器:自动添加 token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器:处理 401 错误
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token')
        // 重新加载页面，触发登录流程
        window.location.reload()
      }
      // 提取后端错误消息
      const message = error.response?.data?.detail || error.message
      return Promise.reject(new Error(message))
    }
    return Promise.reject(error)
  }
)

// 认证 API
export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<User>('/api/auth/register', data)
    return response.data
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data)
    localStorage.setItem('access_token', response.data.access_token)
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/api/auth/me')
    return response.data
  },

  updateProfile: async (data: {
    username?: string
    avatar?: string
    timezone?: string
    current_password?: string
    new_password?: string
    push_url?: string
  }): Promise<User> => {
    console.log('发送 updateProfile 请求:', {
      hasAvatar: !!data.avatar,
      avatarLength: data.avatar?.length,
      data: { ...data, avatar: data.avatar?.substring(0, 50) }
    })
    const response = await api.put<User>('/api/auth/me', data)
    console.log('updateProfile 响应:', {
      hasAvatar: !!response.data.avatar,
      avatarLength: response.data.avatar?.length,
      user: { ...response.data, avatar: response.data.avatar?.substring(0, 50) }
    })
    return response.data
  },

  logout: () => {
    localStorage.removeItem('access_token')
  },
}

export default api
