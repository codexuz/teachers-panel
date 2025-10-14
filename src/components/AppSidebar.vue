<script setup>
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "@/stores/auth.js"
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Layers,
  Book,
  PlayCircle,
  Dumbbell,
  Library,
  Link,
  LogOut,
  ClipboardList,
  PenTool
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
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

const navigation = {
  main: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: (path) => path === '/dashboard' || path === '/'
    },
    {
      title: "Groups",
      url: "/groups",
      icon: Users,
      isActive: (path) => path === '/groups'
    },
    {
      title: "Group Units",
      url: "/group-assignment",
      icon: ClipboardList,
      isActive: (path) => path.startsWith('/group-assignment')
    },
    {
      title: "Group Homework",
      url: "/group-homework",
      icon: PenTool,
      isActive: (path) => path.startsWith('/group-homework')
    }
  ],
  content: [
    {
      title: "Courses",
      url: "/courses",
      icon: GraduationCap,
      isActive: (path) => path === '/courses'
    },
    {
      title: "Units",
      url: "/units", 
      icon: Layers,
      isActive: (path) => path === '/units'
    },
    {
      title: "Lessons",
      url: "/lessons",
      icon: Book,
      isActive: (path) => path === '/lessons'
    },
    {
      title: "Lesson Contents",
      url: "/lesson-contents",
      icon: PlayCircle,
      isActive: (path) => path === '/lesson-contents'
    },
    {
      title: "Exercises",
      url: "/exercises",
      icon: Dumbbell,
      isActive: (path) => path === '/exercises'
    }
  ],
  resources: [
    {
      title: "Library",
      url: "/library",
      icon: Library,
      isActive: (path) => path === '/library'
    },
    {
      title: "Vocabulary",
      url: "/vocabulary",
      icon: BookOpen,
      isActive: (path) => path === '/vocabulary' || path.startsWith('/vocabulary-items')
    },
    {
      title: "Lesson Vocabulary",
      url: "/lesson-vocabulary",
      icon: Link,
      isActive: (path) => path === '/lesson-vocabulary'
    }
  ]
}
</script>

<template>
  <Sidebar variant="inset">
    <SidebarHeader>
      <div class="flex items-center gap-2 px-4 py-2">
        <GraduationCap class="h-8 w-8 text-primary" />
        <span class="text-xl font-bold">Impulse Study</span>
      </div>
    </SidebarHeader>
    
    <SidebarContent>
      <!-- Main Navigation -->
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigation.main" :key="item.title">
              <SidebarMenuButton 
                :as-child="true" 
                :isActive="item.isActive(route.path)"
              >
                <router-link :to="item.url" class="flex items-center gap-2">
                  <component :is="item.icon" class="h-4 w-4" />
                  <span>{{ item.title }}</span>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <!-- Content Management -->
      <SidebarGroup>
        <SidebarGroupLabel>Content Management</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigation.content" :key="item.title">
              <SidebarMenuButton 
                :as-child="true" 
                :isActive="item.isActive(route.path)"
              >
                <router-link :to="item.url" class="flex items-center gap-2">
                  <component :is="item.icon" class="h-4 w-4" />
                  <span>{{ item.title }}</span>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <!-- Resources -->
      <SidebarGroup>
        <SidebarGroupLabel>Resources</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigation.resources" :key="item.title">
              <SidebarMenuButton 
                :as-child="true" 
                :isActive="item.isActive(route.path)"
              >
                <router-link :to="item.url" class="flex items-center gap-2">
                  <component :is="item.icon" class="h-4 w-4" />
                  <span>{{ item.title }}</span>
                </router-link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <div class="flex items-center gap-3 px-2 py-2">
            <Avatar class="h-8 w-8">
              <AvatarFallback>
                {{ (authStore.userName || 'T').charAt(0).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ authStore.userName || 'Teacher' }}
              </p>
              <p class="text-xs text-muted-foreground truncate">
                {{ authStore.userPhone || authStore.userEmail || 'No contact info' }}
              </p>
            </div>
          </div>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <Button 
            variant="ghost" 
            class="w-full justify-start" 
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4 mr-2" />
            Logout
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped>
/* Custom styles for active links */
.router-link-active {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
</style>