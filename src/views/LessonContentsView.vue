<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { lessonContentAPI, lessonsAPI, unitsAPI, courseAPI, uploadAPI } from '@/utils/api.js'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const showModal = ref(false)
const isEditMode = ref(false)

// Upload states
const uploadProgress = ref(0)
const isUploading = ref(false)
const isDragOver = ref(false)

// Data
const lessonContents = ref([])
const lessons = ref([])
const units = ref([])
const courses = ref([])
const selectedCourse = ref('')
const selectedUnit = ref('')
const selectedLesson = ref('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const itemsPerPageOptions = [5, 10, 20, 50]

// Rich editor and media handling
const youtubePreview = ref(false)
const fileInput = ref(null)

// Form data
const form = reactive({
  id: null,
  title: '',
  content: '',
  mediaUrl: '',
  mediaType: 'url', // 'upload', 'url', 'youtube'
  mediaFile: null,
  order_number: 1,
  lessonId: '',
  isActive: true
})

// Computed properties
const filteredContents = computed(() => {
  let result = lessonContents.value

  if (selectedCourse.value) {
    // Filter by lessons that belong to units of the selected course
    const courseLessons = lessons.value
      .filter(lesson => {
        const unit = units.value.find(u => u.id === lesson.moduleId)
        return unit && unit.courseId === selectedCourse.value
      })
      .map(lesson => lesson.id)
    result = result.filter(content => courseLessons.includes(content.lessonId))
  }

  if (selectedUnit.value) {
    // Filter by lessons that belong to the selected unit
    const unitLessons = lessons.value
      .filter(lesson => lesson.moduleId === selectedUnit.value)
      .map(lesson => lesson.id)
    result = result.filter(content => unitLessons.includes(content.lessonId))
  }

  if (selectedLesson.value) {
    result = result.filter(content => content.lessonId === selectedLesson.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(content =>
      content.title.toLowerCase().includes(query) ||
      content.content.toLowerCase().includes(query)
    )
  }

  return result.sort((a, b) => a.order_number - b.order_number)
})

const availableUnits = computed(() => {
  if (!selectedCourse.value) return []
  return units.value.filter(unit => unit.courseId === selectedCourse.value)
})

const availableLessons = computed(() => {
  if (!selectedUnit.value) return []
  return lessons.value.filter(lesson => lesson.moduleId === selectedUnit.value)
})

// Pagination computed properties
const totalItems = computed(() => filteredContents.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))

const paginatedContents = computed(() => {
  const start = startIndex.value
  const end = startIndex.value + itemsPerPage.value
  return filteredContents.value.slice(start, end)
})

const paginationInfo = computed(() => {
  if (totalItems.value === 0) return 'No items to show'
  return `Showing ${startIndex.value + 1} to ${endIndex.value} of ${totalItems.value} contents`
})

// Functions
const fetchLessonContents = async () => {
  isLoading.value = true
  try {
    const response = await lessonContentAPI.getAll()
    const contentsData = response.data || response
    lessonContents.value = Array.isArray(contentsData) ? contentsData : []
  } catch (err) {
    error.value = `Failed to fetch lesson contents: ${err.message || 'Unknown error'}`
    console.error('Error fetching lesson contents:', err)
    lessonContents.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchLessons = async () => {
  try {
    const response = await lessonsAPI.getAll()
    const lessonsData = response.data || response
    lessons.value = Array.isArray(lessonsData) ? lessonsData : []
  } catch (err) {
    console.error('Error fetching lessons:', err)
    lessons.value = []
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

const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll()
    const coursesData = response.data || response
    courses.value = Array.isArray(coursesData) ? coursesData : []
  } catch (err) {
    console.error('Error fetching courses:', err)
    courses.value = []
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (content) => {
  isEditMode.value = true
  form.id = content.id
  form.title = content.title
  form.content = content.content
  form.mediaUrl = content.mediaUrl
  form.order_number = content.order_number
  form.lessonId = content.lessonId
  form.isActive = content.isActive

  // Determine media type based on existing data
  if (content.mediaUrl) {
    if (content.mediaUrl.includes('youtube.com') || content.mediaUrl.includes('youtu.be')) {
      form.mediaType = 'youtube'
    } else {
      form.mediaType = 'url'
    }
  } else {
    form.mediaType = ''
  }

  // Set the selected filters for the modal
  const lesson = lessons.value.find(l => l.id === content.lessonId)
  if (lesson) {
    selectedLesson.value = lesson.id
    const unit = units.value.find(u => u.id === lesson.moduleId)
    if (unit) {
      selectedUnit.value = unit.id
      selectedCourse.value = unit.courseId
    }
  }

  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  form.id = null
  form.title = ''
  form.content = ''
  form.mediaUrl = ''
  form.mediaType = 'url'
  form.mediaFile = null
  form.order_number = 1
  form.lessonId = ''
  form.isActive = true

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  youtubePreview.value = false
}

const saveContent = async () => {
  if (!form.title || !form.lessonId) {
    error.value = 'Please fill in all required fields'
    return
  }

  // Validate media type requirements
  if (form.mediaType === 'upload' && !form.mediaFile) {
    error.value = 'Please select a file to upload'
    return
  }

  if ((form.mediaType === 'url' || form.mediaType === 'youtube') && !form.mediaUrl) {
    error.value = 'Please enter a valid URL'
    return
  }

  isLoading.value = true
  try {
    let mediaUrl = form.mediaUrl

    // Handle file upload
    if (form.mediaType === 'upload' && form.mediaFile) {
      try {
        mediaUrl = await uploadFile(form.mediaFile)
        if (!mediaUrl) {
          throw new Error('Upload completed but no URL returned')
        }
      } catch (uploadError) {
        error.value = uploadError.message
        return
      }
    }

    const contentData = {
      title: form.title,
      content: form.content,
      mediaUrl: mediaUrl,
      order_number: form.order_number,
      lessonId: form.lessonId,
      isActive: form.isActive
    }

    if (isEditMode.value) {
      const response = await lessonContentAPI.update(form.id, contentData)
      const index = lessonContents.value.findIndex(content => content.id === form.id)
      if (index !== -1) {
        lessonContents.value[index] = {
          ...lessonContents.value[index],
          ...(response.data || response || contentData),
          id: form.id
        }
      }
    } else {
      const response = await lessonContentAPI.create(contentData)
      const newContent = response.data || response
      if (newContent && newContent.id) {
        lessonContents.value.push(newContent)
      } else {
        lessonContents.value.push({
          ...contentData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }
    closeModal()
    error.value = ''
  } catch (err) {
    error.value = `Failed to save content: ${err.message || 'Unknown error'}`
    console.error('Error saving content:', err)
  } finally {
    isLoading.value = false
  }
}

const deleteContent = async (id) => {
  if (!confirm('Are you sure you want to delete this content?')) return

  isLoading.value = true
  try {
    await lessonContentAPI.delete(id)
    lessonContents.value = lessonContents.value.filter(content => content.id !== id)
    error.value = ''
  } catch (err) {
    error.value = `Failed to delete content: ${err.message || 'Unknown error'}`
    console.error('Error deleting content:', err)
  } finally {
    isLoading.value = false
  }
}

const toggleContentStatus = async (content) => {
  const originalStatus = content.isActive
  try {
    content.isActive = !content.isActive
    const updatedContent = {
      ...content,
      isActive: content.isActive
    }
    await lessonContentAPI.update(content.id, updatedContent)
    error.value = ''
  } catch (err) {
    content.isActive = originalStatus
    error.value = `Failed to update content status: ${err.message || 'Unknown error'}`
    console.error('Error updating content status:', err)
  }
}

// Helper functions
const getLessonNameById = (lessonId) => {
  const lesson = lessons.value.find(l => l.id === lessonId || l.id === String(lessonId))
  return lesson ? lesson.title : 'Unknown Lesson'
}

const getUnitNameById = (lessonId) => {
  const lesson = lessons.value.find(l => l.id === lessonId || l.id === String(lessonId))
  if (lesson) {
    const unit = units.value.find(u => u.id === lesson.moduleId || u.id === String(lesson.moduleId))
    return unit ? unit.title : 'Unknown Unit'
  }
  return 'Unknown Unit'
}

const getCourseNameById = (lessonId) => {
  const lesson = lessons.value.find(l => l.id === lessonId || l.id === String(lessonId))
  if (lesson) {
    const unit = units.value.find(u => u.id === lesson.moduleId || u.id === String(lesson.moduleId))
    if (unit) {
      const course = courses.value.find(c => c.id === unit.courseId || c.id === String(unit.courseId))
      return course ? (course.name || course.title || 'Unknown Course') : 'Unknown Course'
    }
  }
  return 'Unknown Course'
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
  currentPage.value = 1
}

const resetPagination = () => {
  currentPage.value = 1
}

// File Upload Functions
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Validate file type
    const allowedTypes = [
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]

    if (!allowedTypes.includes(file.type)) {
      error.value = 'Invalid file type. Please select a video, audio, image, PDF, or Office document.'
      event.target.value = ''
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      error.value = 'File size must be less than 50MB'
      event.target.value = ''
      return
    }

    form.mediaFile = file
    error.value = ''
  }
}

const uploadFile = async (file) => {
  if (!file) return null

  isUploading.value = true
  uploadProgress.value = 0

  try {
    const result = await uploadAPI.uploadFile(file, 'lesson-content', {
      metadata: {
        module: 'lesson-contents',
        maxSize: 50 * 1024 * 1024 // 50MB
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      }
    })

    // Return the URL from the response
    return result.url || result.path || result.fileUrl || result.data?.url
  } catch (err) {
    console.error('Upload error:', err)
    throw new Error(`File upload failed: ${err.message}`)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

// Drag and Drop functionality
const handleDragOver = (event) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  isDragOver.value = false
}

const handleDrop = (event) => {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    // Simulate the file input change event
    const mockEvent = {
      target: {
        files: [file],
        value: ''
      }
    }
    handleFileUpload(mockEvent)
  }
}

// YouTube Functions
const validateYouTubeUrl = () => {
  const url = form.mediaUrl
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  youtubePreview.value = youtubeRegex.test(url)
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchLessonContents(),
    fetchLessons(),
    fetchUnits(),
    fetchCourses()
  ])
})

// Watch for changes
watch([selectedCourse, selectedUnit, selectedLesson, searchQuery], () => {
  resetPagination()
})

// Reset dependent filters when parent filter changes
watch(selectedCourse, () => {
  selectedUnit.value = ''
  selectedLesson.value = ''
})

watch(selectedUnit, () => {
  selectedLesson.value = ''
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Lesson Contents Management</h1>
          <p class="text-gray-600">Manage video and text content for lessons</p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>
          Add Content
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Contents</label>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search by title or content..."
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
            <option value="">All Courses</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.name || course.title || 'Unnamed Course' }}
            </option>
          </select>
        </div>

        <!-- Unit Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Unit</label>
          <select
            v-model="selectedUnit"
            :disabled="!selectedCourse"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Units</option>
            <option v-for="unit in availableUnits" :key="unit.id" :value="unit.id">
              {{ unit.title }}
            </option>
          </select>
        </div>

        <!-- Lesson Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Lesson</label>
          <select
            v-model="selectedLesson"
            :disabled="!selectedUnit"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Lessons</option>
            <option v-for="lesson in availableLessons" :key="lesson.id" :value="lesson.id">
              {{ lesson.title }}
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

    <!-- Contents Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lesson & Course
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Media
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
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
                Loading contents...
              </td>
            </tr>
            <tr v-else-if="filteredContents.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                No contents found
              </td>
            </tr>
            <tr v-else v-for="content in paginatedContents" :key="content.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ content.title }}</div>
                  <div class="text-sm text-gray-500 max-w-xs truncate">{{ content.content }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ getCourseNameById(content.lessonId) }}</div>
                <div class="text-sm text-gray-500">{{ getUnitNameById(content.lessonId) }} > {{ getLessonNameById(content.lessonId) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="content.mediaUrl" class="text-sm text-gray-900">
                  <a :href="content.mediaUrl" target="_blank" class="text-blue-600 hover:text-blue-900">
                    <i class="fas fa-play-circle mr-1"></i>
                    Media
                  </a>
                </div>
                <div v-else class="text-sm text-gray-500">No media</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ content.order_number }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button
                  @click="toggleContentStatus(content)"
                  :class="content.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ content.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="openEditModal(content)"
                  class="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  @click="deleteContent(content.id)"
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
                <button
                  @click="previousPage"
                  :disabled="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="sr-only">Previous</span>
                  <i class="fas fa-chevron-left h-5 w-5"></i>
                </button>

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
              {{ isEditMode ? 'Edit Content' : 'Create New Content' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="saveContent" class="space-y-4">
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
                placeholder="Enter content title"
              >
            </div>

            <!-- Lesson Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Lesson <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.lessonId"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Lesson</option>
                <optgroup v-for="course in courses" :key="course.id" :label="course.name || course.title || 'Unnamed Course'">
                  <template v-for="unit in units.filter(u => u.courseId === course.id)" :key="unit.id">
                    <option
                      v-for="lesson in lessons.filter(l => l.moduleId === unit.id)"
                      :key="lesson.id"
                      :value="lesson.id"
                    >
                      {{ unit.title }} > {{ lesson.title }}
                    </option>
                  </template>
                </optgroup>
              </select>
            </div>

            <!-- Content Field with Quill Editor -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <QuillEditor
                v-model:content="form.content"
                theme="snow"
                toolbar="full"
                contentType="html"
                class="bg-white"
                :style="{ minHeight: '200px' }"
                placeholder="Enter detailed content..."
              />
            </div>

            <!-- Media Type Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Media Type
              </label>
              <select
                v-model="form.mediaType"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Media</option>
                <option value="url">Direct URL</option>
                <option value="upload">File Upload</option>
                <option value="youtube">YouTube Embed</option>
              </select>
            </div>

            <!-- Media URL (for direct URL) -->
            <div v-if="form.mediaType === 'url'">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Media URL
              </label>
              <input
                type="url"
                v-model="form.mediaUrl"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/media/video.mp4"
              >
            </div>

            <!-- File Upload -->
            <div v-if="form.mediaType === 'upload'">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Upload File
              </label>
              <div
                :class="[
                  'border-2 border-dashed rounded-md p-4 text-center transition-colors',
                  isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                ]"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
              >
                <input
                  type="file"
                  ref="fileInput"
                  @change="handleFileUpload"
                  accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx"
                  class="hidden"
                >

                <!-- Upload Area -->
                <div v-if="!form.mediaFile && !isUploading">
                  <i :class="[
                    'fas fa-cloud-upload-alt text-4xl mb-2',
                    isDragOver ? 'text-blue-400' : 'text-gray-300'
                  ]"></i>
                  <button
                    type="button"
                    @click="$refs.fileInput.click()"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <i class="fas fa-upload mr-2"></i>
                    Choose File
                  </button>
                  <p :class="[
                    'mt-2 text-sm',
                    isDragOver ? 'text-blue-600' : 'text-gray-500'
                  ]">
                    Or drag and drop a file here
                  </p>
                  <p class="text-xs text-gray-400 mt-1">
                    Supports: Video, Audio, Image, PDF, Office documents (Max: 50MB)
                  </p>
                </div>

                <!-- Selected File Info -->
                <div v-else-if="form.mediaFile && !isUploading" class="bg-green-50 rounded-lg p-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <i class="fas fa-file text-green-600 mr-2"></i>
                      <div class="text-left">
                        <p class="text-sm font-medium text-green-800">{{ form.mediaFile.name }}</p>
                        <p class="text-xs text-green-600">{{ (form.mediaFile.size / 1024 / 1024).toFixed(2) }} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="form.mediaFile = null; $refs.fileInput.value = ''"
                      class="text-red-500 hover:text-red-700"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <!-- Upload Progress -->
                <div v-else-if="isUploading" class="space-y-3">
                  <div class="flex items-center justify-center">
                    <i class="fas fa-spinner fa-spin text-blue-500 mr-2"></i>
                    <span class="text-sm text-gray-600">Uploading... {{ uploadProgress }}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: uploadProgress + '%' }"
                    ></div>
                  </div>
                  <p class="text-xs text-gray-500">{{ form.mediaFile?.name }}</p>
                </div>
              </div>
            </div>

            <!-- YouTube URL -->
            <div v-if="form.mediaType === 'youtube'">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                YouTube URL
              </label>
              <input
                type="url"
                v-model="form.mediaUrl"
                @input="validateYouTubeUrl"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.youtube.com/watch?v=..."
              >
              <div v-if="youtubePreview" class="mt-2 p-2 bg-gray-50 rounded border">
                <p class="text-sm text-gray-600">Preview:</p>
                <div class="mt-1 aspect-video bg-gray-200 rounded flex items-center justify-center">
                  <span class="text-gray-500">YouTube Video Preview</span>
                </div>
              </div>
            </div>

            <!-- Order Number -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <input
                type="number"
                v-model="form.order_number"
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
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
                :disabled="isLoading || isUploading"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i v-if="isLoading || isUploading" class="fas fa-spinner fa-spin mr-2"></i>
                <span v-if="isUploading">Uploading...</span>
                <span v-else-if="isLoading">{{ isEditMode ? 'Updating...' : 'Creating...' }}</span>
                <span v-else>{{ isEditMode ? 'Update' : 'Create' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
