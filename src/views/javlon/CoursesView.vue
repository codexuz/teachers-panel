<template>
  <div class="container mx-auto p-4 sm:p-6 max-w-6xl">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Courses Management</h1>
          <p class="text-muted-foreground">Create and manage your courses</p>
        </div>
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <Button
          @click="showCreateModal = true"
          variant="default"
          class="flex items-center gap-2"
        >
          <Plus class="h-4 w-4" />
          Add Course
        </Button>
        <Button
          @click="loadCourses"
          :disabled="loading"
          variant="outline"
          class="flex items-center gap-2"
        >
          <RefreshCcw class="h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div class="relative w-full sm:w-auto">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search courses..."
          class="w-full sm:w-64 pl-9"
        />
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mb-6">
      <Alert variant="destructive" class="flex items-start">
        <AlertCircle class="h-4 w-4 mr-2 mt-0.5" />
        <div class="flex-1">
          <AlertDescription>{{ error }}</AlertDescription>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="error = null">
          <X class="h-4 w-4" />
        </Button>
      </Alert>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-12 w-12 text-primary animate-spin" />
    </div>

    <!-- Courses Table -->
    <div v-else class="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Units</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="filteredCourses.length === 0">
            <TableCell colspan="6" class="h-64 text-center">
              <div class="flex flex-col items-center justify-center text-center p-4">
                <BookOpen class="h-12 w-12 text-muted-foreground/70" />
                <h3 class="mt-4 text-lg font-medium">No courses found</h3>
                <p class="text-sm text-muted-foreground">
                  {{ searchQuery ? 'Try adjusting your search terms' : 'Create your first course to get started' }}
                </p>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-for="course in filteredCourses" :key="course.id" class="hover:bg-muted/50">
            <TableCell>
              <div class="flex items-center">
                <div class="flex-shrink-0 h-12 w-12">
                  <img v-if="course.imageUrl" :src="course.imageUrl" :alt="course.title" class="h-12 w-12 rounded-lg object-cover" @error="$event.target.style.display = 'none'">
                  <div v-else class="h-12 w-12 rounded-lg bg-zinc-900 flex items-center justify-center">
                    <BookOpen class="w-6 h-6 text-white" />
                  </div>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium">{{ course.title }}</div>
                  <div class="text-sm text-muted-foreground max-w-xs truncate">{{ course.description || 'No description' }}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="getStatusVariant(course.level)">
                {{ course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'Unknown' }}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge :variant="course.isActive ? 'success' : 'secondary'">
                {{ course.isActive ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">
              {{ course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Unknown' }}
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">
              {{ course.unitCount || 0 }} units
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" @click="editCourse(course)" title="Edit">
                  <Pencil class="h-4 w-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="icon" @click="toggleStatus(course)" :title="course.isActive ? 'Deactivate' : 'Activate'">
                  <Lock v-if="course.isActive" class="h-4 w-4 text-gray-600" />
                  <Unlock v-else class="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" @click="deleteCourse(course)" title="Delete">
                  <Trash2 class="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create/Edit Modal -->
    <Dialog :open="showCreateModal || editingCourse !== null" @update:open="(val) => !val && closeModal()">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ editingCourse ? 'Edit Course' : 'Create New Course' }}</DialogTitle>
          <DialogDescription>
            {{ editingCourse ? 'Update the details of your course' : 'Add a new course to your curriculum' }}
          </DialogDescription>
        </DialogHeader>
        
        <form @submit.prevent="saveCourse" class="space-y-4">
          <div class="space-y-2">
            <Label for="title">Title</Label>
            <Input
              id="title"
              type="text"
              v-model="courseForm.title"
              required
              placeholder="Enter course title"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              v-model="courseForm.description"
              rows="3"
              placeholder="Enter course description"
            />
          </div>
          
          <div class="space-y-2">
            <Label for="level">Level</Label>
            <Select v-model="courseForm.level">
              <SelectTrigger>
                <SelectValue placeholder="Select a level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A1">A1</SelectItem>
                <SelectItem value="A2">A2</SelectItem>
                <SelectItem value="B1">B1</SelectItem>
                <SelectItem value="B2">B2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div class="space-y-2">
            <Label for="image-url">Image URL</Label>
            <Input
              id="image-url"
              type="url"
              v-model="courseForm.imageUrl"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          
          <div class="flex items-center space-x-2">
            <Checkbox id="is-active" v-model="courseForm.isActive" />
            <Label for="is-active" class="text-sm font-normal cursor-pointer">
              Course is active
            </Label>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">
              Cancel
            </Button>
            <Button type="submit" :disabled="loading">
              <div v-if="loading" class="flex items-center">
                <Loader2 class="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </div>
              <span v-else>{{ editingCourse ? 'Update' : 'Create' }}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { courseAPI } from '@/utils/api.js'

// Import shadcn components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

// Import Lucide icons
import { 
  Plus, 
  RefreshCcw, 
  X, 
  Search, 
  AlertCircle, 
  Pencil, 
  Trash2, 
  Unlock, 
  Lock,
  BookOpen,
  Loader2
} from 'lucide-vue-next'

// State
const courses = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const showCreateModal = ref(false)
const editingCourse = ref(null)

// Form data
const courseForm = reactive({
  id: null,
  title: '',
  description: '',
  imageUrl: '',
  level: 'A1', // Add level field with default value
  isActive: true
})

// Computed
const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses.value

  const query = searchQuery.value.toLowerCase()
  return courses.value.filter(course =>
    course.title.toLowerCase().includes(query) ||
    course.description?.toLowerCase().includes(query)
  )
})

