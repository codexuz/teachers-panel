<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { lessonsAPI, unitsAPI, courseAPI } from '@/utils/api.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Download, Upload, Plus, X, Edit, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-vue-next'

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
const selectedCourse = ref('all')
const selectedUnit = ref('all')

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

  if (selectedCourse.value && selectedCourse.value !== '' && selectedCourse.value !== 'all') {
    // Filter by modules that belong to the selected course
    const courseModules = units.value
      .filter(unit => unit.courseId === selectedCourse.value)
      .map(unit => unit.id)
    result = result.filter(lesson => courseModules.includes(lesson.moduleId))
  }

  if (selectedUnit.value && selectedUnit.value !== '' && selectedUnit.value !== 'all') {
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
  if (!selectedCourse.value || selectedCourse.value === '' || selectedCourse.value === 'all') return []
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
    selectedCourse.value = module.courseId || 'all'
  } else {
    selectedCourse.value = 'all'
  }

  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedCourse.value = 'all'
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
          <h1 class="text-2xl font-bold">Lessons Management</h1>
          <p class="text-muted-foreground">Manage your course lessons</p>
        </div>
        <div class="flex gap-2">
          <Button @click="exportToCSV" variant="outline">
            <Download class="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button @click="openImportModal" variant="outline">
            <Upload class="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button @click="openCreateModal">
            <Plus class="mr-2 h-4 w-4" />
            Add Lesson
          </Button>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <!-- Filters -->
    <Card class="mb-6">
      <div class="px-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="space-y-2">
            <Label>Search Lessons</Label>
            <Input
              v-model="searchQuery"
              placeholder="Search by title..."
            />
          </div>

          <!-- Course Filter -->
          <div class="space-y-2">
            <Label>Filter by Course</Label>
            <Select v-model="selectedCourse">
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses ({{ courses.length }} total)</SelectItem>
                <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                  {{ course.name || course.title || 'Unnamed Course' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Unit Filter -->
          <div class="space-y-2">
            <Label>Filter by Module</Label>
            <Select v-model="selectedUnit" :disabled="!selectedCourse">
              <SelectTrigger :disabled="!selectedCourse">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem v-for="unit in availableUnits" :key="unit.id" :value="unit.id">
                  {{ unit.title }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Items per page -->
          <div class="space-y-2">
            <Label>Items per page</Label>
            <Select :model-value="String(itemsPerPage)" @update:model-value="changeItemsPerPage(Number($event))">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in itemsPerPageOptions" :key="option" :value="String(option)">
                  {{ option }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>

    <!-- Lessons Table -->
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lesson</TableHead>
            <TableHead>Course & Module</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="6" class="text-center">
              <div class="flex items-center justify-center">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                Loading lessons...
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="filteredLessons.length === 0">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              No lessons found
            </TableCell>
          </TableRow>
          <TableRow v-else v-for="lesson in paginatedLessons" :key="lesson.id">
            <TableCell>
              <div>
                <div class="font-medium">{{ lesson.title }}</div>
                <div class="text-sm text-muted-foreground">ID: {{ lesson.id }}</div>
              </div>
            </TableCell>
            <TableCell>
              <div>{{ getCourseNameById(units.find(u => u.id === lesson.moduleId)?.courseId) }}</div>
              <div class="text-sm text-muted-foreground">{{ getUnitNameById(lesson.moduleId) }}</div>
            </TableCell>
            <TableCell>{{ lesson.order }}</TableCell>
            <TableCell>
              <Badge :variant="lesson.type === 'lesson' ? 'default' : lesson.type === 'practice' ? 'secondary' : 'destructive'">
                {{ lesson.type }}
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div v-if="totalItems > 0" class="border-t px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <!-- Mobile pagination -->
            <Button
              @click="previousPage"
              :disabled="currentPage === 1"
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-muted-foreground">
                {{ paginationInfo }}
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <!-- Previous button -->
                <Button
                  @click="previousPage"
                  :disabled="currentPage === 1"
                  variant="outline"
                  size="icon"
                  class="rounded-r-none"
                >
                  <ChevronLeft class="h-4 w-4" />
                </Button>

                <!-- Page numbers -->
                <template v-for="page in Math.min(totalPages, 7)" :key="page">
                  <Button
                    v-if="page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)"
                    @click="goToPage(page)"
                    :variant="page === currentPage ? 'default' : 'outline'"
                    size="icon"
                    class="rounded-none"
                  >
                    {{ page }}
                  </Button>
                  <span
                    v-else-if="page === currentPage - 3 || page === currentPage + 3"
                    class="relative inline-flex items-center px-4 py-2 border border-input bg-background text-sm font-medium"
                  >
                    ...
                  </span>
                </template>

                <!-- Next button -->
                <Button
                  @click="nextPage"
                  :disabled="currentPage === totalPages"
                  variant="outline"
                  size="icon"
                  class="rounded-l-none"
                >
                  <ChevronRight class="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Modal -->
    <Dialog :open="showModal" @update:open="(val) => { if (!val) closeModal() }">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {{ isEditMode ? 'Edit Lesson' : 'Create New Lesson' }}
          </DialogTitle>
          <DialogDescription>
            {{ isEditMode ? 'Update the lesson information' : 'Add a new lesson to your course' }}
          </DialogDescription>
        </DialogHeader>

        <!-- Modal Body -->
        <form @submit.prevent="saveLesson" class="space-y-4">
          <!-- Title -->
          <div class="space-y-2">
            <Label for="title">
              Title <span class="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              v-model="form.title"
              required
              placeholder="Enter lesson title"
            />
          </div>

          <!-- Course and Module Selection -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="course">
                Course <span class="text-destructive">*</span>
              </Label>
              <Select v-model="selectedCourse" required>
                <SelectTrigger id="course">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select Course ({{ courses.length }} available)</SelectItem>
                  <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                    {{ course.title || 'Unnamed Course' }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="courses.length === 0" class="text-destructive text-xs">No courses available</p>
            </div>

            <div class="space-y-2">
              <Label for="module">
                Module <span class="text-destructive">*</span>
              </Label>
              <Select v-model="form.moduleId" :disabled="!selectedCourse" required>
                <SelectTrigger id="module" :disabled="!selectedCourse">
                  <SelectValue placeholder="Select Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select Module</SelectItem>
                  <SelectItem v-for="unit in units.filter(u => u.courseId === selectedCourse)" :key="unit.id" :value="unit.id">
                    {{ unit.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Order and Type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="order">Order</Label>
              <Input
                id="order"
                type="number"
                v-model="form.order"
                min="1"
              />
            </div>

            <div class="space-y-2">
              <Label for="type">Type</Label>
              <Select v-model="form.type">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson">Lesson</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Status -->
          <div class="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              :checked="form.isActive"
              @update:checked="form.isActive = $event"
            />
            <Label for="isActive" class="font-normal cursor-pointer">
              Active
            </Label>
          </div>

          <!-- Modal Footer -->
          <DialogFooter>
            <Button
              type="button"
              @click="closeModal"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :disabled="isLoading"
            >
              <div v-if="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {{ isEditMode ? 'Update' : 'Create' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Import Modal -->
    <Dialog :open="showImportModal" @update:open="(val) => { if (!val) closeImportModal() }">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Lessons from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple lessons at once
          </DialogDescription>
        </DialogHeader>

        <!-- Modal Body -->
        <div class="space-y-4">
          <!-- File Upload Area -->
          <div class="space-y-2">
            <Label>CSV File</Label>
            <div
              class="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              @drop="handleFileDrop"
              @dragover="handleDragOver"
              @dragenter.prevent
              @click="csvFileInput?.click()"
            >
              <FileText class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p class="text-sm text-muted-foreground mb-2">Drag and drop your CSV file here, or click to select</p>
              <p v-if="csvFile" class="text-sm text-green-600 mb-2 flex items-center justify-center">
                <FileText class="h-4 w-4 mr-1" />{{ csvFile.name }}
              </p>
              <input
                type="file"
                accept=".csv"
                class="hidden"
                ref="csvFileInput"
                @change="handleFileSelect"
              >
              <Button
                type="button"
                variant="outline"
                size="sm"
                @click.stop="csvFileInput?.click()"
              >
                {{ csvFile ? 'Change File' : 'Select CSV File' }}
              </Button>
            </div>
          </div>

          <!-- Instructions -->
          <Alert>
            <AlertDescription>
              <h4 class="font-medium mb-2">CSV Format Requirements</h4>
              <div class="text-sm">
                <p>Your CSV file should have the following columns:</p>
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li><strong>title</strong> - Lesson title (required)</li>
                  <li><strong>moduleId</strong> - Module/Unit ID (required)</li>
                  <li><strong>order</strong> - Lesson order (optional, default: 1)</li>
                  <li><strong>type</strong> - Lesson type: lesson, practice, or test (optional, default: lesson)</li>
                  <li><strong>isActive</strong> - Active status: true or false (optional, default: true)</li>
                </ul>
                <p class="mt-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    class="p-0 h-auto"
                    @click="downloadSampleCSV"
                  >
                    Download sample CSV template
                  </Button>
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <!-- Module ID Help -->
          <Card>
            <div class="px-4 py-3">
              <h4 class="font-medium mb-2">Available Module IDs</h4>
              <div class="text-sm max-h-32 overflow-y-auto">
                <div v-if="units.length === 0" class="text-muted-foreground">No modules available</div>
                <div v-else class="space-y-1">
                  <div v-for="unit in units" :key="unit.id" class="flex justify-between items-center">
                    <span>{{ unit.title }}</span>
                    <Badge variant="outline">{{ unit.id }}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- Modal Footer -->
        <DialogFooter>
          <Button
            type="button"
            @click="closeImportModal"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            @click="importCSV"
            :disabled="!csvFile || isLoading"
          >
            <div v-if="isLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            {{ isLoading ? 'Importing...' : 'Import Lessons' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
