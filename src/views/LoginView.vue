<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
const router = useRouter()
const authStore = useAuthStore()

// Form data
const form = reactive({
  username: '',
  password: '',
  rememberMe: false
})

const isLoading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    error.value = 'Please fill in all fields'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const result = await authStore.login({
      username: form.username,
      password: form.password
    })

    if (result.success) {
      // Redirect to dashboard or intended route
      const redirectTo = router.currentRoute.value.query.redirect || '/dashboard'
      router.push(redirectTo)
    } else {
      error.value = result.error || 'Login failed'
    }
  } catch (err) {
    error.value = err.message || 'An unexpected error occurred'
  } finally {
    isLoading.value = false
  }
}

const clearError = () => {
  error.value = ''
  authStore.clearError()
}
</script>

<template>
  <!-- Login Page -->
  <div id="login-page" class="page active min-h-screen bg-gray-100 flex items-center justify-center px-4">
    <div class="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Impulse Study</h1>
        <p class="text-gray-600">Teacher Panel - Learning Management System</p>
      </div>

      <!-- Error Alert -->
      <div v-if="error || authStore.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <div class="flex justify-between items-center">
          <span>{{ error || authStore.error }}</span>
          <button @click="clearError" class="text-red-700 hover:text-red-900">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Username</label>
          <input
            type="text"
            v-model="form.username"
            :disabled="isLoading || authStore.isLoading"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="Enter your username"
          >
        </div>        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            v-model="form.password"
            :disabled="isLoading || authStore.isLoading"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            placeholder="Enter your password"
          >
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              type="checkbox"
              v-model="form.rememberMe"
              id="rememberMe"
              :disabled="isLoading || authStore.isLoading"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            >
            <label for="rememberMe" class="ml-2 block text-sm text-gray-700">Remember me</label>
          </div>
          <a href="#" class="text-sm text-blue-600 hover:text-blue-500">Forgot password?</a>
        </div>

        <button
          type="submit"
          :disabled="isLoading || authStore.isLoading"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <i v-if="isLoading || authStore.isLoading" class="fas fa-spinner fa-spin mr-2"></i>
          {{ isLoading || authStore.isLoading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Need help?
          <a href="#" class="text-blue-600 hover:text-blue-500">Contact support</a>
        </p>
      </div>
    </div>
  </div>
</template>
