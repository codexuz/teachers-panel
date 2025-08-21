<script setup>
import { RouterView } from 'vue-router'
import Sidebar from '../components/SidebarMenu.vue'
import HeaderComponent from '@/components/HeaderComponent.vue';
</script>

<template>
  <div class="flex bg-gray-50 relative min-h-screen">
    <Sidebar />
    <HeaderComponent class="fixed top-0 w-full right-0 z-10"/>
    <main class="flex-1 overflow-auto ml-64 mt-16">
      <div class="p-6">
        <RouterView />
      </div>
    </main>
  </div>
</template>