// Helper function for badge variants
const getStatusVariant = (level) => {
  const variants = {
    A1: 'success',
    A2: 'warning',
    B1: 'destructive',
    B2: 'primary'
  }
  return variants[level] || 'secondary'
}

// Methods
const loadCourses = async () => {
  loading.value = true
  error.value = null

  try {
    const data = await courseAPI.getAll()
    courses.value = data
  } catch (err) {
    console.error('Error loading courses:', err)
    error.value = 'Failed to load courses'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  courseForm.id = null
  courseForm.title = ''
  courseForm.description = ''
  courseForm.imageUrl = ''
  courseForm.level = 'A1'
  courseForm.isActive = true
}

const editCourse = (course) => {
  Object.assign(courseForm, course)
  editingCourse.value = course
  showCreateModal.value = false
}

const closeModal = () => {
  showCreateModal.value = false
  editingCourse.value = null
  resetForm()
}

const saveCourse = async () => {
  loading.value = true
  error.value = null

  try {
    if (editingCourse.value) {
      // Update existing course
      const updated = await courseAPI.update(courseForm.id, courseForm)
      const index = courses.value.findIndex(c => c.id === courseForm.id)
      if (index > -1) {
        courses.value[index] = updated
      }
    } else {
      // Create new course
      const newCourse = await courseAPI.create(courseForm)
      courses.value.unshift(newCourse)
    }

    closeModal()
  } catch (err) {
    console.error('Error saving course:', err)
    error.value = 'Failed to save course'
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (course) => {
  try {
    const updated = await courseAPI.update(course.id, {
      ...course,
      isActive: !course.isActive
    })

    const index = courses.value.findIndex(c => c.id === course.id)
    if (index > -1) {
      courses.value[index] = updated
    }
  } catch (err) {
    console.error('Error updating course status:', err)
    error.value = 'Failed to update course status'
  }
}

const deleteCourse = async (course) => {
  if (!confirm(`Are you sure you want to delete "${course.title}"?`)) {
    return
  }

  try {
    await courseAPI.delete(course.id)
    const index = courses.value.findIndex(c => c.id === course.id)
    if (index > -1) {
      courses.value.splice(index, 1)
    }
  } catch (err) {
    console.error('Error deleting course:', err)
    error.value = 'Failed to delete course'
  }
}

// Initialize
onMounted(() => {
  loadCourses()
})
</script>