<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { trialLessonsAPI } from '@/utils/api'

const authStore = useAuthStore()
const trialLessons = ref([])
const isLoading = ref(false)
const error = ref('')

// Fetch trial lessons data
const fetchTrialLessons = async () => {
  if (!authStore.user?.id) {
    console.error('No teacher ID available')
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const data = await trialLessonsAPI.getByTeacherId(authStore.user.id)
    trialLessons.value = Array.isArray(data) ? data : []
  } catch (err) {
    error.value = `Failed to fetch trial lessons: ${err.message}`
    console.error('Error fetching trial lessons:', err)
    trialLessons.value = []
  } finally {
    isLoading.value = false
  }
}// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Format time for display
const formatTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status badge class
const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'belgilangan':
      return 'bg-yellow-100 text-yellow-800'
    case 'tugallangan':
      return 'bg-green-100 text-green-800'
    case 'bekor_qilingan':
      return 'bg-red-100 text-red-800'
    case 'jarayonda':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Get status display text
const getStatusText = (status) => {
  switch (status?.toLowerCase()) {
    case 'belgilangan':
      return 'Scheduled'
    case 'tugallangan':
      return 'Completed'
    case 'bekor_qilingan':
      return 'Cancelled'
    case 'jarayonda':
      return 'In Progress'
    default:
      return status || 'Unknown'
  }
}

// Get lead status class
const getLeadStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'yangi':
      return 'bg-blue-100 text-blue-800'
    case 'kontakt_qilingan':
      return 'bg-yellow-100 text-yellow-800'
    case 'qabul_qilingan':
      return 'bg-green-100 text-green-800'
    case 'rad_qilingan':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Computed stats
const totalTrialLessons = computed(() => trialLessons.value.length)
const scheduledLessons = computed(() =>
  trialLessons.value.filter(lesson => lesson.status?.toLowerCase() === 'belgilangan').length
)
const completedLessons = computed(() =>
  trialLessons.value.filter(lesson => lesson.status?.toLowerCase() === 'tugallangan').length
)
const inProgressLessons = computed(() =>
  trialLessons.value.filter(lesson => lesson.status?.toLowerCase() === 'jarayonda').length
)

// Lifecycle
onMounted(() => {
  fetchTrialLessons()
})
</script>

<template>
  <!-- Main Content -->
  <main class="flex-1 p-6">
    <!-- Homepage/Dashboard -->
    <div id="homepage" class="content-page active">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
        <p class="text-gray-600">Welcome back! Here's what's happening in your classes.</p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white p-6 rounded-lg card-shadow">
          <div class="flex items-center">
            <div class="p-3 bg-blue-500 rounded-full">
              <i class="fas fa-users text-white text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-600">Total Trial Lessons</p>
              <p class="text-2xl font-bold text-gray-800">{{ totalTrialLessons }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg card-shadow">
          <div class="flex items-center">
            <div class="p-3 bg-yellow-500 rounded-full">
              <i class="fas fa-calendar text-white text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-600">Scheduled</p>
              <p class="text-2xl font-bold text-gray-800">{{ scheduledLessons }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg card-shadow">
          <div class="flex items-center">
            <div class="p-3 bg-green-500 rounded-full">
              <i class="fas fa-check-circle text-white text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-600">Completed</p>
              <p class="text-2xl font-bold text-gray-800">{{ completedLessons }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg card-shadow">
          <div class="flex items-center">
            <div class="p-3 bg-purple-500 rounded-full">
              <i class="fas fa-clock text-white text-xl"></i>
            </div>
            <div class="ml-4">
              <p class="text-sm text-gray-600">In Progress</p>
              <p class="text-2xl font-bold text-gray-800">{{ inProgressLessons }}</p>
            </div>
          </div>
        </div>
      </div>


       <!-- Quick Actions -->
            <div class="bg-white rounded-lg card-shadow p-6 mb-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button class="flex items-center justify-center p-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        <i class="fas fa-eye mr-2"></i>
                        See Students
                    </button>
                    <button class="flex items-center justify-center p-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                        <i class="fas fa-book mr-2"></i>
                        Create Lesson
                    </button>
                    <button class="flex items-center justify-center p-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
                        <i class="fas fa-clipboard-check mr-2"></i>
                        Take Attendance
                    </button>
                    <button class="flex items-center justify-center p-4 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors">
                        <i class="fas fa-file-alt mr-2"></i>
                        Grade Assignment
                    </button>
                </div>
            </div>

      <!-- Students Assigned to Trial Lessons -->
      <div class="bg-white rounded-lg card-shadow mb-8">
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-800">Trial Lessons Assigned to You</h3>
            <div class="flex space-x-2">
              <button
                @click="fetchTrialLessons"
                :disabled="isLoading"
                class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
              >
                <i :class="isLoading ? 'fas fa-spinner fa-spin mr-1' : 'fas fa-refresh mr-1'"></i>
                {{ isLoading ? 'Loading...' : 'Refresh' }}
              </button>
              <button class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm">
                <i class="fas fa-eye mr-1"></i>View All
              </button>
            </div>
          </div>
          <div v-if="error" class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {{ error }}
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead (Student)</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lesson Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <!-- Loading State -->
              <tr v-if="isLoading">
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                  <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                  <div>Loading trial lessons...</div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-else-if="trialLessons.length === 0">
                <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                  <i class="fas fa-calendar-times text-3xl mb-2 text-gray-400"></i>
                  <div class="text-lg font-medium">No trial lessons found</div>
                  <div class="text-sm">You don't have any trial lessons assigned yet.</div>
                </td>
              </tr>

              <!-- Data Rows -->
              <tr v-else v-for="lesson in trialLessons" :key="lesson.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ lesson.lead?.first_name }} {{ lesson.lead?.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">Lead ID: {{ lesson.lead?.id?.slice(0, 8) }}...</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ lesson.lead?.phone || 'No phone' }}</div>
                  <div class="text-sm text-gray-500">
                    <span :class="getLeadStatusClass(lesson.lead?.status)"
                          class="px-2 py-1 text-xs font-medium rounded-full">
                      {{ lesson.lead?.status || 'Unknown' }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{{ formatDate(lesson.scheduledAt) }}</div>
                  <div class="text-gray-500">{{ formatTime(lesson.scheduledAt) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getLeadStatusClass(lesson.lead?.status)"
                        class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ lesson.lead?.status || 'Unknown' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusClass(lesson.status)"
                        class="px-2 py-1 text-xs font-medium rounded-full">
                    {{ getStatusText(lesson.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    v-if="lesson.status?.toLowerCase() === 'belgilangan'"
                    class="text-green-600 hover:text-green-900 mr-3"
                  >
                    Start Lesson
                  </button>
                  <button
                    v-if="lesson.status?.toLowerCase() === 'tugallangan'"
                    class="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View Results
                  </button>
                  <button
                    v-if="lesson.status?.toLowerCase() === 'jarayonda'"
                    class="text-orange-600 hover:text-orange-900 mr-3"
                  >
                    Continue
                  </button>
                  <button class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button
                    v-if="lesson.status?.toLowerCase() !== 'tugallangan'"
                    class="text-red-600 hover:text-red-900"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing {{ trialLessons.length }} trial lesson{{ trialLessons.length !== 1 ? 's' : '' }}
            </div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {{ scheduledLessons }} Scheduled
              </span>
              <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                {{ completedLessons }} Completed
              </span>
              <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {{ inProgressLessons }} In Progress
              </span>
            </div>
          </div>
        </div>
      </div>


      </div>

  </main>
</template>
