import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuthStore()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    // 表单验证
    if (!email.trim() || !password.trim()) {
      toast.error('请填写完整信息')
      return
    }

    if (!isLogin && password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      toast.error('密码至少需要 6 位')
      return
    }

    try {
      if (isLogin) {
        await login(email, password)
        toast.success('登录成功！')
      } else {
        await register(email, password)
        toast.success('注册成功！')
      }
      onClose()
      // 清空表单
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message = err instanceof Error ? err.message : (isLogin ? '登录失败' : '注册失败')
      toast.error(message)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    clearError()
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        // 点击背景时不关闭（必须认证）
        if (e.target === e.currentTarget && isAuthenticated) {
          onClose()
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 m-4 relative">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          {isLogin ? '登录' : '注册'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
              placeholder="至少 6 位"
            />
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                确认密码
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200"
                placeholder="再次输入密码"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 
                          text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg
                     font-semibold hover:from-blue-600 hover:to-purple-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                     shadow-lg hover:shadow-xl"
          >
            {isLoading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            disabled={isLoading}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium disabled:opacity-50"
          >
            {isLogin ? '没有账号?立即注册' : '已有账号?立即登录'}
          </button>
        </div>

        {/* 只有已认证时才显示关闭按钮 */}
        {isAuthenticated && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                     transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
