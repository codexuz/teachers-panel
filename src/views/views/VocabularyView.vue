<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { vocabularyAPI, courseAPI } from '@/utils/api.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, BookOpen, List, TrendingUp, Tag, Book, Settings, Edit, Trash2 } from 'lucide-vue-next'

const router = useRouter()

// State
const vocabularySets = ref([])
const courses = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const selectedLevel = ref('all')
const selectedCourse = ref('all')
const showCreateModal = ref(false)
const editingSet = ref(null)

// Form data
const vocabularyForm = reactive({
  id: null,
  title: '',
  description: '',
  topic: '',
  level: 'A1',
  course_id: 'none'
})

// Computed
const filteredVocabularySets = computed(() => {
  let result = vocabularySets.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(set =>
      set.title.toLowerCase().includes(query) ||
      set.description?.toLowerCase().includes(query)
    )
  }

  if (selectedLevel.value && selectedLevel.value !== 'all') {
    result = result.filter(set => set.level === selectedLevel.value)
  }

  if (selectedCourse.value && selectedCourse.value !== 'all') {
    result = result.filter(set =>
      set.course_id === selectedCourse.value ||
      String(set.course_id) === String(selectedCourse.value)
    )
  }

  return result
})

const stats = computed(() => {
  const total = vocabularySets.value.length
  const totalWords = vocabularySets.value.reduce((sum, set) => sum + (set.wordCount || 0), 0)
  const avgPerSet = total > 0 ? Math.round(totalWords / total) : 0

  return {
    totalSets: total,
    totalWords,
    avgPerSet
  }
})

// Methods
const loadVocabularySets = async () => {
  loading.value = true
  error.value = null

  try {
    const data = await vocabularyAPI.getAll()
    vocabularySets.value = Array.isArray(data) ? data : (data.data || [])
  } catch (err) {
    console.error('Error loading vocabulary sets:', err)
    error.value = 'Failed to load vocabulary sets'
  } finally {
    loading.value = false
  }
}

const loadCourses = async () => {
  try {
    const data = await courseAPI.getAll()
    courses.value = Array.isArray(data) ? data : (data.data || [])
  } catch (err) {
    console.error('Error loading courses:', err)
    error.value = 'Failed to load courses'
  }
}

const resetForm = () => {
  vocabularyForm.id = null
  vocabularyForm.title = ''
  vocabularyForm.description = ''
  vocabularyForm.topic = ''
  vocabularyForm.level = 'A1'
  vocabularyForm.course_id = 'none'
}

const openCreateModal = () => {
  resetForm()
  editingSet.value = null
  showCreateModal.value = true
}

const editVocabularySet = (set) => {
  Object.assign(vocabularyForm, set)
  editingSet.value = set
  showCreateModal.value = true
}

const closeModal = () => {
  showCreateModal.value = false
  editingSet.value = null
  resetForm()
}

const saveVocabularySet = async () => {
  loading.value = true
  error.value = null

  try {
    const formData = {
      ...vocabularyForm,
      course_id: vocabularyForm.course_id === 'none' ? '' : vocabularyForm.course_id
    }

    if (editingSet.value) {
      // Update existing set
      const updated = await vocabularyAPI.update(formData.id, formData)
      const index = vocabularySets.value.findIndex(s => s.id === formData.id)
      if (index > -1) {
        vocabularySets.value[index] = updated
      }
    } else {
      // Create new set
      const newSet = await vocabularyAPI.create(formData)
      vocabularySets.value.unshift(newSet)
    }

    closeModal()
  } catch (err) {
    console.error('Error saving vocabulary set:', err)
    error.value = 'Failed to save vocabulary set'
  } finally {
    loading.value = false
  }
}

const deleteVocabularySet = async (set) => {
  if (!confirm(`Are you sure you want to delete "${set.title}"?`)) {
    return
  }

  try {
    await vocabularyAPI.delete(set.id)
    const index = vocabularySets.value.findIndex(s => s.id === set.id)
    if (index > -1) {
      vocabularySets.value.splice(index, 1)
    }
  } catch (err) {
    console.error('Error deleting vocabulary set:', err)
    error.value = 'Failed to delete vocabulary set'
  }
}

const getLevelColor = (level) => {
  const colors = {
    'A1': 'bg-green-100 text-green-800',
    'A2': 'bg-blue-100 text-blue-800',
    'B1': 'bg-yellow-100 text-yellow-800',
    'B2': 'bg-orange-100 text-orange-800',
    'C1': 'bg-red-100 text-red-800',
    'C2': 'bg-purple-100 text-purple-800'
  }
  return colors[level] || 'bg-gray-100 text-gray-800'
}

const getCourseNameById = (courseId) => {
  const course = courses.value.find(c =>
    c.id === courseId ||
    c.id === String(courseId) ||
    String(c.id) === String(courseId)
  )
  return course ? (course.name || course.title || 'Unknown Course') : 'No Course'
}

const navigateToVocabularyItems = (setId) => {
  router.push(`/vocabulary-items/${setId}`)
}

// Initialize
onMounted(() => {
  loadVocabularySets()
  loadCourses()
})
</script>

