<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import { groupsAPI, studentsAPI, attendanceAPI, groupStudentsAPI } from '@/utils/api.js'

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
const allStudents = ref([])
const filteredStudents = ref([])
const selectedStudentsToAdd = ref([])
const searchTerm = ref('')
const isLoadingAllStudents = ref(false)
const searchError = ref('')

// Form data for attendance creation
const showAttendanceModal = ref(false)
const attendanceDate = ref(new Date().toISOString().split('T')[0])
const attendanceStatuses = ref({})

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
    // Use the new groupStudentsAPI to get students by group ID
    const response = await groupStudentsAPI.getByGroupId(groupId.value)
    console.log('Group students data:', response) // Log to understand the data structure
    
    students.value = response.data || response || []
    
    // Ensure each student object has the necessary properties
    students.value = students.value.map(student => {
      // If the student data is nested within a group_student object, extract it properly
      if (student.student) {
        return {
          ...student.student,
          group_student_id: student.id, // Store the relationship ID for removal
          status: student.status,
          enrolled_at: student.enrolled_at
        }
      }
      return student
    })
    
    error.value = ''
  } catch (err) {
    console.error('Error fetching students:', err)
    error.value = 'Failed to load students'
    students.value = []
  } finally {
    isLoading.value = false
  }
}

const fetchAllStudents = async () => {
  isLoadingAllStudents.value = true
  try {
    const response = await studentsAPI.getAll()
    allStudents.value = response.data || response || []
    
    // Filter out students already in the group
    filterAvailableStudents()
    
    error.value = ''
  } catch (err) {
    console.error('Error fetching all students:', err)
    searchError.value = 'Failed to load students'
    allStudents.value = []
  } finally {
    isLoadingAllStudents.value = false
  }
}

const filterAvailableStudents = () => {
  // Get IDs of students already in the group
  const groupStudentIds = students.value.map(student => student.user_id || student.id)
  
  // Filter all students to exclude those already in the group
  filteredStudents.value = allStudents.value.filter(
    student => !groupStudentIds.includes(student.id)
  )
  
  if (searchTerm.value) {
    // Filter further by search term
    const term = searchTerm.value.toLowerCase()
    filteredStudents.value = filteredStudents.value.filter(
      student => student.first_name.toLowerCase().includes(term) || 
                 student.last_name.toLowerCase().includes(term)
    )
  }
}

// Date helpers for attendance
const today = new Date()
const startDate = ref(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]) // First day of current month
const endDate = ref(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]) // Last day of current month

const fetchAttendance = async () => {
  if (!groupId.value) return

  try {
    // Use the new API endpoint with date range
    const response = await attendanceAPI.getByGroupIdAndDateRange(
      groupId.value, 
      startDate.value,
      endDate.value
    )
    console.log('Attendance data:', response) // Log to understand the attendance data structure
    attendance.value = response.data || response || []
  } catch (err) {
    console.error('Error fetching attendance:', err)
    error.value = 'Failed to load attendance data'
  }
}

const goBack = () => {
  router.push('/groups')
}

const filterStudents = () => {
  filterAvailableStudents()
}

const toggleStudentSelection = (student) => {
  const index = selectedStudentsToAdd.value.findIndex(s => s.user_id === student.user_id)
  if (index === -1) {
    selectedStudentsToAdd.value.push(student)
  } else {
    selectedStudentsToAdd.value.splice(index, 1)
  }
}

const isStudentSelected = (studentId) => {
  return selectedStudentsToAdd.value.some(student => student.user_id === studentId)
}

const openAddStudentModal = async () => {
  selectedStudentsToAdd.value = []
  searchTerm.value = ''
  await fetchAllStudents()
  showAddStudentModal.value = true
}

const closeAddStudentModal = () => {
  showAddStudentModal.value = false
  selectedStudentsToAdd.value = []
  searchTerm.value = ''
}

const openCreateAttendanceModal = () => {
  // Initialize attendance with current group students
  attendanceStatuses.value = {}
  students.value.forEach(student => {
    // Make sure we use the correct ID (could be in student.id or student.student_id)
    const studentId = student.user_id
    if (studentId) {
      attendanceStatuses.value[studentId] = 'present'
    }
  })
  
  attendanceDate.value = new Date().toISOString().split('T')[0]
  showAttendanceModal.value = true
}

const closeAttendanceModal = () => {
  showAttendanceModal.value = false
}

