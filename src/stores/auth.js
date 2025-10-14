import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authAPI } from '@/utils/api.js'
import { useOneSignal } from '@onesignal/onesignal-vue3'
const onesignal = useOneSignal();

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const refreshToken = ref(localStorage.getItem('refresh_token'))
  const sessionId = ref(localStorage.getItem('session_id'))
  const tokenExpiresAt = ref(localStorage.getItem('token_expires_at'))
  const isLoading = ref(false)
  const error = ref('')

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.roles?.[0] || null)
  const userId = computed(() => user.value?.user?.id || null)
  const userName = computed(() => {
    if (user.value?.user?.first_name && user.value?.user?.last_name) {
      return `${user.value.user.first_name} ${user.value.user.last_name}`
    }
    return  user.value?.user?.username || user.value?.name || ''
  })
  const userPhone = computed(() => user.value?.user?.phone || '')
  const isTokenExpired = computed(() => {
    if (!tokenExpiresAt.value) return false
    return new Date() >= new Date(tokenExpiresAt.value)
  })

  // Actions
  const login = async (credentials) => {
    isLoading.value = true
    error.value = ''

    try {
      const response = await authAPI.login(credentials)
      const data = response.data || response

      if (data.access_token && data.user) {
        token.value = data.access_token
        refreshToken.value = data.refresh_token
        sessionId.value = data.sessionId
        tokenExpiresAt.value = data.expiresAt
        user.value = data.user

        // Store all tokens and data in localStorage
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('session_id', data.sessionId)
        localStorage.setItem('token_expires_at', data.expiresAt)
        localStorage.setItem('user', JSON.stringify(data.user))

        onesignal.login(data.user.id)
        return { success: true, data }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Login failed'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // Call logout API if available
      if (token.value) {
        await authAPI.logout()
      }
    } catch (err) {
      console.error('Logout API error:', err)
    } finally {
      // Clear state regardless of API call result
      clearAuth()
    }
  }

  const clearAuth = () => {
    user.value = null
    token.value = null
    refreshToken.value = null
    sessionId.value = null
    tokenExpiresAt.value = null
    error.value = ''

    // Clear localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('session_id')
    localStorage.removeItem('token_expires_at')
    localStorage.removeItem('user')
  }

  const initAuth = () => {
    const storedToken = localStorage.getItem('token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    const storedSessionId = localStorage.getItem('session_id')
    const storedTokenExpiresAt = localStorage.getItem('token_expires_at')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        refreshToken.value = storedRefreshToken
        sessionId.value = storedSessionId
        tokenExpiresAt.value = storedTokenExpiresAt
        user.value = JSON.parse(storedUser)
      } catch (err) {
        console.error('Error parsing stored user:', err)
        clearAuth()
      }
    }
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value || !sessionId.value) {
      console.log('No refresh token or session ID available')
      clearAuth()
      return false
    }

    try {
      const response = await authAPI.refresh({
        refreshToken: refreshToken.value,
        sessionId: sessionId.value
      })
      const data = response.data || response

      if (data.access_token && data.refresh_token) {
        token.value = data.access_token
        refreshToken.value = data.refresh_token
        tokenExpiresAt.value = data.expiresAt
        user.value = data.user

        // Update localStorage
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        localStorage.setItem('token_expires_at', data.expiresAt)
        localStorage.setItem('user', JSON.stringify(data.user))

        return true
      } else {
        throw new Error('Invalid refresh response format')
      }
    } catch (err) {
      console.error('Token refresh failed:', err)
      clearAuth()
      return false
    }
  }

  const checkAuth = async () => {
    if (!token.value) return false

    // Check if token is expired or will expire soon (within 5 minutes)
    if (tokenExpiresAt.value) {
      const now = new Date()
      const expiresAt = new Date(tokenExpiresAt.value)
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

      if (expiresAt <= fiveMinutesFromNow) {
        console.log('Token expired or will expire soon, attempting refresh...')
        const refreshSuccess = await refreshAccessToken()
        if (!refreshSuccess) {
          return false
        }
      }
    }

    try {
      const response = await authAPI.me()
      const userData = response.data || response
      user.value = userData
      return true
    } catch (err) {
      console.error('Auth check failed:', err)
      // Try to refresh token if auth check fails
      if (refreshToken.value && sessionId.value) {
        const refreshSuccess = await refreshAccessToken()
        if (refreshSuccess) {
          try {
            const response = await authAPI.me()
            const userData = response.data || response
            user.value = userData
            return true
          } catch (retryErr) {
            console.error('Auth check failed after token refresh:', retryErr)
          }
        }
      }
      clearAuth()
      return false
    }
  }

  const updateUser = (userData) => {
    user.value = { ...user.value, ...userData }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  const clearError = () => {
    error.value = ''
  }

  // Initialize auth on store creation
  initAuth()

  return {
    // State
    user,
    token,
    refreshToken,
    sessionId,
    tokenExpiresAt,
    isLoading,
    error,

    // Getters
    isAuthenticated,
    userRole,
    userId,
    userName,
    userPhone,
    isTokenExpired,

    // Actions
    login,
    logout,
    clearAuth,
    initAuth,
    checkAuth,
    refreshAccessToken,
    updateUser,
    clearError
  }
})
