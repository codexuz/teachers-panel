<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { vocabularyAPI, courseAPI } from '@/utils/api.js'

const router = useRouter()

// State
const vocabularySets = ref([])
const courses = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const selectedLevel = ref('')
const selectedCourse = ref('')
const showCreateModal = ref(false)
const editingSet = ref(null)

// Form data
const vocabularyForm = reactive({
  id: null,
  title: '',
  description: '',
  topic: '',
  level: 'A1',
  course_id: ''
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

  if (selectedLevel.value) {
    result = result.filter(set => set.level === selectedLevel.value)
  }

  if (selectedCourse.value) {
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
  vocabularyForm.course_id = ''
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
    if (editingSet.value) {
      // Update existing set
      const updated = await vocabularyAPI.update(vocabularyForm.id, vocabularyForm)
      const index = vocabularySets.value.findIndex(s => s.id === vocabularyForm.id)
      if (index > -1) {
        vocabularySets.value[index] = updated
      }
    } else {
      // Create new set
      const newSet = await vocabularyAPI.create(vocabularyForm)
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
          <h1 class="text-2xl font-bold text-gray-900">Vocabulary Sets</h1>``
          <p class="text-gray-600">Manage vocabulary collections for your lessons</p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>Create Vocabulary Set
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center">
          <div class="p-3 bg-blue-500 rounded-full">
            <i class="fas fa-book-open text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">Total Sets</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.totalSets }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center">
          <div class="p-3 bg-green-500 rounded-full">
            <i class="fas fa-list text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">Total Words</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.totalWords.toLocaleString() }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-500 rounded-full">
            <i class="fas fa-chart-line text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-600">Avg per Set</p>
            <p class="text-2xl font-bold text-gray-800">{{ stats.avgPerSet }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter and Search -->
    <div class="bg-white rounded-lg shadow mb-6">
      <div class="p-6 border-b border-gray-200">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search vocabulary sets..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              v-model="selectedCourse"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Courses</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name || course.title || 'Unnamed Course' }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              v-model="selectedLevel"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
              <option value="C2">C2 - Proficient</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Vocabulary Sets Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-if="filteredVocabularySets.length === 0" class="col-span-full text-center py-12">
        <div class="text-gray-400 mb-4">
          <i class="fas fa-book-open text-6xl"></i>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No vocabulary sets found</h3>
        <p class="text-gray-500">{{ searchQuery ? 'Try adjusting your search criteria' : 'Create your first vocabulary set to get started' }}</p>
      </div>

      <div
        v-for="set in filteredVocabularySets"
        :key="set.id"
        class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
        @click="navigateToVocabularyItems(set.id)"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-blue-100 rounded-full">
            <i class="fas fa-book text-blue-600 text-xl"></i>
          </div>
          <span :class="getLevelColor(set.level) + ' px-2 py-1 text-xs font-medium rounded-full'">
            {{ set.level || 'Unknown' }}
          </span>
        </div>

        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ set.title }}</h3>
        <p class="text-gray-600 text-sm mb-2">{{ set.description || 'No description available' }}</p>

        <!-- Topic and Course Info -->
        <div class="mb-4 space-y-1">
          <p v-if="set.topic" class="text-sm text-blue-600">
            <i class="fas fa-tag mr-1"></i>{{ set.topic }}
          </p>
          <p class="text-sm text-gray-500">
            <i class="fas fa-book mr-1"></i>{{ getCourseNameById(set.course_id) }}
          </p>
        </div>



        <div class="text-xs text-gray-400 mb-4">
          <p>Created: {{ set.createdAt ? new Date(set.createdAt).toLocaleDateString() : 'Unknown' }}</p>
          <p>Last updated: {{ set.updatedAt ? new Date(set.updatedAt).toLocaleDateString() : 'Unknown' }}</p>
        </div>

        <div class="flex space-x-2" @click.stop>
          <button
            class="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm"
            @click="navigateToVocabularyItems(set.id)"
          >
            <i class="fas fa-cog mr-1"></i>Manage
          </button>
          <button
            class="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-300 text-sm"
            @click="editVocabularySet(set)"
          >
            <i class="fas fa-edit mr-1"></i>Edit
          </button>
          <button
            class="bg-red-100 text-red-600 py-2 px-3 rounded-lg hover:bg-red-200 text-sm"
            @click="deleteVocabularySet(set)"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal for Create/Edit Vocabulary Set -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">
          {{ editingSet ? 'Edit Vocabulary Set' : 'Create New Vocabulary Set' }}
        </h3>

        <form @submit.prevent="saveVocabularySet">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              v-model="vocabularyForm.title"
              type="text"
              class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              v-model="vocabularyForm.description"
              rows="3"
              class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Topic</label>
            <input
              v-model="vocabularyForm.topic"
              type="text"
              class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Animals, Food, Transportation"
            />
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Course <span class="text-red-500">*</span></label>
            <select
              v-model="vocabularyForm.course_id"
              class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Course</option>
              <option v-for="course in courses" :key="course.id" :value="course.id">
                {{ course.name || course.title || 'Unnamed Course' }}
              </option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Level <span class="text-red-500">*</span></label>
            <select
              v-model="vocabularyForm.level"
              class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Level</option>
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
              <option value="C2">C2 - Proficient</option>
            </select>
          </div>

          <div class="flex space-x-3">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? 'Saving...' : (editingSet ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
