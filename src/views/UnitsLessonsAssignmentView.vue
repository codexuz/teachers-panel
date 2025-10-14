<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Units & Lessons Assignment</h1>
          <p class="text-gray-600">
            Assign units and lessons to group:
            <span class="font-semibold text-blue-600">{{ groupName }}</span>
          </p>
        </div>
        <button
          @click="goBack"
          class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <i class="fas fa-arrow-left mr-2"></i>
          Back to Groups
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Success Alert -->
    <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {{ successMessage }}
    </div>

    <!-- Course Selection -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Assignment Settings</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Course</label>
          <select
            v-model="selectedCourse"
            @change="onCourseChange"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a course</option>
            <option v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            v-model="assignmentSettings.startDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            v-model="assignmentSettings.endDate"
            :min="assignmentSettings.startDate"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Units and Lessons Assignment -->
    <div v-if="selectedCourse" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-6 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-gray-900">Units & Lessons</h2>
          <div class="flex space-x-3">
            <button
              @click="selectAllUnits"
              class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Select All Units
            </button>
            <button
              @click="deselectAllUnits"
              class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
            >
              Deselect All
            </button>
            <button
              @click="saveAssignments"
              :disabled="isLoading || !hasSelections || !assignmentSettings.startDate || !assignmentSettings.endDate"
              class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              <i v-if="isLoading" class="fas fa-spinner fa-spin mr-2"></i>
              Save Assignments
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoading && !units.length" class="p-8 text-center">
        <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
        <p class="text-gray-500">Loading units and lessons...</p>
      </div>

      <div v-else-if="units.length === 0" class="p-8 text-center">
        <i class="fas fa-book text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">No units found for this course</p>
      </div>

      <div v-else class="max-h-96 overflow-y-auto">
        <div v-for="unit in units" :key="unit.id" class="border-b border-gray-100 last:border-b-0">
          <!-- Unit Header -->
          <div class="p-4 bg-gray-50 flex items-center justify-between">
            <div class="flex items-center">
              <input
                type="checkbox"
                :id="`unit-${unit.id}`"
                v-model="selectedUnits[unit.id]"
                @change="onUnitToggle(unit.id)"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label :for="`unit-${unit.id}`" class="ml-3 flex items-center cursor-pointer">
                <i class="fas fa-folder text-blue-500 mr-2"></i>
                <span class="font-semibold text-gray-900">{{ unit.title }}</span>
                <span class="ml-2 text-sm text-gray-500">({{ unit.lessons?.length || 0 }} lessons)</span>
              </label>
            </div>
            <button
              @click="toggleUnitExpanded(unit.id)"
              class="text-gray-500 hover:text-gray-700 p-1"
            >
              <i :class="expandedUnits[unit.id] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            </button>
          </div>

          <!-- Lessons -->
          <div v-if="expandedUnits[unit.id]" class="pl-8 bg-white">
            <div v-if="!unit.lessons || unit.lessons.length === 0" class="p-4 text-gray-500 text-sm">
              No lessons found in this unit
            </div>
            <div v-else>
              <div v-for="lesson in unit.lessons" :key="lesson.id" class="flex items-center py-3 px-4 border-b border-gray-50 last:border-b-0">
                <input
                  type="checkbox"
                  :id="`lesson-${lesson.id}`"
                  v-model="selectedLessons[lesson.id]"
                  @change="onLessonToggle(lesson.id, unit.id)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label :for="`lesson-${lesson.id}`" class="ml-3 flex items-center cursor-pointer flex-1">
                  <i class="fas fa-file-alt text-green-500 mr-2"></i>
                  <span class="text-gray-900">{{ lesson.title }}</span>
                  <span v-if="lesson.description" class="ml-2 text-sm text-gray-500">
                    - {{ lesson.description.substring(0, 50) }}{{ lesson.description.length > 50 ? '...' : '' }}
                  </span>
                </label>
                <div class="flex items-center space-x-2 text-xs text-gray-500">
                  <span v-if="lesson.duration">{{ lesson.duration }} min</span>
                  <span v-if="lesson.difficulty" class="px-2 py-1 bg-gray-100 rounded">{{ lesson.difficulty }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Assignment Summary -->
      <div v-if="hasSelections" class="p-4 bg-blue-50 border-t border-blue-200">
        <h3 class="font-medium text-blue-900 mb-2">Assignment Summary</h3>
        <div class="text-sm text-blue-800 space-y-1">
          <div>
            <span class="font-medium">{{ selectedUnitsCount }}</span> units and
            <span class="font-medium">{{ selectedLessonsCount }}</span> lessons selected
          </div>
          <div v-if="assignmentSettings.startDate && assignmentSettings.endDate">
            Assignment period:
            <span class="font-medium">{{ formatDate(assignmentSettings.startDate) }}</span> to
            <span class="font-medium">{{ formatDate(assignmentSettings.endDate) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { courseAPI, unitsAPI, lessonsAPI, groupAssignedUnitsAPI, groupAssignedLessonsAPI } from '@/utils/api.js'
import { useAuthStore } from '@/stores/auth.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Props from route
const groupId = route.params.groupId
const groupName = route.query.groupName || 'Unknown Group'

// State
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')
const courses = ref([])
const units = ref([])
const selectedCourse = ref('')
const selectedUnits = ref({})
const selectedLessons = ref({})
const expandedUnits = ref({})

// Assignment settings
const assignmentSettings = ref({
  startDate: new Date().toISOString().split('T')[0], // Today
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
})

// Computed
const hasSelections = computed(() => {
  return selectedUnitsCount.value > 0 || selectedLessonsCount.value > 0
})

const selectedUnitsCount = computed(() => {
  return Object.values(selectedUnits.value).filter(Boolean).length
})

const selectedLessonsCount = computed(() => {
  return Object.values(selectedLessons.value).filter(Boolean).length
})

// Methods
const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll()
    const coursesData = response.data || response
    courses.value = Array.isArray(coursesData) ? coursesData : []
  } catch (err) {
    error.value = `Failed to fetch courses: ${err.message || 'Unknown error'}`
    console.error('Error fetching courses:', err)
  }
}

const fetchUnitsAndLessons = async (courseId) => {
  isLoading.value = true
  error.value = ''

  try {
    // Fetch units for the specific course
    const unitsResponse = await unitsAPI.getByCourse(courseId)
    const unitsData = unitsResponse.data || unitsResponse
    const courseUnits = Array.isArray(unitsData) ? unitsData : []

    // Fetch lessons for each unit
    const unitsWithLessons = []

    for (const unit of courseUnits) {
      try {
        const lessonsResponse = await lessonsAPI.getByUnit(unit.id)
        const lessonsData = lessonsResponse.data || lessonsResponse
        const unitLessons = Array.isArray(lessonsData) ? lessonsData : []

        unitsWithLessons.push({
          ...unit,
          lessons: unitLessons
        })
      } catch (lessonErr) {
        console.warn(`Failed to fetch lessons for unit ${unit.id}:`, lessonErr)
        // Include unit even if lessons fail to load
        unitsWithLessons.push({
          ...unit,
          lessons: []
        })
      }
    }

    units.value = unitsWithLessons

    // Initialize expanded state for units
    const expandedState = {}
    courseUnits.forEach(unit => {
      expandedState[unit.id] = false
    })
    expandedUnits.value = expandedState

  } catch (err) {
    error.value = `Failed to fetch units and lessons: ${err.message || 'Unknown error'}`
    console.error('Error fetching units and lessons:', err)
    units.value = []
  } finally {
    isLoading.value = false
  }
}

const onCourseChange = () => {
  if (selectedCourse.value) {
    // Reset selections
    selectedUnits.value = {}
    selectedLessons.value = {}
    expandedUnits.value = {}
    units.value = []

    fetchUnitsAndLessons(selectedCourse.value)
  }
}

const onUnitToggle = (unitId) => {
  const isSelected = selectedUnits.value[unitId]
  const unit = units.value.find(u => u.id === unitId)

  if (unit && unit.lessons) {
    // Toggle all lessons in this unit
    unit.lessons.forEach(lesson => {
      selectedLessons.value[lesson.id] = isSelected
    })
  }

  // Auto-expand unit if selected
  if (isSelected) {
    expandedUnits.value[unitId] = true
  }
}

const onLessonToggle = (lessonId, unitId) => {
  const unit = units.value.find(u => u.id === unitId)
  if (unit && unit.lessons) {
    // Check if all lessons in unit are selected
    const allLessonsSelected = unit.lessons.every(lesson => selectedLessons.value[lesson.id])
    selectedUnits.value[unitId] = allLessonsSelected
  }
}

const toggleUnitExpanded = (unitId) => {
  expandedUnits.value[unitId] = !expandedUnits.value[unitId]
}

const selectAllUnits = () => {
  units.value.forEach(unit => {
    selectedUnits.value[unit.id] = true
    expandedUnits.value[unit.id] = true

    if (unit.lessons) {
      unit.lessons.forEach(lesson => {
        selectedLessons.value[lesson.id] = true
      })
    }
  })
}

const deselectAllUnits = () => {
  selectedUnits.value = {}
  selectedLessons.value = {}
}

const saveAssignments = async () => {
  if (!hasSelections.value) {
    error.value = 'Please select at least one unit or lesson'
    return
  }

  if (!assignmentSettings.value.startDate || !assignmentSettings.value.endDate) {
    error.value = 'Please set both start and end dates'
    return
  }

  if (new Date(assignmentSettings.value.endDate) <= new Date(assignmentSettings.value.startDate)) {
    error.value = 'End date must be after start date'
    return
  }

  isLoading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const teacherId = authStore.user?.id
    if (!teacherId) {
      throw new Error('Teacher ID not found')
    }

    // Track assigned unit IDs for lesson assignments
    const assignedUnitIds = new Map()

    // First, create unit assignments
    const selectedUnitIds = Object.keys(selectedUnits.value).filter(id => selectedUnits.value[id])

    for (const unitId of selectedUnitIds) {
      const unitAssignmentData = {
        status: 'unlocked',
        group_id: groupId,
        unit_id: unitId,
        teacher_id: teacherId
      }

      const unitAssignmentResponse = await groupAssignedUnitsAPI.create(unitAssignmentData)
      const assignedUnit = unitAssignmentResponse.data || unitAssignmentResponse

      // Store the assigned unit ID for lesson assignments
      assignedUnitIds.set(unitId, assignedUnit.id)
    }

    // Then, create lesson assignments
    const selectedLessonIds = Object.keys(selectedLessons.value).filter(id => selectedLessons.value[id])

    for (const lessonId of selectedLessonIds) {
      // Find which unit this lesson belongs to
      let unitId = null
      let groupAssignedUnitId = null

      for (const unit of units.value) {
        if (unit.lessons && unit.lessons.some(lesson => lesson.id === lessonId)) {
          unitId = unit.id
          groupAssignedUnitId = assignedUnitIds.get(unitId)
          break
        }
      }

      // If the unit wasn't selected but lesson was, create unit assignment first
      if (!groupAssignedUnitId && unitId) {
        const unitAssignmentData = {
          status: 'unlocked',
          group_id: groupId,
          unit_id: unitId,
          teacher_id: teacherId
        }

        const unitAssignmentResponse = await groupAssignedUnitsAPI.create(unitAssignmentData)
        const assignedUnit = unitAssignmentResponse.data || unitAssignmentResponse
        groupAssignedUnitId = assignedUnit.id
        assignedUnitIds.set(unitId, groupAssignedUnitId)
      }

      const lessonAssignmentData = {
        lesson_id: lessonId,
        group_id: groupId,
        granted_by: teacherId,
        group_assigned_unit_id: groupAssignedUnitId,
        start_from: assignmentSettings.value.startDate,
        end_at: assignmentSettings.value.endDate,
        status: 'unlocked'
      }

      await groupAssignedLessonsAPI.create(lessonAssignmentData)
    }

    successMessage.value = `Successfully assigned ${selectedUnitsCount.value} units and ${selectedLessonsCount.value} lessons to the group!`

    // Clear selections and auto-hide success message after 5 seconds
    selectedUnits.value = {}
    selectedLessons.value = {}
    setTimeout(() => {
      successMessage.value = ''
    }, 5000)

  } catch (err) {
    error.value = `Failed to save assignments: ${err.message || 'Unknown error'}`
    console.error('Error saving assignments:', err)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push({ name: 'GroupAssignment' })
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(async () => {
  await fetchCourses()
})
</script>
