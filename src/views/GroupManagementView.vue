<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { groupsAPI, studentsAPI, attendanceAPI } from '@/utils/api.js'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const groupId = ref(route.params.id)
const group = ref(null)
const students = ref([])
const attendance = ref([])
const isLoading = ref(false)
const error = ref('')
const activeTab = ref('students')

// Form data for adding students
const showAddStudentModal = ref(false)
const newStudent = ref({
  name: '',
  email: '',
  phone: ''
})

// Computed properties
const groupName = computed(() => group.value?.name || 'Group')

// Functions
const fetchGroup = async () => {
  if (!groupId.value) return

  try {
    const response = await groupsAPI.getById(groupId.value)
    group.value = response.data || response
  } catch (err) {
    console.error('Error fetching group:', err)
    error.value = 'Failed to load group details'
  }
}

const fetchStudents = async () => {
  if (!groupId.value) return

  isLoading.value = true
  try {
    // Assuming there's an API to get students by group ID
    const response = await studentsAPI.getByGroupId(groupId.value)
    students.value = response.data || response || []
    error.value = ''
  } catch (err) {
    console.error('Error fetching students:', err)
    error.value = 'Failed to load students'
    students.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchAttendance = async () => {
  if (!groupId.value) return

  try {
    const response = await attendanceAPI.getByGroupId(groupId.value)
    attendance.value = response.data || response || []
  } catch (err) {
    console.error('Error fetching attendance:', err)
    error.value = 'Failed to load attendance data'

    // Fallback to mock data if API fails
    attendance.value = [
      { id: 1, date: '2025-07-20', student_name: 'John Doe', status: 'present', student_id: 1 },
      { id: 2, date: '2025-07-20', student_name: 'Jane Smith', status: 'absent', student_id: 2 },
      { id: 3, date: '2025-07-21', student_name: 'John Doe', status: 'absent', student_id: 1 },
      { id: 4, date: '2025-07-21', student_name: 'Jane Smith', status: 'present', student_id: 2 },
    ]
  }
}

const goBack = () => {
  router.push('/groups')
}

const openAddStudentModal = () => {
  newStudent.value = {
    name: '',
    email: '',
    phone: ''
  }
  showAddStudentModal.value = true
}

const closeAddStudentModal = () => {
  showAddStudentModal.value = false
}

const addStudent = async () => {
  if (!newStudent.value.name || !newStudent.value.email) {
    error.value = 'Please fill in required fields'
    return
  }

  try {
    const studentData = {
      ...newStudent.value,
      group_id: groupId.value
    }

    const response = await studentsAPI.create(studentData)
    const createdStudent = response.data || response

    if (createdStudent) {
      students.value.push(createdStudent)
    }

    closeAddStudentModal()
    error.value = ''
  } catch (err) {
    console.error('Error adding student:', err)
    error.value = 'Failed to add student'
  }
}

const removeStudent = async (student) => {
  if (!confirm(`Are you sure you want to remove ${student.name} from this group?`)) return

  try {
    await studentsAPI.delete(student.id)
    students.value = students.value.filter(s => s.id !== student.id)
    error.value = ''
  } catch (err) {
    console.error('Error removing student:', err)
    error.value = 'Failed to remove student'
  }
}

const markAttendance = async (studentId, date, status) => {
  try {
    await attendanceAPI.mark({
      student_id: studentId,
      date,
      status,
      group_id: groupId.value
    })
    await fetchAttendance() // Refresh attendance data
    error.value = ''
  } catch (err) {
    console.error('Error marking attendance:', err)
    error.value = 'Failed to mark attendance'
  }
}

// Lifecycle
onMounted(() => {
  fetchGroup()
  fetchStudents()
  fetchAttendance()
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goBack"
            class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <i class="fas fa-arrow-left"></i>
            Back to Groups
          </button>
          <div>
            <h2 class="text-2xl font-bold text-gray-800">{{ groupName }}</h2>
            <p class="text-gray-600">Group Management</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'students'"
            :class="activeTab === 'students'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
          >
            <i class="fas fa-users mr-2"></i>
            Students ({{ students.length }})
          </button>
          <button
            @click="activeTab = 'attendance'"
            :class="activeTab === 'attendance'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
          >
            <i class="fas fa-calendar-check mr-2"></i>
            Attendance
          </button>
        </nav>
      </div>
    </div>

    <!-- Students Tab -->
    <div v-if="activeTab === 'students'">
      <div class="mb-4">
        <button
          @click="openAddStudentModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i class="fas fa-plus mr-2"></i>Add Student
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
        <p class="text-gray-500">Loading students...</p>
      </div>

      <!-- No Students State -->
      <div v-else-if="students.length === 0" class="text-center py-12">
        <i class="fas fa-user-plus text-gray-400 text-4xl mb-4"></i>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
        <p class="text-gray-500 mb-4">Add your first student to this group</p>
        <button
          @click="openAddStudentModal"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <i class="fas fa-plus mr-2"></i>Add Student
        </button>
      </div>

      <!-- Students List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="student in students"
          :key="student.id"
          class="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-blue-600"></i>
              </div>
              <div>
                <h4 class="font-medium text-gray-800">{{ student.name }}</h4>
                <p class="text-sm text-gray-500">{{ student.email }}</p>
              </div>
            </div>
            <button
              @click="removeStudent(student)"
              class="text-red-500 hover:text-red-700 text-sm"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div v-if="student.phone" class="text-sm text-gray-600">
            <i class="fas fa-phone mr-1"></i>{{ student.phone }}
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Tab -->
    <div v-if="activeTab === 'attendance'">
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Attendance Records</h3>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
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
              <tr v-for="record in attendance" :key="record.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ new Date(record.date).toLocaleDateString() }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ record.student_name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="record.status === 'present'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ record.status === 'present' ? 'Present' : 'Absent' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    @click="markAttendance(record.student_id, record.date, record.status === 'present' ? 'absent' : 'present')"
                    class="text-blue-600 hover:text-blue-800"
                  >
                    Toggle
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="attendance.length === 0" class="text-center py-8">
          <i class="fas fa-calendar-times text-gray-400 text-2xl mb-2"></i>
          <p class="text-gray-500">No attendance records found</p>
        </div>
      </div>
    </div>

    <!-- Add Student Modal -->
    <div v-if="showAddStudentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Add New Student</h3>
            <button @click="closeAddStudentModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="addStudent" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Student Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                v-model="newStudent.name"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter student name"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Email <span class="text-red-500">*</span>
              </label>
              <input
                type="email"
                v-model="newStudent.email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                v-model="newStudent.phone"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter phone number"
              >
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeAddStudentModal"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Student
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