const addStudent = async () => {
  if (selectedStudentsToAdd.value.length === 0) {
    error.value = 'Please select at least one student to add'
    return
  }

  try {
    error.value = ''
    const currentDate = new Date().toISOString()
    
    // Add all selected students to the group
    const promises = selectedStudentsToAdd.value.map(student => {
      // Ensure we have all the required fields with proper formats
      const groupStudentData = {
        student_id: student.user_id, // This must be a valid UUID from the existing student
        group_id: groupId.value,
        enrolled_at: currentDate, // Current date in ISO format
        status: 'active', // Using 'active' as the default status
        created_by: authStore.user.id // Add the teacher who created this enrollment
      }
      return groupStudentsAPI.addToGroup(groupStudentData)
    })
    
    await Promise.all(promises)
    
    // Refresh the students list to show the newly added students
    await fetchStudents()
    closeAddStudentModal()
  } catch (err) {
    console.error('Error adding students:', err)
    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific validation error message from the server
      error.value = Array.isArray(err.response.data.message) 
        ? err.response.data.message.join(', ')
        : err.response.data.message
    } else {
      error.value = 'Failed to add students to the group'
    }
  }
}

const createAttendance = async () => {
  try {
    error.value = ''
    const teacherId = JSON.parse(localStorage.getItem('user'))?.id
     // Validate teacher ID
    if (!teacherId) {
      error.value = 'Teacher ID is missing. Please ensure you are logged in.'
      return
    }
    
    // Create attendance records for each student
    const promises = students.value.map(student => {
      // Make sure we have the correct student ID (could be in student_id or id field)
      const studentId = student.user_id || student.id
      
      if (!studentId) {
        throw new Error(`Student ID is missing for student ${student.name}`)
      }
      
      const attendanceData = {
        student_id: studentId, // Ensure this is a valid UUID
        date: attendanceDate.value,
        status: attendanceStatuses.value[student.id || studentId] || 'present',
        group_id: groupId.value,
        teacher_id: teacherId, // Ensure this is a valid UUID
        note: ''
      }
      
      console.log('Creating attendance record:', attendanceData)
      return attendanceAPI.create(attendanceData)
    })
    
    await Promise.all(promises)
    
    // Refresh the attendance data
    await fetchAttendance()
    closeAttendanceModal()
  } catch (err) {
    console.error('Error creating attendance records:', err)
    
    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific validation error message from the server
      error.value = Array.isArray(err.response.data.message) 
        ? err.response.data.message.join(', ')
        : err.response.data.message
    } else if (err.message) {
      error.value = err.message
    } else {
      error.value = 'Failed to create attendance records'
    }
  }
}

const removeStudent = async (student) => {
  if (!confirm(`Are you sure you want to remove ${student.name} from this group?`)) return

  try {
    // Use the new groupStudentsAPI to remove the student from the group
    // We need to use the group_student_id which is the ID of the relationship, not the student ID
    const groupStudentId = student.group_student_id || student.id
    
    await groupStudentsAPI.removeFromGroup(groupStudentId)
    students.value = students.value.filter(s => s.id !== student.id)
    error.value = ''
  } catch (err) {
    console.error('Error removing student:', err)
    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific error message from the server
      error.value = Array.isArray(err.response.data.message) 
        ? err.response.data.message.join(', ')
        : err.response.data.message
    } else {
      error.value = 'Failed to remove student'
    }
  }
}

