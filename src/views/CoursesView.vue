<template>
  <div class="max-w-6xl mx-auto p-6 bg-white min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg mb-6">
      <h1 class="text-3xl font-bold mb-2">Courses Management</h1>
      <p class="text-blue-100">Create and manage your courses</p>
    </div>

    <!-- Actions Bar -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <button
          @click="showCreateModal = true"
          class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m12 5v14m-7-7h14"/>
          </svg>
          Add Course
        </button>
        <button
          @click="loadCourses"
          :disabled="loading"
          class="bg-blue-600 text-white px-6 flex items-center py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          Refresh
        </button>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search courses..."
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-400 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span class="text-red-700">{{ error }}</span>
        <button @click="error = null" class="ml-auto text-red-400 hover:text-red-600">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Courses Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="filteredCourses.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <p class="text-lg font-medium mb-2">No courses found</p>
                <p class="text-sm">{{ searchQuery ? 'Try adjusting your search terms' : 'Create your first course to get started' }}</p>
              </td>
            </tr>
            <tr v-for="course in filteredCourses" :key="course.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-12 w-12">
                    <img v-if="course.imageUrl" :src="course.imageUrl" :alt="course.title" class="h-12 w-12 rounded-lg object-cover" @error="$event.target.style.display = 'none'">
                    <div v-else class="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ course.title }}</div>
                    <div class="text-sm text-gray-500 max-w-xs truncate">{{ course.description || 'No description' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getLevelColor(course.level)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : 'Unknown' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="course.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ course.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ course.unitCount || 0 }} units
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                  <button
                    @click="editCourse(course)"
                    class="text-blue-600 hover:text-blue-900 p-1"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M7 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-1"/>
                      <path d="M20.385 6.585a2.1 2.1 0 0 0-2.97-2.97L9 12v3h3l8.385-8.415z"/>
                      <path d="m16 5 3 3"/>
                    </svg>
                  </button>
                  <button
                    @click="toggleStatus(course)"
                    :class="course.isActive ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'"
                    class="p-1"
                    :title="course.isActive ? 'Deactivate' : 'Activate'"
                  >
                    <svg v-if="course.isActive" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 9V6a4 4 0 1 1 8 0v3"/>
                      <rect x="8" y="9" width="12" height="9" rx="2"/>
                    </svg>
                    <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="8" y="9" width="12" height="9" rx="2"/>
                      <path d="M16 9V6a4 4 0 0 0-8 0v3"/>
                    </svg>
                  </button>
                  <button
                    @click="deleteCourse(course)"
                    class="text-red-600 hover:text-red-900 p-1"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" x2="10" y1="11" y2="17"/>
                      <line x1="14" x2="14" y1="11" y2="17"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingCourse" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold">{{ editingCourse ? 'Edit Course' : 'Create New Course' }}</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" x2="6" y1="6" y2="18"/>
                <line x1="6" x2="18" y1="6" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6">
          <form @submit.prevent="saveCourse" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                v-model="courseForm.title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter course title"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                v-model="courseForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter course description"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Level</label>
              <select
                v-model="courseForm.level"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                v-model="courseForm.imageUrl"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="courseForm.isActive"
                  class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span class="ml-2 text-sm text-gray-700">Course is active</span>
              </label>
            </div>
            <div class="flex justify-end gap-2 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
              >
                {{ loading ? 'Saving...' : (editingCourse ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { courseAPI } from '@/utils/api.js'

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

// Helper function for level colors
const getLevelColor = (level) => {
  const colors = {
    A1: 'bg-green-100 text-green-800',
    A2: 'bg-yellow-100 text-yellow-800',
    B1: 'bg-red-100 text-red-800',
    B2: 'bg-blue-100 text-blue-800'
  }
  return colors[level] || 'bg-gray-100 text-gray-800'
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
