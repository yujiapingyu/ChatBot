import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { X, Camera } from 'lucide-react'
import AvatarUpload from './AvatarUpload'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, updateProfile } = useAuthStore()
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [avatarKey, setAvatarKey] = useState(0) // 强制重新渲染头像

  // 当模态框打开或用户信息变化时，更新用户名
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || user.email.split('@')[0])
      console.log('UserProfileModal - 用户信息:', {
        hasAvatar: !!user.avatar,
        avatarLength: user.avatar?.length,
        avatarPrefix: user.avatar?.substring(0, 50)
      })
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const handleAvatarSave = async (avatar: string) => {
    setIsLoading(true)
    try {
      console.log('保存头像，avatar 长度:', avatar.length)
      const updatedUser = await updateProfile({ avatar })
      console.log('更新后的用户信息:', updatedUser)
      console.log('用户头像:', user?.avatar?.substring(0, 50))
      toast.success('头像已更新')
      setIsEditingAvatar(false)
      setAvatarKey(prev => prev + 1) // 强制重新渲染
    } catch (error: any) {
      console.error('头像更新失败:', error)
      toast.error(error.message || '头像更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // 密码验证
      if (newPassword && newPassword !== confirmPassword) {
        toast.error('两次输入的新密码不一致')
        setIsLoading(false)
        return
      }
      
      if (newPassword && newPassword.length < 6) {
        toast.error('新密码至少需要 6 位')
        setIsLoading(false)
        return
      }

      // 准备更新数据
      const updateData: {
        username?: string
        current_password?: string
        new_password?: string
      } = {}

      // 只有当用户名发生变化时才更新
      if (username && username !== (user?.username || user?.email.split('@')[0])) {
        updateData.username = username
      }

      // 只有当输入了新密码时才更新
      if (newPassword) {
        updateData.current_password = currentPassword
        updateData.new_password = newPassword
      }

      // 如果没有任何更新
      if (Object.keys(updateData).length === 0) {
        toast.info('没有修改任何信息')
        setIsLoading(false)
        return
      }

      // 调用 API
      await updateProfile(updateData)
      
      toast.success('用户信息已更新')
      // 清空密码输入
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (error: any) {
      toast.error(error.message || '更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 m-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          个人信息
        </h2>

        {isEditingAvatar ? (
          <AvatarUpload
            currentAvatar={user.avatar}
            onSave={handleAvatarSave}
            onCancel={() => setIsEditingAvatar(false)}
          />
        ) : (
          <div className="space-y-4">
          {/* 头像 */}
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={() => setIsEditingAvatar(true)}
              className="relative group mb-3"
            >
              {user.avatar ? (
                <img
                  key={avatarKey}
                  src={user.avatar}
                  alt="头像"
                  className="h-20 w-20 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600 group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-3xl font-semibold text-white group-hover:opacity-75 transition-opacity">
                  {(user.username || user.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400">邮箱: {user.email}</p>
          </div>

          {/* 用户名 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
              placeholder="输入用户名"
            />
          </div>

          {/* 修改密码区域 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              修改密码（可选）
            </h3>

            <div className="space-y-3">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  当前密码
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200"
                  placeholder="输入当前密码"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  新密码
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200"
                  placeholder="至少 6 位"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  确认新密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all duration-200"
                  placeholder="再次输入新密码"
                />
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                       text-gray-700 dark:text-gray-300 font-medium
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg
                       font-semibold hover:from-blue-600 hover:to-purple-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                       shadow-lg hover:shadow-xl"
            >
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
