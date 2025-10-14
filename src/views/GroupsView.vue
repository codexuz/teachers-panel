<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { groupsAPI, courseAPI } from '@/utils/api.js'

// Shadcn Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Lucide Icons
import { Plus, Users, Settings, Edit, X } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')
const groups = ref([])
const courses = ref([])
const showModal = ref(false)
const isEditMode = ref(false)
const currentGroup = ref(null)

// Form data
const form = ref({
  id: null,
  name: '',
  level_id: ''
})

// Computed properties
const activeGroups = computed(() => {
  return groups.value.filter(group => group.is_active !== false)
})

const inactiveGroups = computed(() => {
  return groups.value.filter(group => group.is_active === false)
})

const getCourseName = (levelId) => {
  const course = courses.value.find(c => c.id === levelId)
  return course ? course.name : 'Unknown Course'
}

// Functions
const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll()
    courses.value = response.data || response
  } catch (err) {
    console.error('Error fetching courses:', err)
  }
}

const fetchGroups = async () => {
  if (!authStore.userId) {
    error.value = 'User not authenticated'
    return
  }

  isLoading.value = true
  try {
    const response = await groupsAPI.getByTeacherId(authStore.userId)
    const groupsData = response.data || response
    groups.value = Array.isArray(groupsData) ? groupsData : []
    error.value = ''
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || 'Unknown error'}`
    console.error('Error fetching groups:', err)
    groups.value = []
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  form.value = {
    id: null,
    name: '',
    level_id: ''
  }
  showModal.value = true
}

const openEditModal = (group) => {
  isEditMode.value = true
  currentGroup.value = group
  form.value = {
    id: group.id,
    name: group.name || '',
    level_id: group.level_id || ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  currentGroup.value = null
}

const saveGroup = async () => {
  if (!form.value.name) {
    error.value = 'Please enter a group name'
    return
  }

  if (!form.value.level_id) {
    error.value = 'Please select a course'
    return
  }

  isLoading.value = true
  try {
    const groupData = {
      name: form.value.name,
      teacher_id: authStore.userId,
      level_id: form.value.level_id
    }

    if (isEditMode.value) {
      const response = await groupsAPI.update(form.value.id, groupData)
      const updatedGroup = response.data || response
      const index = groups.value.findIndex(g => g.id === form.value.id)
      if (index !== -1) {
        groups.value[index] = { ...groups.value[index], ...updatedGroup }
      }
    } else {
      const response = await groupsAPI.create(groupData)
      const newGroup = response.data || response
      if (newGroup && newGroup.id) {
        groups.value.push(newGroup)
      }
    }

    closeModal()
    error.value = ''
  } catch (err) {
    error.value = `Failed to save group: ${err.message || 'Unknown error'}`
    console.error('Error saving group:', err)
  } finally {
    isLoading.value = false
  }
}



const manageGroup = (group) => {
  router.push(`/groups/${group.id}/manage`)
}

const getStudentCount = (group) => {
  return group.students?.length || 0
}

// Lifecycle
onMounted(() => {
  fetchCourses()
  fetchGroups()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 sm:p-6 border-b bg-background">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Group Management</h1>
          <p class="text-muted-foreground">Manage your teaching groups and students</p>
        </div>
        
        <Dialog v-model:open="showModal">
          <DialogTrigger asChild>
            <Button @click="openCreateModal" class="flex items-center gap-2">
              <Plus class="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-4 sm:p-6">
      <!-- Error Alert -->
      <div v-if="error" class="mb-6">
        <Alert variant="destructive">
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && groups.length === 0" class="flex flex-col items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p class="text-muted-foreground">Loading groups...</p>
      </div>

      <!-- No Groups State -->
      <Card v-else-if="!isLoading && groups.length === 0" class="text-center py-12">
        <CardContent class="pt-6">
          <Users class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle class="mb-2">No groups yet</CardTitle>
          <CardDescription class="mb-4">Create your first group to start managing students</CardDescription>
          <Button @click="openCreateModal" class="flex items-center gap-2 mx-auto">
            <Plus class="h-4 w-4" />
            Create Group
          </Button>
        </CardContent>
      </Card>

      <!-- Groups Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card v-for="group in groups" :key="group.id" class="hover:shadow-md transition-shadow">
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div class="p-2 rounded-full bg-primary/10">
                <Users class="h-5 w-5 text-primary" />
              </div>
              <Badge :variant="group.is_active !== false ? 'default' : 'destructive'">
                {{ group.is_active !== false ? 'Active' : 'Inactive' }}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent class="pt-0">
            <CardTitle class="text-lg mb-1">{{ group.name }}</CardTitle>
            <CardDescription class="mb-4">{{ getCourseName(group.level_id) }}</CardDescription>

            <div class="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <div class="flex items-center gap-1">
                <Users class="h-3 w-3" />
                {{ getStudentCount(group) }} Students
              </div>
              <span class="text-primary text-xs">{{ getCourseName(group.level_id) }}</span>
            </div>

            <div class="flex gap-2">
              <Button
                @click="manageGroup(group)"
                class="flex-1"
                size="sm"
              >
                <Settings class="h-4 w-4 mr-1" />
                Manage
              </Button>
              <Button
                @click="openEditModal(group)"
                variant="outline"
                size="sm"
                class="flex-1"
              >
                <Edit class="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Create/Edit Group Dialog -->
    <Dialog v-model:open="showModal">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ isEditMode ? 'Edit Group' : 'Create New Group' }}</DialogTitle>
          <DialogDescription>
            {{ isEditMode ? 'Update the group details below.' : 'Create a new group for your students.' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveGroup" class="space-y-4">
          <div class="space-y-2">
            <Label for="group-name">
              Group Name <span class="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              v-model="form.name"
              type="text"
              placeholder="Enter group name"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="course-select">
              Course <span class="text-destructive">*</span>
            </Label>
            <Select v-model="form.level_id" required>
              <SelectTrigger id="course-select">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">
              Cancel
            </Button>
            <Button type="submit" :disabled="isLoading">
              <div v-if="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              {{ isEditMode ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