const markAttendance = async (id, status) => {
  try {
      await attendanceAPI.update(id, status)
    await fetchAttendance() // Refresh attendance data
    error.value = ''
  } catch (err) {
    console.error('Error marking attendance:', err)
    
    if (err.response && err.response.data && err.response.data.message) {
      // Display the specific validation error message from the server
      error.value = Array.isArray(err.response.data.message) 
        ? err.response.data.message.join(', ')
        : err.response.data.message
    } else {
      error.value = 'Failed to mark attendance'
    }
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
                <h4 class="font-medium text-gray-800">{{ student.first_name }}</h4>
                <p class="text-sm text-gray-500">{{ student.last_name }}</p>
              </div>
            </div>
            <button
              @click="removeStudent(student)"
              class="text-red-500 hover:text-red-700 text-sm"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <div v-if="student.phone" class="text-sm text-gray-600">
              <i class="fas fa-phone mr-1"></i>{{ student.phone }}
            </div>
            <div class="text-sm">
              <span 
                :class="{
                  'bg-green-100 text-green-700': student.status === 'active',
                  'bg-yellow-100 text-yellow-700': student.status === 'pending',
                  'bg-red-100 text-red-700': student.status === 'inactive'
                }"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ student.status || 'active' }}
              </span>
            </div>
            <div v-if="student.enrolled_at" class="text-xs text-gray-500 ml-auto">
              Enrolled: {{ new Date(student.enrolled_at).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Tab -->
    <div v-if="activeTab === 'attendance'">
      <div class="bg-white rounded-lg border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Attendance Records</h3>
            
            <!-- Create Attendance Button -->
            <button
              @click="openCreateAttendanceModal"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <i class="fas fa-plus mr-2"></i>Create Attendance
            </button>
          </div>
          
          <!-- Date Range Selection -->
          <div class="flex items-center gap-4 mt-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                v-model="startDate"
                @change="fetchAttendance"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                v-model="endDate"
                @change="fetchAttendance"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <button
              @click="fetchAttendance"
              class="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i class="fas fa-sync-alt mr-2"></i>Refresh
            </button>
          </div>
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
                  {{ `${record?.student?.first_name || ''} ${record?.student?.last_name || ''}` }}
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
                    @click="markAttendance(record?.id, record.status === 'present' ? 'absent' : 'present')"
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
      <div class="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Add Students to Group</h3>
            <button @click="closeAddStudentModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Search filter -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Filter Students
            </label>
            <div class="flex items-center">
              <input
                type="text"
                v-model="searchTerm"
                @input="filterStudents"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Filter by first name or last name"
              >
            </div>
            
            <div v-if="searchError" class="text-sm text-red-500 mt-1">
              {{ searchError }}
            </div>
          </div>
          
          <!-- Selected students counter -->
          <div class="mb-4 text-sm">
            <span class="font-medium">{{ selectedStudentsToAdd.length }}</span> students selected
          </div>

          <!-- Students list -->
          <div v-if="isLoadingAllStudents" class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-gray-400 text-2xl mb-2"></i>
            <p class="text-gray-500">Loading students...</p>
          </div>
          
          <div v-else-if="filteredStudents.length === 0" class="text-center py-6">
            <p class="text-gray-500">No students found</p>
          </div>
          
          <div v-else class="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            <div 
              v-for="student in filteredStudents" 
              :key="student.id"
              @click="toggleStudentSelection(student)"
              :class="isStudentSelected(student.user_id || student.id) ? 'bg-blue-50 border-blue-300' : ''"
              class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0 flex items-center"
            >
              <div class="flex-1">
                <div class="font-medium">{{ student?.first_name  }} {{ student?.last_name }}</div>
                <div v-if="student?.phone" class="text-xs text-gray-500">{{ student?.phone }}</div>
              </div>
              <div class="w-6 h-6 flex items-center justify-center">
                <i v-if="isStudentSelected(student.user_id || student.id)" class="fas fa-check text-blue-500"></i>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end space-x-3 pt-6 mt-4 border-t border-gray-200">
            <button
              type="button"
              @click="closeAddStudentModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="addStudent"
              :disabled="selectedStudentsToAdd.length === 0"
              :class="selectedStudentsToAdd.length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'"
              class="px-4 py-2 text-white rounded-md transition-colors"
            >
              Add Selected Students
            </button>
          </div>
        </div>
      </div>
    </div>
  
    <!-- Create Attendance Modal -->
    <div v-if="showAttendanceModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <!-- Modal Header -->
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Create Attendance Records</h3>
            <button @click="closeAttendanceModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Date selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              v-model="attendanceDate"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <!-- Students attendance list -->
          <div v-if="students.length === 0" class="text-center py-6">
            <p class="text-gray-500">No students in this group</p>
          </div>
          
          <div v-else class="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            <div 
              v-for="student in students" 
              :key="student.id"
              class="px-4 py-3 border-b border-gray-200 last:border-b-0 flex items-center justify-between"
            >
              <div>
                <div class="font-medium">{{ student.first_name || student.name }}</div>
                <div class="text-sm text-gray-500">{{ student.last_name || student.email }}</div>
              </div>
              <div class="flex items-center gap-4">
                <label class="inline-flex items-center">
                  <input
                    type="radio"
                    :name="`attendance-${student.user_id}`"
                    value="present"
                    v-model="attendanceStatuses[student.user_id]"
                    class="form-radio h-5 w-5 text-green-600"
                  >
                  <span class="ml-2 text-green-700">Present</span>
                </label>
                <label class="inline-flex items-center">
                  <input
                    type="radio"
                    :name="`attendance-${student.user_id}`"
                    value="absent"
                    v-model="attendanceStatuses[student.user_id]"
                    class="form-radio h-5 w-5 text-red-600"
                  >
                  <span class="ml-2 text-red-700">Absent</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end space-x-3 pt-6 mt-4 border-t border-gray-200">
            <button
              type="button"
              @click="closeAttendanceModal"
              class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              @click="createAttendance"
              :disabled="students.length === 0"
              :class="students.length === 0 ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'"
              class="px-4 py-2 text-white rounded-md transition-colors"
            >
              Save Attendance Records
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
