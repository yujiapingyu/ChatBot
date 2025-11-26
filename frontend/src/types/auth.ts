export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  username?: string
  avatar?: string
  timezone?: string
  is_active: boolean
  is_verified: boolean
}
