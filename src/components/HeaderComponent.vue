<script setup>
import { useAuthStore } from '@/stores/auth.js'

const authStore = useAuthStore()
</script>

<template>
   <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="flex items-center justify-between px-6 py-4">
            <h1 class="text-2xl font-bold text-gray-800">Impulse Study</h1>
            <div class="flex items-center space-x-4">
                <div class="relative">
                    <i class="fas fa-bell text-gray-600 text-xl cursor-pointer hover:text-blue-600"></i>
                    <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                </div>
                <div class="flex items-center space-x-2">
                    <img src="https://i.pravatar.cc/300" alt="Profile" class="w-8 h-8 rounded-full">
                    <span class="text-gray-700">{{ authStore.userName || 'Teacher' }}</span>
                    <i class="fas fa-chevron-down text-gray-500"></i>
                </div>
            </div>
        </div>
    </header>
</template>
