<script setup>
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  Book,
  PlayCircle,
  Dumbbell,
  Mic,
  Library,
  Link,
  LogOut,
  ClipboardList,
  PenTool,
  CheckCircle,
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const navigation = {
  main: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: (path) => path === "/dashboard" || path === "/",
    },
    {
      title: "Groups",
      url: "/groups",
      icon: Users,
      isActive: (path) => path === "/groups",
    },
    {
      title: "Group Units",
      url: "/group-assignment",
      icon: ClipboardList,
      isActive: (path) => path.startsWith("/group-assignment"),
    },
    {
      title: "Group Homework",
      url: "/group-homework",
      icon: PenTool,
      isActive: (path) => path.startsWith("/group-homework"),
    },
    {
      title: "Homework Check",
      url: "/homework-check",
      icon: CheckCircle,
      isActive: (path) => path.startsWith("/homework-check"),
    },
  ],
  content: [
    {
      title: "Courses",
      url: "/courses",
      icon: GraduationCap,
      isActive: (path) => path === "/courses",
    },
    {
      title: "Units",
      url: "/units",
      icon: Layers,
      isActive: (path) => path === "/units",
    },
    {
      title: "Lessons",
      url: "/lessons",
      icon: Book,
      isActive: (path) => path === "/lessons",
    },
    {
      title: "Lesson Contents",
      url: "/lesson-contents",
      icon: PlayCircle,
      isActive: (path) => path === "/lesson-contents",
    },
    {
      title: "Exercises",
      url: "/exercises",
      icon: Dumbbell,
      isActive: (path) => path === "/exercises",
    },
    {
      title: "Speaking",
      url: "/speaking",
      icon: Mic,
      isActive: (path) => path === "/speaking",
    },
  ],
  resources: [
    {
      title: "Library",
      url: "/library",
      icon: Library,
      isActive: (path) => path === "/library",
    },
    {
      title: "Vocabulary",
      url: "/vocabulary",
      icon: BookOpen,
      isActive: (path) =>
        path === "/vocabulary" || path.startsWith("/vocabulary-items"),
    },
    {
      title: "Lesson Vocabulary",
      url: "/lesson-vocabulary",
      icon: Link,
      isActive: (path) => path === "/lesson-vocabulary",
    },
  ],
};
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
            <SidebarMenuItem
              v-for="item in navigation.content"
              :key="item.title"
            >
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
            <SidebarMenuItem
              v-for="item in navigation.resources"
              :key="item.title"
            >
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
  </Sidebar>
</template>

<style scoped>
/* Custom styles for active links */
.router-link-active {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
</style>
