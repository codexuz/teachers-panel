<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { groupsAPI, courseAPI } from '@/utils/api.js'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  Plus, 
  Settings, 
  BookOpen, 
  AlertCircle,
  RefreshCw
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')
const groups = ref([])
const courses = ref([])
const showModal = ref(false)
const isEditMode = ref(false)
const currentGroup = ref(null)
const isSubmitting = ref(false)

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
    groups.value = response.data || response || []
    error.value = ''
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || 'Unknown error'}`
    console.error('Error fetching groups:', err)
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  form.value = { id: null, name: '', level_id: '' }
  showModal.value = true
  error.value = ''
}

const openEditModal = (group) => {
  isEditMode.value = true
  currentGroup.value = group
  form.value = {
    id: group.id,
    name: group.name,
    level_id: group.level_id
  }
  showModal.value = true
  error.value = ''
}

const closeModal = () => {
  showModal.value = false
  form.value = { id: null, name: '', level_id: '' }
  currentGroup.value = null
  error.value = ''
  isSubmitting.value = false
}

const saveGroup = async () => {
  if (!form.value.name.trim()) {
    error.value = 'Group name is required'
    return
  }

  if (!form.value.level_id) {
    error.value = 'Please select a course'
    return
  }

  isSubmitting.value = true
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
    isSubmitting.value = false
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold tracking-tight">Group Management</h2>
        <p class="text-muted-foreground">Manage your teaching groups and students</p>
      </div>
      
      <!-- Create Group Button -->
      <Dialog v-model:open="showModal">
        <DialogTrigger asChild>
          <Button @click="openCreateModal">
            <Plus class="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{{ isEditMode ? 'Edit Group' : 'Create New Group' }}</DialogTitle>
            <DialogDescription>
              {{ isEditMode ? 'Update the group details below.' : 'Add a new group to manage students.' }}
            </DialogDescription>
          </DialogHeader>
          
          <div class="grid gap-4 py-4">
            <div class="grid gap-2">
              <Label for="name">Group Name</Label>
              <Input
                id="name"
                v-model="form.name"
                placeholder="Enter group name"
              />
            </div>
            <div class="grid gap-2">
              <Label for="course">Course</Label>
              <Select v-model="form.level_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem 
                    v-for="course in courses" 
                    :key="course.id" 
                    :value="course.id"
                  >
                    {{ course.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Alert v-if="error" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>{{ error }}</AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button variant="outline" @click="closeModal">Cancel</Button>
            <Button @click="saveGroup" :disabled="isSubmitting">
              <RefreshCw v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              {{ isEditMode ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error && !showModal" variant="destructive">
      <AlertCircle class="h-4 w-4" />
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Loading State -->
    <div v-if="isLoading && groups.length === 0" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card v-for="i in 6" :key="i">
        <CardHeader>
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-3 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-12 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton class="h-8 w-20" />
        </CardFooter>
      </Card>
    </div>

    <!-- No Groups State -->
    <Card v-else-if="!isLoading && groups.length === 0" class="text-center py-12">
      <CardContent>
        <Users class="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <CardTitle class="mb-2">No groups yet</CardTitle>
        <CardDescription class="mb-4">
          Create your first group to start managing students
        </CardDescription>
        <Button @click="openCreateModal">
          <Plus class="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </CardContent>
    </Card>

    <!-- Active Groups -->
    <div v-else-if="activeGroups.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Active Groups</h3>
        <Badge variant="secondary">{{ activeGroups.length }}</Badge>
      </div>
      
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="group in activeGroups" :key="group.id" class="hover:shadow-md transition-shadow">
          <CardHeader>
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <CardTitle class="text-lg">{{ group.name }}</CardTitle>
                <CardDescription>
                  {{ getCourseName(group.level_id) }}
                </CardDescription>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div class="flex items-center gap-4 text-sm text-muted-foreground">
              <div class="flex items-center gap-1">
                <Users class="h-4 w-4" />
                <span>{{ getStudentCount(group) }} students</span>
              </div>
              <div class="flex items-center gap-1">
                <BookOpen class="h-4 w-4" />
                <span>Course Level</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter class="gap-2">
            <Button @click="manageGroup(group)" size="sm" class="flex-1">
              <Settings class="h-4 w-4 mr-2" />
              Manage
            </Button>
            <Button @click="openEditModal(group)" variant="outline" size="sm">
              Edit
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>

    <!-- Inactive Groups -->
    <div v-if="inactiveGroups.length > 0" class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Inactive Groups</h3>
        <Badge variant="outline">{{ inactiveGroups.length }}</Badge>
      </div>
      
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card v-for="group in inactiveGroups" :key="group.id" class="opacity-75">
          <CardHeader>
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <CardTitle class="text-lg">{{ group.name }}</CardTitle>
                <CardDescription>
                  {{ getCourseName(group.level_id) }}
                </CardDescription>
              </div>
              <Badge variant="secondary">Inactive</Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div class="flex items-center gap-4 text-sm text-muted-foreground">
              <div class="flex items-center gap-1">
                <Users class="h-4 w-4" />
                <span>{{ getStudentCount(group) }} students</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter class="gap-2">
            <Button @click="manageGroup(group)" variant="outline" size="sm" class="flex-1">
              <Settings class="h-4 w-4 mr-2" />
              Manage
            </Button>
            <Button @click="openEditModal(group)" variant="ghost" size="sm">
              Edit
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional responsive styles if needed */
</style>