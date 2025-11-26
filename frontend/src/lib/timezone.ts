/**
 * 将 UTC 时间字符串或时间戳转换为用户时区的本地时间
 * @param utcDate - UTC 时间字符串（ISO 8601 格式）或时间戳（毫秒）
 * @param userTimezone - 用户时区，如 'Asia/Shanghai'，默认为系统时区
 * @returns Date 对象
 */
export function convertToUserTimezone(utcDate: string | number, userTimezone?: string): Date {
  const date = new Date(utcDate)
  
  if (!userTimezone) {
    return date
  }
  
  // 使用 Intl API 获取用户时区的时间字符串
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  
  const parts = formatter.formatToParts(date)
  const dateObj: Record<string, string> = {}
  parts.forEach(({ type, value }) => {
    dateObj[type] = value
  })
  
  // 构造用户时区的 Date 对象
  return new Date(
    `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}`
  )
}

/**
 * 格式化时间显示（时分）
 * @param utcDate - UTC 时间字符串或时间戳
 * @param userTimezone - 用户时区
 * @returns 格式化的时间字符串，如 "14:30"
 */
export function formatTime(utcDate: string | number, userTimezone?: string): string {
  const date = new Date(utcDate)
  
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: userTimezone || undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * 格式化日期显示（年月日）
 * @param utcDate - UTC 时间字符串或时间戳
 * @param userTimezone - 用户时区
 * @returns 格式化的日期字符串，如 "2025/01/26"
 */
export function formatDate(utcDate: string | number, userTimezone?: string): string {
  const date = new Date(utcDate)
  
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: userTimezone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * 格式化完整日期时间
 * @param utcDate - UTC 时间字符串或时间戳
 * @param userTimezone - 用户时区
 * @returns 格式化的日期时间字符串，如 "2025/01/26 14:30"
 */
export function formatDateTime(utcDate: string | number, userTimezone?: string): string {
  const date = new Date(utcDate)
  
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: userTimezone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}
