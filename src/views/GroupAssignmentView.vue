<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center">
        <div class="mb-4 md:mb-0">
          <h1 class="text-3xl font-bold text-gray-900">Group Assignment</h1>
          <p class="text-gray-600 mt-1">Assign and manage learning units for your groups</p>
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
    
    <!-- Progress Indicator -->
    <div class="mb-6">
      <div class="flex flex-wrap gap-2 sm:gap-0">
        <div class="flex items-center flex-1">
          <div class="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">1</div>
          <div class="ml-2">
            <p class="text-sm font-medium text-gray-900">Select Group</p>
            <p class="text-xs text-gray-500">{{ selectedGroup ? 'Completed' : 'Not started' }}</p>
          </div>
          <div class="hidden sm:block h-0.5 flex-1 bg-gray-300 mx-2" :class="{'bg-blue-300': selectedGroup}"></div>
        </div>
        
        <div class="flex items-center flex-1">
          <div class="h-8 w-8 rounded-full flex items-center justify-center font-semibold"
               :class="selectedGroup ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'">2</div>
          <div class="ml-2">
            <p class="text-sm font-medium" :class="selectedGroup ? 'text-gray-900' : 'text-gray-500'">Manage Units</p>
            <p class="text-xs text-gray-500">{{ selectedUnits.length > 0 ? 'In progress' : 'Not started' }}</p>
          </div>
          <div class="hidden sm:block h-0.5 flex-1 bg-gray-300 mx-2" :class="{'bg-blue-300': selectedUnits.length > 0}"></div>
        </div>
        
        <div class="flex items-center flex-1">
          <div class="h-8 w-8 rounded-full flex items-center justify-center font-semibold"
               :class="selectedUnits.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'">3</div>
          <div class="ml-2">
            <p class="text-sm font-medium" :class="selectedUnits.length > 0 ? 'text-gray-900' : 'text-gray-500'">Finish</p>
            <p class="text-xs text-gray-500">Assignment details</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Group Selection -->
    <div class="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <h2 class="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
          <i class="fas fa-users text-blue-500 mr-2"></i>
          Step 1: Select a Group
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
                <i class="fas fa-calendar-alt text-purple-600"></i>
              </div>
              <span class="text-gray-700">Created {{ formatDate(group.created_at) }}</span>
            </div>
          </div>
          
          <div v-if="selectedGroup?.id === group.id" class="mt-4 pt-3 border-t border-blue-200 text-blue-600 font-medium text-center">
            Group selected
          </div>
        </div>
      </div>
    </div>

    <!-- Unit Selection -->
    <div v-if="selectedGroup" class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Step 2: Manage Units Assignment</h2>

      <div v-if="isLoadingUnits || isLoadingAssignedUnits" class="text-center py-8">
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

        <!-- Already Assigned Units Section -->
        <div v-if="assignedFilteredUnits.length > 0" class="mb-8">
          <h3 class="font-medium text-gray-900 mb-3 pb-2 border-b">
            <i class="fas fa-check-circle text-blue-500 mr-2"></i>
            Units Already Assigned to This Group
          </h3>
          
          <div class="space-y-3">
            <div
              v-for="unit in assignedFilteredUnits"
              :key="unit.id"
              class="border border-blue-200 rounded-lg p-4 bg-blue-50"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">{{ unit.title }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ unit.description || 'No description available' }}</p>
                  <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>
                      <span class="font-medium">Start Date:</span> {{ unit.start_date ? new Date(unit.start_date).toLocaleDateString() : 'Not set' }}
                    </div>
                    <div>
                      <span class="font-medium">End Date:</span> {{ unit.end_date ? new Date(unit.end_date).toLocaleDateString() : 'No expiration' }}
                    </div>
                    <div>
                      <span class="font-medium">Status:</span>
                      <span :class="unit.status === 'unlocked' ? 'text-green-600' : 'text-orange-600'">
                        {{ unit.status === 'unlocked' ? 'Unlocked' : 'Locked' }}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  @click="unassignUnit(unit)"
                  class="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-md"
                  title="Unassign Unit"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Available Units Section -->
        <div>
          <div class="flex justify-between items-center mb-3 pb-2 border-b">
            <h3 class="font-medium text-gray-900">
              <i class="fas fa-book text-green-500 mr-2"></i>
              Available Units to Assign
            </h3>
            
            <div class="flex gap-2">
              <button 
                v-if="availableUnits.length > 0"
                @click="selectAllAvailableUnits" 
                class="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded flex items-center"
              >
                <i class="fas fa-check-double mr-1"></i> Select All
              </button>
              <button 
                v-if="selectedUnits.length > 0"
                @click="deselectAllUnits" 
                class="text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 px-3 py-1 rounded flex items-center"
              >
                <i class="fas fa-times mr-1"></i> Clear
              </button>
            </div>
          </div>
          
          <div v-if="availableUnits.length === 0" class="text-center py-8">
            <i class="fas fa-check-double text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">All units have been assigned to this group</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="unit in availableUnits"
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
    </div>

    <!-- Assignment Configuration -->
    <div id="configSection" v-if="selectedGroup && selectedUnits.length > 0" class="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
      <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <i class="fas fa-sliders-h text-green-500 mr-2"></i>
        Step 3: Configure Assignment
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Left Column -->
        <div class="space-y-6">
          <!-- Start Date -->
          <div>
            <label class="block text-sm font-medium text-gray-800 mb-2">Start Date</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fas fa-calendar-day text-gray-400"></i>
              </div>
              <input
                type="date"
                v-model="assignmentForm.start_date"
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
            </div>
            <p class="text-sm text-gray-600 mt-2 flex items-center">
              <i class="fas fa-info-circle text-blue-500 mr-1"></i>
              When students can start accessing these units
            </p>
          </div>

          <!-- End Date -->
          <div>
            <label class="block text-sm font-medium text-gray-800 mb-2">End Date</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fas fa-calendar-times text-gray-400"></i>
              </div>
              <input
                type="date"
                v-model="assignmentForm.end_date"
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
            </div>
            <p class="text-sm text-gray-600 mt-2 flex items-center">
              <i class="fas fa-info-circle text-blue-500 mr-1"></i>
              When access will expire (leave empty for no expiration)
            </p>
          </div>
        </div>
        
        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Status with Radio Buttons -->
          <div>
            <label class="block text-sm font-medium text-gray-800 mb-3">Assignment Status</label>
            
            <div class="space-y-3">
              <label class="flex items-center p-3 border rounded-lg cursor-pointer"
                :class="assignmentForm.status === 'locked' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'">
                <input 
                  type="radio" 
                  name="status" 
                  value="locked" 
                  v-model="assignmentForm.status"
                  class="h-5 w-5 text-orange-500 focus:ring-orange-500 mr-3"
                >
                <div>
                  <div class="font-medium text-gray-900 flex items-center">
                    <i class="fas fa-lock text-orange-500 mr-2"></i>
                    Locked
                  </div>
                  <div class="text-sm text-gray-600 mt-1">Content will be assigned but not accessible to students yet</div>
                </div>
              </label>
              
              <label class="flex items-center p-3 border rounded-lg cursor-pointer"
                :class="assignmentForm.status === 'unlocked' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'">
                <input 
                  type="radio" 
                  name="status" 
                  value="unlocked" 
                  v-model="assignmentForm.status"
                  class="h-5 w-5 text-green-500 focus:ring-green-500 mr-3"
                >
                <div>
                  <div class="font-medium text-gray-900 flex items-center">
                    <i class="fas fa-lock-open text-green-500 mr-2"></i>
                    Unlocked
                  </div>
                  <div class="text-sm text-gray-600 mt-1">Students can access the content immediately</div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Assignment Summary -->
          <div class="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 class="font-medium text-blue-800 mb-2 flex items-center">
              <i class="fas fa-info-circle mr-2"></i>
              Assignment Summary
            </h4>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-2"></i>
                Assigning <span class="font-medium text-gray-800 mx-1">{{ selectedUnits.length }}</span> units
              </li>
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-2"></i>
                To group <span class="font-medium text-gray-800 mx-1">{{ selectedGroup.name }}</span>
              </li>
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-2"></i>
                All lessons within selected units will be included
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Button -->
    <div v-if="selectedGroup && selectedUnits.length > 0" class="text-center">
      <div class="bg-gray-50 border border-gray-100 rounded-xl p-6 inline-block">
        <button
          @click="submitAssignments"
          :disabled="isSubmitting"
          class="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg font-medium shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[220px]"
        >
          <i :class="isSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-check'" class="mr-2"></i>
          {{ isSubmitting ? 'Assigning...' : 'Assign Units & Lessons' }}
        </button>
        <p class="text-sm text-gray-600 mt-3 max-w-md mx-auto">
          <i class="fas fa-info-circle text-blue-500 mr-1"></i>
          This will assign all lessons in the selected units to the group
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { groupsAPI, courseAPI, unitsAPI, groupAssignedUnitsAPI } from '@/utils/api.js'
import { useAuthStore } from '@/stores/auth.js'

