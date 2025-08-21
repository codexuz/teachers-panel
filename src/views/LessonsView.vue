<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { lessonsAPI, unitsAPI, courseAPI } from '@/utils/api.js'

const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const showModal = ref(false)
const isEditMode = ref(false)
const showImportModal = ref(false)
const csvFile = ref(null)
const csvFileInput = ref(null)

// Data
const lessons = ref([])
const courses = ref([])
const units = ref([])
const selectedCourse = ref('')
const selectedUnit = ref('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const itemsPerPageOptions = [5, 10, 20, 50]

// Form data
const form = reactive({
  id: null,
  title: '',
  order: 1,
  isActive: true,
  type: 'lesson',
  moduleId: ''
})

// Computed properties
const filteredLessons = computed(() => {
  let result = lessons.value

  if (selectedCourse.value) {
    // Filter by modules that belong to the selected course
    const courseModules = units.value
      .filter(unit => unit.courseId === selectedCourse.value)
      .map(unit => unit.id)
    result = result.filter(lesson => courseModules.includes(lesson.moduleId))
  }

  if (selectedUnit.value) {
    result = result.filter(lesson => lesson.moduleId === selectedUnit.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(lesson =>
      lesson.title.toLowerCase().includes(query)
    )
  }

  return result
})

const availableUnits = computed(() => {
  if (!selectedCourse.value) return []
  return units.value.filter(unit => unit.courseId === selectedCourse.value)
})

// Pagination computed properties
const totalItems = computed(() => filteredLessons.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))

const paginatedLessons = computed(() => {
  const start = startIndex.value
  const end = startIndex.value + itemsPerPage.value
  return filteredLessons.value.slice(start, end)
})

const paginationInfo = computed(() => {
  if (totalItems.value === 0) return 'No items to show'
  return `Showing ${startIndex.value + 1} to ${endIndex.value} of ${totalItems.value} lessons`
})

// Functions
const fetchLessons = async () => {
  isLoading.value = true
  try {
    const response = await lessonsAPI.getAll()
    const lessonsData = response.data || response
    lessons.value = Array.isArray(lessonsData) ? lessonsData : []
  } catch (err) {
    error.value = `Failed to fetch lessons: ${err.message || 'Unknown error'}`
    console.error('Error fetching lessons:', err)
    lessons.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll()
    console.log('Courses API response:', response)
    const coursesData = response.data || response
    console.log('Courses data:', coursesData)
    courses.value = Array.isArray(coursesData) ? coursesData : []
    console.log('Final courses value:', courses.value)
  } catch (err) {
    console.error('Error fetching courses:', err)
    courses.value = []
  }
}

const fetchUnits = async () => {
  try {
    const response = await unitsAPI.getAll()
    const unitsData = response.data || response
    units.value = Array.isArray(unitsData) ? unitsData : []
  } catch (err) {
    console.error('Error fetching units:', err)
    units.value = []
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (lesson) => {
  isEditMode.value = true
  form.id = lesson.id
  form.title = lesson.title
  form.order = lesson.order
  form.isActive = lesson.isActive
  form.type = lesson.type
  form.moduleId = lesson.moduleId

  // Set the selected course for the modal
  const module = units.value.find(u => u.id === lesson.moduleId)
  if (module) {
    selectedCourse.value = module.courseId
  }

  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedCourse.value = ''
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.title = ''
  form.order = 1
  form.isActive = true
  form.type = 'lesson'
  form.moduleId = ''
}

const saveLesson = async () => {
  if (!form.title || !form.moduleId) {
    error.value = 'Please fill in all required fields'
    return
  }

  isLoading.value = true
  try {
    // Prepare the data for API
    const lessonData = {
      title: form.title,
      order: form.order,
      isActive: form.isActive,
      type: form.type,
      moduleId: form.moduleId
    }

    if (isEditMode.value) {
      const response = await lessonsAPI.update(form.id, lessonData)
      const index = lessons.value.findIndex(lesson => lesson.id === form.id)
      if (index !== -1) {
        // Update the lesson with the response data or merge with form data
        lessons.value[index] = {
          ...lessons.value[index],
          ...(response.data || response || lessonData),
          id: form.id
        }
      }
    } else {
      const response = await lessonsAPI.create(lessonData)
      const newLesson = response.data || response
      // Ensure the new lesson has all required fields
      if (newLesson && newLesson.id) {
        lessons.value.push(newLesson)
      } else {
        // Fallback if API doesn't return the created lesson
        lessons.value.push({
          ...lessonData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }
    closeModal()
    error.value = ''
  } catch (err) {
    error.value = `Failed to save lesson: ${err.message || 'Unknown error'}`
    console.error('Error saving lesson:', err)
  } finally {
    isLoading.value = false
  }
}

const deleteLesson = async (id) => {
  if (!confirm('Are you sure you want to delete this lesson?')) return

  isLoading.value = true
  try {
    await lessonsAPI.delete(id)
    lessons.value = lessons.value.filter(lesson => lesson.id !== id)
    error.value = ''
  } catch (err) {
    error.value = `Failed to delete lesson: ${err.message || 'Unknown error'}`
    console.error('Error deleting lesson:', err)
  } finally {
    isLoading.value = false
  }
}

const toggleLessonStatus = async (lesson) => {
  const originalStatus = lesson.isActive
  try {
    // Optimistically update UI
    lesson.isActive = !lesson.isActive

    const updatedLesson = {
      ...lesson,
      isActive: lesson.isActive
    }
    await lessonsAPI.update(lesson.id, updatedLesson)
    error.value = ''
  } catch (err) {
    // Revert on error
    lesson.isActive = originalStatus
    error.value = `Failed to update lesson status: ${err.message || 'Unknown error'}`
    console.error('Error updating lesson status:', err)
  }
}

const getTypeColor = (type) => {
  const colors = {
    lesson: 'bg-blue-100 text-blue-800',
    practice: 'bg-green-100 text-green-800',
    test: 'bg-red-100 text-red-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

const getCourseNameById = (courseId) => {
  const course = courses.value.find(c => c.id === courseId || c.id === String(courseId))
  return course ? (course.name || course.title || 'Unknown Course') : 'Unknown Course'
}

const getUnitNameById = (moduleId) => {
  const unit = units.value.find(u => u.id === moduleId || u.id === String(moduleId))
  return unit ? unit.name : 'Unknown Module'
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

const changeItemsPerPage = (newSize) => {
  itemsPerPage.value = newSize
  currentPage.value = 1 // Reset to first page when changing page size
}

// CSV Export/Import functions
const exportToCSV = () => {
  if (lessons.value.length === 0) {
    alert('No lessons to export')
    return
  }

  const headers = ['title', 'order', 'type', 'isActive', 'moduleId']
  const csvContent = [
    headers.join(','),
    ...lessons.value.map(lesson => {
      return [
        lesson.title || '',
        lesson.order || 1,
        lesson.type || 'lesson',
        lesson.isActive ? 'true' : 'false',
        lesson.moduleId || '',
      ].map(value => {
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value)
        return stringValue.includes(',') || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue
      }).join(',')
    })
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `lessons_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const openImportModal = () => {
  showImportModal.value = true
  csvFile.value = null
  if (csvFileInput.value) {
    csvFileInput.value.value = ''
  }
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
  if (file) {
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }
    csvFile.value = file
  }
}

const handleFileDrop = (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      alert('Please drop a CSV file')
      return
    }
    csvFile.value = file
  }
}

const handleDragOver = (event) => {
  event.preventDefault()
}

const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  // Simple CSV parser that handles quoted fields
  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
  const requiredHeaders = ['title', 'moduleid']
  const optionalHeaders = ['order', 'type', 'isActive']

  // Check if required headers exist
  const missingRequired = requiredHeaders.filter(header => !headers.includes(header))
  if (missingRequired.length > 0) {
    throw new Error(`Missing required columns: ${missingRequired.join(', ')}`)
  }

  const items = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const item = {}

    headers.forEach((header, index) => {
      if (requiredHeaders.includes(header) || optionalHeaders.includes(header)) {
        let value = values[index] || ''

        // Handle special cases
        if (header === 'isactive') {
          value = value.toLowerCase() === 'true'
        } else if (header === 'order') {
          value = parseInt(value) || 1
        }

        item[header] = value
      }
    })

    if (item.title && item.title.trim() && item.moduleid) {
      // Verify module exists
      const moduleExists = units.value.some(u => u.id === item.moduleid)
      if (moduleExists) {
        items.push({
          title: item.title,
          order: item.order || 1,
          type: item.type || 'lesson',
          isActive: item.isactive !== undefined ? item.isactive : true,
          moduleId: item.moduleid
        })
      }
    }
  }

  return items
}

const importCSV = async () => {
  if (!csvFile.value) {
    alert('Please select a CSV file first')
    return
  }

  isLoading.value = true
  try {
    const text = await csvFile.value.text()
    const items = parseCSV(text)

    if (items.length === 0) {
      alert('No valid lessons found in CSV file')
      return
    }

    // Import items one by one
    let successCount = 0
    let errorCount = 0

    for (const item of items) {
      try {
        const response = await lessonsAPI.create(item)
        const newLesson = response.data || response
        if (newLesson && newLesson.id) {
          lessons.value.push(newLesson)
        } else {
          lessons.value.push({
            ...item,
            id: Date.now() + Math.random(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        }
        successCount++
      } catch (err) {
        console.error('Error importing lesson:', item.title, err)
        errorCount++
      }
    }

    closeImportModal()

    if (successCount > 0) {
      alert(`Successfully imported ${successCount} lessons${errorCount > 0 ? `. ${errorCount} lessons failed to import.` : ''}`)
    } else {
      alert('No lessons were imported')
    }

    error.value = ''

  } catch (error) {
    console.error('Error importing CSV:', error)
    alert(`Error importing CSV: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

const downloadSampleCSV = () => {
  const sampleData = [
    ['title', 'order', 'type', 'isActive', 'moduleId'],
    ['Introduction to Basics', '1', 'lesson', 'true', 'module_id_here'],
    ['Practice Exercise 1', '2', 'practice', 'true', 'module_id_here'],
    ['Unit Test 1', '3', 'test', 'true', 'module_id_here']
  ]

  const csvContent = sampleData.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'lessons_sample_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Reset pagination when filters change
const resetPagination = () => {
  currentPage.value = 1
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchLessons(),
    fetchCourses(),
    fetchUnits()
  ])
})

// Watch for changes
watch(courses, (newCourses) => {
  console.log('Courses updated:', newCourses)
}, { deep: true })

watch(units, (newUnits) => {
  console.log('Units updated:', newUnits)
}, { deep: true })

// Reset pagination when filters change
watch([selectedCourse, selectedUnit, searchQuery], () => {
  resetPagination()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Lessons Management</h1>
          <p class="text-gray-600">Manage your course lessons</p>
        </div>
        <div class="flex space-x-2">
          <button
            @click="exportToCSV"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <i class="fas fa-download mr-2"></i>
            Export CSV
          </button>
          <button
            @click="openImportModal"
            class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <i class="fas fa-upload mr-2"></i>
            Import CSV
          </button>
          <button
            @click="openCreateModal"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i class="fas fa-plus mr-2"></i>
            Add Lesson
          </button>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Lessons</label>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search by title..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>

        <!-- Course Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Course</label>
          <select
            v-model="selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Courses ({{ courses.length }} total)</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.name || course.title || 'Unnamed Course' }}
            </option>
          </select>
        </div>

        <!-- Unit Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Module</label>
          <select
            v-model="selectedUnit"
            :disabled="!selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Modules</option>
            <option v-for="unit in availableUnits" :key="unit.id" :value="unit.id">
              {{ unit.title }}
            </option>
          </select>
        </div>

        <!-- Items per page -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
          <select
            :value="itemsPerPage"
            @change="changeItemsPerPage(Number($event.target.value))"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="option in itemsPerPageOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Lessons Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lesson
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course & Module
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="isLoading">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Loading lessons...
              </td>
            </tr>
            <tr v-else-if="filteredLessons.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                No lessons found
              </td>
            </tr>
            <tr v-else v-for="lesson in paginatedLessons" :key="lesson.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ lesson.title }}</div>
                  <div class="text-sm text-gray-500">ID: {{ lesson.id }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getCourseNameById(units.find(u => u.id === lesson.moduleId)?.courseId) }}</div>
                <div class="text-sm text-gray-500">{{ getUnitNameById(lesson.moduleId) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ lesson.order }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getTypeColor(lesson.type)" class="px-2 py-1 text-xs font-medium rounded-full">
                  {{ lesson.type }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button
                  @click="toggleLessonStatus(lesson)"
                  :class="lesson.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ lesson.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="openEditModal(lesson)"
                  class="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  @click="deleteLesson(lesson.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalItems > 0" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <!-- Mobile pagination -->
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                {{ paginationInfo }}
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <!-- Previous button -->
                <button
                  @click="previousPage"
                  :disabled="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="sr-only">Previous</span>
                  <i class="fas fa-chevron-left h-5 w-5"></i>
                </button>

                <!-- Page numbers -->
                <template v-for="page in Math.min(totalPages, 7)" :key="page">
                  <button
                    v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
                    @click="goToPage(page)"
                    :class="[
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                      'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                    ]"
                  >
                    {{ page }}
                  </button>
                  <span
                    v-else-if="page === currentPage - 3 || page === currentPage + 3"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                </template>

                <!-- Next button -->
                <button
                  @click="nextPage"
                  :disabled="currentPage === totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="sr-only">Next</span>
                  <i class="fas fa-chevron-right h-5 w-5"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ isEditMode ? 'Edit Lesson' : 'Create New Lesson' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="saveLesson" class="space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Title <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                v-model="form.title"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter lesson title"
              >
            </div>

            <!-- Course and Module Selection -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Course <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="selectedCourse"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course ({{ courses.length }} available)</option>
                  <option v-for="course in courses" :key="course.id" :value="course.id">
                    {{  course.title || 'Unnamed Course' }}
                  </option>
                </select>
                <p v-if="courses.length === 0" class="text-red-500 text-xs mt-1">No courses available</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Module <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="form.moduleId"
                  :disabled="!selectedCourse"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select Module</option>
                  <option v-for="unit in units.filter(u => u.courseId === selectedCourse)" :key="unit.id" :value="unit.id">
                    {{ unit.title }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Order and Type -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <input
                  type="number"
                  v-model="form.order"
                  min="1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  v-model="form.type"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lesson">Lesson</option>
                  <option value="practice">Practice</option>
                  <option value="test">Test</option>
                </select>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center">
              <input
                type="checkbox"
                v-model="form.isActive"
                id="isActive"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="isActive" class="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isLoading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
                {{ isEditMode ? 'Update' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Import Lessons from CSV</h3>
            <button @click="closeImportModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="space-y-4">
            <!-- File Upload Area -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
              <div
                class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                @drop="handleFileDrop"
                @dragover="handleDragOver"
                @dragenter.prevent
              >
                <i class="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-4"></i>
                <p class="text-gray-600 mb-2">Drag and drop your CSV file here, or click to select</p>
                <p v-if="csvFile" class="text-sm text-green-600 mb-2">
                  <i class="fas fa-file-csv mr-1"></i>{{ csvFile.name }}
                </p>
                <input
                  type="file"
                  accept=".csv"
                  class="hidden"
                  ref="csvFileInput"
                  @change="handleFileSelect"
                >
                <button
                  type="button"
                  @click="csvFileInput?.click()"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {{ csvFile ? 'Change File' : 'Select CSV File' }}
                </button>
              </div>
            </div>

            <!-- Instructions -->
            <div class="bg-yellow-50 p-4 rounded-lg">
              <h4 class="font-medium text-yellow-900 mb-2">CSV Format Requirements</h4>
              <div class="text-sm text-yellow-800">
                <p>Your CSV file should have the following columns:</p>
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li><strong>title</strong> - Lesson title (required)</li>
                  <li><strong>moduleId</strong> - Module/Unit ID (required)</li>
                  <li><strong>order</strong> - Lesson order (optional, default: 1)</li>
                  <li><strong>type</strong> - Lesson type: lesson, practice, or test (optional, default: lesson)</li>
                  <li><strong>isActive</strong> - Active status: true or false (optional, default: true)</li>
                </ul>
                <p class="mt-2">
                  <button
                    type="button"
                    @click="downloadSampleCSV"
                    class="text-blue-600 hover:text-blue-800 underline">
                    Download sample CSV template
                  </button>
                </p>
              </div>
            </div>

            <!-- Module ID Help -->
            <div class="bg-blue-50 p-4 rounded-lg">
              <h4 class="font-medium text-blue-900 mb-2">Available Module IDs</h4>
              <div class="text-sm text-blue-800 max-h-32 overflow-y-auto">
                <div v-if="units.length === 0" class="text-gray-600">No modules available</div>
                <div v-else class="space-y-1">
                  <div v-for="unit in units" :key="unit.id" class="flex justify-between">
                    <span>{{ unit.title }}</span>
                    <code class="bg-blue-100 px-1 rounded">{{ unit.id }}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeImportModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="importCSV"
              :disabled="!csvFile || isLoading"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
              {{ isLoading ? 'Importing...' : 'Import Lessons' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
