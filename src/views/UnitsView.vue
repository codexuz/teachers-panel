<template>
  <div class="max-w-6xl mx-auto p-6 bg-white min-h-screen">
    <!-- Header -->
    <div class="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg mb-6">
      <h1 class="text-3xl font-bold mb-2">Units Management</h1>
      <p class="text-green-100">Organize course content into units</p>
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
          Add Unit
        </button>
        <button
          @click="exportToCSV"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Export CSV
        </button>
        <button
          @click="openImportModal"
          class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Import CSV
        </button>
        <button
          @click="loadUnits"
          :disabled="loading"
          class="bg-gray-600 text-white px-6 flex items-center py-2 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
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
      <div class="flex items-center gap-4">
        <!-- Course Filter -->
        <select
          v-model="selectedCourseId"
          @change="loadUnits"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Courses</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.title }}
          </option>
        </select>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search units..."
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
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>

    <!-- Units Table -->
    <div v-else class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessons</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="paginatedUnits.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <p class="text-lg font-medium mb-2">No units found</p>
                <p class="text-sm">{{ searchQuery ? 'Try adjusting your search terms' : 'Create your first unit to get started' }}</p>
              </td>
            </tr>
            <tr v-for="unit in paginatedUnits" :key="unit.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ unit.title }}</div>
                  <div class="text-sm text-gray-500 max-w-xs truncate">{{ unit.description || 'No description' }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getCourseTitle(unit.courseId) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {{ unit.order }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="unit.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ unit.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ unit.lessonCount || 0 }} lessons
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end gap-2">
                  <button
                    @click="editUnit(unit)"
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
                    @click="toggleStatus(unit)"
                    :class="unit.isActive ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'"
                    class="p-1"
                    :title="unit.isActive ? 'Deactivate' : 'Activate'"
                  >
                    <svg v-if="unit.isActive" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 9V6a4 4 0 1 1 8 0v3"/>
                      <rect x="8" y="9" width="12" height="9" rx="2"/>
                    </svg>
                    <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="8" y="9" width="12" height="9" rx="2"/>
                      <path d="M16 9V6a4 4 0 0 0-8 0v3"/>
                    </svg>
                  </button>
                  <button
                    @click="deleteUnit(unit)"
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

    <!-- Pagination Controls -->
    <div v-if="filteredUnits.length > 0" class="mt-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="text-sm text-gray-700">
          Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredUnits.length) }} of {{ filteredUnits.length }} units
        </div>
        <select
          v-model="itemsPerPage"
          @change="currentPage = 1"
          class="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option :value="5">5 per page</option>
          <option :value="10">10 per page</option>
          <option :value="20">20 per page</option>
          <option :value="50">50 per page</option>
        </select>
      </div>

      <div class="flex items-center gap-1">
        <!-- Previous Button -->
        <button
          @click="previousPage"
          :disabled="currentPage === 1"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
        </button>

        <!-- Page Numbers -->
        <template v-for="page in getPageNumbers()" :key="page">
          <button
            v-if="page !== '...'"
            @click="goToPage(page)"
            :class="currentPage === page
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
            class="px-3 py-2 text-sm border rounded-md min-w-[40px]"
          >
            {{ page }}
          </button>
          <span v-else class="px-2 py-2 text-gray-500">...</span>
        </template>

        <!-- Next Button -->
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingUnit" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-semibold">{{ editingUnit ? 'Edit Unit' : 'Create New Unit' }}</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" x2="6" y1="6" y2="18"/>
                <line x1="6" x2="18" y1="6" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="p-6">
          <form @submit.prevent="saveUnit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Course *</label>
              <select
                v-model="unitForm.courseId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a course</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.title }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                v-model="unitForm.title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter unit title"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                v-model="unitForm.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter unit description"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Order</label>
              <input
                type="number"
                v-model.number="unitForm.order"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Unit order (1, 2, 3...)"
              />
            </div>
            <div>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  v-model="unitForm.isActive"
                  class="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                />
                <span class="ml-2 text-sm text-gray-700">Unit is active</span>
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
                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
              >
                {{ loading ? 'Saving...' : (editingUnit ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Import Modal -->
  <div v-if="showImportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Import Units from CSV</h3>

      <div
        @dragover.prevent
        @dragenter.prevent
        @drop="handleDrop"
        class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4 hover:border-blue-400 transition"
      >
        <div class="mb-4">
          <svg class="w-12 h-12 mx-auto text-gray-400 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          <p class="text-gray-600">Drop your CSV file here or</p>
        </div>
        <button
          @click="$refs.csvFileInput.click()"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Choose File
        </button>
        <input
          ref="csvFileInput"
          type="file"
          accept=".csv"
          @change="handleFileSelect"
          class="hidden"
        >
      </div>

      <div v-if="csvFile" class="mb-4 p-3 bg-gray-50 rounded">
        <p class="text-sm text-gray-600">Selected file: {{ csvFile.name }}</p>
      </div>

      <div class="mb-4">
        <h4 class="font-medium mb-2">CSV Format Requirements:</h4>
        <ul class="text-sm text-gray-600 space-y-1">
          <li>• First row should be headers</li>
          <li>• Required columns: title, description</li>
          <li>• Optional columns: courseId, order, isActive</li>
        </ul>
        <button @click="downloadSampleCSV" class="text-blue-600 hover:underline text-sm mt-2">
          Download sample CSV template
        </button>
      </div>

      <div class="flex gap-3">
        <button
          @click="closeImportModal"
          class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          @click="importCSV"
          :disabled="!csvFile"
          class="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Import
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { unitsAPI, courseAPI } from '@/utils/api.js'

// State
const units = ref([])
const courses = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const selectedCourseId = ref('')
const showCreateModal = ref(false)
const editingUnit = ref(null)
const showImportModal = ref(false)
const csvFile = ref(null)
const csvFileInput = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = computed(() => Math.ceil(filteredUnits.value.length / itemsPerPage.value))

// Form data
const unitForm = reactive({
  id: null,
  title: '',
  description: '',
  courseId: '',
  order: 1,
  isActive: true
})

// Computed
const filteredUnits = computed(() => {
  let filtered = units.value

  // Filter by course if selected
  if (selectedCourseId.value) {
    filtered = filtered.filter(unit => unit.courseId === selectedCourseId.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(unit =>
      unit.title.toLowerCase().includes(query) ||
      unit.description?.toLowerCase().includes(query)
    )
  }

  return filtered
})

const paginatedUnits = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUnits.value.slice(start, end)
})

// Methods
const getCourseTitle = (courseId) => {
  const course = courses.value.find(c => c.id === courseId)
  return course ? course.title : 'Unknown Course'
}

const loadCourses = async () => {
  try {
    const data = await courseAPI.getAll()
    courses.value = data
  } catch (err) {
    console.error('Error loading courses:', err)
  }
}

const loadUnits = async () => {
  loading.value = true
  error.value = null

  try {
    let data
    if (selectedCourseId.value) {
      data = await unitsAPI.getByCourse(selectedCourseId.value)
    } else {
      data = await unitsAPI.getAll()
    }
    units.value = data
    currentPage.value = 1 // Reset to first page when loading new data
  } catch (err) {
    console.error('Error loading units:', err)
    error.value = 'Failed to load units'
  } finally {
    loading.value = false
  }
}

// Pagination functions
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const getPageNumbers = () => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    // Show all pages if 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show ellipsis pagination
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
  }

  return pages
}

