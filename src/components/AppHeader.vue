<script setup>
import { useAuthStore } from '@/stores/auth.js'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Bell, ChevronDown } from 'lucide-vue-next'

const authStore = useAuthStore()


const handleLogout = async () => {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await authStore.logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
      // Force logout even if API call fails
      authStore.clearAuth()
      router.push("/login")
    }
  }
}
</script>

<template>
  <header class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
    <div class="flex items-center gap-2 px-4">
      <SidebarTrigger class="-ml-1" />
      <div class="h-4 w-px bg-sidebar-border hidden sm:block" />
      <h1 class="text-lg font-semibold text-foreground hidden sm:block">
        Dashboard
      </h1>
    </div>
    
    <!-- Spacer -->
    <div class="flex-1" />
    
    <!-- Header Actions -->
    <div class="flex items-center gap-2 px-4">
      <!-- Notifications -->
      <Button variant="ghost" size="icon" class="relative">
        <Bell class="h-4 w-4" />
        <Badge 
          variant="destructive" 
          class="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
        >
          3
        </Badge>
      </Button>
      
      <!-- User Menu -->
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" class="flex items-center gap-2 px-2">
            <Avatar class="h-8 w-8">
              <AvatarFallback>
                {{ (authStore.userName || 'T').charAt(0).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <span class="hidden sm:inline-block text-sm font-medium">
              {{ authStore.userName || 'Teacher' }}
            </span>
            <ChevronDown class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col space-y-1">
              <p class="text-sm font-medium leading-none">
                {{ authStore.userName || 'Teacher' }}
              </p>
              <p class="text-xs leading-none text-muted-foreground">
                {{ authStore.userPhone || authStore.userEmail || 'No contact info' }}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<style scoped>
/* Additional responsive styles if needed */
</style>