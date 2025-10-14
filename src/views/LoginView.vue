<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

// Import shadcn components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

// Import Lucide icons
import { 
  User, 
  Lock, 
  Loader2, 
  AlertCircle, 
  X 
} from 'lucide-vue-next'

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
  <div id="login-page" class="page active min-h-screen bg-muted/30 flex items-center justify-center px-4">
    <Card class="w-full max-w-md mx-auto shadow-lg">
      <CardHeader class="text-center space-y-1">
        <CardTitle class="text-3xl font-bold">Impulse Study</CardTitle>
        <CardDescription class="text-base">Teacher Panel - Learning Management System</CardDescription>
      </CardHeader>

      <!-- Error Alert -->
      <div v-if="error || authStore.error" class="px-6 mb-2">
        <Alert variant="destructive" class="flex items-start">
          <AlertCircle class="h-4 w-4 mr-2 mt-0.5" />
          <div class="flex-1">
            <AlertDescription>{{ error || authStore.error }}</AlertDescription>
          </div>
          <Button variant="ghost" size="icon" class="h-8 w-8" @click="clearError">
            <X class="h-4 w-4" />
          </Button>
        </Alert>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-6 px-6">
        <div class="space-y-2">
          <Label for="username">Username</Label>
          <div class="relative">
            <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="username"
              type="text"
              v-model="form.username"
              :disabled="isLoading || authStore.isLoading"
              required
              placeholder="Enter your username"
              class="pl-9"
            />
          </div>
        </div>
        
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <div class="relative">
            <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              v-model="form.password"
              :disabled="isLoading || authStore.isLoading"
              required
              placeholder="Enter your password"
              class="pl-9"
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Checkbox 
              id="rememberMe" 
              v-model="form.rememberMe"
              :disabled="isLoading || authStore.isLoading"
            />
            <Label 
              for="rememberMe" 
              class="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <a href="#" class="text-sm text-primary hover:underline">Forgot password?</a>
        </div>

        <Button
          type="submit"
          :disabled="isLoading || authStore.isLoading"
          class="w-full"
        >
          <div v-if="isLoading || authStore.isLoading" class="flex items-center">
            <Loader2 class="h-4 w-4 mr-2 animate-spin" />
            Signing In...
          </div>
          <span v-else>Sign In</span>
        </Button>
      </form>

      <CardFooter class="flex justify-center pb-6">
        <p class="text-sm text-muted-foreground">
          Need help?
          <a href="#" class="text-primary hover:underline ml-1">Contact support</a>
        </p>
      </CardFooter>
    </Card>
  </div>
</template>
