<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Group Assignment</h1>
          <p class="text-gray-600">Assign units and lessons to your groups</p>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      <div class="flex items-center">
        <i class="fas fa-check-circle text-green-500 mr-2"></i>
        <span>{{ successMessage }}</span>
      </div>
    </div>

    <!-- Group Selection -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Step 1: Select a Group</h2>

      <!-- Search Groups -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">Search Groups</label>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by group name..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
      </div>

      <!-- Groups Grid -->
      <div v-if="isLoading" class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
        <p class="text-gray-500">Loading groups...</p>
      </div>

      <div v-else-if="filteredGroups.length === 0" class="text-center py-8">
        <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">No groups found</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          @click="selectGroup(group)"
          class="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all duration-200"
          :class="{ 'border-blue-500 bg-blue-50': selectedGroup?.id === group.id }"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900">{{ group.name }}</h3>
            <span
              :class="group.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ group.is_active ? 'Active' : 'Inactive' }}
            </span>
          </div>

          <div class="space-y-2 text-sm text-gray-600">
            <div class="flex items-center">
              <i class="fas fa-book text-blue-500 w-4 mr-2"></i>
              <span>{{ getCourseTitle(group.level_id) }}</span>
            </div>
            <div class="flex items-center">
              <i class="fas fa-users text-green-500 w-4 mr-2"></i>
              <span>{{ group.student_count || 0 }} students</span>
            </div>
            <div class="flex items-center">
              <i class="fas fa-calendar text-purple-500 w-4 mr-2"></i>
              <span>{{ formatDate(group.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unit Selection -->
    <div v-if="selectedGroup" class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Step 2: Select Units to Assign</h2>

      <div v-if="isLoadingUnits" class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
        <p class="text-gray-500">Loading units...</p>
      </div>

      <div v-else>
        <!-- Filter units by search -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">Search Units</label>
          <input
            type="text"
            v-model="unitSearchQuery"
            placeholder="Search by unit title..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>

        <!-- Units List -->
        <div v-if="filteredUnits.length === 0" class="text-center py-8">
          <i class="fas fa-book text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No units found for this course</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="unit in filteredUnits"
            :key="unit.id"
            @click="toggleUnitSelection(unit)"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all duration-200"
            :class="{ 'border-green-500 bg-green-50': isUnitSelected(unit.id) }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-start">
                <input
                  type="checkbox"
                  :checked="isUnitSelected(unit.id)"
                  @click.stop
                  @change="toggleUnitSelection(unit)"
                  class="h-5 w-5 mr-3 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
                >
                <div>
                  <h3 class="font-semibold text-gray-900">{{ unit.title }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ unit.description || 'No description available' }}</p>
                </div>
              </div>
              <span class="text-sm text-gray-500">Order: {{ unit.order || 'N/A' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assignment Configuration -->
    <div v-if="selectedGroup && selectedUnits.length > 0" class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Step 3: Configure Assignment</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Start Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            v-model="assignmentForm.start_date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
          <p class="text-xs text-gray-500 mt-1">When students can start accessing these units</p>
        </div>

        <!-- End Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            v-model="assignmentForm.end_date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
          <p class="text-xs text-gray-500 mt-1">When access will expire (leave empty for no expiration)</p>
        </div>

        <!-- Status -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Assignment Status</label>
          <select
            v-model="assignmentForm.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="locked">Locked</option>
            <option value="unlocked">Unlocked (manually activate later)</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Controls whether students can access these units</p>
        </div>
      </div>
    </div>

    <!-- Submit Button -->
    <div v-if="selectedGroup && selectedUnits.length > 0" class="text-center">
      <button
        @click="submitAssignments"
        :disabled="isSubmitting"
        class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        <i :class="isSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-check'" class="mr-2"></i>
        {{ isSubmitting ? 'Assigning...' : 'Assign Units & Lessons' }}
      </button>
      <p class="text-sm text-gray-600 mt-2">This will assign all lessons in the selected units to the group</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { groupsAPI, courseAPI, unitsAPI } from '@/utils/api.js'
import { useAuthStore } from '@/stores/auth.js'

const authStore = useAuthStore()

// State
const isLoading = ref(false)
const isLoadingUnits = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const successMessage = ref('')
const groups = ref([])
const courses = ref([])
const units = ref([])
const selectedGroup = ref(null)
const selectedUnits = ref([])
const searchQuery = ref('')
const unitSearchQuery = ref('')

// Form for assignment configuration
const assignmentForm = ref({
  start_date: new Date().toISOString().split('T')[0], // Today
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
  status: 'locked' // Default status
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

const filteredUnits = computed(() => {
  if (!selectedGroup.value) return []

  let result = units.value.filter(unit =>
    unit.courseId === selectedGroup.value.level_id
  )

  if (unitSearchQuery.value) {
    const query = unitSearchQuery.value.toLowerCase()
    result = result.filter(unit =>
      unit.title.toLowerCase().includes(query) ||
      (unit.description && unit.description.toLowerCase().includes(query))
    )
  }

  return result
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

const fetchUnits = async () => {
  if (!selectedGroup.value || !selectedGroup.value.level_id) return

  isLoadingUnits.value = true
  try {
    const response = await unitsAPI.getByCourse(selectedGroup.value.level_id)
    const unitsData = response.data || response
    units.value = Array.isArray(unitsData) ? unitsData : []
  } catch (err) {
    console.error('Error fetching units:', err)
    units.value = []
  } finally {
    isLoadingUnits.value = false
  }
}

const selectGroup = (group) => {
  selectedGroup.value = group
  selectedUnits.value = []
  fetchUnits()
}

const toggleUnitSelection = (unit) => {
  const index = selectedUnits.value.findIndex(u => u.id === unit.id)
  if (index === -1) {
    selectedUnits.value.push(unit)
  } else {
    selectedUnits.value.splice(index, 1)
  }
}

const isUnitSelected = (unitId) => {
  return selectedUnits.value.some(unit => unit.id === unitId)
}

const getCourseTitle = (courseId) => {
  const course = courses.value.find(c => c.id === courseId)
  return course ? course.title : 'Unknown Course'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString()
  } catch {
    return 'Invalid Date'
  }
}

const submitAssignments = async () => {
  if (!selectedGroup.value || selectedUnits.value.length === 0) {
    error.value = 'Please select a group and at least one unit'
    return
  }

  isSubmitting.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const assignmentPromises = selectedUnits.value.map(unit => {
      return groupsAPI.assignUnits({
        group_id: selectedGroup.value.id,
        unit_id: unit.id,
        teacher_id: authStore.userId,
        start_date: assignmentForm.value.start_date,
        end_date: assignmentForm.value.end_date,
        status: assignmentForm.value.status
      })
    })

    await Promise.all(assignmentPromises)

    successMessage.value = `Successfully assigned ${selectedUnits.value.length} units with all their lessons to ${selectedGroup.value.name}`
    selectedUnits.value = []
  } catch (err) {
    error.value = `Failed to assign units: ${err.message || 'Unknown error'}`
    console.error('Error assigning units:', err)
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchGroups(),
    fetchCourses()
  ])
})
</script>
