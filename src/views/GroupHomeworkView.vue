<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center">
        <div class="mb-4 md:mb-0">
          <h1 class="text-3xl font-bold text-gray-900">Group Homework</h1>
          <p class="text-gray-600 mt-1">Assign and manage homework for your groups</p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start shadow-sm">
      <i class="fas fa-exclamation-circle text-red-500 mr-3 mt-0.5"></i>
      <div>
        <p class="font-medium">Error</p>
        <p>{{ error }}</p>
      </div>
      <button @click="error = ''" class="ml-auto text-red-500 hover:text-red-700">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6 flex items-start shadow-sm">
      <i class="fas fa-check-circle text-green-500 mr-3 mt-0.5"></i>
      <div>
        <p class="font-medium">Success</p>
        <p>{{ successMessage }}</p>
      </div>
      <button @click="successMessage = ''" class="ml-auto text-green-500 hover:text-green-700">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Group Selection -->
    <div class="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
          <i class="fas fa-users text-blue-500 mr-2"></i>
          Select a Group
        </h2>
        
        <!-- Search Groups -->
        <div class="relative flex-grow sm:max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search by group name..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
      </div>

      <!-- Group Counter and Filter Options -->
      <div class="flex flex-wrap items-center justify-between mb-4 text-sm text-gray-600">
        <p><span class="font-semibold">{{ filteredGroups.length }}</span> groups available</p>
        
        <div class="flex gap-2 mt-2 sm:mt-0">
          <button class="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center">
            <i class="fas fa-filter text-gray-500 mr-1"></i> 
            Filter
          </button>
          <button class="px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center">
            <i class="fas fa-sort text-gray-500 mr-1"></i> 
            Sort
          </button>
        </div>
      </div>

      <!-- Groups Grid -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-500">Loading your groups...</p>
      </div>

      <div v-else-if="filteredGroups.length === 0" class="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
        <i class="fas fa-users-slash text-5xl text-gray-300 mb-4"></i>
        <p class="text-gray-500 font-medium">No groups found</p>
        <p class="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          @click="selectGroup(group)"
          class="relative border rounded-xl p-5 hover:shadow-lg cursor-pointer transition-all duration-300"
          :class="{ 
            'border-blue-500 ring-2 ring-blue-100 bg-blue-50': selectedGroup?.id === group.id,
            'border-gray-200 hover:border-blue-300': selectedGroup?.id !== group.id
          }"
        >
          <!-- Selection indicator -->
          <div v-if="selectedGroup?.id === group.id" class="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full h-8 w-8 flex items-center justify-center shadow-md">
            <i class="fas fa-check"></i>
          </div>

          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-gray-900 text-lg">{{ group.name }}</h3>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex items-center">
              <div class="bg-blue-100 p-1.5 rounded-md mr-3">
                <i class="fas fa-book text-blue-600"></i>
              </div>
              <span class="text-gray-700">{{ getCourseTitle(group.level_id) }}</span>
            </div>
            <div class="flex items-center">
              <div class="bg-green-100 p-1.5 rounded-md mr-3">
                <i class="fas fa-users text-green-600"></i>
              </div>
              <span class="text-gray-700">{{ group.student_count || 0 }} students enrolled</span>
            </div>
            <div class="flex items-center">
              <div class="bg-purple-100 p-1.5 rounded-md mr-3">
                <i class="fas fa-clipboard-list text-purple-600"></i>
              </div>
              <span class="text-gray-700">{{ groupHomeworks[group.id]?.length || 0 }} homework assigned</span>
            </div>
          </div>
          
          <div v-if="selectedGroup?.id === group.id" class="mt-4 pt-3 border-t border-blue-200 text-blue-600 font-medium text-center">
            Group selected
          </div>
        </div>
      </div>
    </div>

    <!-- Group Homework Management -->
    <div v-if="selectedGroup" class="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
          <i class="fas fa-clipboard-list text-green-500 mr-2"></i>
          Group Homework Management
        </h2>
        
        <!-- Search Homeworks -->
        <div class="relative flex-grow sm:max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-search text-gray-400"></i>
          </div>
          <input
            type="text"
            v-model="homeworkSearchQuery"
            placeholder="Search by homework title..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
      </div>

      <!-- Create New Homework Button -->
      <div class="mb-6">
        <button 
          @click="openHomeworkForm()"
          class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow flex items-center"
        >
          <i class="fas fa-plus mr-2"></i>
          Create New Homework
        </button>
      </div>

      <!-- Assigned Homeworks Section -->
      <div v-if="groupHomeworks[selectedGroup.id]?.length > 0" class="mb-8">
        <h3 class="font-medium text-gray-900 mb-3 pb-2 border-b flex items-center">
          <i class="fas fa-check-circle text-blue-500 mr-2"></i>
          Homeworks for {{ selectedGroup.name }}
        </h3>
        
        <div class="space-y-3">
          <div
            v-for="homework in filteredHomeworks"
            :key="homework.id"
            class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">{{ homework.title }}</h3>
                <div class="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                  <div>
                    <span class="font-medium text-gray-700">Start Date:</span> {{ homework.start_date ? new Date(homework.start_date).toLocaleDateString() : 'Not set' }}
                  </div>
                  <div>
                    <span class="font-medium text-gray-700">Deadline:</span> {{ homework.deadline ? new Date(homework.deadline).toLocaleDateString() : 'No deadline' }}
                  </div>
                  <div>
                    <span class="font-medium text-gray-700">Status:</span> 
                    <span :class="getStatusClass(homework)">
                      {{ getStatusText(homework) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button 
                  @click.stop="openHomeworkForm(homework)"
                  class="bg-blue-50 text-blue-500 hover:bg-blue-100 p-2 rounded-md"
                  title="Edit Homework"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button 
                  @click.stop="deleteHomework(homework)"
                  class="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-md"
                  title="Delete Homework"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="!isLoading" class="text-center py-8">
        <i class="fas fa-clipboard-list text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">No homework assignments found for this group</p>
        <p class="text-gray-400 text-sm mt-1">Click "Create New Homework" to get started</p>
      </div>
    </div>

    <!-- Homework Form Modal -->
    <div v-if="showHomeworkForm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <i class="fas fa-clipboard-list text-green-500 mr-2"></i>
              {{ editingHomework ? 'Edit Homework' : 'Create New Homework' }}
            </h2>
            <button @click="closeHomeworkForm" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div class="space-y-6">
            <!-- Homework Title -->
            <div>
              <label class="block text-sm font-medium text-gray-800 mb-2">Homework Title*</label>
              <input
                type="text"
                v-model="homeworkForm.title"
                placeholder="Enter a descriptive title..."
                class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
              <p class="text-sm text-gray-600 mt-2 flex items-center">
                <i class="fas fa-info-circle text-blue-500 mr-1"></i>
                A clear title helps students understand the task
              </p>
            </div>
            
            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-800 mb-2">Description</label>
              <textarea
                v-model="homeworkForm.description"
                placeholder="Enter homework instructions and details..."
                rows="4"
                class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              ></textarea>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Start Date -->
              <div>
                <label class="block text-sm font-medium text-gray-800 mb-2">Start Date*</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fas fa-calendar-day text-gray-400"></i>
                  </div>
                  <input
                    type="date"
                    v-model="homeworkForm.start_date"
                    class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                </div>
              </div>

              <!-- Deadline -->
              <div>
                <label class="block text-sm font-medium text-gray-800 mb-2">Deadline*</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fas fa-calendar-times text-gray-400"></i>
                  </div>
                  <input
                    type="date"
                    v-model="homeworkForm.deadline"
                    class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                </div>
              </div>
            </div>
            
            <!-- Lesson ID (Optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-800 mb-2">Lesson ID (Optional)</label>
              <input
                type="text"
                v-model="homeworkForm.lesson_id"
                placeholder="Enter a lesson ID if this homework is related to a specific lesson..."
                class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
            </div>

            <!-- Error message -->
            <div v-if="formError" class="text-red-500 text-sm">
              {{ formError }}
            </div>
            
            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3 pt-4">
              <button 
                @click="closeHomeworkForm" 
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                @click="submitHomework"
                :disabled="isSubmitting || !isFormValid"
                class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                <i :class="isSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-save'" class="mr-2"></i>
                {{ isSubmitting ? 'Saving...' : (editingHomework ? 'Update' : 'Create') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { groupsAPI, courseAPI, groupHomeworksAPI } from '@/utils/api.js'
import { useAuthStore } from '@/stores/auth.js'

const authStore = useAuthStore()

// State
const isLoading = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const formError = ref('')
const successMessage = ref('')
const groups = ref([])
const courses = ref([])
const groupHomeworks = ref({})
const selectedGroup = ref(null)
const searchQuery = ref('')
const homeworkSearchQuery = ref('')
const showHomeworkForm = ref(false)
const editingHomework = ref(null)

// Form for homework configuration
const homeworkForm = ref({
  id: null,
  title: '',
  description: '',
  start_date: new Date().toISOString().split('T')[0], // Today
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
  lesson_id: '',
  group_id: '',
  teacher_id: ''
})

// Computed property to check if the form is valid
const isFormValid = computed(() => {
  return homeworkForm.value.title && homeworkForm.value.start_date && homeworkForm.value.deadline
})

// Computed
const filteredGroups = computed(() => {
  if (!searchQuery.value) {
    return groups.value
  }

  const query = searchQuery.value.toLowerCase()
  return groups.value.filter(group =>
    group.name.toLowerCase().includes(query)
  )
})

const filteredHomeworks = computed(() => {
  if (!selectedGroup.value || !groupHomeworks.value[selectedGroup.value.id]) return []

  let result = groupHomeworks.value[selectedGroup.value.id]

  if (homeworkSearchQuery.value) {
    const query = homeworkSearchQuery.value.toLowerCase()
    result = result.filter(homework =>
      homework.title.toLowerCase().includes(query) ||
      (homework.description && homework.description.toLowerCase().includes(query))
    )
  }

  // Sort by deadline (null deadlines at the end)
  return result.sort((a, b) => {
    // Handle cases where either deadline might be null
    if (!a.deadline && !b.deadline) return a.title.localeCompare(b.title) // Sort by title if both have no deadline
    if (!a.deadline) return 1 // Push items with no deadline to the end
    if (!b.deadline) return -1 // Keep items with deadline at the beginning
    
    // Compare dates for items that both have deadlines
    const dateA = new Date(a.deadline)
    const dateB = new Date(b.deadline)
    
    if (dateA.getTime() === dateB.getTime()) {
      // If deadlines are the same, sort by title
      return a.title.localeCompare(b.title)
    }
    
    // Sort by deadline (ascending - earlier dates first)
    return dateA - dateB
  })
})

// Methods
const fetchGroups = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await groupsAPI.getByTeacherId(authStore.userId)
    const groupsData = response.data || response
    groups.value = Array.isArray(groupsData) ? groupsData : []
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || 'Unknown error'}`
    console.error('Error fetching groups:', err)
    groups.value = []
  } finally {
    isLoading.value = false
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

const fetchGroupHomeworks = async (groupId) => {
  try {
    const response = await groupHomeworksAPI.getByGroupId(groupId)
    const homeworksData = response.data || response
    
    // Update the groupHomeworks object with this group's homeworks
    groupHomeworks.value = {
      ...groupHomeworks.value,
      [groupId]: Array.isArray(homeworksData) ? homeworksData : []
    }
  } catch (err) {
    console.error(`Error fetching homeworks for group ${groupId}:`, err)
    groupHomeworks.value[groupId] = []
  }
}

const selectGroup = async (group) => {
  selectedGroup.value = group
  resetForm()
  
  // Load homeworks for this group
  await fetchGroupHomeworks(group.id)
}

const resetForm = () => {
  homeworkForm.value = {
    id: null,
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0], // Today
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 days
    lesson_id: '',
    group_id: '',
    teacher_id: ''
  }
  editingHomework.value = null
  formError.value = ''
}

const openHomeworkForm = (homework = null) => {
  resetForm()
  
  if (homework) {
    // Edit mode
    editingHomework.value = homework
    homeworkForm.value = {
      id: homework.id,
      title: homework.title,
      description: homework.description || '',
      start_date: homework.start_date || new Date().toISOString().split('T')[0],
      deadline: homework.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lesson_id: homework.lesson_id || '',
      group_id: selectedGroup.value.id,
      teacher_id: authStore.userId
    }
  } else {
    // Create mode
    homeworkForm.value.group_id = selectedGroup.value.id
    homeworkForm.value.teacher_id = authStore.userId
  }
  
  showHomeworkForm.value = true
}

const closeHomeworkForm = () => {
  showHomeworkForm.value = false
}

// Get appropriate status class based on homework dates
const getStatusClass = (homework) => {
  const now = new Date()
  const startDate = homework.start_date ? new Date(homework.start_date) : null
  const deadline = homework.deadline ? new Date(homework.deadline) : null
  
  if (deadline && deadline < now) {
    return 'text-red-600 font-medium'
  } else if (startDate && startDate > now) {
    return 'text-orange-600 font-medium'
  } else {
    return 'text-green-600 font-medium'
  }
}

// Get human-readable status text based on homework dates
const getStatusText = (homework) => {
  const now = new Date()
  const startDate = homework.start_date ? new Date(homework.start_date) : null
  const deadline = homework.deadline ? new Date(homework.deadline) : null
  
  if (deadline && deadline < now) {
    return 'Expired'
  } else if (startDate && startDate > now) {
    return 'Scheduled'
  } else {
    return 'Active'
  }
}

const deleteHomework = async (homework) => {
  if (!confirm(`Are you sure you want to delete the homework "${homework.title}"?`)) {
    return
  }
  
  error.value = ''
  successMessage.value = ''
  
  try {
    await groupHomeworksAPI.delete(homework.id)
    
    // Remove from local state
    if (selectedGroup.value && groupHomeworks.value[selectedGroup.value.id]) {
      groupHomeworks.value[selectedGroup.value.id] = groupHomeworks.value[selectedGroup.value.id]
        .filter(hw => hw.id !== homework.id)
    }
    
    successMessage.value = `"${homework.title}" has been deleted successfully`
  } catch (err) {
    error.value = `Failed to delete homework: ${err.message || 'Unknown error'}`
    console.error('Error deleting homework:', err)
  }
}

const submitHomework = async () => {
  if (!selectedGroup.value || !homeworkForm.value.title) {
    error.value = 'Please select a group and provide a homework title'
    return
  }

  if (!homeworkForm.value.deadline) {
    error.value = 'Please provide a deadline'
    return
  }

  isSubmitting.value = true
  error.value = ''
  successMessage.value = ''

  try {
    // Prepare homework data
    const homeworkData = {
      title: homeworkForm.value.title,
      description: homeworkForm.value.description,
      group_id: selectedGroup.value.id,
      teacher_id: authStore.userId,
      start_date: homeworkForm.value.start_date,
      deadline: homeworkForm.value.deadline,
      lesson_id: homeworkForm.value.lesson_id || null
    }

    let response
    
    if (editingHomework.value) {
      // Update existing homework
      response = await groupHomeworksAPI.update(editingHomework.value.id, homeworkData)
      successMessage.value = `Homework "${homeworkForm.value.title}" has been successfully updated`
    } else {
      // Create new homework
      response = await groupHomeworksAPI.create(homeworkData)
      successMessage.value = `Homework "${homeworkForm.value.title}" has been successfully assigned to ${selectedGroup.value.name}`
    }
    
    // Refresh homeworks for this group
    await fetchGroupHomeworks(selectedGroup.value.id)
    
    // Reset form and close modal
    closeHomeworkForm()
  } catch (err) {
    error.value = `Failed to save homework: ${err.message || 'Unknown error'}`
    console.error('Error saving homework:', err)
  } finally {
    isSubmitting.value = false
  }
}

const getCourseTitle = (courseId) => {
  const course = courses.value.find(c => c.id === courseId)
  return course ? course.title : 'Unknown Course'
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchGroups(),
    fetchCourses()
  ])
})
</script>