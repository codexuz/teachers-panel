<template>
  <div class="max-w-6xl mx-auto p-6 min-h-screen">
    <!-- Header -->
    <Card class="mb-6">
      <CardHeader className="bg-white p-3">
        <CardTitle class="text-3xl">Units Management</CardTitle>
        <CardDescription>Organize course content into units</CardDescription>
      </CardHeader>
    </Card>

    <!-- Actions Bar -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <Button
          @click="showCreateModal = true"
          variant="default"
          class="flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          Add Unit
        </Button>
        <Button
          @click="exportToCSV"
          variant="default"
          class="flex items-center gap-2"
        >
          <Download class="w-4 h-4" />
          Export CSV
        </Button>
        <Button
          @click="openImportModal"
          variant="default"
          class="flex items-center gap-2"
        >
          <Upload class="w-4 h-4" />
          Import CSV
        </Button>
        <Button
          @click="loadUnits"
          :disabled="loading"
          variant="outline"
        >
          <RefreshCcw class="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      <div class="flex items-center gap-4">
        <!-- Course Filter -->
        <Select
          v-model="selectedCourseId"
          @update:model-value="loadUnits"
        >
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
              {{ course.title }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          v-model="searchQuery"
          type="text"
          placeholder="Search units..."
        >
          <template #prefix>
            <Search class="h-4 w-4 text-muted-foreground" />
          </template>
        </Input>
      </div>
    </div>

    <!-- Error Message -->
    <Alert v-if="error" variant="destructive" class="mb-4">
      <AlertCircle class="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
      <Button 
        variant="ghost" 
        size="icon" 
        class="absolute right-2 top-2" 
        @click="error = null"
      >
        <X class="h-4 w-4" />
      </Button>
    </Alert>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="h-12 w-12 animate-spin text-primary" />
    </div>

    <!-- Units Table -->
    <Table v-else>
      <TableHeader>
        <TableRow>
          <TableHead>Unit</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="paginatedUnits.length === 0">
          <TableCell colspan="6" class="h-24 text-center">
            <BookOpen class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p class="text-lg font-medium mb-2">No units found</p>
            <p class="text-sm text-muted-foreground">{{ searchQuery ? 'Try adjusting your search terms' : 'Create your first unit to get started' }}</p>
          </TableCell>
        </TableRow>
        <TableRow v-for="unit in paginatedUnits" :key="unit.id">
          <TableCell>
            <div>
              <div class="font-medium">{{ unit.title }}</div>
              <div class="text-sm text-muted-foreground max-w-xs truncate">{{ unit.description || 'No description' }}</div>
            </div>
          </TableCell>
          <TableCell>
            {{ getCourseTitle(unit.courseId) }}
          </TableCell>
          <TableCell>
            <Badge variant="outline" class="bg-primary/10">
              {{ unit.order }}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge :variant="unit.isActive ? 'default' : 'outline'">
              {{ unit.isActive ? 'Active' : 'Inactive' }}
            </Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <!-- Pagination Controls -->
    <div v-if="filteredUnits.length > 0" class="mt-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="text-sm text-muted-foreground">
          Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredUnits.length) }} of {{ filteredUnits.length }} units
        </div>
        <Select
          v-model="itemsPerPage"
          @update:model-value="currentPage = 1"
        >
          <SelectTrigger class="w-[130px]">
            <SelectValue placeholder="10 per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="5">5 per page</SelectItem>
            <SelectItem :value="10">10 per page</SelectItem>
            <SelectItem :value="20">20 per page</SelectItem>
            <SelectItem :value="50">50 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center gap-1">
        <!-- Pagination component -->
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                @click="previousPage" 
                :disabled="currentPage === 1"
              />
            </PaginationItem>

            <template v-for="page in getPageNumbers()" :key="page">
              <PaginationItem v-if="page !== '...'">
                <button 
                  class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9"
                  :class="[
                    currentPage === page 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  ]"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </PaginationItem>
              <PaginationEllipsis v-else />
            </template>

            <PaginationItem>
              <PaginationNext 
                @click="nextPage" 
                :disabled="currentPage === totalPages"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Dialog :open="showCreateModal || editingUnit" @update:open="(val) => { if (!val) closeModal() }">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ editingUnit ? 'Edit Unit' : 'Create New Unit' }}</DialogTitle>
          <DialogDescription>
            {{ editingUnit ? 'Update unit details' : 'Add a new unit to your course' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="saveUnit" class="space-y-4">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="courseId">Course *</Label>
              <Select
                v-model="unitForm.courseId"
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Select a course</SelectItem>
                  <SelectItem v-for="course in courses" :key="course.id" :value="course.id">
                    {{ course.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="title">Title *</Label>
              <Input
                id="title"
                v-model="unitForm.title"
                required
                placeholder="Enter unit title"
              />
            </div>
            <div class="space-y-2">
              <Label for="description">Description</Label>
              <Textarea
                id="description"
                v-model="unitForm.description"
                rows="3"
                placeholder="Enter unit description"
              />
            </div>
            <div class="space-y-2">
              <Label for="order">Order</Label>
              <Input
                id="order"
                type="number"
                v-model.number="unitForm.order"
                min="1"
                placeholder="Unit order (1, 2, 3...)"
              />
            </div>
            <div class="flex items-center space-x-2">
              <Checkbox 
                id="is-active"
                v-model:checked="unitForm.isActive" 
              />
              <Label for="is-active">Unit is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              @click="closeModal"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              :disabled="loading"
            >
              {{ loading ? 'Saving...' : (editingUnit ? 'Update' : 'Create') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>

  <!-- Import Modal -->
  <Dialog :open="showImportModal" @update:open="(val) => { if (!val) closeImportModal() }">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Import Units from CSV</DialogTitle>
        <DialogDescription>
          Upload a CSV file with unit data to import
        </DialogDescription>
      </DialogHeader>

      <div
        @dragover.prevent
        @dragenter.prevent
        @drop="handleDrop"
        class="border-2 border-dashed border-primary/20 rounded-lg p-6 text-center mb-4 hover:border-primary transition cursor-pointer"
      >
        <div class="mb-4">
          <Upload class="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p class="text-muted-foreground">Drop your CSV file here or</p>
        </div>
        <Button 
          @click="$refs.csvFileInput.click()"
          variant="secondary"
        >
          Choose File
        </Button>
        <input
          ref="csvFileInput"
          type="file"
          accept=".csv"
          @change="handleFileSelect"
          class="hidden"
        >
      </div>

      <div v-if="csvFile" class="mb-4 p-3 bg-muted rounded">
        <p class="text-sm text-muted-foreground">Selected file: {{ csvFile.name }}</p>
      </div>

      <div class="mb-4">
        <h4 class="font-medium mb-2">CSV Format Requirements:</h4>
        <ul class="text-sm text-muted-foreground space-y-1">
          <li>• First row should be headers</li>
          <li>• Required columns: title, description</li>
          <li>• Optional columns: courseId, order, isActive</li>
        </ul>
        <Button 
          variant="link" 
          class="p-0 h-auto text-sm" 
          @click="downloadSampleCSV"
        >
          Download sample CSV template
        </Button>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="closeImportModal"
        >
          Cancel
        </Button>
        <Button
          @click="importCSV"
          :disabled="!csvFile"
        >
          Import
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { unitsAPI, courseAPI } from '@/utils/api.js'
import { 
  Upload, Download, Plus, PencilLine, Trash, 
  Lock, Unlock, RefreshCcw, Search, X, 
  Loader2, AlertCircle, BookOpen
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Pagination, 
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

// State
const units = ref([])
const courses = ref([])
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const selectedCourseId = ref('')
const showCreateModal = ref(false)
const editingUnit = ref(null)
const showImportModal = ref(false)
const csvFile = ref(null)
const csvFileInput = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalPages = computed(() => Math.ceil(filteredUnits.value.length / itemsPerPage.value))

// Form data
const unitForm = reactive({
  id: null,
  title: '',
  description: '',
  courseId: '',
  order: 1,
  isActive: true
})

// Computed
const filteredUnits = computed(() => {
  let filtered = units.value

  // Filter by course if selected
  if (selectedCourseId.value) {
    filtered = filtered.filter(unit => unit.courseId === selectedCourseId.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(unit =>
      unit.title.toLowerCase().includes(query) ||
      unit.description?.toLowerCase().includes(query)
    )
  }

  return filtered
})

const paginatedUnits = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUnits.value.slice(start, end)
})

// Methods
const getCourseTitle = (courseId) => {
  const course = courses.value.find(c => c.id === courseId)
  return course ? course.title : 'Unknown Course'
}

const loadCourses = async () => {
  try {
    const data = await courseAPI.getAll()
    courses.value = data
  } catch (err) {
    console.error('Error loading courses:', err)
  }
}

const loadUnits = async () => {
  loading.value = true
  error.value = null

  try {
    let data
    if (selectedCourseId.value) {
      data = await unitsAPI.getByCourse(selectedCourseId.value)
    } else {
      data = await unitsAPI.getAll()
    }
    units.value = data
    currentPage.value = 1 // Reset to first page when loading new data
  } catch (err) {
    console.error('Error loading units:', err)
    error.value = 'Failed to load units'
  } finally {
    loading.value = false
  }
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

const getPageNumbers = () => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    // Show all pages if 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show ellipsis pagination
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
  }

  return pages
}

const resetForm = () => {
  unitForm.id = null
  unitForm.title = ''
  unitForm.description = ''
  unitForm.courseId = selectedCourseId.value || ''
  unitForm.order = 1
  unitForm.isActive = true
}

const editUnit = (unit) => {
  Object.assign(unitForm, unit)
  editingUnit.value = unit
  showCreateModal.value = false
}

const closeModal = () => {
  showCreateModal.value = false
  editingUnit.value = null
  resetForm()
}

const saveUnit = async () => {
  loading.value = true
  error.value = null

  try {
    if (editingUnit.value) {
      // Update existing unit
      const updated = await unitsAPI.update(unitForm.id, unitForm)
      const index = units.value.findIndex(u => u.id === unitForm.id)
      if (index > -1) {
        units.value[index] = updated
      }
    } else {
      // Create new unit
      const newUnit = await unitsAPI.create(unitForm)
      units.value.unshift(newUnit)
    }

    closeModal()
  } catch (err) {
    console.error('Error saving unit:', err)
    error.value = 'Failed to save unit'
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (unit) => {
  try {
    const updated = await unitsAPI.update(unit.id, {
      ...unit,
      isActive: !unit.isActive
    })

    const index = units.value.findIndex(u => u.id === unit.id)
    if (index > -1) {
      units.value[index] = updated
    }
  } catch (err) {
    console.error('Error updating unit status:', err)
    error.value = 'Failed to update unit status'
  }
}

const deleteUnit = async (unit) => {
  if (!confirm(`Are you sure you want to delete "${unit.title}"?`)) {
    return
  }

  try {
    await unitsAPI.delete(unit.id)
    const index = units.value.findIndex(u => u.id === unit.id)
    if (index > -1) {
      units.value.splice(index, 1)
    }
  } catch (err) {
    console.error('Error deleting unit:', err)
    error.value = 'Failed to delete unit'
  }
}

// Import/Export Functions
const exportToCSV = () => {
  if (!units.value || units.value.length === 0) {
    alert('No units to export')
    return
  }

  const headers = ['title', 'description', 'courseId', 'order', 'isActive']
  const csvContent = [
    headers.join(','),
    ...units.value.map(unit => [
      `"${(unit.title || '').replace(/"/g, '""')}"`,
      `"${(unit.description || '').replace(/"/g, '""')}"`,
      unit.courseId || '',
      unit.order || '',
      unit.isActive ? 'true' : 'false'
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `units_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const openImportModal = () => {
  showImportModal.value = true
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
  if (file && file.type === 'text/csv') {
    csvFile.value = file
  } else {
    alert('Please select a valid CSV file')
  }
}

const handleDrop = (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (file && file.type === 'text/csv') {
    csvFile.value = file
    if (csvFileInput.value) {
      csvFileInput.value.files = event.dataTransfer.files
    }
  } else {
    alert('Please drop a valid CSV file')
  }
}

const downloadSampleCSV = () => {
  const sampleData = [
    ['title', 'description', 'courseId', 'order', 'isActive'],
    ['Unit 1: Introduction', 'Basic concepts and fundamentals', '1', '1', 'true'],
    ['Unit 2: Advanced Topics', 'Deep dive into complex subjects', '1', '2', 'true'],
    ['Unit 3: Practice', 'Hands-on exercises and examples', '1', '3', 'true']
  ]

  const csvContent = sampleData.map(row =>
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'units_sample_template.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const parseCSV = (csvText) => {
  const lines = []
  let currentLine = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
    } else {
      currentLine += char
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  return lines.map(line => {
    const fields = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField)
        currentField = ''
      } else {
        currentField += char
      }
    }

    fields.push(currentField)
    return fields
  })
}

const importCSV = async () => {
  if (!csvFile.value) {
    alert('Please select a CSV file')
    return
  }

  try {
    const text = await csvFile.value.text()
    const rows = parseCSV(text)

    if (rows.length < 2) {
      alert('CSV file must contain at least a header row and one data row')
      return
    }

    const headers = rows[0].map(h => h.toLowerCase().trim())
    const requiredHeaders = ['title', 'description']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))

    if (missingHeaders.length > 0) {
      alert(`Missing required columns: ${missingHeaders.join(', ')}`)
      return
    }

    const titleIndex = headers.indexOf('title')
    const descriptionIndex = headers.indexOf('description')
    const courseIdIndex = headers.indexOf('courseid')
    const orderIndex = headers.indexOf('order')

    let successCount = 0
    let errorCount = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]

      if (row.length < headers.length || !row[titleIndex] || !row[descriptionIndex]) {
        errorCount++
        continue
      }

      try {
        const unitData = {
          title: row[titleIndex].trim(),
          description: row[descriptionIndex].trim(),
          courseId: courseIdIndex >= 0 && row[courseIdIndex] ? row[courseIdIndex] : selectedCourseId.value || null,
          order: orderIndex >= 0 && row[orderIndex] ? parseInt(row[orderIndex]) : 1,
          isActive: true
        }

        await unitsAPI.create(unitData)
        successCount++
      } catch (error) {
        console.error('Error creating unit:', error)
        errorCount++
      }
    }

    closeImportModal()
    await loadUnits()

    if (successCount > 0) {
      alert(`Successfully imported ${successCount} units${errorCount > 0 ? `. ${errorCount} units failed to import.` : '.'}`)
    } else {
      alert('No units were imported. Please check your CSV format.')
    }
  } catch (error) {
    console.error('Error importing CSV:', error)
    alert('Error reading CSV file. Please check the file format.')
  }
}

// Initialize
onMounted(() => {
  loadCourses()
  loadUnits()
})

// Watchers
watch([searchQuery, selectedCourseId], () => {
  currentPage.value = 1 // Reset to first page when filters change
})
</script>