const resetForm = () => {
  unitForm.id = null
  unitForm.title = ''
  unitForm.description = ''
  unitForm.courseId = selectedCourseId.value || ''
  unitForm.order = 1
  unitForm.isActive = true
}

const editUnit = (unit) => {
  Object.assign(unitForm, unit)
  editingUnit.value = unit
  showCreateModal.value = false
}

const closeModal = () => {
  showCreateModal.value = false
  editingUnit.value = null
  resetForm()
}

const saveUnit = async () => {
  loading.value = true
  error.value = null

  try {
    if (editingUnit.value) {
      // Update existing unit
      const updated = await unitsAPI.update(unitForm.id, unitForm)
      const index = units.value.findIndex(u => u.id === unitForm.id)
      if (index > -1) {
        units.value[index] = updated
      }
    } else {
      // Create new unit
      const newUnit = await unitsAPI.create(unitForm)
      units.value.unshift(newUnit)
    }

    closeModal()
  } catch (err) {
    console.error('Error saving unit:', err)
    error.value = 'Failed to save unit'
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (unit) => {
  try {
    const updated = await unitsAPI.update(unit.id, {
      ...unit,
      isActive: !unit.isActive
    })

    const index = units.value.findIndex(u => u.id === unit.id)
    if (index > -1) {
      units.value[index] = updated
    }
  } catch (err) {
    console.error('Error updating unit status:', err)
    error.value = 'Failed to update unit status'
  }
}

const deleteUnit = async (unit) => {
  if (!confirm(`Are you sure you want to delete "${unit.title}"?`)) {
    return
  }

  try {
    await unitsAPI.delete(unit.id)
    const index = units.value.findIndex(u => u.id === unit.id)
    if (index > -1) {
      units.value.splice(index, 1)
    }
  } catch (err) {
    console.error('Error deleting unit:', err)
    error.value = 'Failed to delete unit'
  }
}

// Import/Export Functions
const exportToCSV = () => {
  if (!units.value || units.value.length === 0) {
    alert('No units to export')
    return
  }

  const headers = ['title', 'description', 'courseId', 'order', 'isActive']
  const csvContent = [
    headers.join(','),
    ...units.value.map(unit => [
      `"${(unit.title || '').replace(/"/g, '""')}"`,
      `"${(unit.description || '').replace(/"/g, '""')}"`,
      unit.courseId || '',
      unit.order || '',
      unit.isActive ? 'true' : 'false'
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `units_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const openImportModal = () => {
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
  csvFile.value = null
  if (csvFileInput.value) {
    csvFileInput.value.value = ''
  }
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file && file.type === 'text/csv') {
    csvFile.value = file
  } else {
    alert('Please select a valid CSV file')
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (file && file.type === 'text/csv') {
    csvFile.value = file
    if (csvFileInput.value) {
      csvFileInput.value.files = event.dataTransfer.files
    }
  } else {
    alert('Please drop a valid CSV file')
  }
}

const downloadSampleCSV = () => {
  const sampleData = [
    ['title', 'description', 'courseId', 'order', 'isActive'],
    ['Unit 1: Introduction', 'Basic concepts and fundamentals', '1', '1', 'true'],
    ['Unit 2: Advanced Topics', 'Deep dive into complex subjects', '1', '2', 'true'],
    ['Unit 3: Practice', 'Hands-on exercises and examples', '1', '3', 'true']
  ]

  const csvContent = sampleData.map(row =>
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'units_sample_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const parseCSV = (csvText) => {
  const lines = []
  let currentLine = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
    } else {
      currentLine += char
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  return lines.map(line => {
    const fields = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField)
        currentField = ''
      } else {
        currentField += char
      }
    }

    fields.push(currentField)
    return fields
  })
}

const importCSV = async () => {
  if (!csvFile.value) {
    alert('Please select a CSV file')
    return
  }

  try {
    const text = await csvFile.value.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      alert('CSV file must contain at least a header row and one data row')
      return
    }

    const headers = rows[0].map(h => h.toLowerCase().trim())
    const requiredHeaders = ['title', 'description']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      alert(`Missing required columns: ${missingHeaders.join(', ')}`)
      return
    }

    const titleIndex = headers.indexOf('title')
    const descriptionIndex = headers.indexOf('description')
    const courseIdIndex = headers.indexOf('courseid')
    const orderIndex = headers.indexOf('order')

    let successCount = 0
    let errorCount = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]

      if (row.length < headers.length || !row[titleIndex] || !row[descriptionIndex]) {
        errorCount++
        continue
      }

      try {
        const unitData = {
          title: row[titleIndex].trim(),
          description: row[descriptionIndex].trim(),
          courseId: courseIdIndex >= 0 && row[courseIdIndex] ? row[courseIdIndex] : selectedCourseId.value || null,
          order: orderIndex >= 0 && row[orderIndex] ? parseInt(row[orderIndex]) : 1,
          isActive: true
        }

        await unitsAPI.create(unitData)
        successCount++
      } catch (error) {
        console.error('Error creating unit:', error)
        errorCount++
      }
    }

    closeImportModal()
    await loadUnits()

    if (successCount > 0) {
      alert(`Successfully imported ${successCount} units${errorCount > 0 ? `. ${errorCount} units failed to import.` : '.'}`)
    } else {
      alert('No units were imported. Please check your CSV format.')
    }
  } catch (error) {
    console.error('Error importing CSV:', error)
    alert('Error reading CSV file. Please check the file format.')
  }
}

// Initialize
onMounted(() => {
  loadCourses()
  loadUnits()
})

// Watchers
watch([searchQuery, selectedCourseId], () => {
  currentPage.value = 1 // Reset to first page when filters change
})
</script>
