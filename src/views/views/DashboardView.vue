<script setup>
import { RouterView } from 'vue-router'
import { ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

const isMobile = ref(false)

// Check if mobile on mount and handle resize
import { onMounted, onUnmounted } from 'vue'

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <SidebarProvider :defaultOpen="!isMobile">
    <AppSidebar />
    <SidebarInset>
      <AppHeader />
      <div class="flex flex-1 flex-col gap-4 p-4 pt-0 min-h-[calc(100vh-4rem)]">
        <div class="flex-1 rounded-xl bg-muted/50 p-4">
          <RouterView />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>

<style scoped>
/* Add any custom styles if needed */
</style>
