import { useState, useCallback, useRef } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Upload, X, Check } from 'lucide-react'

interface AvatarUploadProps {
  currentAvatar?: string
  onSave: (avatar: string) => Promise<void>
  onCancel: () => void
}

export default function AvatarUpload({ currentAvatar, onSave, onCancel }: AvatarUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      // 检查文件大小（限制 5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过 5MB')
        return
      }

      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string)
      })
      reader.readAsDataURL(file)
    }
  }

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<string> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    // 设置画布尺寸为裁剪后的尺寸
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    // 转换为 base64
    return canvas.toDataURL('image/jpeg', 0.9)
  }

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setIsSaving(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
      await onSave(croppedImage)
      // 保存成功后不关闭，而是重置状态显示新头像
      handleReset()
    } catch (e) {
      console.error(e)
      alert('裁剪失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {!imageSrc ? (
        <div className="flex flex-col items-center">
          {/* 当前头像预览 */}
          <div className="mb-4">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="头像"
                className="h-24 w-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-4xl font-semibold text-white">
                ?
              </div>
            )}
          </div>

          {/* 上传按钮 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="avatar-upload"
          />
          <label
            htmlFor="avatar-upload"
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
          >
            <Upload size={20} />
            上传头像
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            支持 JPG、PNG 格式，最大 5MB
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 裁剪区域 */}
          <div className="relative h-80 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* 缩放控制 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              缩放
            </label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              <X size={20} />
              重新选择
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={20} />
              {isSaving ? '保存中...' : '确认裁剪'}
            </button>
          </div>
        </div>
      )}

      {/* 取消按钮 */}
      {!imageSrc && (
        <button
          onClick={onCancel}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          取消
        </button>
      )}
    </div>
  )
}
