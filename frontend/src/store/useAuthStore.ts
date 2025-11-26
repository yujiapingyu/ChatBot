import { create } from 'zustand'
import type { User } from '@/types/auth'
import { authApi } from '@/lib/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitializing: boolean // 页面初始化时检查认证状态
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (data: {
    username?: string
    avatar?: string
    timezone?: string
    current_password?: string
    new_password?: string
  }) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true, // 初始为 true，避免登录框闪烁
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.login({ email, password })
      const user = await authApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      let message = '登录失败'
      if (error instanceof Error) {
        message = error.message
      }
      set({ error: message, isLoading: false, isAuthenticated: false })
      throw new Error(message)
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.register({ email, password })
      // 注册后自动登录
      await authApi.login({ email, password })
      const user = await authApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false, error: null })
    } catch (error) {
      let message = '注册失败'
      if (error instanceof Error) {
        message = error.message
      }
      set({ error: message, isLoading: false, isAuthenticated: false })
      throw new Error(message)
    }
  },

  logout: () => {
    authApi.logout()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isAuthenticated: false, user: null, isInitializing: false })
      return
    }

    set({ isLoading: true })
    try {
      const user = await authApi.getMe()
      set({ user, isAuthenticated: true, isLoading: false, isInitializing: false })
    } catch {
      authApi.logout()
      set({ user: null, isAuthenticated: false, isLoading: false, isInitializing: false })
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const updatedUser = await authApi.updateProfile(data)
      set({ user: updatedUser, isLoading: false, error: null })
    } catch (error) {
      let message = '更新失败'
      if (error instanceof Error) {
        message = error.message
      }
      set({ error: message, isLoading: false })
      throw new Error(message)
    }
  },

  clearError: () => set({ error: null }),
}))