<template>
  <!-- Vocabulary Sets -->
  <div class="p-6">
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold">Vocabulary Sets</h1>
          <p class="text-muted-foreground">Manage vocabulary collections for your lessons</p>
        </div>
        <Button @click="openCreateModal">
          <Plus class="mr-2 h-4 w-4" />
          Create Vocabulary Set
        </Button>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <BookOpen class="text-blue-600 dark:text-blue-400 h-6 w-6" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">Total Sets</p>
              <p class="text-2xl font-bold">{{ stats.totalSets }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center">
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <List class="text-green-600 dark:text-green-400 h-6 w-6" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">Total Words</p>
              <p class="text-2xl font-bold">{{ stats.totalWords.toLocaleString() }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center">
            <div class="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <TrendingUp class="text-yellow-600 dark:text-yellow-400 h-6 w-6" />
            </div>
            <div class="ml-4">
              <p class="text-sm text-muted-foreground">Avg per Set</p>
              <p class="text-2xl font-bold">{{ stats.avgPerSet }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Filter and Search -->
    <Card class="mb-6">
      <CardContent class="pt-6">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="space-y-2">
            <Label>Search</Label>
            <Input
              v-model="searchQuery"
              placeholder="Search vocabulary sets..."
            />
          </div>
          <div class="space-y-2">
            <Label>Course</Label>
            <Select v-model="selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.name || course.title || 'Unnamed Course' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Level</Label>
            <Select v-model="selectedLevel">
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="A1">A1 - Beginner</SelectItem>
                <SelectItem value="A2">A2 - Elementary</SelectItem>
                <SelectItem value="B1">B1 - Intermediate</SelectItem>
                <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                <SelectItem value="C1">C1 - Advanced</SelectItem>
                <SelectItem value="C2">C2 - Proficient</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>

    <!-- Vocabulary Sets Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-if="filteredVocabularySets.length === 0" class="col-span-full text-center py-12">
        <BookOpen class="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-2">No vocabulary sets found</h3>
        <p class="text-muted-foreground">{{ searchQuery ? 'Try adjusting your search criteria' : 'Create your first vocabulary set to get started' }}</p>
      </div>

      <Card
        v-for="set in filteredVocabularySets"
        :key="set.id"
        class="hover:shadow-lg transition-shadow cursor-pointer"
        @click="navigateToVocabularyItems(set.id)"
      >
        <CardHeader>
          <div class="flex items-center justify-between mb-4">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Book class="text-blue-600 dark:text-blue-400 h-6 w-6" />
            </div>
            <Badge :variant="set.level === 'A1' || set.level === 'A2' ? 'default' : set.level === 'B1' || set.level === 'B2' ? 'secondary' : 'destructive'">
              {{ set.level || 'Unknown' }}
            </Badge>
          </div>

          <CardTitle class="text-lg">{{ set.title }}</CardTitle>
          <CardDescription>{{ set.description || 'No description available' }}</CardDescription>
        </CardHeader>

        <CardContent>
          <!-- Topic and Course Info -->
          <div class="mb-4 space-y-1">
            <p v-if="set.topic" class="text-sm text-primary flex items-center">
              <Tag class="h-3 w-3 mr-1" />{{ set.topic }}
            </p>
            <p class="text-sm text-muted-foreground flex items-center">
              <Book class="h-3 w-3 mr-1" />{{ getCourseNameById(set.course_id) }}
            </p>
          </div>

          <div class="text-xs text-muted-foreground mb-4 space-y-1">
            <p>Created: {{ set.createdAt ? new Date(set.createdAt).toLocaleDateString() : 'Unknown' }}</p>
            <p>Last updated: {{ set.updatedAt ? new Date(set.updatedAt).toLocaleDateString() : 'Unknown' }}</p>
          </div>

          <div class="flex gap-2" @click.stop>
            <Button
              class="flex-1"
              size="sm"
              @click="navigateToVocabularyItems(set.id)"
            >
              <Settings class="mr-1 h-4 w-4" />
              Manage
            </Button>
            <Button
              class="flex-1"
              variant="outline"
              size="sm"
              @click="editVocabularySet(set)"
            >
              <Edit class="mr-1 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              @click="deleteVocabularySet(set)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Modal for Create/Edit Vocabulary Set -->
    <Dialog :open="showCreateModal" @update:open="(val) => { if (!val) closeModal() }">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {{ editingSet ? 'Edit Vocabulary Set' : 'Create New Vocabulary Set' }}
          </DialogTitle>
          <DialogDescription>
            {{ editingSet ? 'Update the vocabulary set information' : 'Add a new vocabulary set to your library' }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveVocabularySet" class="space-y-4">
          <div class="space-y-2">
            <Label for="title">Title <span class="text-destructive">*</span></Label>
            <Input
              id="title"
              v-model="vocabularyForm.title"
              required
              placeholder="Enter set title"
            />
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              v-model="vocabularyForm.description"
              rows="3"
              placeholder="Enter description"
            />
          </div>

          <div class="space-y-2">
            <Label for="topic">Topic</Label>
            <Input
              id="topic"
              v-model="vocabularyForm.topic"
              placeholder="e.g., Animals, Food, Transportation"
            />
          </div>

          <div class="space-y-2">
            <Label for="course">Course <span class="text-destructive">*</span></Label>
            <Select v-model="vocabularyForm.course_id" required>
              <SelectTrigger id="course">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Course</SelectItem>
                <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.name || course.title || 'Unnamed Course' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="level">Level <span class="text-destructive">*</span></Label>
            <Select v-model="vocabularyForm.level" required>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A1">A1 - Beginner</SelectItem>
                <SelectItem value="A2">A2 - Elementary</SelectItem>
                <SelectItem value="B1">B1 - Intermediate</SelectItem>
                <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                <SelectItem value="C1">C1 - Advanced</SelectItem>
                <SelectItem value="C2">C2 - Proficient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              @click="closeModal"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :disabled="loading"
            >
              <div v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {{ loading ? 'Saving...' : (editingSet ? 'Update' : 'Create') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
