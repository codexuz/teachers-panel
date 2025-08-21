<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { groupsAPI, courseAPI } from '@/utils/api.js'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)
const error = ref('')
const groups = ref([])
const courses = ref([])
const showModal = ref(false)
const isEditMode = ref(false)
const currentGroup = ref(null)

// Form data
const form = ref({
  id: null,
  name: '',
  level_id: ''
})

// Computed properties
const activeGroups = computed(() => {
  return groups.value.filter(group => group.is_active !== false)
})

const inactiveGroups = computed(() => {
  return groups.value.filter(group => group.is_active === false)
})

const getCourseName = (levelId) => {
  const course = courses.value.find(c => c.id === levelId)
  return course ? course.name : 'Unknown Course'
}

// Functions
const fetchCourses = async () => {
  try {
    const response = await courseAPI.getAll()
    courses.value = response.data || response
  } catch (err) {
    console.error('Error fetching courses:', err)
  }
}

const fetchGroups = async () => {
  if (!authStore.userId) {
    error.value = 'User not authenticated'
    return
  }

  isLoading.value = true
  try {
    const response = await groupsAPI.getByTeacherId(authStore.userId)
    const groupsData = response.data || response
    groups.value = Array.isArray(groupsData) ? groupsData : []
    error.value = ''
  } catch (err) {
    error.value = `Failed to fetch groups: ${err.message || 'Unknown error'}`
    console.error('Error fetching groups:', err)
    groups.value = []
  } finally {
    isLoading.value = false
  }
}

const openCreateModal = () => {
  isEditMode.value = false
  form.value = {
    id: null,
    name: '',
    level_id: ''
  }
  showModal.value = true
}

const openEditModal = (group) => {
  isEditMode.value = true
  currentGroup.value = group
  form.value = {
    id: group.id,
    name: group.name || '',
    level_id: group.level_id || ''
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  currentGroup.value = null
}

const saveGroup = async () => {
  if (!form.value.name) {
    error.value = 'Please enter a group name'
    return
  }

  if (!form.value.level_id) {
    error.value = 'Please select a course'
    return
  }

  isLoading.value = true
  try {
    const groupData = {
      name: form.value.name,
      teacher_id: authStore.userId,
      level_id: form.value.level_id
    }

    if (isEditMode.value) {
      const response = await groupsAPI.update(form.value.id, groupData)
      const updatedGroup = response.data || response
      const index = groups.value.findIndex(g => g.id === form.value.id)
      if (index !== -1) {
        groups.value[index] = { ...groups.value[index], ...updatedGroup }
      }
    } else {
      const response = await groupsAPI.create(groupData)
      const newGroup = response.data || response
      if (newGroup && newGroup.id) {
        groups.value.push(newGroup)
      }
    }

    closeModal()
    error.value = ''
  } catch (err) {
    error.value = `Failed to save group: ${err.message || 'Unknown error'}`
    console.error('Error saving group:', err)
  } finally {
    isLoading.value = false
  }
}



const manageGroup = (group) => {
  router.push(`/groups/${group.id}/manage`)
}

const getStudentCount = (group) => {
  return group.students?.length || 0
}

// Lifecycle
onMounted(() => {
  fetchCourses()
  fetchGroups()
})
</script>

<template>
  <!-- Groups Management -->
  <div id="groups" class="content-page p-6">
    <div class="mb-6">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Group Management</h2>
          <p class="text-gray-600">Manage your teaching groups and students</p>
        </div>
        <button
          @click="openCreateModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>Create Group
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && groups.length === 0" class="text-center py-8">
      <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
      <p class="text-gray-500">Loading groups...</p>
    </div>

    <!-- No Groups State -->
    <div v-else-if="!isLoading && groups.length === 0" class="text-center py-12">
      <i class="fas fa-users text-gray-400 text-4xl mb-4"></i>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
      <p class="text-gray-500 mb-4">Create your first group to start managing students</p>
      <button
        @click="openCreateModal"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        <i class="fas fa-plus mr-2"></i>Create Group
      </button>
    </div>

    <!-- Groups Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="group in groups"
        :key="group.id"
        class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600">
            <i class="fas fa-users text-xl"></i>
          </div>
          <span
            :class="group.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            class="px-2 py-1 text-xs font-medium rounded-full"
          >
            {{ group.is_active !== false ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ group.name }}</h3>
        <p class="text-gray-600 text-sm mb-4">{{ getCourseName(group.level_id) }}</p>

        <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span><i class="fas fa-users mr-1"></i>{{ getStudentCount(group) }} Students</span>
          <span class="text-blue-600">{{ getCourseName(group.level_id) }}</span>
        </div>

        <div class="flex space-x-2">
          <button
            @click="manageGroup(group)"
            class="flex-1 bg-blue-600 text-white py-1.5 px-3 text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i class="fas fa-users mr-1"></i>Manage
          </button>
          <button
            @click="openEditModal(group)"
            class="flex-1 bg-green-600 text-white py-1.5 px-3 text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            <i class="fas fa-edit mr-1"></i>Edit
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ isEditMode ? 'Edit Group' : 'Create New Group' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="saveGroup" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Group Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                v-model="form.name"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter group name"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Course <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.level_id"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Course</option>
                <option v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.title }}
                </option>
              </select>
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
  </div>
</template>
