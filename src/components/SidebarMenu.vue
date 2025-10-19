<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.js";

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await authStore.logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      authStore.clearAuth();
      router.push("/login");
    }
  }
};
</script>

<template>
  <!-- Sidebar -->
  <aside
    class="w-64 bg-white shadow-md fixed top-10 pb-16 left-0 h-screen overflow-y-auto"
  >
    <nav class="mt-6">
      <div class="px-6 py-2">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Main
        </h2>
      </div>
      <div class="mt-2">
        <router-link
          to="/dashboard"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/dashboard' || $route.path === '/'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-home mr-3"></i>
          Dashboard
        </router-link>
        <router-link
          to="/groups"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/groups'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-layer-group mr-3"></i>
          Groups
        </router-link>
        <router-link
          to="/group-assignment"
          class="flex items-center px-6 py-3"
          :class="
            $route.path.startsWith('/group-assignment')
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-tasks mr-3"></i>
          Group Units
        </router-link>
        <router-link
          to="/group-homework"
          class="flex items-center px-6 py-3"
          :class="
            $route.path.startsWith('/group-homework')
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-pencil-alt mr-3"></i>
          Group Homework
        </router-link>
        <!----
                    <router-link to="/exams" class="flex items-center px-6 py-3"
                        :class="$route.path === '/exams' ? 'text-white bg-blue-600' : 'text-gray-700 hover:bg-gray-50'">
                        <i class="fas fa-file-alt mr-3"></i>
                        Exams
                    </router-link>
                    -->
      </div>
      <div class="px-6 py-2 mt-6">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Content Management
        </h2>
      </div>
      <div class="mt-2">
        <router-link
          to="/courses"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/courses'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-graduation-cap mr-3"></i>
          Courses
        </router-link>
        <router-link
          to="/units"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/units'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-layer-group mr-3"></i>
          Units
        </router-link>
        <router-link
          to="/lessons"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/lessons'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-book mr-3"></i>
          Lessons
        </router-link>
        <router-link
          to="/lesson-contents"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/lesson-contents'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-play-circle mr-3"></i>
          Lesson Contents
        </router-link>
        <router-link
          to="/exercises"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/exercises'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-dumbbell mr-3"></i>
          Exercises
        </router-link>
        <router-link
          to="/speaking"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/speaking'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-microphone mr-3"></i>
          Speaking
        </router-link>
      </div>
      <div class="px-6 py-2 mt-6">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Resources
        </h2>
      </div>
      <div class="mt-2">
        <!------
                    <router-link to="/messages" class="flex items-center px-6 py-3"
                        :class="$route.path === '/messages' ? 'text-white bg-blue-600' : 'text-gray-700 hover:bg-gray-50'">
                        <i class="fas fa-comments mr-3"></i>
                        Chat
                    </router-link>

                    --->
        <router-link
          to="/library"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/library'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-book-open mr-3"></i>
          Library
        </router-link>
        <router-link
          to="/vocabulary"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/vocabulary' ||
            $route.path.startsWith('/vocabulary-items')
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-book-open mr-3"></i>
          Vocabulary
        </router-link>
        <router-link
          to="/lesson-vocabulary"
          class="flex items-center px-6 py-3"
          :class="
            $route.path === '/lesson-vocabulary'
              ? 'text-white bg-blue-600'
              : 'text-gray-700 hover:bg-gray-50'
          "
        >
          <i class="fas fa-link mr-3"></i>
          Lesson Vocabulary
        </router-link>
      </div>

      <!-- User Account Section -->
      <div class="px-6 py-2 mt-6">
        <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Account
        </h2>
      </div>
      <div class="mt-2">
        <div class="px-6 py-3 text-gray-700">
          <div class="flex items-center mb-2">
            <i class="fas fa-user-circle mr-3 text-lg"></i>
            <div class="text-sm">
              <div class="font-medium">
                {{ authStore.userName || "Teacher" }}
              </div>
              <div class="text-gray-500 text-xs">
                {{
                  authStore.userPhone ||
                  authStore.userEmail ||
                  "No contact info"
                }}
              </div>
            </div>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <i class="fas fa-sign-out-alt mr-3"></i>
          Logout
        </button>
      </div>
    </nav>
  </aside>
</template>