const authStore = useAuthStore()

// State
const isLoading = ref(false)
const isLoadingUnits = ref(false)
const isLoadingAssignedUnits = ref(false)
const isSubmitting = ref(false)
const error = ref('')
const successMessage = ref('')
const groups = ref([])
const courses = ref([])
const units = ref([])
const assignedUnits = ref([])
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

const isUnitAlreadyAssigned = (unitId) => {
  return assignedUnits.value.some(assigned => assigned.unit_id === unitId)
}

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

const availableUnits = computed(() => {
  return filteredUnits.value.filter(unit => !isUnitAlreadyAssigned(unit.id))
})

const assignedFilteredUnits = computed(() => {
  if (!selectedGroup.value || assignedUnits.value.length === 0) return []
  
  // Get full unit details for assigned units
  const result = assignedUnits.value.map(assigned => {
    const fullUnitDetails = units.value.find(unit => unit.id === assigned.unit_id) || {}
    return {
      ...assigned,
      title: fullUnitDetails.title || 'Unknown Unit',
      description: fullUnitDetails.description || '',
      order: fullUnitDetails.order
    }
  })
  
  if (unitSearchQuery.value) {
    const query = unitSearchQuery.value.toLowerCase()
    return result.filter(unit =>
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

const fetchAssignedUnits = async () => {
  if (!selectedGroup.value || !selectedGroup.value.id) return
  
  isLoadingAssignedUnits.value = true
  try {
    const response = await groupAssignedUnitsAPI.getByGroupId(selectedGroup.value.id)
    const assignedUnitsData = response.data || response
    assignedUnits.value = Array.isArray(assignedUnitsData) ? assignedUnitsData : []
  } catch (err) {
    console.error('Error fetching assigned units:', err)
    assignedUnits.value = []
  } finally {
    isLoadingAssignedUnits.value = false
  }
}

const selectGroup = (group) => {
  selectedGroup.value = group
  selectedUnits.value = []
  assignedUnits.value = []
  fetchUnits()
  fetchAssignedUnits()
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

const selectAllAvailableUnits = () => {
  // Add all available units that aren't already selected
  availableUnits.value.forEach(unit => {
    if (!isUnitSelected(unit.id)) {
      selectedUnits.value.push(unit)
    }
  })
  successMessage.value = `Selected all ${availableUnits.value.length} available units`
}

const deselectAllUnits = () => {
  selectedUnits.value = []
  successMessage.value = 'Cleared all selections'
}

const unassignUnit = async (assignedUnit) => {
  if (!selectedGroup.value) return
  
  error.value = ''
  successMessage.value = ''
  
  try {
    // Use the delete method from groupAssignedUnitsAPI
    await groupAssignedUnitsAPI.delete(assignedUnit.id)
    
    // Remove from local state
    assignedUnits.value = assignedUnits.value.filter(unit => unit.id !== assignedUnit.id)
    
    successMessage.value = `"${assignedUnit.title}" has been unassigned from this group`
  } catch (err) {
    error.value = `Failed to unassign unit: ${err.message || 'Unknown error'}`
    console.error('Error unassigning unit:', err)
  }
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
    selectedUnits.value = [];
    window.location.reload();
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
